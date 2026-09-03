// 《Fogg 的赌约》· 关6 日本横滨长鼻马戏团 · 道具连击接抛与主仆大重聚 (方案A 经典高能街机重塑典藏版 - 磁力吸附与危险红标版)
import { MiniGame } from './_base/MiniGame.js';
import { particles } from '../engine/particles.js';
import { GameImages } from '../assets/images.js';
import { SpriteEngine } from '../engine/sprites.js';
import { Camera2D } from '../engine/camera.js';
import { physicsDebris } from '../engine/physics.js';

export class CircusAcrobatMiniGame extends MiniGame {
  constructor(params) {
    super(params);

    this.camera = new Camera2D(1280, 720);

    // 三幕式状态机：1: 跑位接道具, 2: 五层叠罗汉, 3: 发现福克与大飞扑, 4: 凯旋结算
    this.act = 1;

    // 路路通角色状态
    this.player = {
      x: 640,
      y: 560,
      vx: 0,
      vy: 0,
      speed: 560,
      facing: 1,
      action: 'idle', // idle, run, jump, slide, balance, pose, dive
      isGrounded: true,
      stunTimer: 0,
      poseTimer: 0
    };

    // 第 1 幕：接道具系统
    this.props = [];
    this.spawnTimer = 0.45;
    this.combo = 0;
    this.applauseLevel = 80;

    // 第 2 幕：叠罗汉平衡系统
    this.balance = 0; // -100 ~ 100
    this.balanceVelocity = 0;
    this.pyramidLevel = 5;
    this.pyramidWobble = 0;
    this.posePromptTimer = 0;
    this.poseSuccessCount = 0;

    // 第 3 幕：主仆重聚大飞扑
    this.foggSpotted = false;
    this.diveProgress = 0;
    this.diveStartX = 640;
    this.diveStartY = 220;
    this.vipX = 1060;
    this.vipY = 510;
    this.pyramidCollapsed = false;

    this.timer = 40.0;
    this.score = 0;
    this.animTime = 0;

    // 樱花雨粒子
    this.sakuraPetals = [];
    for (let i = 0; i < 40; i++) {
      this.sakuraPetals.push({
        x: Math.random() * 1280,
        y: Math.random() * 720,
        size: 5 + Math.random() * 5,
        speedY: 40 + Math.random() * 60,
        speedX: 20 + Math.random() * 40,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 3
      });
    }

    this.circusBgImg = new Image();
    const circusSrc = GameImages.yokohama_kabuki_circus || GameImages.yokohama || GameImages.yokohama_kabuki_circus_art;
    if (circusSrc) this.circusBgImg.src = circusSrc;
  }

  init() {
    this.act = 1;
    this.player.x = 640;
    this.player.y = 560;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.action = 'idle';
    this.player.isGrounded = true;
    this.player.stunTimer = 0;
    this.player.poseTimer = 0;

    this.props = [];
    this.spawnTimer = 0.4;
    this.combo = 0;
    this.applauseLevel = 80;

    this.balance = 0;
    this.balanceVelocity = 0;
    this.pyramidWobble = 0;
    this.posePromptTimer = 1.2;
    this.poseSuccessCount = 0;

    this.foggSpotted = false;
    this.diveProgress = 0;
    this.pyramidCollapsed = false;

    this.timer = 40.0;
    this.score = 0;
    this.animTime = 0;

    this.camera.setWorldBounds(0, 1280, 0, 720);
    this.camera.follow(640, 360, true);

    this.input.configureUI({
      showDpad: true,
      showA: true,
      showB: true,
      labelA: '腾空 / POSE',
      labelB: '冲刺滑铲'
    });

    if (this.sound.music) this.sound.music.playTheme('circus');
    this.fx.toast('【横滨长鼻马戏团】[A/D/←/→] 疾跑长鼻接球（带磁力吸附） | [W/空格/A] 腾空起跳躲避 ⚠️ 红圈香蕉与炸弹！', 5500);
  }

