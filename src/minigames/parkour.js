import { MiniGame } from './_base/MiniGame.js';
import { particles } from '../engine/particles.js';
import { SpriteEngine } from '../engine/sprites.js';
import { GameImages } from '../assets/images.js';
import { Camera2D } from '../engine/camera.js';
import { physicsDebris } from '../engine/physics.js';
import { fx } from '../engine/fx.js';

// 关1（大师级大重构）：多佛码头·黑伞滑翔/子弹时间与立体追逐 (Dover Harbor Umbrella Gliding & Steam Chase)
export class ParkourMiniGame extends MiniGame {
  constructor(params) {
    super(params);

    this.camera = new Camera2D(1280, 720);

    this.player = {
      x: 120,
      y: 480,
      vx: 0,
      vy: 0,
      w: 60,
      h: 75,
      baseY: 500,
      isGrounded: true,
      facing: 'right',
      state: 'idle',

      // 绅士黑伞滑翔系统
      isGliding: false,
      glideTimer: 0,
      isSliding: false,
      slideTimer: 0,
      feverMeter: 0,
      isFever: false,
      feverTimer: 0,

      // 动作参数
      jumpHoldTime: 0,
      maxJumpHold: 0.32,
      isJumping: false,
      speed: 400,
      accel: 1500,
      friction: 1300,
      gravity: 1550,
      glideMaxFallSpeed: 85, // 黑伞滑翔时极限缓降下落速度
      animTime: 0,
      coins: 0,
      score: 0,

      // 强力道具
      bulletsRemaining: 5,
      isGiant: false,
      giantTimer: 0
    };

    this.levelWidth = 4500;
    this.timeRemaining = 60.0;

    this.mysteryBlocks = [];
    this.platforms = [];
    this.bouncers = [];
    this.enemies = [];
    this.coins = [];
    this.bullets = [];

    // 菲克斯侦探拦截 BOSS 战
    this.fixBoss = {
      x: 2200,
      y: 320,
      w: 50,
      h: 70,
      defeated: false,
      trapCratesTimer: 2.0
    };

    this.boardingZone = {
      x: 4000,
      gangplankX: 4080,
      gangplankEndX: 4320,
      gangplankTopY: 320,
      boarded: false
    };

    this.fixImg = new Image();
    if (GameImages.fix) this.fixImg.src = GameImages.fix;

    this.mongoliaImg = new Image();
    const mongoliaSrc = GameImages.ss_mongolia || GameImages.ss_mongolia_ship || GameImages.mongolia_ship;
    if (mongoliaSrc) this.mongoliaImg.src = mongoliaSrc;

    this.doverBgImg = new Image();
    const doverSrc = GameImages.dover_bg || GameImages.dover || GameImages.dover_harbor || GameImages.dover_harbor_pier_art;
    if (doverSrc) this.doverBgImg.src = doverSrc;
  }

  init() {
    this.player.x = 120;
    this.player.y = this.player.baseY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.isGrounded = true;
    this.player.isGliding = false;
    this.player.state = 'idle';
    this.player.coins = 0;
    this.player.score = 0;
    this.player.bulletsRemaining = 5;
    this.player.isGiant = false;
    this.player.giantTimer = 0;

    this.timeRemaining = 60.0;
    this.boardingZone.boarded = false;
    this.fixBoss.defeated = false;

    this.mysteryBlocks = [];
    this.platforms = [];
    this.bouncers = [];
    this.enemies = [];
    this.coins = [];
    this.bullets = [];
    physicsDebris.clear();

    this.camera.setWorldBounds(0, this.levelWidth + 500, 0, 720);
    this.camera.follow(this.player.x + 200, 360, true);

    this.input.configureUI({
      showDpad: true,
      showA: true,
      showB: true,
      labelA: '跳跃/伞滑 [A]',
      labelB: '蒸汽火球 [B]'
    });

    this.sound.playSteamWhistle();
    if (this.sound.music) this.sound.music.playTheme('dover');
    this.fx.toast('【双主角协同】[A] 起跳空中长按展开黑伞滑翔！[C] 触发福克怀表子弹时间！[B] 发射蒸汽弹！', 4000);

    this.generateHarborLevel();
  }

