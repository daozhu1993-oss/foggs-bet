import { MiniGame } from './_base/MiniGame.js';
import { particles } from '../engine/particles.js';
import { SpriteEngine } from '../engine/sprites.js';
import { GameImages } from '../assets/images.js';
import { Camera2D } from '../engine/camera.js';

// 第一关只教两件事：越过货箱、低身穿梁。先练会，再赶船。
export class ParkourMiniGame extends MiniGame {
  constructor(params) {
    super(params);
    this.camera = new Camera2D(1280, 720);
    this.player = {
      x: 120, y: 500, vx: 0, vy: 0, w: 60, h: 75, baseY: 500,
      isGrounded: true, isSliding: false, state: 'running',
      speed: 240, gravity: 1550, animTime: 0, score: 0
    };
    this.levelWidth = 4500;
    this.boardingZone = {
      gangplankX: 4080, gangplankEndX: 4320, gangplankTopY: 320, boarded: false
    };
    this.mongoliaImg = new Image();
    const ship = GameImages.ss_mongolia || GameImages.ss_mongolia_ship || GameImages.mongolia_ship;
    if (ship) this.mongoliaImg.src = ship;
    this.doverBgImg = new Image();
    const dover = GameImages.dover_bg || GameImages.dover || GameImages.dover_harbor || GameImages.dover_harbor_pier_art;
    if (dover) this.doverBgImg.src = dover;
  }

  init() {
    Object.assign(this.player, {
      x: 120, y: 500, vx: 0, vy: 0, h: 75, isGrounded: true,
      isSliding: false, state: 'running', animTime: 0, score: 0
    });
    this.timeRemaining = 24;
    this.boardingZone.boarded = false;
    this.finishDelay = null;
    this.lesson = 0;
    this.lessonWaiting = false;
    this.lessonAttempted = false;
    this.jumpBuffer = 0;
    this.jumpWasHeld = false;
    this.hits = 0;
    this.hitCooldown = 0;
    this.obstacles = [
      { x: 650, y: 520, w: 85, h: 55, type: 'box' },
      { x: 1320, y: 410, w: 145, h: 115, type: 'beam' },
      { x: 2010, y: 505, w: 95, h: 70, type: 'box' },
      { x: 2600, y: 410, w: 150, h: 115, type: 'beam' },
      { x: 3200, y: 515, w: 105, h: 60, type: 'box' },
      { x: 3730, y: 410, w: 135, h: 115, type: 'beam' }
    ];
    this.camera.setWorldBounds(0, this.levelWidth + 500, 0, 720);
    this.camera.follow(640, 360, true);
    this.input.configureUI({ showDpad: false, showA: true, showB: true, labelA: '轻点跳跃', labelB: '按住滑铲' });
    this.sound.playSteamWhistle();
    if (this.sound.music) this.sound.music.playTheme('dover');
  }

