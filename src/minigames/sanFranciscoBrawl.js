// 《Fogg 的赌约》· 关7 旧金山选战大决斗 (仿 Spine 骨骼动力学 1v1 街霸/拳皇街机格斗 · 丝滑输入缓冲与一键大招取消连段典藏版)
import { MiniGame } from './_base/MiniGame.js';
import { particles } from '../engine/particles.js';
import { physicsDebris } from '../engine/physics.js';
import { SpriteEngine } from '../engine/sprites.js';
import { GameImages } from '../assets/images.js';
import { Camera2D } from '../engine/camera.js';

export class SanFranciscoBrawlMiniGame extends MiniGame {
  constructor(params) {
    super(params);

    this.camera = new Camera2D(1280, 720);

    // 格斗状态机：intro (Round 1 Fight), fight (对决中), ko (终结慢动作), victory (登车结算)
    this.gameState = 'intro';
    this.introTimer = 1.6;
    this.koTimer = 0;

    // P1: 让·路路通 (Passepartout - Savate Fighter)
    this.p1 = {
      x: 360,
      y: 540,
      baseY: 540,
      vx: 0,
      vy: 0,
      isGrounded: true,
      facing: 1,
      health: 100,
      maxHealth: 100,
      exGauge: 75,
      action: 'idle', // idle, walk, guard, punch, kick, rising_kick, hit, knockdown, super
      actionDuration: 0.16,
      actionTimer: 0,
      cancelable: true,
      comboCount: 0,
      comboTimer: 0,
      invulnerableTimer: 0,
      hitFlashTimer: 0,
      afterImages: []
    };

    // P2 / Boss: 斯坦普·普罗克托上校 (Colonel Stamp Proctor)
    this.p2 = {
      x: 920,
      y: 540,
      baseY: 540,
      vx: 0,
      vy: 0,
      isGrounded: true,
      facing: -1,
      health: 1000,
      maxHealth: 1000,
      action: 'idle', // idle, walk, guard, punch, charge, shoot, hit, knockdown
      actionDuration: 0.35,
      actionTimer: 0,
      aiTimer: 0.4,
      attackCooldown: 1.0,
      invulnerableTimer: 0,
      hitFlashTimer: 0,
      hatOffset: { x: 0, y: -80, vx: 0, vy: 0, rot: 0 }
    };

    // 输入缓冲队列 (8 帧 / 0.15s 预输入缓存)
    this.inputBuffer = [];

    // 飞行道具 (左轮子弹/掀桌地波)
    this.projectiles = [];

    // 终幕：太平洋大铁路列车驶来
    this.trainX = 1400;

    this.timer = 99.0;
    this.animTime = 0;
    this.hitStopTimer = 0;

    this.saloonBgImg = new Image();
    const saloonSrc = GameImages.ftg_saloon_stage || GameImages.san_francisco_saloon || GameImages.sanfrancisco || GameImages.san_francisco_saloon_art;
    if (saloonSrc) this.saloonBgImg.src = saloonSrc;
  }

  init() {
    this.gameState = 'intro';
    this.introTimer = 1.6;
    this.koTimer = 0;
    this.hitStopTimer = 0;
    this.inputBuffer = [];

    // 重置 P1
    this.p1.x = 360;
    this.p1.y = 540;
    this.p1.vx = 0;
    this.p1.vy = 0;
    this.p1.isGrounded = true;
    this.p1.facing = 1;
    this.p1.health = 100;
    this.p1.exGauge = 75;
    this.p1.action = 'idle';
    this.p1.actionDuration = 0.16;
    this.p1.actionTimer = 0;
    this.p1.cancelable = true;
    this.p1.comboCount = 0;
    this.p1.comboTimer = 0;
    this.p1.invulnerableTimer = 0;
    this.p1.hitFlashTimer = 0;
    this.p1.afterImages = [];

    // 重置 P2
    this.p2.x = 920;
    this.p2.y = 540;
    this.p2.vx = 0;
    this.p2.vy = 0;
    this.p2.isGrounded = true;
    this.p2.facing = -1;
    this.p2.health = 1000;
    this.p2.maxHealth = 1000;
    this.p2.action = 'idle';
    this.p2.actionDuration = 0.35;
    this.p2.actionTimer = 0;
    this.p2.aiTimer = 0.4;
    this.p2.attackCooldown = 1.0;
    this.p2.invulnerableTimer = 0;
    this.p2.hitFlashTimer = 0;
    this.p2.hatOffset = { x: 0, y: -80, vx: 0, vy: 0, rot: 0 };

    this.projectiles = [];
    this.trainX = 1400;
    this.timer = 99.0;
    this.animTime = 0;

    this.camera.setWorldBounds(0, 1280, 0, 720);
    this.camera.follow(640, 360, true);

    this.input.configureUI({
      showDpad: true,
      showA: true,
      showB: true,
      labelA: '刺拳 [J]',
      labelB: '重踢 [K]'
    });

    if (this.sound.music) this.sound.music.playTheme('brawl');
    this.sound.playSteamWhistle();
    this.fx.toast('【仿 Spine 极速流畅格斗】[J] 刺拳 ➔ [K] 重踢 ➔ [W+J] 升龙 ➔ [Q/B/U/I/O] 一键超必杀取消连段！', 6000);
  }

