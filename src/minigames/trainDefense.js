// 《Fogg 的赌约》· 关8a 洛矶山列车车顶防守与断桥飞跃 (正统狂野西部第一人称光枪射击 & 100 MPH 断桥绝命飞跃典藏版)
import { MiniGame } from './_base/MiniGame.js';
import { particles } from '../engine/particles.js';
import { physicsDebris } from '../engine/physics.js';
import { SpriteEngine } from '../engine/sprites.js';
import { GameImages } from '../assets/images.js';
import { Camera2D } from '../engine/camera.js';

export class TrainDefenseMiniGame extends MiniGame {
  constructor(params) {
    super(params);

    this.camera = new Camera2D(1280, 720);

    // 战役阶段：phase1 (侧翼包抄), phase2 (车顶炸药桶与精英强盗), phase3 (梅迪辛博断桥百迈绝命飞跃)
    this.phase = 1;
    this.timer = 45.0;
    this.maxTimer = 45.0;

    this.trainSpeed = 45; // MPH
    this.trainHealth = 100;
    this.maxTrainHealth = 100;

    // 准星与第一人称柯尔特左轮
    this.crosshair = { x: 640, y: 320 };
    this.revolver = {
      ammo: 6,
      maxAmmo: 6,
      isReloading: false,
      reloadTimer: 0,
      recoilTimer: 0
    };

    // 神射手子弹时间 (Dead Eye / Bullet Time)
    this.bulletTime = {
      active: false,
      meter: 100, // 0 ~ 100%
      timer: 0
    };

    // 敌人与飞行道具
    this.enemies = [];
    this.enemyProjectiles = [];
    this.flyingDebris = [];
    this.spawnTimer = 0.8;

    // 连击系统
    this.combo = 0;
    this.comboTimer = 0;
    this.score = 0;

    // 背景与铁轨
    this.trackOffset = 0;
    this.animTime = 0;

    this.canyonBgImg = new Image();
    const canyonSrc = GameImages.rocky_mountains_canyon_train || GameImages.rocky_canyon_train || GameImages.rocky_train || GameImages.rocky_mountains_canyon_train_art;
    if (canyonSrc) this.canyonBgImg.src = canyonSrc;
  }

  init() {
    this.phase = 1;
    this.timer = 45.0;
    this.trainSpeed = 45;
    this.trainHealth = 100;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;

    this.crosshair = { x: 640, y: 320 };
    this.revolver = {
      ammo: 6,
      maxAmmo: 6,
      isReloading: false,
      reloadTimer: 0,
      recoilTimer: 0
    };

    this.bulletTime = {
      active: false,
      meter: 100,
      timer: 0
    };

    this.enemies = [];
    this.enemyProjectiles = [];
    this.flyingDebris = [];
    this.spawnTimer = 0.6;
    this.trackOffset = 0;
    this.animTime = 0;

    this.camera.setWorldBounds(0, 1280, 0, 720);
    this.camera.follow(640, 360, true);

    this.input.configureUI({
      showDpad: true,
      showA: true,
      showB: true,
      labelA: '拔枪射击 [J/空格]',
      labelB: '快速换弹 [R]'
    });

    if (this.sound.music) this.sound.music.playTheme('overdrive');
    this.sound.playSteamWhistle();
    this.fx.toast('🤠 【落基山绝命防守】[移动准星 + 点击/空格射击] [R 换弹] [E/Shift 子弹时间]！', 5000);
  }