  update(dt) {
    if (!this.running || this.paused) return;
    dt = Math.max(0, Math.min(dt || 0, 0.05));
    this.player.animTime += dt;
    if (this.finishDelay !== null) {
      this.finishDelay -= dt;
      if (this.finishDelay <= 0) this.complete(this.boardingResult);
      return;
    }
    const p = this.player;
    const b = this.input.input.buttons;
    const jumpHeld = !!(b.A || b.up);
    const jumpPressed = b.justA || (jumpHeld && !this.jumpWasHeld);
    this.jumpWasHeld = jumpHeld;
    const slide = !!(b.B || b.down);
    const lessonObstacle = this.obstacles[this.lesson];
    if (this.lesson < 2 && !this.lessonAttempted && p.x + p.w > lessonObstacle.x - 75) {
      this.lessonWaiting = true;
    }
    if (this.lessonWaiting) {
      if ((this.lesson === 0 && jumpPressed) || (this.lesson === 1 && slide)) {
        this.lessonWaiting = false;
        this.lessonAttempted = true;
      } else return; // 第一跳与第一处横梁等玩家操作，不消耗赶船时间。
    }

    if (this.lesson >= 2) this.timeRemaining -= dt;
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.jumpBuffer = jumpPressed ? 0.15 : Math.max(0, this.jumpBuffer - dt);
    const previousFoot = p.y + p.h;
    p.isSliding = slide && p.isGrounded;
    p.h = p.isSliding ? 42 : 75;
    p.y = previousFoot - p.h;
    if (this.jumpBuffer > 0 && p.isGrounded && !p.isSliding) {
      p.vy = -780;
      p.isGrounded = false;
      this.jumpBuffer = 0;
      this.sound.playJump();
    }
    p.vx = p.speed;
    p.x += p.vx * dt;
    p.y += p.vy * dt + 0.5 * p.gravity * dt * dt;
    p.vy += p.gravity * dt;
    const ramp = Math.max(0, Math.min(1, (p.x - this.boardingZone.gangplankX) /
      (this.boardingZone.gangplankEndX - this.boardingZone.gangplankX)));
    const floor = 575 - ramp * 180;
    if (p.y + p.h >= floor) {
      p.y = floor - p.h;
      p.vy = 0;
      p.isGrounded = true;
    } else p.isGrounded = false;

    for (const obstacle of this.obstacles) {
      if (obstacle.passed) continue;
      const overlaps = p.x + p.w * 0.8 > obstacle.x && p.x + p.w * 0.2 < obstacle.x + obstacle.w &&
        p.y + p.h > obstacle.y + 4 && p.y < obstacle.y + obstacle.h;
      if (overlaps) {
        if (obstacle.type === 'box' && p.vy >= 0 && previousFoot <= obstacle.y + 8) {
          // 从上方落到货箱上是一次正常落脚，不应算侧面撞击。
          p.y = obstacle.y - p.h;
          p.vy = 0;
          p.isGrounded = true;
          continue;
        }
        p.x = obstacle.x - p.w * 0.8;
        p.vx = 0;
        if (this.lesson < 2 && p.isGrounded) {
          // 练习失误回到提示，只有实际越过障碍才算学会。
          this.lessonWaiting = true;
          this.lessonAttempted = false;
        } else if (this.lesson >= 2 && this.hitCooldown === 0) {
          this.hits++;
          this.timeRemaining -= 1;
          this.hitCooldown = 1;
          this.sound.playCrash();
          this.camera.addTrauma(0.12);
          this.fx.toast(obstacle.type === 'box' ? '货箱挡住了路 · 轻点跳跃' : '横梁太低 · 按住滑铲', 1200);
        }
      }
      if (p.x > obstacle.x + obstacle.w) {
        obstacle.passed = true;
        p.score += 100;
        if (this.lesson < 2 && obstacle === lessonObstacle) {
          this.lesson++;
          this.lessonAttempted = false;
          this.sound.playCoinClink();
          if (this.lesson === 2) this.fx.toast('动作学会了。汽笛响起，还有 24 秒登船！', 2200);
        }
      }
    }
    p.state = p.isSliding ? 'sliding' : (!p.isGrounded ? 'jumping' : 'running');
    this.camera.follow(p.x + 280, 360);
    this.camera.update(dt);
    if (this.timeRemaining <= 0) this.finishBoarding(false);
    else if (p.x >= this.boardingZone.gangplankEndX) this.finishBoarding(true);
  }

  finishBoarding(reached) {
    if (this.finishDelay !== null) return;
    this.boardingZone.boarded = reached;
    this.finishDelay = 1.1;
    const perfect = reached && this.hits === 0;
    if (reached) this.sound.playSteamWhistle();
    else this.sound.playCrash();
    this.boardingResult = {
      result: perfect ? 'perfect' : (reached ? 'good' : 'miss'),
      score: this.player.score + (reached ? Math.round(Math.max(0, this.timeRemaining) * 10) : 0),
      baseDays: 7, daysDelta: reached ? (perfect ? -0.5 : 0) : 1.5, moneyDelta: 0,
      stamp: { id: 'suez', city: 'SUEZ', label: '苏伊士 · 领事馆签证', color: 'suez' },
      flags: { boatMissed: !reached },
      comment: perfect ? '路路通把旅行袋递上跳板时，汽笛才刚响。一路顺畅，为后面的转车留出了半天余地。'
        : reached ? '福克伸手拉住路路通。跳板收起，两个人都在船上。'
          : '跳板已经收起。可以包艇追赶，也可以等候下一班渡轮。'
    };
  }

  destroy() {
    super.destroy();
    if (this.sound.music) this.sound.music.stopTheme();
  }