  queueInput(cmd) {
    this.inputBuffer.push({ cmd, time: 0.16 });
  }

  update(rawDt) {
    if (!this.running || this.paused) return;
    const dt = Math.max(0.0001, rawDt || 0.016);

    // Hit-stop 受击定帧
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
      return;
    }

    this.animTime += dt;

    // 衰减输入缓冲
    for (let i = this.inputBuffer.length - 1; i >= 0; i--) {
      this.inputBuffer[i].time -= dt;
      if (this.inputBuffer[i].time <= 0) this.inputBuffer.splice(i, 1);
    }

    // 衰减残影
    for (let i = this.p1.afterImages.length - 1; i >= 0; i--) {
      this.p1.afterImages[i].alpha -= dt * 4;
      if (this.p1.afterImages[i].alpha <= 0) this.p1.afterImages.splice(i, 1);
    }

    // 开场倒计时
    if (this.gameState === 'intro') {
      this.introTimer -= dt;
      if (this.introTimer <= 0) {
        this.gameState = 'fight';
        this.sound.playCrash();
        if (this.camera) this.camera.addTrauma(0.35);
      }
      return;
    }

    // 终结 KO 慢动作与帽子抛物线物理
    if (this.gameState === 'ko') {
      this.koTimer += dt;
      if (this.p2.hatOffset) {
        this.p2.hatOffset.x += this.p2.hatOffset.vx * dt;
        this.p2.hatOffset.y += this.p2.hatOffset.vy * dt;
        this.p2.hatOffset.vy += 800 * dt;
        this.p2.hatOffset.rot += 12 * dt;
        if (this.p2.hatOffset.y >= 50) {
          this.p2.hatOffset.y = 50;
          this.p2.hatOffset.vy = 0;
          this.p2.hatOffset.vx = 0;
        }
      }

      if (this.koTimer > 2.0) {
        this.gameState = 'victory';
        this.sound.playVictory();
        this.sound.playSteamWhistle();
        this.fx.toast('🚂 汽笛长鸣！普罗克托上校彻底折服！全员飞身跃上太平洋大铁路列车！', 4500);
      }
      return;
    }

    if (this.gameState === 'victory') {
      this.trainX -= 300 * dt;
      if (this.trainX <= 640) {
        this.finishGame();
      }
      return;
    }

    // 格斗进行中 (Fight Active)
    this.timer -= dt;

    if (this.p1.invulnerableTimer > 0) this.p1.invulnerableTimer -= dt;
    if (this.p1.hitFlashTimer > 0) this.p1.hitFlashTimer -= dt;
    if (this.p2.invulnerableTimer > 0) this.p2.invulnerableTimer -= dt;
    if (this.p2.hitFlashTimer > 0) this.p2.hitFlashTimer -= dt;

    if (this.p1.comboTimer > 0) {
      this.p1.comboTimer -= dt;
      if (this.p1.comboTimer <= 0) this.p1.comboCount = 0;
    }

    const inp = this.input ? this.input.input : null;
    const keys = inp ? (inp.keys || {}) : {};
    const btns = inp ? (inp.buttons || {}) : {};
    const axis = inp ? (inp.axis || { x: 0, y: 0 }) : { x: 0, y: 0 };
    const pointer = inp ? (inp.pointer || {}) : {};