  update(rawDt) {
    if (!this.running || this.paused) return;
    const dt = Math.max(0.0001, rawDt || 0.016);

    this.animTime += dt;
    this.timer -= dt;

    const inp = this.input ? this.input.input : null;
    const keys = inp ? (inp.keys || {}) : {};
    const btns = inp ? (inp.buttons || {}) : {};
    const axis = inp ? (inp.axis || { x: 0, y: 0 }) : { x: 0, y: 0 };
    const pointer = inp ? (inp.pointer || {}) : {};

    // 飘落樱花雨更新
    this.sakuraPetals.forEach(p => {
      p.y += p.speedY * dt;
      p.x += Math.sin(this.animTime * 2 + p.y * 0.01) * 30 * dt + p.speedX * dt;
      p.rot += p.rotSpeed * dt;
      if (p.y > 730) {
        p.y = -15;
        p.x = Math.random() * 1280;
      }
    });

    // 幕次转换判定
    if (this.act === 1 && this.timer <= 26.0) {
      // 进入第 2 幕：五层叠罗汉
      this.act = 2;
      this.player.x = 640;
      this.player.y = 220;
      this.player.action = 'balance';
      this.sound.playSteamWhistle();
      this.fx.toast('🎪 第 2 幕：五层长鼻人梯登场！[←/→] 维持重力平衡，按 [空格/A] 摆出天狗 POSE！', 4500);
    } else if (this.act === 2 && this.timer <= 12.0) {
      // 进入第 3 幕：发现福克先生
      this.act = 3;
      this.foggSpotted = true;
      this.sound.playVictory();
      this.fx.toast('⭐ 探照灯照亮台下贵宾席！发现福克先生与艾娥达夫人！按 [空格/飞扑] 纵身飞越！', 5000);
    }

    // ==================== 第 1 幕：跑位接道具 ====================
    if (this.act === 1) {
      if (this.player.stunTimer > 0) {
        this.player.stunTimer -= dt;
        this.player.action = 'slide';
      } else {
        let moveX = 0;
        if (keys['ArrowLeft'] || keys['KeyA'] || btns.left || axis.x < -0.2) moveX -= 1;
        if (keys['ArrowRight'] || keys['KeyD'] || btns.right || axis.x > 0.2) moveX += 1;

        if (pointer.down) {
          const dx = pointer.x - this.player.x;
          if (Math.abs(dx) > 15) moveX = Math.sign(dx);
        }

        if (moveX !== 0) {
          this.player.x += moveX * this.player.speed * dt;
          this.player.facing = moveX > 0 ? 1 : -1;
          this.player.action = 'run';
        } else {
          this.player.action = 'idle';
        }

        // 起跳 (腾空翻滚无敌)
        if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW'] || btns.justA) && this.player.isGrounded) {
          this.player.vy = -680;
          this.player.isGrounded = false;
          this.player.action = 'jump';
          this.sound.playJump();
        }
      }

      // 重力与跳跃
      if (!this.player.isGrounded) {
        this.player.vy += 1500 * dt;
        this.player.y += this.player.vy * dt;
        if (this.player.y >= 560) {
          this.player.y = 560;
          this.player.vy = 0;
          this.player.isGrounded = true;
        }
      }

      this.player.x = Math.max(120, Math.min(1160, this.player.x));

      // 道具生成
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const pTypes = ['ball', 'fan', 'onigiri', 'coin', 'coin', 'banana', 'firecracker'];
        const randType = pTypes[Math.floor(Math.random() * pTypes.length)];
        this.props.push({
          x: 150 + Math.random() * 980,
          y: -40,
          vy: 220 + Math.random() * 100,
          type: randType,
          radius: 24,
          alive: true
        });
        this.spawnTimer = 0.45 + Math.random() * 0.4;
      }

      // 道具更新、磁力吸附与碰撞
      const noseX = this.player.x + this.player.facing * 35;
      const noseY = this.player.y - 25;

