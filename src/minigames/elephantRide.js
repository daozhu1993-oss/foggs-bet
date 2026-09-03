import { MiniGame } from './_base/MiniGame.js';
import { particles } from '../engine/particles.js';
import { SpriteEngine } from '../engine/sprites.js';
import { GameImages } from '../assets/images.js';
import { Camera2D } from '../engine/camera.js';
import { physicsDebris } from '../engine/physics.js';
import { fx } from '../engine/fx.js';

// =========================================================================
// 关卡3 核心小游戏：【印度古雨林 · 皇家战象神庙跑酷与破壁大营救】
// 严格遵循经典动作跑酷设计范式 (轻盈灵动、指令即响应、绝不跑出画面)
// =========================================================================
export class ElephantRideMiniGame extends MiniGame {
  constructor(params) {
    super(params);

    this.camera = new Camera2D(1280, 720);

    this.elephant = {
      x: 180,
      y: 470,
      baseY: 470,
      vx: 460, // 恒定极速奔袭速度
      vy: 0,
      w: 130,  // 优化为轻盈敏捷的黄金比例，视野开阔
      h: 95,
      isGrounded: true,
      isDucking: false,
      isCharging: false,
      chargeTimer: 0,
      gravity: 2400,
      jumpVelocity: -780,
      animTime: 0,
      score: 0,
      smashCount: 0,
      firesExtinguished: 0,
      starsCollected: 0,
      isFeverMode: false,
      feverTimer: 0,
      hasRescuedAouda: false
    };

    this.trackLength = 4800;
    this.distanceRemainingMeters = 100;
    this.timeLimit = 55.0;

    this.coins = [];          // 悬空金币轨迹 (提供清晰动作指引)
    this.stoneWalls = [];     // 庙宇可粉碎石墙 [D/→ 冲撞]
    this.fireWalls = [];      // 烈焰火海 [B/K 灭火 或 空格 跳跃]
    this.hangingVines = [];   // 低垂巨藤 [S/↓ 滑铲]
    this.trampolines = [];    // 皇家金边蹦床
    this.royalStars = [];     // 悬空皇家金星
    this.waterCannons = [];   // 喷射出的水花弹
    this.templePyre = { x: 3400, y: 400, w: 160, h: 140, smashed: false }; // 火祭神坛与阿娥达
    this.goalPodium = { x: 4600, y: 380, w: 300, h: 160, reached: false }; // 阿拉哈巴德凯旋之门

    this.jungleBgImg = new Image();
    const jungleSrc = GameImages.jungle_bg || GameImages.elephant || GameImages.india_jungle || GameImages.india_jungle_wide || GameImages.india_jungle_wide_art;
    if (jungleSrc) this.jungleBgImg.src = jungleSrc;

    this.aoudaImg = new Image();
    if (GameImages.aouda) this.aoudaImg.src = GameImages.aouda;
  }

  init() {
    this.elephant.x = 180;
    this.elephant.y = this.elephant.baseY;
    this.elephant.vx = 460;
    this.elephant.vy = 0;
    this.elephant.isGrounded = true;
    this.elephant.isDucking = false;
    this.elephant.isCharging = false;
    this.elephant.chargeTimer = 0;
    this.elephant.score = 0;
    this.elephant.smashCount = 0;
    this.elephant.firesExtinguished = 0;
    this.elephant.starsCollected = 0;
    this.elephant.isFeverMode = false;
    this.elephant.feverTimer = 0;
    this.elephant.hasRescuedAouda = false;

    this.distanceRemainingMeters = 100;
    this.timeLimit = 55.0;
    this.templePyre.smashed = false;
    this.goalPodium.reached = false;

    this.coins = [];
    this.stoneWalls = [];
    this.fireWalls = [];
    this.hangingVines = [];
    this.trampolines = [];
    this.royalStars = [];
    this.waterCannons = [];
    physicsDebris.clear();

    // 摄像机世界边界与初始瞬时锁定 (大象永远位于屏幕黄金左侧 1/3，绝不跑出画面)
    this.camera.setWorldBounds(0, this.trackLength + 800, 0, 720);
    this.camera.follow(this.elephant.x + 320, 360, true);

    this.input.configureUI({
      showDpad: true,
      showA: true,
      showB: true,
      labelA: '冲撞 [D/→]',
      labelB: '水炮 [B/K]'
    });

    this.sound.playElephantTrumpet();
    if (this.sound.music) this.sound.music.playTheme('jungle');
    this.fx.toast('【战象跑酷】[空格/↑] 跳跃！[D/→] 冲撞碎石！[S/↓] 滑铲伏低！[B/K] 象鼻喷水！', 4500);

    this.buildRunnerCourse();
  }