  render(ctx) {
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. 多佛港海港背景（原画视差绘制）
    if (this.doverBgImg.complete && this.doverBgImg.naturalWidth > 0) {
      const bgOffsetX = -(this.camera.x * 0.25) % w;
      ctx.drawImage(this.doverBgImg, bgOffsetX, 0, w, h);
      if (bgOffsetX < 0) {
        ctx.drawImage(this.doverBgImg, bgOffsetX + w, 0, w, h);
      }
    } else {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 500);
      skyGrad.addColorStop(0, '#151328');
      skyGrad.addColorStop(0.5, '#683022');
      skyGrad.addColorStop(1, '#c46424');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. 摄像机空间渲染
    this.camera.apply(ctx);

    // 3. 终点：维多利亚皇家远洋巨轮【蒙古号 SS MONGOLIA】高精原画与检票登船跳板
    ctx.save();
    const shipX = 3950;
    const shipY = 80;
    const shipW = 1050;
    const shipH = 580;

    if (this.mongoliaImg.complete && this.mongoliaImg.naturalWidth > 0) {
      ctx.drawImage(this.mongoliaImg, shipX, shipY, shipW, shipH);
      if (Math.random() < 0.35) {
        particles.emitSteam(shipX + 370 + Math.random() * 40, shipY + 80, 2);
        particles.emitSteam(shipX + 460 + Math.random() * 40, shipY + 80, 2);
      }
    } else {
      ctx.fillStyle = '#1c1815';
      ctx.beginPath();
      ctx.moveTo(shipX, shipY + 300);
      ctx.lineTo(shipX + 900, shipY + 280);
      ctx.lineTo(shipX + 980, shipY + 180);
      ctx.lineTo(shipX + 1020, shipY + 540);
      ctx.lineTo(shipX, shipY + 540);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#8b1e1e';
      ctx.fillRect(shipX + 360, shipY + 110, 55, 170);
      ctx.fillRect(shipX + 460, shipY + 110, 55, 170);
      ctx.fillStyle = '#ffe87c';
      ctx.font = 'bold 32px "Baskerville", serif';
      ctx.fillText('DOVER · CALAIS', shipX + 320, shipY + 340);
    }

    // 登船实木长跳板与红地毯 (Gangplank)
    const gpStartX = this.boardingZone.gangplankX;
    const gpStartY = 575;
    const gpEndX = this.boardingZone.gangplankEndX;
    const gpEndY = 395;

    // 桥体阴影
    ctx.fillStyle = 'rgba(15, 10, 5, 0.45)';
    ctx.beginPath();
    ctx.moveTo(gpStartX, gpStartY + 10);
    ctx.lineTo(gpEndX, gpEndY + 10);
    ctx.lineTo(gpEndX, 720);
    ctx.lineTo(gpStartX, 720);
    ctx.closePath();
    ctx.fill();

    // 实木甲板跳板斜面
    ctx.strokeStyle = '#4a2f1b';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(gpStartX, gpStartY);
    ctx.lineTo(gpEndX, gpEndY);
    ctx.stroke();

    // 黄金铆钉与红毯
    ctx.strokeStyle = '#8b1e1e';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(gpStartX, gpStartY - 2);
    ctx.lineTo(gpEndX, gpEndY - 2);
    ctx.stroke();

    // 登船检票口金箔牌匾
    ctx.fillStyle = 'rgba(36, 26, 18, 0.95)';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2.5;
    ctx.fillRect(gpStartX + 40, gpEndY + 10, 220, 44);
    ctx.strokeRect(gpStartX + 40, gpEndY + 10, 220, 44);
    ctx.fillStyle = '#ffe87c';
    ctx.font = 'bold 15px "Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.fillText('多佛渡轮 · 登船跳板', gpStartX + 150, gpEndY + 38);
    ctx.restore();

    // 4. 多佛码头老木栈道地面与海水波光
    this.drawVictorianPier(ctx);

    this.drawObstacles(ctx);

    // 13. 绘制主角路路通（黑伞滑翔、贴地滑铲与狂暴金光光晕）
    ctx.save();
    SpriteEngine.drawPassepartoutRunner(
      ctx,
      this.player.x,
      this.player.y,
      this.player.state,
      this.player.animTime,
      575
    );

    ctx.restore();

    // 恢复摄像机
    this.camera.restore(ctx);

    // 14. 顶部商业级 HUD 饰板
    this.drawParkourHUD(ctx, w);
  }

  // 绘制真实多佛港口老木栈道与海水波光
  drawVictorianPier(ctx) {
    const groundY = 575;

    // 海水浪潮
    const waterGrad = ctx.createLinearGradient(0, groundY + 20, 0, 720);
    waterGrad.addColorStop(0, '#102231');
    waterGrad.addColorStop(1, '#08121a');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(-200, groundY + 20, this.levelWidth + 800, 720 - groundY);

    // 厚实老橡木栈道台面
    ctx.fillStyle = '#3a271a';
    ctx.fillRect(-200, groundY, this.levelWidth + 800, 28);
    ctx.strokeStyle = '#5a3d28';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-200, groundY, this.levelWidth + 800, 28);