    // 自动朝向
    this.p1.facing = this.p2.x >= this.p1.x ? 1 : -1;
    this.p2.facing = this.p1.x >= this.p2.x ? 1 : -1;

    // 1. 采集按键压入缓冲
    if (keys['KeyQ'] || keys['KeyB'] || keys['KeyU'] || keys['KeyI'] || keys['KeyO'] || keys['Digit4'] || keys['Digit5'] || keys['Digit6'] || (keys['KeyJ'] && keys['KeyK'])) {
      this.queueInput('super');
      keys['KeyQ'] = false;
      keys['KeyB'] = false;
      keys['KeyU'] = false;
      keys['KeyI'] = false;
      keys['KeyO'] = false;
    }
    if ((keys['KeyW'] || keys['ArrowUp'] || btns.up) && (keys['KeyJ'] || keys['Space'] || btns.justA)) {
      this.queueInput('rising_kick');
      keys['KeyJ'] = false;
      keys['Space'] = false;
    }
    if (keys['KeyK'] || btns.justB || keys['KeyL']) {
      this.queueInput('kick');
      keys['KeyK'] = false;
      keys['KeyL'] = false;
    }
    if (keys['KeyJ'] || keys['Space'] || btns.justA) {
      this.queueInput('punch');
      keys['KeyJ'] = false;
      keys['Space'] = false;
    }

    // 2. 状态机与动画帧更新
    if (this.p1.actionTimer > 0) {
      this.p1.actionTimer -= dt;
      if (this.p1.actionTimer <= 0.08) {
        this.p1.cancelable = true;
      }
      if (this.p1.actionTimer <= 0) {
        this.p1.action = 'idle';
        this.p1.cancelable = true;
      }
    }

    // 重力与跳跃
    if (!this.p1.isGrounded) {
      this.p1.vy += 1600 * dt;
      this.p1.y += this.p1.vy * dt;
      if (this.p1.y >= this.p1.baseY) {
        this.p1.y = this.p1.baseY;
        this.p1.vy = 0;
        this.p1.isGrounded = true;
        if (this.p1.action === 'rising_kick') {
          this.p1.action = 'idle';
          this.p1.cancelable = true;
        }
      }
    }

    // 3. 处理输入缓冲中的指令技
    if (this.p1.cancelable || this.p1.action === 'idle' || this.p1.action === 'walk' || this.p1.action === 'guard') {
      const superIdx = this.inputBuffer.findIndex(b => b.cmd === 'super');
      const risingIdx = this.inputBuffer.findIndex(b => b.cmd === 'rising_kick');
      const kickIdx = this.inputBuffer.findIndex(b => b.cmd === 'kick');
      const punchIdx = this.inputBuffer.findIndex(b => b.cmd === 'punch');

      if (superIdx >= 0 && this.p1.exGauge >= 50) {
        this.inputBuffer.splice(superIdx, 1);
        this.executeP1Super();
      } else if (risingIdx >= 0 && this.p1.isGrounded) {
        this.inputBuffer.splice(risingIdx, 1);
        this.executeP1RisingKick();
      } else if (kickIdx >= 0) {
        this.inputBuffer.splice(kickIdx, 1);
        this.executeP1Kick();
      } else if (punchIdx >= 0) {
        this.inputBuffer.splice(punchIdx, 1);
        this.executeP1Punch();
      }
    }

    // 4. 行走与防御控制
    if (this.p1.action === 'idle' || this.p1.action === 'walk' || this.p1.action === 'guard') {
      let moveDir = 0;
      if (keys['ArrowLeft'] || keys['KeyA'] || btns.left || axis.x < -0.2) moveDir -= 1;
      if (keys['ArrowRight'] || keys['KeyD'] || btns.right || axis.x > 0.2) moveDir += 1;

      if (pointer.down) {
        if (pointer.x >= 110 && pointer.x <= 410 && pointer.y >= 630 && pointer.y <= 700) {
          if (this.p1.exGauge >= 50) this.executeP1Super();
        } else {
          const dx = pointer.x - this.p1.x;
          if (Math.abs(dx) > 30) moveDir = Math.sign(dx);
        }
      }

      const isRetreating = (moveDir === -1 && this.p1.facing === 1) || (moveDir === 1 && this.p1.facing === -1);

      if (isRetreating) {
        this.p1.action = 'guard';
        this.p1.x += moveDir * 200 * dt;
      } else if (moveDir !== 0) {
        this.p1.action = 'walk';
        this.p1.x += moveDir * 420 * dt;
        // 跑步留残影
        if (Math.random() < 0.2) {
          this.p1.afterImages.push({ x: this.p1.x, y: this.p1.y, facing: this.p1.facing, alpha: 0.6 });
        }
      } else {
        this.p1.action = 'idle';
      }

      if ((keys['ArrowUp'] || keys['KeyW'] || btns.up) && this.p1.isGrounded && this.p1.action !== 'rising_kick') {
        this.p1.vy = -640;
        this.p1.isGrounded = false;
        this.sound.playJump();
      }
    }