  buildRunnerCourse() {
    // 1. 金币抛物线与地面金币串 (指引跳跃与滑铲节奏)
    const addCoinArc = (startX, startY, count = 5) => {
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const arcY = startY - Math.sin(t * Math.PI) * 120;
        this.coins.push({ x: startX + i * 55, y: arcY, collected: false });
      }
    };

    const addCoinLine = (startX, y, count = 4) => {
      for (let i = 0; i < count; i++) {
        this.coins.push({ x: startX + i * 50, y: y, collected: false });
      }
    };

    // 2. 障碍物与金币全赛道编排
    // 第1段：跳跃热身与滑铲
    addCoinArc(450, 480, 5);
    this.stoneWalls.push({ x: 750, y: this.elephant.baseY - 20, w: 55, h: 120, broken: false });

    this.hangingVines.push({ x: 1100, y: 350, w: 45, h: 120, cleared: false });
    addCoinLine(1050, 510, 4); // 滑铲金币线

    // 第2段：蹦床大腾空与皇家金星
    this.trampolines.push({ x: 1450, y: this.elephant.baseY + 30, w: 80, h: 25 });
    this.royalStars.push({ x: 1650, y: 220, collected: false });
    addCoinArc(1500, 360, 6);

    this.fireWalls.push({ x: 1900, y: this.elephant.baseY + 15, w: 75, h: 70, extinguished: false });
    this.stoneWalls.push({ x: 2200, y: this.elephant.baseY - 20, w: 55, h: 120, broken: false });

    // 第3段：连续低藤与金星
    this.hangingVines.push({ x: 2500, y: 350, w: 45, h: 120, cleared: false });
    addCoinLine(2450, 510, 4);

    this.trampolines.push({ x: 2800, y: this.elephant.baseY + 30, w: 80, h: 25 });
    this.royalStars.push({ x: 3000, y: 220, collected: false });

    this.fireWalls.push({ x: 3180, y: this.elephant.baseY + 15, w: 75, h: 70, extinguished: false });