  update(rawDt) {
    if (!this.running || this.paused) return;
    let dt = Math.max(0.0001, rawDt || 0.016);

    // 子弹时间慢速流逝
    if (this.bulletTime.active) {
      dt *= 0.25;
      this.bulletTime.meter = Math.max(0, this.bulletTime.meter - rawDt * 30);
      if (this.bulletTime.meter <= 0) {
        this.bulletTime.active = false;
        this.fx.toast('⏳ 子弹时间结束！', 1200);
      }
    } else {
      this.bulletTime.meter = Math.min(100, this.bulletTime.meter + rawDt * 12);
    }

    this.timer -= dt;
    this.animTime += dt;
    this.trackOffset += dt * this.trainSpeed * 24;

    if (this.revolver.recoilTimer > 0) this.revolver.recoilTimer -= dt;

    // 换弹计时
    if (this.revolver.isReloading) {
      this.revolver.reloadTimer -= dt;
      if (this.revolver.reloadTimer <= 0) {
        this.revolver.ammo = this.revolver.maxAmmo;
        this.revolver.isReloading = false;
        this.sound.playCoin();
        this.fx.addFloatText(640, 480, '⚡ 弹药装填完毕! (6/6)', '#50e3c2');
      }
    }

    // 连击计时
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // 阶段流转
    if (this.timer > 30) {
      this.phase = 1; // 骑兵包抄
      this.trainSpeed = 45;
    } else if (this.timer > 12) {
      if (this.phase === 1) {
        this.phase = 2; // 车顶炸药桶袭击
        this.sound.playThunder();
        this.fx.toast('⚠️ 警报！强盗向列车投掷高爆炸药桶！优先射爆空中炸药！', 4000);
      }
      this.trainSpeed = 65;
    } else {
      if (this.phase === 2) {
        this.phase = 3; // 梅迪辛博断桥冲刺
        this.sound.playSteamWhistle();
        this.sound.playThunder();
        if (this.camera) this.camera.addTrauma(0.6);
        this.fx.toast('🌉 前方梅迪辛博危桥断裂！推满油门！全速百迈飞跃！', 4500);
      }
      // 速度飙升到 100+ MPH
      this.trainSpeed = Math.min(108, 65 + (12 - this.timer) * 3.6);
    }

    const inp = this.input ? this.input.input : null;
    const keys = inp ? (inp.keys || {}) : {};
    const btns = inp ? (inp.buttons || {}) : {};
    const axis = inp ? (inp.axis || { x: 0, y: 0 }) : { x: 0, y: 0 };
    const pointer = inp ? (inp.pointer || {}) : {};

    // 1. 准星平滑操纵
    let moveX = 0;
    let moveY = 0;
    if (keys['ArrowLeft'] || keys['KeyA'] || btns.left || axis.x < -0.2) moveX -= 1;
    if (keys['ArrowRight'] || keys['KeyD'] || btns.right || axis.x > 0.2) moveX += 1;
    if (keys['ArrowUp'] || keys['KeyW'] || btns.up || axis.y < -0.2) moveY -= 1;
    if (keys['ArrowDown'] || keys['KeyS'] || btns.down || axis.y > 0.2) moveY += 1;

    this.crosshair.x += moveX * 650 * dt;
    this.crosshair.y += moveY * 650 * dt;

    if (pointer.down) {
      this.crosshair.x = pointer.x;
      this.crosshair.y = pointer.y;
    }

    this.crosshair.x = Math.max(90, Math.min(this.canvas.width - 90, this.crosshair.x));
    this.crosshair.y = Math.max(70, Math.min(540, this.crosshair.y));

    // 2. 换弹 (R / Button B)
    if ((keys['KeyR'] || btns.justB) && !this.revolver.isReloading && this.revolver.ammo < 6) {
      this.startReload();
    }

    // 3. 启动子弹时间 (E / Shift / Button C)
    if ((keys['KeyE'] || keys['ShiftLeft'] || keys['ShiftRight'] || btns.justC) && this.bulletTime.meter > 25) {
      this.bulletTime.active = !this.bulletTime.active;
      if (this.bulletTime.active) {
        this.sound.playWhoosh();
        this.fx.toast('⏳ 【神射手专注模式】时间流速变缓！', 1500);
      }
    }

    // 4. 左轮射击
    if (keys['Space'] || keys['KeyJ'] || btns.justA || pointer.justDown) {
      this.fireRevolver();
      keys['Space'] = false;
      keys['KeyJ'] = false;
      if (pointer.justDown) pointer.justDown = false;
    }

    // 5. 敌人与投掷物生成系统
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      if (this.phase === 1) {
        this.enemies.push({
          type: 'bandit_rider',
          x: Math.random() < 0.5 ? -40 : 1320,
          y: 220 + Math.random() * 180,
          vx: (Math.random() < 0.5 ? 1 : -1) * (90 + Math.random() * 60),
          health: 1,
          shootCooldown: 1.5 + Math.random() * 1.5,
          alive: true
        });
        this.spawnTimer = 0.9 + Math.random() * 0.6;

      } else if (this.phase === 2) {
        const isDynamite = Math.random() < 0.45;
        if (isDynamite) {
          this.enemies.push({
            type: 'dynamite',
            x: 200 + Math.random() * 880,
            y: -30,
            vy: 160 + Math.random() * 90,
            vx: (Math.random() - 0.5) * 60,
            rot: 0,
            health: 1,
            alive: true
          });
        } else {
          this.enemies.push({
            type: 'bandit_rider',
            x: Math.random() < 0.5 ? -40 : 1320,
            y: 220 + Math.random() * 180,
            vx: (Math.random() < 0.5 ? 1 : -1) * (110 + Math.random() * 70),
            health: 1,
            shootCooldown: 1.2,
            alive: true
          });
        }
        this.spawnTimer = 0.7 + Math.random() * 0.5;

      } else if (this.phase === 3) {
        this.enemies.push({
          type: 'boulder',
          x: 320 + Math.random() * 640,
          y: -40,
          vy: 220 + Math.random() * 100,
          vx: (Math.random() - 0.5) * 50,
          rot: 0,
          health: 2,
          alive: true
        });
        this.spawnTimer = 0.6 + Math.random() * 0.4;
      }
    }