    // 边界与推挤
    this.p1.x = Math.max(120, Math.min(1160, this.p1.x));
    this.p2.x = Math.max(120, Math.min(1160, this.p2.x));

    if (Math.abs(this.p1.x - this.p2.x) < 70) {
      const push = (70 - Math.abs(this.p1.x - this.p2.x)) / 2;
      this.p1.x -= this.p1.facing * push;
      this.p2.x += this.p1.facing * push;
    }

    // ==================== 5. P2 / Boss AI 行动与招式 ====================
    this.updateP2BossAI(dt);

    // ==================== 6. 飞行投掷物物理更新 ====================
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;

      if (Math.abs(p.x - this.p1.x) < 40 && Math.abs(p.y - this.p1.y) < 55 && this.p1.invulnerableTimer <= 0) {
        p.alive = false;
        const isGuarding = this.p1.action === 'guard';
        const dmg = isGuarding ? p.power * 0.15 : p.power;

        this.p1.health -= dmg;
        this.p1.hitFlashTimer = 0.1;
        this.p1.exGauge = Math.min(100, this.p1.exGauge + 10);

        if (isGuarding) {
          this.sound.playCrash();
          particles.emitSparkles(this.p1.x + 25, this.p1.y - 20, 10);
          this.fx.addFloatText(this.p1.x, this.p1.y - 40, '🛡️ GUARD! -' + Math.ceil(dmg), '#50e3c2');
        } else {
          this.p1.action = 'hit';
          this.p1.actionDuration = 0.22;
          this.p1.actionTimer = 0.22;
          this.p1.cancelable = true;
          this.sound.playCrash();
          if (this.camera) this.camera.addTrauma(0.3);
          this.fx.flashRed(120);
          this.fx.addFloatText(this.p1.x, this.p1.y - 40, '⚠️ 枪击命中! -' + Math.ceil(dmg), '#ff4d4d');
        }

        if (this.p1.health <= 0) {
          this.triggerKO('p2');
        }
      }