  generateHarborLevel() {
    // 问号木箱 [?]
    const blockPlacements = [
      { x: 380, y: 340, type: 'bullet' },
      { x: 440, y: 340, type: 'coin' },
      { x: 500, y: 340, type: 'giant' },
      { x: 920, y: 310, type: 'bullet' },
      { x: 1350, y: 280, type: 'giant' },
      { x: 1410, y: 280, type: 'coin' },
      { x: 1880, y: 260, type: 'bullet' },
      { x: 2550, y: 290, type: 'giant' },
      { x: 3100, y: 270, type: 'bullet' },
      { x: 3600, y: 290, type: 'coin' }
    ];

    blockPlacements.forEach(b => {
      this.mysteryBlocks.push({
        x: b.x,
        y: b.y,
        w: 52,
        h: 52,
        type: b.type,
        hit: false,
        bounceY: 0
      });
    });

    // 多层立体高空栈桥与起重机
    const platformPlacements = [
      { x: 680, y: 360, w: 200, h: 25, label: '吊装货桥' },
      { x: 1100, y: 310, w: 240, h: 25, label: '高空起重桁架' },
      { x: 1600, y: 330, w: 220, h: 25, label: '海关查验台' },
      { x: 2100, y: 280, w: 260, h: 25, label: '菲克斯埋伏吊台' },
      { x: 2750, y: 320, w: 240, h: 25, label: '轮船煤炭栈道' },
      { x: 3350, y: 290, w: 260, h: 25, label: '登船引桥' }
    ];

    platformPlacements.forEach(p => {
      this.platforms.push({ x: p.x, y: p.y, w: p.w, h: p.h, label: p.label });
    });

    // 弹簧踏板
    const bouncers = [580, 1500, 2480, 3200];
    bouncers.forEach(bx => {
      this.bouncers.push({ x: bx, y: this.player.baseY + 30, w: 45, h: 20 });
    });

    // 滚桶敌人
    const enemyPlacements = [800, 1250, 1800, 2600, 3000, 3700];
    enemyPlacements.forEach(ex => {
      this.enemies.push({
        x: ex,
        y: this.player.baseY + 15,
        w: 42,
        h: 42,
        vx: -95,
        alive: true
      });
    });

    // 悬空金币怀表
    for (let x = 250; x < 3900; x += 140) {
      this.coins.push({
        x,
        y: this.player.baseY - 45 - Math.sin(x * 0.04) * 65,
        w: 24,
        h: 24,
        collected: false
      });
    }
  }