    // 6. 敌人行动与攻击
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.type === 'bandit_rider') {
        e.x += e.vx * dt;
        e.shootCooldown -= dt;

        if (e.shootCooldown <= 0 && Math.abs(e.x - 640) < 360) {
          e.shootCooldown = 2.0;
          this.enemyProjectiles.push({
            x: e.x,
            y: e.y - 30,
            vx: (640 - e.x) * 1.5,
            vy: (520 - (e.y - 30)) * 1.5,
            type: 'arrow',
            alive: true
          });
          this.sound.playWhoosh();
        }

      } else if (e.type === 'dynamite' || e.type === 'boulder') {
        e.y += e.vy * dt;
        e.x += e.vx * dt;
        e.rot += 3 * dt;

        if (e.y >= 520) {
          e.alive = false;
          const dmg = e.type === 'dynamite' ? 22 : 16;
          this.trainHealth -= dmg;
          this.sound.playCrash();
          if (this.camera) this.camera.addTrauma(0.5);
          this.fx.flashRed(160);
          this.fx.addFloatText(e.x, 480, (e.type === 'dynamite' ? '💥 炸药爆炸! -22' : '⚠️ 巨石撞击! -16'), '#ff4d4d');
          particles.emitExplosion(e.x, 520, 25);
        }
      }

      if (e.x < -120 || e.x > 1400 || e.y > 750 || !e.alive) {
        this.enemies.splice(i, 1);
      }
    }

    // 7. 敌方投掷物
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = this.enemyProjectiles[i];
      ep.x += ep.vx * dt;
      ep.y += ep.vy * dt;

      if (Math.abs(ep.x - 640) < 320 && ep.y >= 500) {
        ep.alive = false;
        this.trainHealth -= 4;
        this.sound.playCrash();
        this.fx.flashRed(80);
        this.fx.addFloatText(ep.x, ep.y, '🏹 车厢受损 -4', '#ff7777');
        particles.emitSparks(ep.x, ep.y, 6);
      }

      if (ep.y > 740 || !ep.alive) {
        this.enemyProjectiles.splice(i, 1);
      }
    }

    // 8. 抛射出的黄铜弹壳
    for (let i = this.flyingDebris.length - 1; i >= 0; i--) {
      const d = this.flyingDebris[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 980 * dt;
      d.rot += d.vrot * dt;
      if (d.y > 720) this.flyingDebris.splice(i, 1);
    }

    if (this.timer <= 0 || this.trainHealth <= 0) {
      this.finishGame();
    }
  }

  fireRevolver() {
    if (this.revolver.isReloading) {
      this.fx.toast('⚠️ 正在快速填弹中...', 800);
      return;
    }

    if (this.revolver.ammo <= 0) {
      this.sound.playPop();
      this.fx.toast('⚠️ 弹巢空！按 [R] 快速换弹！', 1000);
      this.startReload();
      return;
    }

    this.revolver.ammo--;
    this.revolver.recoilTimer = 0.14;

    this.sound.playCrash();
    if (this.fx && this.fx.hapticHeavy) this.fx.hapticHeavy();
    if (this.camera) this.camera.addTrauma(0.28);
    this.fx.addFloatText(this.crosshair.x, this.crosshair.y - 20, '💥 BANG!', '#ffde59');
    particles.emitSparks(this.crosshair.x, this.crosshair.y, 14);

    // 抛出黄铜弹壳
    this.flyingDebris.push({
      x: 740,
      y: 560,
      vx: 140 + Math.random() * 90,
      vy: -260 - Math.random() * 80,
      rot: 0,
      vrot: 18
    });

    let hitSomething = false;

    // 命中敌人判定 (含爆头 Headshot 判定)
    for (const e of this.enemies) {
      if (!e.alive) continue;

      if (e.type === 'bandit_rider') {
        const dx = Math.abs(e.x - this.crosshair.x);
        const dy = Math.abs(e.y - this.crosshair.y);

        if (dx < 65 && dy < 65) {
          hitSomething = true;
          const isHeadshot = dy < 28 && this.crosshair.y < e.y - 15;

          e.alive = false;
          this.combo++;
          this.comboTimer = 2.0;

          const pts = (isHeadshot ? 500 : 200) * (1 + this.combo * 0.2);
          this.score += pts;

          this.sound.playCoin();
          particles.emitSparkles(e.x, e.y, isHeadshot ? 25 : 12);
          this.fx.addFloatText(e.x, e.y - 40, (isHeadshot ? '👑 HEADSHOT! +' + pts : '★ 击退骑兵 +' + pts), isHeadshot ? '#ffd700' : '#50e3c2');
          break;
        }

      } else if (e.type === 'dynamite') {
        const dx = Math.abs(e.x - this.crosshair.x);
        const dy = Math.abs(e.y - this.crosshair.y);

        if (dx < 45 && dy < 45) {
          hitSomething = true;
          e.alive = false;
          this.score += 600;
          this.sound.playThunder();
          if (this.camera) this.camera.addTrauma(0.6);
          this.fx.addFloatText(e.x, e.y, '💥 空中引爆炸药! +600', '#ffd700');
          particles.emitExplosion(e.x, e.y, 40);

          for (const near of this.enemies) {
            if (near.alive && Math.abs(near.x - e.x) < 220) {
              near.alive = false;
              this.score += 300;
              particles.emitSparkles(near.x, near.y, 15);
              this.fx.addFloatText(near.x, near.y, '💥 连锁炸飞 +300', '#50e3c2');
            }
          }
          break;
        }

      } else if (e.type === 'boulder') {
        const dx = Math.abs(e.x - this.crosshair.x);
        const dy = Math.abs(e.y - this.crosshair.y);

        if (dx < 55 && dy < 55) {
          hitSomething = true;
          e.health--;
          if (e.health <= 0) {
            e.alive = false;
            this.score += 400;
            this.sound.playCrash();
            particles.emitExplosion(e.x, e.y, 25);
            this.fx.addFloatText(e.x, e.y, '⚡ 击碎落石! +400', '#ffd700');
          } else {
            this.sound.playCrash();
            particles.emitSparks(e.x, e.y, 10);
            this.fx.addFloatText(e.x, e.y, '💥 CRACK!', '#ffde59');
          }
          break;
        }
      }
    }

    // 拦截空中飞箭
    if (!hitSomething) {
      for (const ep of this.enemyProjectiles) {
        if (ep.alive && Math.abs(ep.x - this.crosshair.x) < 35 && Math.abs(ep.y - this.crosshair.y) < 35) {
          ep.alive = false;
          hitSomething = true;
          this.score += 150;
          this.sound.playCoin();
          particles.emitSparkles(ep.x, ep.y, 10);
          this.fx.addFloatText(ep.x, ep.y, '🛡️ 拦截飞箭 +150', '#50e3c2');
          break;
        }
      }
    }

    if (this.revolver.ammo === 0) {
      setTimeout(() => { if (this.revolver.ammo === 0) this.startReload(); }, 200);
    }
  }

  startReload() {
    this.revolver.isReloading = true;
    this.revolver.reloadTimer = 0.85;
    this.sound.playWhoosh();
    this.fx.addFloatText(640, 480, '🔄 RELOADING...', '#ffe87c');
  }

  finishGame() {
    this.running = false;
    const isSuccess = this.trainHealth > 0;
    const rank = isSuccess && this.trainHealth > 65 ? 'S' : (isSuccess ? 'A' : 'B');

    this.sound.playVictory();
    this.sound.playSteamWhistle();

    setTimeout(() => {
      this.complete({
        result: isSuccess ? 'perfect' : 'pass',
        rank,
        score: this.score + Math.floor(this.trainHealth * 15) + Math.floor(this.trainSpeed * 20),
        daysDelta: 0,
        comment: isSuccess
          ? '★ 太平洋大铁路机车推满百迈极速，如同一枚呼啸的钢铁炮弹成功飞跃断裂危桥！'
          : '危急关头，让·路路通冒死爬进车底摘下机车连挂销，迫使列车在基尔尼堡哨所前险险停稳！',
        flags: { trainBridgeCleared: true }
      });
    }, 1000);
  }

  render(ctx) {
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. 实景 16:9 洛矶山雪峡与梅迪辛博危桥手绘油画全景
    if (this.canyonBgImg && this.canyonBgImg.complete && this.canyonBgImg.naturalWidth > 0) {
      ctx.drawImage(this.canyonBgImg, 0, 0, w, h);
    } else {
      const canyonGrad = ctx.createLinearGradient(0, 0, 0, h);
      canyonGrad.addColorStop(0, '#3e241e');
      canyonGrad.addColorStop(0.35, '#6a3f2a');
      canyonGrad.addColorStop(0.7, '#a56c4d');
      canyonGrad.addColorStop(1, '#e6d8c8');
      ctx.fillStyle = canyonGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // 速度感风驰残影线条 (High-speed motion speedlines)
    if (this.trainSpeed >= 80) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const ly = 120 + (i * 65 + this.trackOffset * 2) % 480;
        ctx.beginPath();
        ctx.moveTo(w, ly);
        ctx.lineTo(w - 180 - Math.random() * 120, ly);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 子弹时间复古琥珀金色滤镜暗角
    if (this.bulletTime.active) {
      ctx.fillStyle = 'rgba(212, 175, 55, 0.18)';
      ctx.fillRect(0, 0, w, h);
      const sepiaGrad = ctx.createRadialGradient(w / 2, h / 2, 300, w / 2, h / 2, 700);
      sepiaGrad.addColorStop(0, 'rgba(0,0,0,0)');
      sepiaGrad.addColorStop(1, 'rgba(40, 20, 5, 0.55)');
      ctx.fillStyle = sepiaGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. 绘制狂野西部骑马强盗与印第安骑兵追兵、炸药桶、落石
    for (const e of this.enemies) {
      if (!e.alive) continue;

      if (e.type === 'bandit_rider') {
        SpriteEngine.drawBanditHorse(ctx, e.x, e.y, 160, 160, e.vx > 0, this.animTime);

      } else if (e.type === 'dynamite') {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.rot);
        ctx.fillStyle = '#cc2200';
        ctx.fillRect(-18, -12, 36, 24);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(-18, -12, 36, 24);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('TNT', 0, 4);
        particles.emitSparks(e.x, e.y - 12, 2);
        ctx.restore();

      } else if (e.type === 'boulder') {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.rot);
        ctx.fillStyle = '#7a6f64';
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#3d3731';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }
    }

    // 3. 敌方飞箭
    for (const ep of this.enemyProjectiles) {
      if (ep.alive) {
        ctx.save();
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ep.x, ep.y);
        ctx.lineTo(ep.x - ep.vx * 0.05, ep.y - ep.vy * 0.05);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 4. 底部第一人称车顶木质甲板与铆钉护栏 (First-Person Roof Deck Trim - 无遮挡通透前景)
    ctx.save();
    const roofGrad = ctx.createLinearGradient(0, 650, 0, h);
    roofGrad.addColorStop(0, 'rgba(35, 22, 14, 0.7)');
    roofGrad.addColorStop(0.3, 'rgba(25, 15, 9, 0.95)');
    roofGrad.addColorStop(1, '#0e0804');
    ctx.fillStyle = roofGrad;
    ctx.beginPath();
    ctx.moveTo(0, 660);
    ctx.quadraticCurveTo(w / 2, 640, w, 660);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // 车顶黄铜铆钉与护栏边条
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 660);
    ctx.quadraticCurveTo(w / 2, 640, w, 660);
    ctx.stroke();

    for (let rx = 60; rx < w; rx += 140) {
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(rx, 655 + Math.sin(rx / w * Math.PI) * -12, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 5. 抛飞的黄铜弹壳
    for (const d of this.flyingDebris) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(-6, -2, 12, 4);
      ctx.restore();
    }

    // 6. 高精黄铜准星 (Brass Crosshair)
    ctx.save();
    ctx.strokeStyle = this.bulletTime.active ? '#00ffff' : '#ffd700';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = this.bulletTime.active ? '#00ffff' : '#ff8800';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.crosshair.x, this.crosshair.y, 22, 0, Math.PI * 2);
    ctx.moveTo(this.crosshair.x - 32, this.crosshair.y); ctx.lineTo(this.crosshair.x + 32, this.crosshair.y);
    ctx.moveTo(this.crosshair.x, this.crosshair.y - 32); ctx.lineTo(this.crosshair.x, this.crosshair.y + 32);
    ctx.stroke();
    ctx.restore();

    // 7. 正统第一人称前向瞄准柯尔特六响左轮手枪 (True Forward-Aiming FPS Revolver)
    SpriteEngine.drawFPSRevolver(ctx, this.crosshair.x, this.crosshair.y, this.revolver.recoilTimer > 0, Math.sin(this.animTime * 12) * 0.05, this.revolver.ammo);

    // 8. 顶部经典西部街机 HUD 仪表盘
    this.drawWesternArcadeHUD(ctx);
  }

  drawWesternArcadeHUD(ctx) {
    const w = this.canvas.width;
    ctx.save();

    // 1. 左侧：列车车速仪表与断桥飞跃提示 (MPH Speedometer)
    ctx.fillStyle = 'rgba(15, 10, 6, 0.94)';
    ctx.fillRect(40, 30, 260, 65);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 30, 260, 65);

    ctx.fillStyle = this.trainSpeed >= 90 ? '#ff3300' : '#ffe87c';
    ctx.font = 'bold 20px "Baskerville", serif';
    ctx.textAlign = 'left';
    ctx.fillText('🚂 时速: ' + Math.floor(this.trainSpeed) + ' MPH', 55, 58);

    ctx.fillStyle = '#a09080';
    ctx.font = '12px sans-serif';
    ctx.fillText(this.phase === 3 ? '🔥 百迈极限飞跃冲刺中！' : '目标: 突破 100 MPH 飞跃断桥', 55, 82);

    // 2. 中间：列车耐久度 (Boiler & Car Health Bar)
    const barW = 340;
    ctx.fillStyle = 'rgba(15, 10, 6, 0.94)';
    ctx.fillRect(w / 2 - barW / 2, 30, barW, 45);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(w / 2 - barW / 2, 30, barW, 45);

    const hpProg = Math.max(0, this.trainHealth / this.maxTrainHealth);
    const hpGrad = ctx.createLinearGradient(w / 2 - barW / 2, 30, w / 2 + barW / 2, 30);
    hpGrad.addColorStop(0, '#00ffcc');
    hpGrad.addColorStop(1, hpProg < 0.3 ? '#ff0044' : '#ffd700');
    ctx.fillStyle = hpGrad;
    ctx.fillRect(w / 2 - barW / 2 + 3, 33, (barW - 6) * hpProg, 22);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('机车装甲耐久: ' + Math.floor(this.trainHealth) + '% | 倒计时: ' + Math.ceil(this.timer) + 's', w / 2, 65);

    // 3. 右侧：左轮 6 发轮盘弹仓 (6-Chamber Cylinder UI)
    ctx.fillStyle = 'rgba(15, 10, 6, 0.94)';
    ctx.fillRect(w - 300, 30, 260, 65);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(w - 300, 30, 260, 65);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 14px "Baskerville", serif';
    ctx.textAlign = 'left';
    ctx.fillText('🔫 弹仓: ' + (this.revolver.isReloading ? '装填中...' : this.revolver.ammo + ' / 6 [按 R 换弹]'), w - 285, 54);

    for (let b = 0; b < 6; b++) {
      const bx = w - 280 + b * 38;
      const by = 75;
      const hasBullet = b < this.revolver.ammo;
      ctx.fillStyle = hasBullet ? '#ffd700' : '#4a3d31';
      ctx.fillRect(bx, by, 24, 8);
      ctx.strokeStyle = '#2b1b0d';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, 24, 8);
    }

    // 4. 连击指示 (Combo Counter)
    if (this.combo > 1) {
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ff3300';
      ctx.shadowBlur = 18;
      ctx.font = '900 28px "Baskerville", serif';
      ctx.textAlign = 'left';
      ctx.fillText(this.combo + ' HITS COMBO! ★', 55, 130);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}