    // 木板接缝与铁钉
    ctx.strokeStyle = '#26180f';
    ctx.lineWidth = 1.5;
    for (let x = -200; x < this.levelWidth + 800; x += 45) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x, groundY + 28);
      ctx.stroke();
    }

    // 支撑木桩、系缆桩与煤气路灯
    for (let x = -100; x < this.levelWidth + 800; x += 180) {
      ctx.fillStyle = '#241810';
      ctx.fillRect(x, groundY + 28, 22, 180);

      // 黄铜铸铁系缆桩
      ctx.fillStyle = '#1c1815';
      ctx.beginPath();
      ctx.arc(x + 11, groundY - 8, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 复古煤气路灯
      if (x % 360 === 0) {
        ctx.fillStyle = '#17110a';
        ctx.fillRect(x + 8, groundY - 140, 6, 140);

        const coneGrad = ctx.createRadialGradient(x + 11, groundY - 130, 5, x + 11, groundY - 130, 75);
        coneGrad.addColorStop(0, 'rgba(255, 220, 130, 0.45)');
        coneGrad.addColorStop(1, 'rgba(255, 220, 130, 0)');
        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.arc(x + 11, groundY - 130, 75, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffe87c';
        ctx.beginPath();
        ctx.arc(x + 11, groundY - 130, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawParkourHUD(ctx, w) {
    ctx.save();
    ctx.fillStyle = 'rgba(28, 22, 16, 0.93)';
    ctx.fillRect(28, 86, w - 56, 72);
    ctx.fillStyle = '#ebd8b0';
    ctx.textAlign = 'left';
    ctx.font = '600 23px "Baskerville", serif';
    const lesson = this.lesson < 2;
    const message = this.finishDelay !== null
      ? (this.boardingZone.boarded ? '赶上了。两个人都在船上。' : '跳板收起了 · 还有别的办法出发')
      : lesson ? (this.lesson === 0 ? '先试一次跳跃 · 轻点空格 / 触屏 A，越过货箱' : '再试一次滑铲 · 按住 K / 触屏 B，穿过横梁')
        : '跑稳一点。福克在跳板前等你。';
    ctx.fillText(message, 48, 117);
    ctx.font = '17px sans-serif';
    ctx.fillStyle = '#c9b68f';
    ctx.fillText(lesson ? '练习不计时 · 路路通自动向前跑' : '轻点跳跃 · 按住滑铲 · 不必捡任何东西', 48, 143);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ebd8b0';
    ctx.fillText(lesson ? '练习 ' + (this.lesson + 1) + ' / 2' : Math.ceil(Math.max(0, this.timeRemaining)) + ' 秒 · 离港', w - 48, 117);
    ctx.fillStyle = '#544330';
    ctx.fillRect(w - 258, 133, 210, 7);
    ctx.fillStyle = '#c99a54';
    ctx.fillRect(w - 258, 133, 210 * Math.min(1, this.player.x / this.boardingZone.gangplankEndX), 7);
    ctx.restore();
  }

  drawObstacles(ctx) {
    for (const o of this.obstacles) {
      if (o.type === 'box') {
        ctx.fillStyle = '#735033';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeStyle = '#c99a54'; ctx.lineWidth = 3;
        ctx.strokeRect(o.x, o.y, o.w, o.h);
        ctx.beginPath(); ctx.moveTo(o.x + 8, o.y + 8); ctx.lineTo(o.x + o.w - 8, o.y + o.h - 8);
        ctx.moveTo(o.x + o.w - 8, o.y + 8); ctx.lineTo(o.x + 8, o.y + o.h - 8); ctx.stroke();
      } else {
        ctx.fillStyle = '#4d4338';
        ctx.fillRect(o.x, 270, 9, o.y - 270);
        ctx.fillRect(o.x + o.w - 9, 270, 9, o.y - 270);
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle = '#ad8750';
        ctx.fillRect(o.x, o.y + o.h - 10, o.w, 10);
      }
      ctx.fillStyle = '#f1dfbb';
      ctx.textAlign = 'center'; ctx.font = '600 21px sans-serif';
      ctx.fillText(o.type === 'box' ? '↑ 跳' : '↓ 滑铲', o.x + o.w / 2, o.y - 20);
    }
  }
}