  update(rawDt) {
    if (this.boardingZone.boarded) return;

    // 宝玑怀表子弹时间缩放
    const dtScale = (typeof fx !== 'undefined' && fx && fx.getTimeDilation) ? fx.getTimeDilation() : 1.0;
    const dt = Math.max(0.0001, (rawDt || 0.016) * (dtScale || 1.0));

    this.timeRemaining -= dt;
    this.player.animTime += dt;
    physicsDebris.update(dt);

    // 变大状态倒计时
    if (this.player.isGiant) {
      this.player.giantTimer -= dt;
      if (this.player.giantTimer <= 0) {
        this.player.isGiant = false;
        this.fx.toast('变大超频结束', 1200);
      }
    }

    // 1. 触发福克怀表子弹时间 [C 键]
    if (this.input.input.keys['KeyC']) {
      fx.activateBulletTime();
    }

    // 2. 水平控制
    const axis = this.input.input.axis;
    let moveDir = 0;

    if (this.input.input.buttons.left || axis.x < -0.2) {
      moveDir = -1;
      this.player.facing = 'left';
    } else if (this.input.input.buttons.right || axis.x > 0.2) {
      moveDir = 1;
      this.player.facing = 'right';
    }

        // 2.1 贴地滑铲控制 [S / ↓ / 下方向键]
    const downBtn = this.input.input.buttons.down || this.input.input.keys['KeyS'] || this.input.input.keys['ArrowDown'];
    if (downBtn && this.player.isGrounded && Math.abs(this.player.vx) > 80) {
      this.player.isSliding = true;
      this.player.state = 'sliding';
      this.player.h = 45;
      if (Math.random() < 0.4) {
        particles.emitDust(this.player.x + 20, this.player.y + this.player.h, 3);
        particles.emitSparks(this.player.x + 20, this.player.y + this.player.h, 2);
      }
    } else {
      this.player.isSliding = false;
      this.player.h = 75;
    }

    // 2.2 FEVER 狂暴冲刺计时
    if (this.player.isFever) {
      this.player.feverTimer -= dt;
      if (this.player.feverTimer <= 0) {
        this.player.isFever = false;
        this.fx.toast('狂暴冲刺结束', 1000);
      }
    }
    const curMaxSpeed = (this.player.isGiant || this.player.isFever) ? this.player.speed * 1.55 : this.player.speed;
    if (moveDir !== 0) {
      this.player.vx += moveDir * this.player.accel * dt;
      this.player.vx = Math.max(-curMaxSpeed, Math.min(curMaxSpeed, this.player.vx));
      this.player.state = this.player.isGrounded ? 'running' : 'jumping';
    } else {
      if (this.player.vx > 0) {
        this.player.vx = Math.max(0, this.player.vx - this.player.friction * dt);
      } else if (this.player.vx < 0) {
        this.player.vx = Math.min(0, this.player.vx + this.player.friction * dt);
      }
      if (this.player.isGrounded && Math.abs(this.player.vx) < 10) {
        this.player.state = 'idle';
      }
    }

    this.player.x += this.player.vx * dt;
    this.player.x = Math.max(40, Math.min(this.levelWidth + 300, this.player.x));

    // 3. 发射蒸汽火球弹 [B]
    const shootBtn = this.input.input.buttons.justB || this.input.input.buttons.actionB;
    if (shootBtn && this.player.bulletsRemaining > 0) {
      this.player.bulletsRemaining--;
      this.sound.playSteamWhistle();
      this.fx.triggerHaptic(25);
      this.camera.addTrauma(0.15);

      const bulletDir = this.player.facing === 'left' ? -1 : 1;
      this.bullets.push({
        x: this.player.x + (bulletDir > 0 ? 60 : -10),
        y: this.player.y + 30,
        vx: bulletDir * 650,
        vy: -140,
        radius: 12,
        alive: true
      });
      this.fx.addFloatText(this.player.x, this.player.y - 30, `🔥 蒸汽弹 (余 ${this.player.bulletsRemaining})`, '#ffde59');
    }

    // 更新蒸汽弹轨迹
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.vy += 600 * dt;
      b.y += b.vy * dt;

      if (b.y >= this.player.baseY + 40) {
        b.y = this.player.baseY + 40;
        b.vy = -280;
      }

      // 击碎敌人
      for (const e of this.enemies) {
        if (e.alive && Math.hypot(b.x - (e.x + 20), b.y - (e.y + 20)) < 35) {
          e.alive = false;
          b.alive = false;
          this.player.score += 250;
          this.sound.playCrash();
          this.camera.addTrauma(0.3);
          physicsDebris.spawnWoodSplinters(e.x + 20, e.y + 20, 12, 400);
          this.fx.addFloatText(e.x, e.y - 30, '★ 蒸汽弹轰碎！+250', '#ffe87c');
          break;
        }
      }

      // 击中菲克斯 BOSS
      if (!this.fixBoss.defeated && Math.hypot(b.x - (this.fixBoss.x + 25), b.y - (this.fixBoss.y + 35)) < 40) {
        this.fixBoss.defeated = true;
        b.alive = false;
        this.player.score += 500;
        this.sound.playCrash();
        this.camera.addTrauma(0.4);
        this.fx.addFloatText(this.fixBoss.x, this.fixBoss.y - 40, '⚡ 击退菲克斯侦探！+500', '#50e3c2');
        physicsDebris.spawnWoodSplinters(this.fixBoss.x + 20, this.fixBoss.y + 20, 16, 450);
      }

      if (!b.alive || b.x > this.player.x + 800 || b.x < this.player.x - 400) {
        this.bullets.splice(i, 1);
      }
    }

    // 4. 跳跃与【维多利亚黑伞滑翔】
    const jumpBtn = this.input.input.buttons.justA || this.input.input.buttons.up || this.input.input.buttons.actionA;
    const jumpHolding = this.input.input.buttons.A || this.input.input.buttons.up;