    // 第4段：火祭神庙营救与终极大狂欢 (3400 ~ 4600)
    this.royalStars.push({ x: 3600, y: 320, collected: false });
    addCoinArc(3800, 480, 8);
    addCoinArc(4150, 480, 8);
  }

  update(rawDt) {
    if (this.goalPodium.reached) return;

    const dtScale = (typeof fx !== 'undefined' && fx && fx.getTimeDilation) ? fx.getTimeDilation() : 1.0;
    const dt = Math.max(0.0001, (rawDt || 0.016) * (dtScale || 1.0));

    this.timeLimit -= dt;
    this.elephant.animTime += dt;
    physicsDebris.update(dt);

    // 1. 狂暴冲刺与 FEVER 倒计时
    if (this.elephant.isCharging) {
      this.elephant.chargeTimer -= dt;
      if (this.elephant.chargeTimer <= 0) {
        this.elephant.isCharging = false;
      }
    }

    if (this.elephant.isFeverMode) {
      this.elephant.feverTimer -= dt;
      if (this.elephant.feverTimer <= 0) {
        this.elephant.isFeverMode = false;
      }
    }

    // 2. 福克宝玑怀表子弹时间 [C]
    if (this.input.input.keys['KeyC']) {
      fx.activateBulletTime();
    }

    // 3. 跑酷玩家输入响应 (零延迟、手感极度清脆)
    const inp = this.input.input;
    const keys = inp.keys || {};
    const btns = inp.buttons || {};
    const pointer = inp.pointer || {};

    // 3.1 狂暴冲撞 [D / → / KeyA / Action A / 双击]
    const chargeInput = keys['KeyD'] || keys['ArrowRight'] || keys['KeyA'] || btns.right || btns.A || btns.actionA;
    if (chargeInput && !this.elephant.isCharging) {
      this.elephant.isCharging = true;
      this.elephant.chargeTimer = 0.5;
      this.sound.playCrash();
      this.camera.addTrauma(0.3);
      this.fx.triggerHaptic(35);
      this.fx.addFloatText(this.elephant.x + 90, this.elephant.y - 30, '⚡ 冲撞破壁！', '#ffd700');
      particles.emitSparkles(this.elephant.x + 110, this.elephant.y + 40, 16);
    }

    // 3.2 跳跃 [Space / W / ↑ / 点击屏幕上半区]
    let jumpTouch = pointer.justDown && pointer.y < 420;
    const jumpInput = keys['Space'] || keys['KeyW'] || keys['ArrowUp'] || btns.up || btns.justA || jumpTouch;
    if (jumpInput && this.elephant.isGrounded) {
      this.elephant.vy = this.elephant.jumpVelocity;
      this.elephant.isGrounded = false;
      this.sound.playJump();
      this.camera.addTrauma(0.18);
      this.fx.triggerHaptic(25);
      particles.emitDust(this.elephant.x + 40, this.elephant.y + this.elephant.h, 10);
    }

    // 3.3 滑铲伏低 [S / ↓ / 点击屏幕下半区]
    let duckTouch = pointer.down && pointer.y >= 420;
    const duckInput = keys['KeyS'] || keys['ArrowDown'] || btns.down || duckTouch;
    this.elephant.isDucking = !!duckInput;

    // 3.4 象鼻水炮灭火 [B / K / Action B]
    const sprayInput = keys['KeyB'] || keys['KeyK'] || btns.justB || btns.actionB;
    if (sprayInput) {
      this.sound.playSteamWhistle();
      this.camera.addTrauma(0.2);
      this.fx.triggerHaptic(25);

      for (let i = 0; i < 6; i++) {
        this.waterCannons.push({
          x: this.elephant.x + 120,
          y: this.elephant.y + 30,
          vx: 750 + Math.random() * 200,
          vy: -50 + (Math.random() - 0.5) * 100,
          radius: 14,
          life: 0.5
        });
      }
      this.fx.addFloatText(this.elephant.x + 80, this.elephant.y - 25, '💧 象鼻激流！', '#50e3c2');
    }

    // 4. 速度推进与【关键修复：摄像机平滑锁定，大象永远在画面黄金位置】
    let curSpeed = this.elephant.vx;
    if (this.elephant.isFeverMode) curSpeed = 720;
    else if (this.elephant.isCharging) curSpeed = 650;

    this.elephant.x += curSpeed * dt;

    // 疾驰蹄下有节奏扬尘与加速流光 (Living Gallop Dust & Speed FX)
    if (this.elephant.isGrounded) {
      if (Math.sin(this.elephant.animTime * (this.elephant.isCharging ? 20 : 14)) > 0.85) {
        particles.emitDust(this.elephant.x + 30, this.elephant.y + this.elephant.h + 2, 2);
      }
      if (this.elephant.isCharging || this.elephant.isFeverMode) {
        particles.emitSparkles(this.elephant.x + 20, this.elephant.y + this.elephant.h, 3);
      }
    }

    // 摄像机必须每帧更新 update(dt)，严格锁定在大象右前方 320px 处！
    this.camera.follow(this.elephant.x + 320, 360);
    this.camera.update(dt);

    const progress = Math.min(1.0, this.elephant.x / this.goalPodium.x);
    this.distanceRemainingMeters = Math.max(0, Math.round(100 * (1.0 - progress)));

    // 5. 紧凑利落的跳跃重力响应
    if (!this.elephant.isGrounded) {
      this.elephant.vy += this.elephant.gravity * dt;
      this.elephant.y += this.elephant.vy * dt;

      if (this.elephant.y >= this.elephant.baseY) {
        this.elephant.y = this.elephant.baseY;
        this.elephant.vy = 0;
        this.elephant.isGrounded = true;
        this.sound.playStampThud();
        this.camera.addTrauma(0.15);
        particles.emitDust(this.elephant.x + 40, this.elephant.y + this.elephant.h, 8);
      }
    }

    // 6. 金币收集判定
    for (const c of this.coins) {
      if (!c.collected) {
        const dist = Math.hypot(this.elephant.x + 60 - c.x, this.elephant.y + 40 - c.y);
        if (dist < 60) {
          c.collected = true;
          this.elephant.score += 50;
          this.sound.playCoinClink();
          particles.emitSparkles(c.x, c.y, 8);
        }
      }
    }

    // 7. 水炮灭火判定
    for (let i = this.waterCannons.length - 1; i >= 0; i--) {
      const w = this.waterCannons[i];
      w.x += w.vx * dt;
      w.y += w.vy * dt;
      w.life -= dt;

      for (const fw of this.fireWalls) {
        if (!fw.extinguished && Math.hypot(w.x - (fw.x + 35), w.y - (fw.y + 30)) < 65) {
          fw.extinguished = true;
          this.elephant.firesExtinguished++;
          this.elephant.score += 250;
          this.sound.playCardFlip();
          this.camera.addTrauma(0.25);
          this.fx.addFloatText(fw.x, fw.y - 25, '💧 火海扑灭！+250', '#50e3c2');
          particles.emitSparkles(fw.x + 35, fw.y + 15, 14);
          break;
        }
      }

      if (w.life <= 0) this.waterCannons.splice(i, 1);
    }

    // 8. 冲撞破壁判定 (Stone Wall Smash)
    for (const wall of this.stoneWalls) {
      if (!wall.broken) {
        const inHitZone =
          this.elephant.x + this.elephant.w > wall.x &&
          this.elephant.x + 20 < wall.x + wall.w &&
          this.elephant.y + this.elephant.h > wall.y;

        if (inHitZone) {
          wall.broken = true;
          this.elephant.smashCount++;
          this.elephant.score += 300;
          this.sound.playCrash();
          this.camera.addTrauma(0.45);
          this.fx.hitstop(40);
          this.fx.triggerHaptic(40);
          physicsDebris.spawnStoneDebris(wall.x + 25, wall.y + 40, 16, 500);
          this.fx.addFloatText(wall.x, wall.y - 30, '★ 轰碎神庙石壁！+300', '#ffd700');
        }
      }
    }

    // 9. 低垂巨藤滑铲判定 (Slide Check)
    for (const vine of this.hangingVines) {
      if (!vine.cleared) {
        const inVineZone =
          this.elephant.x + this.elephant.w * 0.8 > vine.x &&
          this.elephant.x + this.elephant.w * 0.2 < vine.x + vine.w;

        if (inVineZone) {
          if (!this.elephant.isDucking && !this.elephant.isCharging && !this.elephant.isFeverMode) {
            vine.cleared = true;
            this.elephant.score = Math.max(0, this.elephant.score - 100);
            this.sound.playCrash();
            this.camera.addTrauma(0.3);
            this.fx.flashRed(150);
            this.fx.addFloatText(vine.x, vine.y + 50, '⚠ 巨藤刮蹭 -100 (按[S/↓]滑铲)', '#ff4d4d');
          } else {
            vine.cleared = true;
            this.elephant.score += 200;
            this.sound.playCardSlam();
            this.fx.addFloatText(vine.x, vine.y + 50, '🌿 完美滑铲！+200', '#50e3c2');
          }
        }
      }
    }

    // 10. 金边蹦床大腾空
    for (const tramp of this.trampolines) {
      if (
        this.elephant.x + this.elephant.w * 0.8 > tramp.x &&
        this.elephant.x + this.elephant.w * 0.2 < tramp.x + tramp.w &&
        this.elephant.y + this.elephant.h >= tramp.y &&
        this.elephant.y + this.elephant.h <= tramp.y + 35 &&
        this.elephant.vy >= 0
      ) {
        this.elephant.vy = -1050;
        this.elephant.isGrounded = false;
        this.sound.playJump();
        this.camera.addTrauma(0.35);
        this.fx.triggerHaptic(35);
        this.fx.addFloatText(tramp.x, tramp.y - 40, '🎪 蹦床超级大腾空！', '#50e3c2');
        particles.emitSparkles(tramp.x + 35, tramp.y, 16);
        break;
      }
    }

    // 11. 皇家金星收集
    for (const star of this.royalStars) {
      if (!star.collected) {
        const dist = Math.hypot(this.elephant.x + 60 - star.x, this.elephant.y + 35 - star.y);
        if (dist < 70) {
          star.collected = true;
          this.elephant.starsCollected++;
          this.elephant.score += 300;
          this.sound.playVictory();
          this.camera.addTrauma(0.25);
          particles.emitSparkles(star.x, star.y, 18);

          if (this.elephant.starsCollected >= 3 && !this.elephant.isFeverMode) {
            this.elephant.isFeverMode = true;
            this.elephant.feverTimer = 6.0;
            this.sound.playElephantTrumpet();
            this.camera.addTrauma(0.45);
            this.fx.flash('#ffd700', 200);
            this.fx.addFloatText(this.elephant.x, this.elephant.y - 50, '🌟 象王黄金无敌狂暴 Fever！', '#ffe87c');
          } else {
            this.fx.addFloatText(star.x, star.y - 25, `⭐ 皇家金星 (${this.elephant.starsCollected}/3)`, '#ffd700');
          }
        }
      }
    }

    // 12. 高潮时刻：火祭神坛现场大营救 (Suttee Pagoda Rescue)
    if (!this.templePyre.smashed && this.elephant.x + this.elephant.w > this.templePyre.x) {
      this.templePyre.smashed = true;
      this.elephant.hasRescuedAouda = true;
      this.elephant.score += 1000;
      this.sound.playVictory();
      this.sound.playElephantTrumpet();
      this.camera.addTrauma(0.65);
      this.fx.flash('#ffd700', 300);
      this.fx.hitstop(70);
      physicsDebris.spawnStoneDebris(this.templePyre.x + 70, this.templePyre.y + 40, 24, 600);

      this.elephant.isFeverMode = true;
      this.elephant.feverTimer = 8.0;
      this.fx.addFloatText(this.elephant.x + 60, this.elephant.y - 60, '👑 救出艾娥达夫人！全速突围！+1000', '#ffe87c');
      particles.emitSparkles(this.elephant.x + 80, this.elephant.y, 35);
    }

    // 13. 抵达阿拉哈巴德终点
    if (!this.goalPodium.reached && this.elephant.x >= this.goalPodium.x) {
      this.goalPodium.reached = true;
      this.finishElephantGame();
    }
  }

  finishElephantGame() {
    this.sound.playVictory();

    const isPerfect = this.elephant.score >= 1800 && this.elephant.smashCount >= 2;
    const rank = isPerfect ? 'S' : 'A';
    const daysDelta = isPerfect ? -2.0 : -1.0;

    setTimeout(() => {
      this.complete({
        result: rank === 'S' ? 'perfect' : 'good',
        rank,
        score: this.elephant.score,
        daysDelta,
        stamp: {
          id: 'calcutta',
          city: 'CALCUTTA',
          date: '25 OCT 1872',
          label: '加尔各答·东印度总督签注',
          color: 'calcutta'
        },
        flags: {
          boughtElephant: true,
          aoudaRescued: true,
          jungleRampageMaster: rank === 'S'
        },
        comment: isPerfect
          ? '福克：「奇阿尼真乃神象！一路冲撞破壁、灭火救人，提前整整两天赶抵加尔各答码头！」'
          : '福克：「战象勇猛过人，艾娥达夫人已随我们安全抵达成加尔各答。」'
      });
    }, 1200);
  }

  render(ctx) {
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. 远景印度热带雨林水彩油画画卷 (视差无缝循环)
    ctx.save();
    if (this.jungleBgImg && this.jungleBgImg.complete && this.jungleBgImg.naturalWidth > 0) {
      const bgOffset = (this.camera.x * 0.2) % w;
      ctx.drawImage(this.jungleBgImg, -bgOffset, 0, w, h);
      ctx.drawImage(this.jungleBgImg, w - bgOffset, 0, w, h);

      ctx.fillStyle = this.elephant.isFeverMode ? 'rgba(255, 215, 0, 0.12)' : 'rgba(15, 30, 18, 0.2)';
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = '#172818';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();

    this.camera.apply(ctx);

    // 2. 终点：阿拉哈巴德 · 1872 维多利亚凯旋胜利巨拱门原画与盛大红毯狂欢
    const podX = this.goalPodium.x;
    const podY = this.goalPodium.y;
    SpriteEngine.drawAllahabadVictoryGate(ctx, podX - 60, podY - 190, 540, 370, this.elephant.animTime);

    // 3. 热带雨林青苔石道与青翠蕨类草木 (Ground)
    const groundY = this.elephant.baseY + this.elephant.h;
    const earthGrad = ctx.createLinearGradient(0, groundY, 0, 720);
    earthGrad.addColorStop(0, '#2d1f14');
    earthGrad.addColorStop(1, '#140c06');
    ctx.fillStyle = earthGrad;
    ctx.fillRect(-200, groundY, this.trackLength + 800, 720 - groundY);

    ctx.fillStyle = '#214224';
    ctx.fillRect(-200, groundY - 5, this.trackLength + 800, 10);
    ctx.strokeStyle = '#528c63';
    ctx.lineWidth = 2;
    ctx.strokeRect(-200, groundY - 5, this.trackLength + 800, 10);

    // 4. 绘制悬空皇家金币 (Coins)
    for (const c of this.coins) {
      if (!c.collected) {
        ctx.save();
        ctx.fillStyle = '#ffd700';
        ctx.strokeStyle = '#fff0ca';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#8c6d23';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('£', c.x, c.y + 3.5);
        ctx.restore();
      }
    }

    // 5. 绘制低垂热带榕树巨藤原画 (Hanging Vines)
    for (const vine of this.hangingVines) {
      if (!vine.cleared) {
        SpriteEngine.drawBanyanVines(ctx, vine.x, vine.y, vine.w + 15, vine.h + 10, this.elephant.animTime);
      }
    }

    // 6. 绘制古印度神庙雕花石壁原画 (Stone Walls)
    for (const wall of this.stoneWalls) {
      if (!wall.broken) {
        SpriteEngine.drawTempleStoneWall(ctx, wall.x, wall.y, wall.w + 10, wall.h + 5, wall.broken);
      }
    }

    // 7. 绘制古吠陀神火祭坛原画 (Fire Altars)
    for (const fw of this.fireWalls) {
      if (!fw.extinguished) {
        SpriteEngine.drawFireAltar(ctx, fw.x - 5, fw.y - 15, fw.w + 10, fw.h + 20, this.elephant.animTime, fw.extinguished);
      }
    }

    // 8. 绘制萨蒂火祭神庙宝刹现场高潮营救大原画 (Suttee Pagoda Shrine)
    const px = this.templePyre.x;
    const py = this.templePyre.y;
    SpriteEngine.drawSutteePagodaShrine(ctx, px - 60, py - 90, this.templePyre.w + 160, this.templePyre.h + 90, this.elephant.animTime, this.templePyre.smashed);

    // 9. 绘制水炮粒子
    for (const wc of this.waterCannons) {
      ctx.save();
      ctx.fillStyle = '#70e8ff';
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(wc.x, wc.y, wc.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 10. 绘制维多利亚皇家金雕弹簧跳床 (Ornate Victorian Circus Springboard)
    for (const tr of this.trampolines) {
      ctx.save();
      // 地面软阴影
      ctx.fillStyle = 'rgba(15, 10, 5, 0.5)';
      ctx.beginPath();
      ctx.ellipse(tr.x + tr.w / 2, tr.y + 16, tr.w * 0.6, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 双侧黄铜重装螺旋弹簧 (Coiled Brass Springs)
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 3;
      for (const sx of [tr.x + 16, tr.x + tr.w - 16]) {
        ctx.beginPath();
        ctx.moveTo(sx, tr.y + 2);
        ctx.lineTo(sx - 4, tr.y + 6);
        ctx.lineTo(sx + 4, tr.y + 10);
        ctx.lineTo(sx - 4, tr.y + 14);
        ctx.lineTo(sx, tr.y + 18);
        ctx.stroke();
      }

      // 皇家深红丝绒金边垫面 (Crimson Tufted Velvet Pad with Gold Trim)
      const padGrad = ctx.createLinearGradient(tr.x, tr.y, tr.x, tr.y + 12);
      padGrad.addColorStop(0, '#a12323');
      padGrad.addColorStop(0.5, '#731414');
      padGrad.addColorStop(1, '#420808');
      ctx.fillStyle = padGrad;
      ctx.beginPath();
      ctx.roundRect(tr.x, tr.y - 4, tr.w, 12, 4);
      ctx.fill();
      ctx.strokeStyle = '#ffe87c';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 黄金狮爪底座 (Brass Claw Feet)
      ctx.fillStyle = '#b8860b';
      ctx.beginPath();
      ctx.arc(tr.x + 8, tr.y + 16, 5, 0, Math.PI * 2);
      ctx.arc(tr.x + tr.w - 8, tr.y + 16, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffe87c';
      ctx.font = 'bold 11px "Baskerville", serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎪 蹦床', tr.x + tr.w / 2, tr.y + 5);
      ctx.restore();
    }

    for (const s of this.royalStars) {
      if (!s.collected) {
        ctx.save();
        ctx.font = '36px sans-serif';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 24;
        ctx.fillText('⭐', s.x - 18, s.y + 14);
        ctx.restore();
      }
    }

    // 11. 物理碎石渲染
    physicsDebris.render(ctx);

    // 12. 绘制灵动神兽战象奇阿尼 (1872 维多利亚铜版原画)
    ctx.save();
    if (this.elephant.isFeverMode || this.elephant.isCharging) {
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 35;
    }

    const elephantRenderY = this.elephant.isDucking ? this.elephant.y + 25 : this.elephant.y - 30;
    SpriteEngine.drawElephant(
      ctx,
      this.elephant.x - 25,
      elephantRenderY,
      this.elephant.isCharging || this.elephant.isFeverMode,
      this.elephant.animTime,
      0.78 // 黄金轻灵比例
    );

    // 救出艾娥达夫人后，艾娥达坐在象鞍上陪伴！
    if (this.elephant.hasRescuedAouda && this.aoudaImg && this.aoudaImg.complete && this.aoudaImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.elephant.x + 65, elephantRenderY + 20, 18, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.aoudaImg, this.elephant.x + 47, elephantRenderY + 2, 36, 36);
      ctx.restore();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    ctx.restore();

    this.camera.restore(ctx);

    // 13. 顶部 HUD 仪表盘
    this.drawHUD(ctx);
  }

  drawHUD(ctx) {
    const w = this.canvas.width;
    const progress = Math.min(1.0, this.elephant.x / this.goalPodium.x);
    const barW = 500;
    const startX = (w - barW) / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(20, 16, 12, 0.88)';
    ctx.strokeStyle = '#8c6d23';
    ctx.lineWidth = 2;
    ctx.fillRect(startX, 75, barW, 14);
    ctx.strokeRect(startX, 75, barW, 14);

    ctx.fillStyle = this.elephant.isFeverMode ? '#ffd700' : '#50e3c2';
    ctx.fillRect(startX + 2, 77, (barW - 4) * progress, 10);

    ctx.font = '600 13px "Baskerville", serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🐘 柯尔比断轨', startX - 85, 87);
    ctx.fillText('🛕 阿拉哈巴德', startX + barW + 10, 87);

    ctx.font = 'bold 15px "Baskerville", serif';
    ctx.fillStyle = this.timeLimit < 15 ? '#ff4d4d' : '#ffde59';
    ctx.textAlign = 'center';
    ctx.fillText(
      `距离终点: ${this.distanceRemainingMeters} 米  |  冲撞[D/→]  |  跳跃[空格]  |  滑铲[S/↓]  |  水炮[B/K]  |  积分: ${this.elephant.score}`,
      w / 2,
      122
    );
    ctx.restore();
  }
}