      if (p.x < -30 || p.x > 1310 || !p.alive) {
        this.projectiles.splice(i, 1);
      }
    }

    if (this.timer <= 0 && this.gameState === 'fight') {
      this.triggerKO(this.p1.health >= this.p2.health / 10 ? 'p1' : 'p2');
    }
  }

  executeP1Punch() {
    this.p1.action = 'punch';
    this.p1.actionDuration = 0.16;
    this.p1.actionTimer = 0.16;
    this.p1.cancelable = true;
    this.sound.playWhoosh();
    this.checkP1Hit(28, 105, false, '🥊 刺拳! +28');
  }

  executeP1Kick() {
    this.p1.action = 'kick';
    this.p1.actionDuration = 0.24;
    this.p1.actionTimer = 0.24;
    this.p1.cancelable = true;
    this.sound.playCrash();
    this.checkP1Hit(55, 125, true, '💥 萨瓦特重踢! +55');
  }

  executeP1RisingKick() {
    this.p1.action = 'rising_kick';
    this.p1.actionDuration = 0.55;
    this.p1.actionTimer = 0.55;
    this.p1.cancelable = true;
    this.p1.vy = -720;
    this.p1.isGrounded = false;
    this.p1.invulnerableTimer = 0.35;

    // 升龙残影
    for (let i = 0; i < 3; i++) {
      this.p1.afterImages.push({ x: this.p1.x - i * 15 * this.p1.facing, y: this.p1.y + i * 20, facing: this.p1.facing, alpha: 0.8 });
    }

    this.sound.playThunder();
    if (this.camera) this.camera.addTrauma(0.4);
    this.checkP1Hit(120, 135, true, '⚡ 萨瓦特·旋风升龙! +120');
  }

  executeP1Super() {
    if (this.p1.exGauge < 50) {
      this.fx.toast('⚠️ EX 能量不足！连续命中与格挡可快速积攒能量！', 1500);
      return;
    }

    this.p1.exGauge = Math.max(0, this.p1.exGauge - 50);
    this.p1.action = 'super';
    this.p1.actionDuration = 1.0;
    this.p1.actionTimer = 1.0;
    this.p1.cancelable = false;
    this.p1.invulnerableTimer = 1.2;
    this.hitStopTimer = 0.25;

    // 闪现前冲多重残影
    for (let i = 0; i < 5; i++) {
      this.p1.afterImages.push({ x: this.p1.x + (i * 30 * this.p1.facing), y: this.p1.y, facing: this.p1.facing, alpha: 0.9 });
    }

    this.sound.playThunder();
    this.sound.playSteamWhistle();
    if (this.camera) this.camera.addTrauma(0.7);
    this.fx.flashRed(200);

    this.p1.x = this.p2.x - this.p1.facing * 75;

    this.checkP1Hit(320, 160, true, '🌟 MAX SUPER: 绅士暴风连打! -320');
    this.fx.toast('🔥 超必杀技！【维多利亚绅士暴风连打】爆发！', 3000);
    particles.emitSparkles(this.p1.x, this.p1.y - 40, 45);
  }

  checkP1Hit(rawDmg, reach, isHeavy = false, label = '') {
    const dist = (this.p2.x - this.p1.x) * this.p1.facing;

    if (dist > -20 && dist < reach && this.p2.invulnerableTimer <= 0) {
      const isP2Guarding = this.p2.action === 'guard';
      const dmg = isP2Guarding ? rawDmg * 0.18 : rawDmg;

      this.p2.hp = Math.max(0, this.p2.health - dmg);
      this.p2.health = this.p2.hp;
      this.p2.hitFlashTimer = 0.12;
      this.hitStopTimer = isHeavy ? 0.06 : 0.03;

      this.p1.exGauge = Math.min(100, this.p1.exGauge + (isHeavy ? 25 : 18));
      this.p1.comboCount++;
      this.p1.comboTimer = 1.5;
      this.p1.cancelable = true;

      if (isP2Guarding) {
        this.sound.playCrash();
        particles.emitSparkles(this.p2.x, this.p2.y - 25, 12);
        this.fx.addFloatText(this.p2.x, this.p2.y - 50, '🛡️ GUARD! -' + Math.ceil(dmg), '#50e3c2');
      } else {
        this.p2.action = isHeavy ? 'knockdown' : 'hit';
        this.p2.actionDuration = isHeavy ? 0.4 : 0.2;
        this.p2.actionTimer = isHeavy ? 0.4 : 0.2;
        this.sound.playCrash();
        particles.emitSparkles(this.p2.x, this.p2.y - 30, isHeavy ? 28 : 14);
        if (this.camera) this.camera.addTrauma(isHeavy ? 0.4 : 0.18);

        this.fx.addFloatText(this.p2.x, this.p2.y - 60, label, '#ffd700');
        physicsDebris.spawnCoinFountain(this.p2.x, this.p2.y, isHeavy ? 6 : 2);
      }

      if (this.p2.health <= 0) {
        this.triggerKO('p1');
      }
    }
  }

  updateP2BossAI(dt) {
    if (this.p2.actionTimer > 0) {
      this.p2.actionTimer -= dt;
      if (this.p2.actionTimer <= 0) {
        this.p2.action = 'idle';
      }
    }

    if (this.p2.action === 'charge') {
      this.p2.x += this.p2.facing * 520 * dt;
      if (Math.abs(this.p1.x - this.p2.x) < 65 && this.p1.invulnerableTimer <= 0) {
        const isGuarding = this.p1.action === 'guard';
        const dmg = isGuarding ? 8 : 28;
        this.p1.health -= dmg;
        this.p1.invulnerableTimer = 0.8;
        this.p1.exGauge = Math.min(100, this.p1.exGauge + 15);

        this.sound.playCrash();
        if (this.camera) this.camera.addTrauma(0.5);
        this.fx.flashRed(150);
        this.fx.addFloatText(this.p1.x, this.p1.y - 45, (isGuarding ? '🛡️ 格挡冲撞! -8' : '💥 冲撞击飞! -28'), '#ff4d4d');

        if (this.p1.health <= 0) this.triggerKO('p2');
      }
      return;
    }

    this.p2.attackCooldown -= dt;
    this.p2.aiTimer -= dt;

    const dist = Math.abs(this.p1.x - this.p2.x);

    if (this.p2.aiTimer <= 0) {
      this.p2.aiTimer = 0.4 + Math.random() * 0.4;
      if (this.p1.action === 'punch' || this.p1.action === 'kick' || this.p1.action === 'super') {
        if (Math.random() < 0.35) {
          this.p2.action = 'guard';
          this.p2.actionDuration = 0.45;
          this.p2.actionTimer = 0.45;
        }
      }
    }

    if (this.p2.action === 'idle' || this.p2.action === 'walk') {
      if (dist > 110) {
        this.p2.x += this.p2.facing * 240 * dt;
        this.p2.action = 'walk';
      } else {
        this.p2.action = 'idle';
      }

      if (this.p2.attackCooldown <= 0) {
        const r = Math.random();
        if (r < 0.45 && dist < 120) {
          this.p2.action = 'punch';
          this.p2.actionDuration = 0.35;
          this.p2.actionTimer = 0.35;
          this.p2.attackCooldown = 1.3;
          this.sound.playWhoosh();

          setTimeout(() => {
            if (Math.abs(this.p1.x - this.p2.x) < 95 && this.p1.invulnerableTimer <= 0) {
              const isGuarding = this.p1.action === 'guard';
              const dmg = isGuarding ? 6 : 24;
              this.p1.health -= dmg;
              this.p1.invulnerableTimer = 0.6;
              this.p1.exGauge = Math.min(100, this.p1.exGauge + 12);

              this.sound.playCrash();
              if (this.camera) this.camera.addTrauma(0.3);
              this.fx.addFloatText(this.p1.x, this.p1.y - 40, (isGuarding ? '🛡️ 格挡勾拳! -6' : '🥊 重拳命中! -24'), '#ff4d4d');
              if (this.p1.health <= 0) this.triggerKO('p2');
            }
          }, 120);

        } else if (r < 0.75 && dist > 200) {
          this.p2.action = 'shoot';
          this.p2.actionDuration = 0.5;
          this.p2.actionTimer = 0.5;
          this.p2.attackCooldown = 2.2;
          this.sound.playPop();

          [-10, 0, 10].forEach((offY, idx) => {
            setTimeout(() => {
              this.projectiles.push({
                x: this.p2.x + this.p2.facing * 45,
                y: this.p2.y - 20 + offY,
                vx: this.p2.facing * 640,
                power: 18,
                alive: true
              });
            }, idx * 120);
          });
        } else if (dist > 180) {
          this.p2.action = 'charge';
          this.p2.actionDuration = 0.8;
          this.p2.actionTimer = 0.8;
          this.p2.attackCooldown = 2.5;
          this.sound.playWhoosh();
          this.fx.toast('⚠️ 上校发动【野蛮冲撞】！按后退格挡或起跳躲避！', 1600);
        }
      }
    }
  }

  triggerKO(winner) {
    this.gameState = 'ko';
    this.koTimer = 0;
    this.hitStopTimer = 0.4;

    if (winner === 'p1') {
      this.p2.action = 'knockdown';
      this.p2.actionDuration = 1.0;
      this.p2.actionTimer = 1.0;
      this.p2.health = 0;
      // 帽子飞出物理
      this.p2.hatOffset = { x: 0, y: -70, vx: this.p1.facing * 220, vy: -380, rot: 0 };

      this.sound.playThunder();
      this.sound.playVictory();
      if (this.camera) this.camera.addTrauma(0.85);
      physicsDebris.spawnCoinFountain(this.p2.x, this.p2.y, 40);
      this.fx.addFloatText(640, 260, '👑 K.O.! PERFECT VICTORY! 👑', '#ffd700');
    } else {
      this.p1.action = 'knockdown';
      this.p1.health = 0;
      this.sound.playCrash();
      this.fx.flashRed(250);
    }
  }

  finishGame() {
    this.running = false;
    const isSuccess = this.p2.health <= 0 || this.p1.health > 0;
    const rank = this.p2.health <= 0 && this.p1.health > 60 ? 'S' : (isSuccess ? 'A' : 'B');
    const daysDelta = rank === 'S' ? -0.5 : 0;

    this.sound.playVictory();

    setTimeout(() => {
      this.complete({
        result: isSuccess ? 'perfect' : 'good',
        rank,
        score: (1000 - this.p2.health) * 5 + this.p1.health * 20 + 2000,
        daysDelta,
        moneyDelta: -200,
        flags: { sfBrawlWon: true, proctorKnockedOut: this.p2.health <= 0 },
        comment: isSuccess
          ? '让·路路通：「法式萨瓦特防身术把傲慢上校彻底击倒！旧金山大铁路列车鸣笛起航，直奔纽约！」'
          : '一番激战终迫使普罗克托上校退却，众人安然登上列车横穿美洲。'
      });
    }, 1000);
  }

  render(ctx) {
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. 实景 1872 加州旧金山淘金酒馆 16:9 街霸擂台手绘原画背景
    if (this.saloonBgImg && this.saloonBgImg.complete && this.saloonBgImg.naturalWidth > 0) {
      ctx.drawImage(this.saloonBgImg, 0, 0, w, h);
      const vigGrad = ctx.createRadialGradient(w / 2, h / 2, 280, w / 2, h / 2, 700);
      vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vigGrad.addColorStop(1, 'rgba(15, 6, 2, 0.45)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, w, h);
    } else {
      const saloonGrad = ctx.createLinearGradient(0, 0, 0, h);
      saloonGrad.addColorStop(0, '#2d180c');
      saloonGrad.addColorStop(0.5, '#452615');
      saloonGrad.addColorStop(1, '#1b0e06');
      ctx.fillStyle = saloonGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. 绘制飞行子弹
    for (const p of this.projectiles) {
      if (p.alive) {
        ctx.save();
        ctx.fillStyle = '#ff0044';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    // 计算 Spine 动作进度 (0.0 ~ 1.0)
    const p1Prog = this.p1.actionDuration > 0 ? Math.max(0, Math.min(1.0, (this.p1.actionDuration - this.p1.actionTimer) / this.p1.actionDuration)) : 0;
    const p2Prog = this.p2.actionDuration > 0 ? Math.max(0, Math.min(1.0, (this.p2.actionDuration - this.p2.actionTimer) / this.p2.actionDuration)) : 0;

    // 3. 绘制 P2: 斯坦普·普罗克托上校 (Boss FTG Spine)
    SpriteEngine.drawFTGColonelProctor(
      ctx,
      this.p2.x,
      this.p2.y,
      this.p2.action,
      this.p2.facing,
      this.animTime,
      this.p2.hitFlashTimer > 0,
      p2Prog,
      this.p2.hatOffset
    );

    // 4. 绘制 P1: 让·路路通 (Hero FTG Spine + 残影)
    SpriteEngine.drawFTGPassepartout(
      ctx,
      this.p1.x,
      this.p1.y,
      this.p1.action,
      this.p1.facing,
      this.animTime,
      this.p1.hitFlashTimer > 0,
      p1Prog,
      this.p1.afterImages
    );

    // 5. 终幕：绘制驶入车站的太平洋大铁路巨型蒸汽机车 (Pacific Railroad Train)
    if (this.gameState === 'victory') {
      SpriteEngine.drawPacificRailroadTrain(ctx, this.trainX, 540, this.animTime);
    }

    // 6. 经典格斗开场与终结大字特写 (FIGHT! / K.O.!)
    if (this.gameState === 'intro') {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 240, w, 140);

      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ff3300';
      ctx.shadowBlur = 25;
      ctx.font = '900 64px "Baskerville", serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.introTimer > 0.6 ? 'ROUND 1' : 'FIGHT !', w / 2, 335);
      ctx.restore();
    } else if (this.gameState === 'ko' || this.gameState === 'victory') {
      ctx.save();
      ctx.fillStyle = '#ff0044';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 35;
      ctx.font = '900 86px "Baskerville", serif';
      ctx.textAlign = 'center';
      ctx.fillText('K . O . !', w / 2, 330);
      ctx.restore();
    }

    // 7. 顶部经典街霸/拳皇格斗 HUD 仪表盘
    this.drawStreetFighterHUD(ctx);
  }

  drawStreetFighterHUD(ctx) {
    const w = this.canvas.width;
    ctx.save();

    // 1. P1 血条 (左侧 绿金渐变)
    const barW = 420;
    const barH = 26;

    ctx.fillStyle = '#50e3c2';
    ctx.font = '900 18px "Baskerville", serif';
    ctx.textAlign = 'left';
    ctx.fillText('🥋 PASSEPARTOUT', 110, 36);

    ctx.fillStyle = '#1b120c';
    ctx.fillRect(110, 45, barW, barH);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(110, 45, barW, barH);

    const p1HpProg = Math.max(0, this.p1.health / this.p1.maxHealth);
    const p1Grad = ctx.createLinearGradient(110, 45, 110 + barW, 45);
    p1Grad.addColorStop(0, '#00ffcc');
    p1Grad.addColorStop(1, '#ffd700');
    ctx.fillStyle = p1Grad;
    ctx.fillRect(110 + barW * (1 - p1HpProg) + 2, 47, (barW - 4) * p1HpProg, barH - 4);

    // 2. P2 血条 (右侧 红黑渐变)
    ctx.fillStyle = '#ff4d4d';
    ctx.font = '900 18px "Baskerville", serif';
    ctx.textAlign = 'right';
    ctx.fillText('🤠 COL. PROCTOR', w - 110, 36);

    ctx.fillStyle = '#1b120c';
    ctx.fillRect(w - 110 - barW, 45, barW, barH);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(w - 110 - barW, 45, barW, barH);

    const p2HpProg = Math.max(0, this.p2.health / this.p2.maxHealth);
    const p2Grad = ctx.createLinearGradient(w - 110 - barW, 45, w - 110, 45);
    p2Grad.addColorStop(0, '#ff0044');
    p2Grad.addColorStop(1, '#ffaa00');
    ctx.fillStyle = p2Grad;
    ctx.fillRect(w - 110 - barW + 2, 47, (barW - 4) * p2HpProg, barH - 4);

    // 3. 中间经典 [ KO ] 徽章与 99s 倒计时
    ctx.fillStyle = '#2b1509';
    ctx.beginPath();
    ctx.arc(w / 2, 58, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffd700';
    ctx.font = '900 28px "Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.max(0, Math.ceil(this.timer)), w / 2, 68);

    // 4. 底部 P1 EX 必杀能量槽 (Super Meter - 带有金色火焰脉冲与快捷释放按钮)
    const canSuper = this.p1.exGauge >= 50;

    ctx.fillStyle = 'rgba(15, 8, 5, 0.94)';
    ctx.fillRect(110, 646, 300, 30);
    ctx.strokeStyle = canSuper ? '#ffd700' : '#8b5a2b';
    ctx.lineWidth = canSuper ? 3 : 2;
    if (canSuper) {
      ctx.shadowColor = '#ff3300';
      ctx.shadowBlur = 15;
    }
    ctx.strokeRect(110, 646, 300, 30);
    ctx.shadowBlur = 0;

    const exProg = Math.min(1.0, this.p1.exGauge / 100);
    const exGrad = ctx.createLinearGradient(110, 646, 410, 646);
    if (canSuper) {
      exGrad.addColorStop(0, '#ff0044');
      exGrad.addColorStop(0.5, '#ffd700');
      exGrad.addColorStop(1, '#ff3300');
    } else {
      exGrad.addColorStop(0, '#00b4d8');
      exGrad.addColorStop(1, '#50e3c2');
    }
    ctx.fillStyle = exGrad;
    ctx.fillRect(112, 648, 296 * exProg, 26);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 13px sans-serif';
    ctx.textAlign = 'center';
    if (canSuper) {
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText('🔥 [按 Q/B/U/I/O] 释放超必杀暴风连打! 🔥', 260, 666);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillText('EX GAUGE: ' + Math.floor(this.p1.exGauge) + '% (50% 满能量)', 260, 666);
    }

    // 5. 连击数字特写 (Combo Counter)
    if (this.p1.comboCount > 1) {
      ctx.fillStyle = '#ffcc00';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 18;
      ctx.font = '900 34px "Baskerville", serif';
      ctx.textAlign = 'left';
      ctx.fillText(this.p1.comboCount + ' HITS COMBO!', 110, 115);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}