    if (jumpBtn && this.player.isGrounded) {
      this.player.vy = -660;
      this.player.isGrounded = false;
      this.player.isJumping = true;
      this.player.jumpHoldTime = 0;
      this.player.state = 'jumping';
      this.sound.playJump();
      this.fx.triggerHaptic(25);
      particles.emitDust(this.player.x + 20, this.player.y + this.player.h, 6);
    }

    if (this.player.isJumping) {
      if (jumpHolding && this.player.jumpHoldTime < this.player.maxJumpHold) {
        this.player.vy -= 400 * dt;
        this.player.jumpHoldTime += dt;
      } else {
        this.player.isJumping = false;
      }
    }

    // 空中长按起跳键触发【黑伞滑翔】
    if (!this.player.isGrounded && this.player.vy > 0 && jumpHolding) {
      this.player.isGliding = true;
      this.player.vy = Math.min(this.player.vy, this.player.glideMaxFallSpeed); // 缓降
      particles.emitSparkles(this.player.x + 25, this.player.y - 10, 1);
    } else {
      this.player.isGliding = false;
    }

    // 重力
    if (!this.player.isGliding) {
      this.player.vy += this.player.gravity * dt;
    }
    this.player.y += this.player.vy * dt;

    // 登船跳板坡度
    let currentGroundY = this.player.baseY;
    if (this.player.x >= this.boardingZone.gangplankX && this.player.x <= this.boardingZone.gangplankEndX) {
      const rampProgress = (this.player.x - this.boardingZone.gangplankX) / (this.boardingZone.gangplankEndX - this.boardingZone.gangplankX);
      currentGroundY = this.player.baseY - rampProgress * (this.player.baseY - this.boardingZone.gangplankTopY);
    }

    // 平台碰撞
    for (const p of this.platforms) {
      if (
        this.player.x + this.player.w * 0.7 > p.x &&
        this.player.x + this.player.w * 0.3 < p.x + p.w &&
        this.player.y + this.player.h >= p.y &&
        this.player.y + this.player.h <= p.y + 25 &&
        this.player.vy >= 0
      ) {
        currentGroundY = p.y - this.player.h;
        break;
      }
    }

    // 问号箱顶部
    for (const mb of this.mysteryBlocks) {
      if (
        this.player.x + this.player.w * 0.7 > mb.x &&
        this.player.x + this.player.w * 0.3 < mb.x + mb.w &&
        this.player.y + this.player.h >= mb.y + mb.bounceY &&
        this.player.y + this.player.h <= mb.y + mb.bounceY + 25 &&
        this.player.vy >= 0
      ) {
        currentGroundY = mb.y + mb.bounceY - this.player.h;
        break;
      }
    }

    if (this.player.y >= currentGroundY) {
      this.player.y = currentGroundY;
      this.player.vy = 0;
      this.player.isGrounded = true;
      this.player.isGliding = false;
      if (this.player.state === 'jumping') {
        this.player.state = Math.abs(this.player.vx) > 10 ? 'running' : 'idle';
      }
    } else {
      this.player.isGrounded = false;
    }

    // 5. 顶撞问号木箱
    for (const mb of this.mysteryBlocks) {
      if (mb.bounceY < 0) {
        mb.bounceY += 60 * dt;
        if (mb.bounceY > 0) mb.bounceY = 0;
      }

      if (
        this.player.vy < 0 &&
        this.player.x + this.player.w * 0.8 > mb.x &&
        this.player.x + this.player.w * 0.2 < mb.x + mb.w &&
        this.player.y <= mb.y + mb.h + 10 &&
        this.player.y >= mb.y
      ) {
        this.player.y = mb.y + mb.h + 1;
        this.player.vy = 120;
        mb.bounceY = -12;
        this.sound.playCardSlam();
        this.camera.addTrauma(0.2);
        this.fx.triggerHaptic(30);

        if (!mb.hit) {
          mb.hit = true;
          this.player.score += 150;
          this.sound.playCoinClink();

          if (mb.type === 'bullet') {
            this.player.bulletsRemaining += 5;
            this.fx.addFloatText(mb.x + mb.w / 2, mb.y - 40, '🔥 获得 5 发蒸汽火球弹！', '#ffde59');
          } else if (mb.type === 'giant') {
            this.player.isGiant = true;
            this.player.giantTimer = 6.0;
            this.sound.playSteamWhistle();
            this.camera.addTrauma(0.35);
            this.fx.addFloatText(mb.x + mb.w / 2, mb.y - 40, '⭐ 黄金超频！变大无敌！', '#50e3c2');
          } else {
            this.player.coins += 1;
            this.timeRemaining += 3.0;
            this.fx.addFloatText(mb.x + mb.w / 2, mb.y - 40, '⏱ 延时 +3s', '#ffde59');
          }
        }
      }
    }