      for (let i = this.props.length - 1; i >= 0; i--) {
        const prop = this.props[i];
        prop.y += prop.vy * dt;

        const isHazard = prop.type === 'banana' || prop.type === 'firecracker';
        const dist = Math.hypot(noseX - prop.x, noseY - prop.y);

        // 磁力吸附 (Magnetic Nose Snatch for good props)
        if (!isHazard && dist < 120 && prop.alive && this.player.stunTimer <= 0) {
          prop.x += (noseX - prop.x) * 4.5 * dt;
          prop.y += (noseY - prop.y) * 4.5 * dt;
        }

        // 接取/碰撞判定 (宽容 48px 范围)
        if (dist < prop.radius + 48 && prop.alive) {
          if (isHazard) {
            // 如果玩家正处于高空起跳腾空状态，则不会触发地面香蕉皮陷阱
            if (this.player.isGrounded && this.player.stunTimer <= 0) {
              prop.alive = false;
              if (prop.type === 'banana') {
                this.player.stunTimer = 1.0;
                this.combo = 0;
                this.sound.playCrash();
                if (this.camera) this.camera.addTrauma(0.3);
                this.fx.addFloatText(this.player.x, this.player.y - 40, '🍌 踩中香蕉皮打滑！', '#ff4d4d');
                this.applauseLevel = Math.max(20, this.applauseLevel - 15);
              } else {
                this.player.stunTimer = 1.2;
                this.combo = 0;
                this.sound.playThunder();
                if (this.camera) this.camera.addTrauma(0.4);
                this.fx.flashRed(120);
                this.fx.addFloatText(this.player.x, this.player.y - 40, '💥 炸弹爆炸！', '#ff4d4d');
                this.applauseLevel = Math.max(20, this.applauseLevel - 20);
              }
            }
          } else if (this.player.stunTimer <= 0) {
            prop.alive = false;
            this.combo++;
            let pts = 150;
            if (prop.type === 'ball') pts = 300;
            else if (prop.type === 'fan') pts = 220;
            else if (prop.type === 'onigiri') pts = 180;
            else if (prop.type === 'coin') pts = 100;

            const comboBonus = Math.min(4, 1 + this.combo * 0.2);
            const totalPts = Math.floor(pts * comboBonus);
            this.score += totalPts;
            this.applauseLevel = Math.min(100, this.applauseLevel + 6);

            this.sound.playCoin();
            particles.emitSparkles(noseX, noseY, 15);
            this.fx.addFloatText(noseX, noseY - 35, '+' + totalPts + ' (Combo x' + this.combo + ')', '#ffd700');
          }
        }

        if (prop.y > 660 || !prop.alive) {
          this.props.splice(i, 1);
        }
      }
    }

    // ==================== 第 2 幕：五层叠罗汉平衡与华丽 POSE ====================
    if (this.act === 2) {
      // 左右平衡力矩微调
      let push = 0;
      if (keys['ArrowLeft'] || keys['KeyA'] || btns.left || axis.x < -0.2) push -= 85;
      if (keys['ArrowRight'] || keys['KeyD'] || btns.right || axis.x > 0.2) push += 85;

      if (pointer.down) {
        if (pointer.x < 640 - 40) push -= 80;
        else if (pointer.x > 640 + 40) push += 80;
      }

      const naturalWobble = Math.sin(this.animTime * 3.0) * 28;
      this.balanceVelocity += (push + naturalWobble) * dt;
      this.balanceVelocity *= 0.94;
      this.balance += this.balanceVelocity * dt;
      this.balance = Math.max(-100, Math.min(100, this.balance));

      this.player.x = 640 + (this.balance / 100) * 160;
      this.player.y = 220 + Math.abs(this.balance / 100) * 15;

      // POSE 提示与触发
      this.posePromptTimer -= dt;
      if (this.posePromptTimer <= 0 && this.player.poseTimer <= 0) {
        this.fx.toast('✨ 黄金时机！按 [空格/A] 摆出【天狗大展翅】压轴 POSE！', 2200);
        this.posePromptTimer = 3.5;
      }

      if ((keys['Space'] || keys['KeyJ'] || btns.justA) && this.player.poseTimer <= 0) {
        if (Math.abs(this.balance) < 55) {
          // 成功摆出华丽 POSE
          this.player.action = 'pose';
          this.player.poseTimer = 1.2;
          this.poseSuccessCount++;
          this.score += 800;
          this.sound.playVictory();
          if (this.camera) this.camera.addTrauma(0.3);
          this.fx.addFloatText(this.player.x, this.player.y - 50, '✨ BRAVO! 完美天狗 POSE! +800', '#ffd700');
          particles.emitSparkles(this.player.x, this.player.y, 35);
        } else {
          this.fx.addFloatText(this.player.x, this.player.y - 40, '⚠️ 摇晃过大！先微调平衡！', '#ff4d4d');
          this.sound.playCrash();
        }
      }

      if (this.player.poseTimer > 0) {
        this.player.poseTimer -= dt;
        if (this.player.poseTimer <= 0) {
          this.player.action = 'balance';
        }
      }
    }

    // ==================== 第 3 幕：主仆重聚大飞扑 ====================
    if (this.act === 3) {
      if (!this.pyramidCollapsed) {
        // 等待玩家按下飞扑按键
        if (keys['Space'] || keys['KeyJ'] || btns.justA || pointer.down) {
          this.pyramidCollapsed = true;
          this.diveProgress = 0;
          this.diveStartX = this.player.x;
          this.diveStartY = this.player.y;
          this.sound.playSteamWhistle();
          this.sound.playVictory();
          if (this.camera) this.camera.addTrauma(0.6);
          this.fx.flashRed(150);
          this.fx.toast('💥 金字塔轰然倒塌！路路通大喊「主人！」纵身大飞扑！', 4000);
          physicsDebris.spawnCoinFountain(640, 500, 30);
        }
      } else {
        // 执行飞扑抛物线动画
        this.diveProgress += dt * 1.1;
        this.player.action = 'dive';
        this.player.facing = 1;

        const t = Math.min(1.0, this.diveProgress);
        // 抛物线高飞
        this.player.x = this.diveStartX + (this.vipX - this.diveStartX) * t;
        const peakY = Math.min(this.diveStartY, this.vipY) - 140;
        this.player.y = (1 - t) * (1 - t) * this.diveStartY + 2 * (1 - t) * t * peakY + t * t * this.vipY;

        particles.emitSparkles(this.player.x, this.player.y, 3);

        if (t >= 1.0) {
          // 扑入怀中，胜利完成
          this.act = 4;
          this.sound.playVictory();
          this.fx.addFloatText(this.vipX, this.vipY - 60, '❤️ 福克先生！我终于找到您了！', '#ffd700');
          physicsDebris.spawnCoinFountain(this.vipX, this.vipY, 40);
          setTimeout(() => this.finishGame(), 1500);
        }
      }
    }

    if (this.timer <= 0 && this.act < 4) {
      this.finishGame();
    }
  }

  finishGame() {
    this.running = false;
    const isSuccess = this.act >= 3 || this.score > 2000;
    const rank = this.act === 4 && this.score > 3500 ? 'S' : (isSuccess ? 'A' : 'B');
    const daysDelta = rank === 'S' ? -0.5 : 0;

    this.sound.playVictory();

    setTimeout(() => {
      this.complete({
        result: isSuccess ? 'perfect' : 'good',
        rank,
        score: this.score + 1500,
        daysDelta,
        moneyDelta: 0,
        flags: { circusReunited: true, passedYokohamaCircus: true },
        comment: '让·路路通：「福克先生！艾娥达夫人！我可算把你们给盼来了！我们这就上格兰特将军号，横渡太平洋！」'
      });
    }, 1000);
  }

  render(ctx) {
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. 实景日本横滨明治长鼻天狗歌舞伎马戏大帐原画背景
    if (this.circusBgImg && this.circusBgImg.complete && this.circusBgImg.naturalWidth > 0) {
      ctx.drawImage(this.circusBgImg, 0, 0, w, h);
      ctx.fillStyle = 'rgba(15, 6, 12, 0.4)';
      ctx.fillRect(0, 0, w, h);
    } else {
      const tentGrad = ctx.createLinearGradient(0, 0, 0, h);
      tentGrad.addColorStop(0, '#1f0d14');
      tentGrad.addColorStop(0.5, '#3b1722');
      tentGrad.addColorStop(1, '#14080d');
      ctx.fillStyle = tentGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. 舞台高亮追光灯束 (Theatrical Spotlight)
    const spotTargetX = this.act === 3 && !this.pyramidCollapsed ? this.player.x : (this.act >= 3 ? this.vipX : this.player.x);
    const spotTargetY = this.act === 3 && !this.pyramidCollapsed ? this.player.y : (this.act >= 3 ? this.vipY : this.player.y);

    const spotGrad = ctx.createRadialGradient(spotTargetX, spotTargetY, 20, spotTargetX, spotTargetY, 220);
    spotGrad.addColorStop(0, 'rgba(255, 240, 180, 0.45)');
    spotGrad.addColorStop(0.6, 'rgba(255, 215, 0, 0.12)');
    spotGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = spotGrad;
    ctx.beginPath();
    ctx.arc(spotTargetX, spotTargetY, 220, 0, Math.PI * 2);
    ctx.fill();

    // 3. 绘制台下 VIP 贵宾包厢 (Mr. Fogg & Mrs. Aouda)
    SpriteEngine.drawVIPAudienceBox(ctx, this.vipX, this.vipY, this.act >= 3, this.animTime);

    // 4. 绘制舞台木质基座
    ctx.fillStyle = '#4a2810';
    ctx.fillRect(100, 580, w - 200, 45);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.strokeRect(100, 580, w - 200, 45);

    // 5. 第 1 幕：绘制抛落道具 (Props)
    if (this.act === 1) {
      for (const prop of this.props) {
        if (prop.alive) {
          SpriteEngine.drawCircusPropItem(ctx, prop.x, prop.y, prop.type, this.animTime);
        }
      }
    }

    // 6. 第 2 & 3 幕：绘制五层叠罗汉长鼻人梯 (5-Tier Human Pyramid)
    if (this.act >= 2 && !this.pyramidCollapsed) {
      ctx.save();
      ctx.translate(640, 580);
      const tilt = (this.balance / 100) * 0.35;
      ctx.rotate(tilt);

      for (let lvl = 1; lvl <= 4; lvl++) {
        const count = 5 - lvl;
        const ly = -lvl * 75;
        for (let c = 0; c < count; c++) {
          const cx = (c - (count - 1) / 2) * 65;
          SpriteEngine.drawTenguAcrobat(ctx, cx, ly, 105, 105, (c % 2 === 0 ? 0.05 : -0.05));
        }
      }
      ctx.restore();
    } else if (this.pyramidCollapsed) {
      // 绘制倒塌的杂技演员向两侧滑稽四散
      ctx.save();
      ctx.translate(640, 580);
      for (let i = -3; i <= 3; i++) {
        const rx = i * 75 + Math.sin(this.animTime * 10 + i) * 15;
        SpriteEngine.drawTenguAcrobat(ctx, rx, -15, 95, 95, i * 0.4);
      }
      ctx.restore();
    }

    // 7. 绘制主角路路通天狗演员
    const playerTilt = this.act === 2 ? (this.balance / 100) * 0.45 : 0;
    SpriteEngine.drawPassepartoutTenguAcrobat(
      ctx,
      this.player.x,
      this.player.y,
      this.animTime,
      this.player.action,
      this.player.facing,
      playerTilt
    );

    // 8. 绘制飘落樱花雨
    ctx.fillStyle = 'rgba(255, 183, 197, 0.75)';
    this.sakuraPetals.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 9. 顶部 HUD
    this.drawCircusHUD(ctx);
  }

  drawCircusHUD(ctx) {
    const w = this.canvas.width;
    ctx.save();

    // 顶部莳绘黑金控制面板
    ctx.fillStyle = 'rgba(18, 8, 12, 0.92)';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.fillRect(120, 15, w - 240, 52);
    ctx.strokeRect(120, 15, w - 240, 52);

    // 幕次指示
    ctx.fillStyle = '#ffd700';
    ctx.font = '900 16px "Baskerville", serif';
    ctx.textAlign = 'left';
    const actNames = [
      '',
      '第 1 幕：长鼻接球连击',
      '第 2 幕：五层高空叠罗汉',
      '第 3 幕：主仆重聚大飞扑！',
      '终幕：重聚凯旋登船！'
    ];
    ctx.fillText('🎭 ' + actNames[this.act], 145, 46);

    // 平衡指示条 (第 2 幕)
    if (this.act === 2) {
      const barX = 460;
      const barW = 240;
      ctx.fillStyle = '#2b151e';
      ctx.fillRect(barX, 28, barW, 16);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(barX, 28, barW, 16);

      // 安全中区 (更宽更友好的绿色安全区)
      ctx.fillStyle = 'rgba(80, 227, 194, 0.45)';
      ctx.fillRect(barX + barW / 2 - 45, 29, 90, 14);

      const cursorX = barX + barW / 2 + (this.balance / 100) * (barW / 2 - 10);
      ctx.fillStyle = Math.abs(this.balance) > 55 ? '#ff4d4d' : '#50e3c2';
      ctx.beginPath();
      ctx.arc(cursorX, 36, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      if (Math.abs(this.balance) < 55) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✨ 按 [空格/A] 摆 POSE!', barX + barW / 2, 60);
      }
    } else if (this.act === 1) {
      ctx.fillStyle = '#ff4d4d';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('🔥 COMBO x' + this.combo + ' (避开 ⚠️ 危险红圈)', 430, 46);
    } else if (this.act === 3) {
      ctx.fillStyle = '#50e3c2';
      ctx.font = '900 14px sans-serif';
      ctx.fillText('👉 按 [空格 / 触屏] 飞扑向福克先生！', 430, 46);
    }

    // 战绩得分与倒计时
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffe87c';
    ctx.font = '900 15px "Baskerville", serif';
    ctx.fillText('🏆 ' + this.score + ' PTS | ⏱️ ' + Math.ceil(this.timer) + 's', w - 145, 46);

    ctx.restore();
  }
}