    // 6. 踩踏与碾压
    for (const e of this.enemies) {
      if (e.alive) {
        e.x += e.vx * dt;

        if (this.player.isGiant) {
          if (
            this.player.x + this.player.w > e.x &&
            this.player.x < e.x + e.w &&
            this.player.y + this.player.h > e.y
          ) {
            e.alive = false;
            this.player.score += 300;
            this.sound.playCrash();
            this.camera.addTrauma(0.35);
            physicsDebris.spawnWoodSplinters(e.x + 20, e.y + 20, 14, 450);
            this.fx.addFloatText(e.x, e.y - 30, '★ 无敌碾碎 +300', '#50e3c2');
            continue;
          }
        }

        const isSlideSmash = this.player.isSliding || this.player.isFever;
        const isStomping =
          this.player.vy > 0 &&
          this.player.y + this.player.h >= e.y &&
          this.player.y + this.player.h <= e.y + 30 &&
          this.player.x + this.player.w > e.x &&
          this.player.x < e.x + e.w;

        if (isSlideSmash && Math.abs(this.player.x - e.x) < 55) {
          e.alive = false;
          this.player.score += 250;
          this.player.feverMeter = Math.min(100, this.player.feverMeter + 20);
          this.sound.playCrash();
          this.camera.addTrauma(0.35);
          this.fx.triggerHaptic(40);
          physicsDebris.spawnWoodSplinters(e.x + 20, e.y + 20, 16, 450);
          this.fx.addFloatText(e.x, e.y - 30, '★ 贴地滑铲碎箱！+250', '#50e3c2');
        } else if (isStomping) {
          e.alive = false;
          this.player.vy = -600;
          this.player.score += 200;
          this.sound.playCrash();
          this.camera.addTrauma(0.3);
          this.fx.triggerHaptic(35);
          physicsDebris.spawnWoodSplinters(e.x + 20, e.y + 20, 10, 350);
          this.fx.addFloatText(e.x, e.y - 30, '★ 踩碎滚桶 +200', '#ffde59');
        } else {
          const isColliding =
            this.player.x + this.player.w * 0.8 > e.x &&
            this.player.x + this.player.w * 0.2 < e.x + e.w &&
            this.player.y + this.player.h > e.y + 10 &&
            this.player.y < e.y + e.h;

          if (isColliding) {
            e.alive = false;
            this.timeRemaining -= 2.5;
            this.sound.playCrash();
            this.camera.addTrauma(0.55);
            this.fx.flashRed(240);
            this.fx.addFloatText(this.player.x, this.player.y - 20, '撞击减速 -2.5s', '#ff4d4d');
          }
        }
      }
    }

    // 7. 弹簧跳板
    for (const b of this.bouncers) {
      if (
        this.player.x + this.player.w > b.x &&
        this.player.x < b.x + b.w &&
        this.player.y + this.player.h >= b.y &&
        this.player.y + this.player.h <= b.y + b.h + 20 &&
        this.player.vy >= 0
      ) {
        this.player.vy = -960;
        this.player.isGrounded = false;
        this.player.isJumping = true;
        this.sound.playJump();
        this.camera.addTrauma(0.3);
        this.fx.addFloatText(b.x, b.y - 20, '★ 超级弹射！', '#50e3c2');
        particles.emitSparkles(b.x + 20, b.y, 8);
        break;
      }
    }

    // 8. 金币拾取
    for (const c of this.coins) {
      if (!c.collected) {
        if (
          this.player.x + this.player.w > c.x &&
          this.player.x < c.x + c.w &&
          this.player.y + this.player.h > c.y &&
          this.player.y < c.y + c.h
        ) {
          c.collected = true;
          this.player.coins += 1;
          this.player.score += 50;
          this.player.feverMeter = Math.min(100, this.player.feverMeter + 15);
          if (this.player.feverMeter >= 100 && !this.player.isFever) {
            this.player.isFever = true;
            this.player.feverTimer = 4.0;
            this.player.feverMeter = 0;
            this.sound.playSteamWhistle();
            this.camera.addTrauma(0.4);
            this.fx.addFloatText(this.player.x, this.player.y - 40, '⚡ FEVER 狂暴极速冲刺！', '#ffd700');
          }
          this.sound.playCoinClink();
          particles.emitSparkles(c.x, c.y, 6);
        }
      }
    }

    // 9. 冲上蒙古号跳板实景登船
    if (!this.boardingZone.boarded && this.player.x >= this.boardingZone.gangplankEndX) {
      this.boardingZone.boarded = true;
      this.finishBoardingCinematic();
    }

    this.camera.follow(this.player.x + 160, 360);
    this.camera.update(dt);

    if (this.timeRemaining <= 0) {
      this.failBoarding();
    }
  }

  finishBoardingCinematic() {
    this.sound.playSteamWhistle();
    this.sound.playVictory();
    this.camera.addTrauma(0.4);
    this.fx.addFloatText(this.player.x, 240, '🚢 登上蒙古号班轮！汽笛起锚！', '#ffe87c');

    const isPerfect = this.timeRemaining > 20 && this.player.coins >= 8;

    setTimeout(() => {
      this.complete({
        result: isPerfect ? 'perfect' : 'good',
        score: this.player.score + Math.round(this.timeRemaining * 10),
        baseDays: 7.0,
        daysDelta: isPerfect ? -0.5 : 0,
        moneyDelta: 0,
        stamp: {
          id: 'suez',
          city: 'SUEZ',
          date: '09 OCT 1872',
          label: '苏伊士·领事馆签证',
          color: 'suez'
        },
        flags: { boatMissed: false },
        comment: isPerfect
          ? '福克：「黑伞滑翔与子弹时间完美配合，提前登上蒙古号。路路通，干得漂亮。」'
          : '福克：「虽有波折，但分秒不差，正在计划之中。」'
      });
    }, 1400);
  }

  failBoarding() {
    this.sound.playCrash();
    this.camera.addTrauma(0.6);

    setTimeout(() => {
      this.complete({
        result: 'miss',
        baseDays: 7.0,
        daysDelta: 1.5,
        moneyDelta: 0,
        stamp: {
          id: 'suez',
          city: 'SUEZ',
          date: '10 OCT 1872',
          label: '苏伊士·加急签证',
          color: 'suez'
        },
        flags: { boatMissed: true },
        comment: '未能赶上预定班轮，须做出追赶决策。'
      });
    }, 1000);
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
      ctx.fillText('S.S. MONGOLIA', shipX + 320, shipY + 340);
    }

    // 登船实木长跳板与红地毯 (Gangplank)
    const gpStartX = this.boardingZone.gangplankX;
    const gpStartY = this.player.baseY + this.player.h;
    const gpEndX = this.boardingZone.gangplankEndX;
    const gpEndY = this.boardingZone.gangplankTopY + this.player.h;

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
    ctx.fillText('🚢 蒙古号 · 检票登船跳板', gpStartX + 150, gpEndY + 38);
    ctx.restore();

    // 4. 多佛码头老木栈道地面与海水波光
    this.drawVictorianPier(ctx);

    // 5. 绘制维多利亚铸铁立体桁架平台
    for (const p of this.platforms) {
      this.drawCranePlatform(ctx, p);
    }

    // 6. 绘制菲克斯 BOSS
    if (!this.fixBoss.defeated) {
      ctx.save();
      if (this.fixImg.complete && this.fixImg.naturalWidth > 0) {
        ctx.drawImage(this.fixImg, this.fixBoss.x, this.fixBoss.y, this.fixBoss.w, this.fixBoss.h);
      } else {
        SpriteEngine.drawFixPortrait(ctx, this.fixBoss.x, this.fixBoss.y, 60);
      }
      ctx.fillStyle = '#ff4d4d';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🕵️ 菲克斯截击！(滑铲击飞/蒸汽弹轰击)', this.fixBoss.x + 25, this.fixBoss.y - 14);
      ctx.restore();
    }

    // 7. 绘制维多利亚皇家海关货箱
    for (const mb of this.mysteryBlocks) {
      this.drawVictorianCargoCrate(ctx, mb);
    }

    // 8. 绘制维多利亚重型蒸汽黄铜活塞弹跳机
    for (const b of this.bouncers) {
      this.drawSteamBouncer(ctx, b);
    }

    // 9. 绘制蒸汽火球弹
    for (const b of this.bullets) {
      this.drawSteamBullet(ctx, b);
    }

    // 10. 绘制加固橡木朗姆酒桶敌人
    for (const e of this.enemies) {
      if (e.alive) {
        this.drawOakBarrel(ctx, e);
      }
    }

    // 11. 绘制 3D 自转金镑硬币
    for (const c of this.coins) {
      if (!c.collected) {
        this.drawGoldSovereign(ctx, c);
      }
    }

    // 12. 物理碎片
    physicsDebris.render(ctx);

    // 13. 绘制主角路路通（黑伞滑翔、贴地滑铲与狂暴金光光晕）
    ctx.save();
    if (this.player.isGiant || this.player.isFever) {
      ctx.shadowColor = '#ffe87c';
      ctx.shadowBlur = 28;
    }

    SpriteEngine.drawPassepartoutRunner(
      ctx,
      this.player.x,
      this.player.y,
      this.player.state,
      this.player.animTime,
      this.player.baseY + this.player.h
    );

    // 绘制撑开的维多利亚绅士黑伞
    if (this.player.isGliding) {
      ctx.save();
      ctx.translate(this.player.x + 45, this.player.y - 12);
      ctx.rotate(Math.sin(this.player.animTime * 8) * 0.08);

      // 黑色丝绸伞面
      ctx.fillStyle = '#171717';
      ctx.beginPath();
      ctx.arc(0, 0, 44, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#444444';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 金色伞顶针与中轴伞柄
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -44);
      ctx.lineTo(0, 32);
      ctx.stroke();

      // 弯曲木质握柄
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(-6, 32, 6, 0, Math.PI);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    // 恢复摄像机
    this.camera.restore(ctx);

    // 14. 顶部商业级 HUD 饰板
    this.drawParkourHUD(ctx, w);
  }

  // 绘制真实多佛港口老木栈道与海水波光
  drawVictorianPier(ctx) {
    const groundY = this.player.baseY + this.player.h;

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

  // 绘制维多利亚起重桁架平台
  drawCranePlatform(ctx, p) {
    ctx.save();
    const platGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    platGrad.addColorStop(0, '#4a3222');
    platGrad.addColorStop(1, '#241810');
    ctx.fillStyle = platGrad;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, p.w, p.h);

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x + 15, p.y); ctx.lineTo(p.x + 15, p.y - 120);
    ctx.moveTo(p.x + p.w - 15, p.y); ctx.lineTo(p.x + p.w - 15, p.y - 120);
    ctx.stroke();

    ctx.fillStyle = '#ffe87c';
    ctx.font = 'bold 12px "Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.label, p.x + p.w / 2, p.y + 17);
    ctx.restore();
  }

  // 绘制维多利亚皇家海关货箱
  drawVictorianCargoCrate(ctx, mb) {
    ctx.save();
    const by = mb.y + mb.bounceY;

    ctx.fillStyle = mb.hit ? '#3d2c20' : '#7c4d25';
    ctx.fillRect(mb.x, by, mb.w, mb.h);

    ctx.strokeStyle = mb.hit ? '#5a4637' : '#ffd700';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(mb.x, by, mb.w, mb.h);

    ctx.beginPath();
    ctx.moveTo(mb.x, by); ctx.lineTo(mb.x + mb.w, by + mb.h);
    ctx.moveTo(mb.x + mb.w, by); ctx.lineTo(mb.x, by + mb.h);
    ctx.stroke();

    ctx.fillStyle = mb.hit ? '#554234' : '#1c120c';
    ctx.fillRect(mb.x + 10, by + 12, mb.w - 20, mb.h - 24);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(mb.x + 10, by + 12, mb.w - 20, mb.h - 24);

    ctx.fillStyle = mb.hit ? '#7a6652' : '#ffe87c';
    ctx.font = 'bold 18px "Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.fillText(mb.hit ? '✓' : (mb.type === 'bullet' ? '🔥' : (mb.type === 'giant' ? '⭐' : '£')), mb.x + mb.w / 2, by + 34);
    ctx.restore();
  }

  // 绘制维多利亚重型蒸汽黄铜活塞弹跳机
  drawSteamBouncer(ctx, b) {
    ctx.save();
    ctx.fillStyle = '#261b12';
    ctx.fillRect(b.x, b.y + 8, b.w, b.h - 8);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b.x, b.y + 8, b.w, b.h - 8);

    // 螺旋钢弹簧
    ctx.strokeStyle = '#cfd8dc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let sy = b.y + 8; sy >= b.y; sy -= 2) {
      const sx = b.x + b.w / 2 + Math.sin(sy * 1.8) * (b.w * 0.35);
      if (sy === b.y + 8) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // 顶部红皮压花踏板
    ctx.fillStyle = '#8b1e1e';
    ctx.fillRect(b.x - 4, b.y, b.w + 8, 8);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x - 4, b.y, b.w + 8, 8);
    ctx.restore();
  }

  // 绘制真实加固橡木朗姆酒桶
  drawOakBarrel(ctx, e) {
    ctx.save();
    const cx = e.x + 21;
    const cy = e.y + 21;
    ctx.translate(cx, cy);
    ctx.rotate((e.x * 0.05));

    ctx.fillStyle = '#5c3a21';
    ctx.beginPath();
    ctx.arc(0, 0, 21, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1c1510';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#3e2716';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-21, 0); ctx.lineTo(21, 0);
    ctx.moveTo(0, -21); ctx.lineTo(0, 21);
    ctx.stroke();

    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 绘制 3D 自转金镑硬币
  drawGoldSovereign(ctx, c) {
    ctx.save();
    const cx = c.x + 12;
    const cy = c.y + 12;
    const spin = Math.sin(this.player.animTime * 6 + c.x * 0.1);

    ctx.translate(cx, cy);
    ctx.scale(spin, 1);

    ctx.fillStyle = '#ffde59';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c59b27';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  // 绘制蒸汽火球弹
  drawSteamBullet(ctx, b) {
    ctx.save();
    ctx.fillStyle = '#ffde59';
    ctx.shadowColor = '#ff4d4d';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // 绘制商业级顶部 HUD
  drawParkourHUD(ctx, w) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 10, 6, 0.92)';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2.5;
    ctx.fillRect(20, 16, 460, 56);
    ctx.strokeRect(20, 16, 460, 56);

    ctx.fillStyle = '#ffe87c';
    ctx.font = 'bold 15px "Baskerville", serif';
    ctx.fillText('⏱ 赶船倒计时: ' + Math.max(0, Math.ceil(this.timeRemaining)) + 's  |  🪙 金镑: ' + this.player.coins + '  |  得分: ' + this.player.score, 35, 40);

    // Fever 狂暴能量条
    ctx.fillStyle = '#26180f';
    ctx.fillRect(35, 48, 430, 14);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(35, 48, 430, 14);

    const feverProgress = this.player.isFever ? (this.player.feverTimer / 4.0) : (this.player.feverMeter / 100);
    ctx.fillStyle = this.player.isFever ? '#ffd700' : '#50e3c2';
    ctx.fillRect(36, 49, 428 * feverProgress, 12);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.player.isFever ? '⚡ FEVER 极速狂暴中 ⚡' : 'FEVER 冲刺能量 (碎箱/吃金币积攒)', 250, 58);

    // 快捷键提示栏
    ctx.fillStyle = 'rgba(15, 10, 6, 0.9)';
    ctx.fillRect(w - 380, 16, 360, 42);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(w - 380, 16, 360, 42);

    ctx.fillStyle = '#ffe87c';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎮 [A/空格] 跳跃/伞滑 | [S/↓] 滑铲碎箱 | [B] 蒸汽弹', w - 200, 42);

    ctx.restore();
  }
}
