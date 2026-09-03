// 《Fogg 的赌约》· 关3B 萨蒂神庙暗夜潜行与王体复活大营救 (对标《Shadow Tactics》战术潜行典藏版)
import { MiniGame } from './_base/MiniGame.js';
import { particles } from '../engine/particles.js';
import { SpriteEngine } from '../engine/sprites.js';
import { GameImages } from '../assets/images.js';
import { Camera2D } from '../engine/camera.js';
import { physicsDebris } from '../engine/physics.js';

export class StealthRescueMiniGame extends MiniGame {
  constructor(params) {
    super(params);

    this.camera = new Camera2D(1280, 720);

    this.phase = 1; // 1: 潜入与斩断锁链, 2: 假扮土邦王显灵与携美突围
    this.timer = 90.0;
    this.animTime = 0;
    this.detected = false;

    this.player = {
      x: 120,
      y: 360,
      speed: 210,
      radius: 18,
      facingAngle: 0,
      hasRescued: false,
      isHiding: false,
      isDisguisedRajah: false,
      soundRings: [],
      waterPouches: 3
    };

    this.aouda = {
      x: 1080,
      y: 360,
      radius: 24,
      rescued: false,
      locksRemaining: 3
    };

    // 开锁 QTE 状态
    this.isLockpicking = false;
    this.lockDialAngle = 0;
    this.lockTargetStart = Math.PI * 0.35;
    this.lockTargetEnd = Math.PI * 0.75;
    this.lockSpeed = 4.2;

    // 土邦王显灵全屏定格与震慑状态
    this.rajahShowTimer = 0;
    this.guardsFrozen = false;

    // 印式神庙护寺武僧与卫兵
    this.guards = [
      {
        id: 1,
        x: 360,
        y: 200,
        startY: 140,
        endY: 580,
        speedY: 110,
        facingAngle: Math.PI / 2,
        visionRange: 220,
        visionAngle: Math.PI / 3.0,
        alertLevel: 0,
        knockedOut: false,
        distractedTimer: 0,
        investigatePos: null
      },
      {
        id: 2,
        x: 640,
        y: 520,
        startY: 150,
        endY: 570,
        speedY: -120,
        facingAngle: -Math.PI / 2,
        visionRange: 220,
        visionAngle: Math.PI / 3.0,
        alertLevel: 0,
        knockedOut: false,
        distractedTimer: 0,
        investigatePos: null
      },
      {
        id: 3,
        x: 880,
        y: 220,
        startY: 160,
        endY: 560,
        speedY: 105,
        facingAngle: Math.PI / 2,
        visionRange: 210,
        visionAngle: Math.PI / 3.2,
        alertLevel: 0,
        knockedOut: false,
        distractedTimer: 0,
        investigatePos: null
      }
    ];

    this.dog = {
      x: 500,
      y: 360,
      startX: 420,
      endX: 580,
      speedX: 75,
      facingAngle: 0,
      hearRadius: 175,
      isAlert: false
    };

    this.torches = [
      { id: 1, x: 360, y: 360, lit: true, flicker: 0 },
      { id: 2, x: 760, y: 360, lit: true, flicker: 0 }
    ];

    // 茂密灌木草丛（完全匿踪）
    this.bushes = [
      { x: 190, y: 150, w: 90, h: 60 },
      { x: 190, y: 510, w: 90, h: 60 },
      { x: 480, y: 220, w: 90, h: 60 },
      { x: 480, y: 440, w: 90, h: 60 },
      { x: 760, y: 180, w: 90, h: 60 },
      { x: 760, y: 480, w: 90, h: 60 }
    ];

    // 古印度雕花石柱掩体
    this.pillars = [
      { x: 260, y: 280, w: 65, h: 160 },
      { x: 560, y: 140, w: 65, h: 150 },
      { x: 560, y: 430, w: 65, h: 150 },
      { x: 820, y: 280, w: 65, h: 160 }
    ];

    this.foggCooldown = 0;
    this.foggCooldownMax = 5.0;
    this.distractionRipple = null;

    this.escapeZone = { x: 30, y: 240, w: 110, h: 240 };

    this.aoudaImg = new Image();
    if (GameImages.aouda) this.aoudaImg.src = GameImages.aouda;
  }

  init() {
    this.phase = 1;
    this.timer = 90.0;
    this.animTime = 0;
    this.detected = false;

    this.player.x = 120;
    this.player.y = 360;
    this.player.facingAngle = 0;
    this.player.hasRescued = false;
    this.player.isHiding = false;
    this.player.isDisguisedRajah = false;
    this.player.soundRings = [];
    this.player.waterPouches = 3;

    this.aouda.rescued = false;
    this.aouda.locksRemaining = 3;
    this.isLockpicking = false;
    this.rajahShowTimer = 0;
    this.guardsFrozen = false;

    this.guards.forEach(g => {
      g.knockedOut = false;
      g.alertLevel = 0;
      g.distractedTimer = 0;
      g.investigatePos = null;
    });

    this.foggCooldown = 0;
    this.distractionRipple = null;
    physicsDebris.clear();

    this.camera.setWorldBounds(0, 1280, 0, 720);
    this.camera.follow(640, 360, true);

    this.input.configureUI({
      showDpad: true,
      showA: true,
      showB: true,
      labelA: '击晕/开锁',
      labelB: '水袋灭火'
    });

    const foggBtn = document.getElementById('fogg-assist-btn-container');
    if (foggBtn) foggBtn.classList.remove('hidden');

    const distractBtn = document.getElementById('btn-fogg-distract');
    if (distractBtn) {
      distractBtn.onclick = () => this.triggerFoggDistract();
    }

    if (this.sound.music) this.sound.music.playTheme('temple');
    this.fx.toast('【暗夜神庙潜行】[草丛/暗处] 匿踪 | 背后 [空格/A] 击晕守卫 | [B/Q] 泼灭火把 | [C] 金币引怪！', 5000);
  }

  triggerFoggDistract() {
    if (this.foggCooldown > 0) return;

    this.foggCooldown = this.foggCooldownMax;
    this.sound.playCoinClink();
    if (this.camera) this.camera.addTrauma(0.2);
    this.fx.toast('🪙 福克先生投掷了一枚黄铜金币！叮当脆响！', 2500);

    const targetX = 620 + Math.random() * 140;
    const targetY = 130 + Math.random() * 80;
    this.distractionRipple = { x: targetX, y: targetY, radius: 10, maxRadius: 240, alpha: 1.0 };
    physicsDebris.spawnCoinFountain(targetX, targetY, 6);

    this.guards.forEach(guard => {
      if (!guard.knockedOut) {
        guard.distractedTimer = 4.5;
        guard.investigatePos = { x: targetX, y: targetY };
        guard.alertLevel = 1;
        guard.facingAngle = Math.atan2(targetY - guard.y, targetX - guard.x);
      }
    });
  }

  extinguishNearestTorch() {
    if (this.player.waterPouches <= 0) {
      this.fx.toast('⚠️ 水袋已耗尽！', 1500);
      return;
    }

    let nearestTorch = null;
    let minDist = 300;

    for (const t of this.torches) {
      if (t.lit) {
        const d = Math.hypot(this.player.x - t.x, this.player.y - t.y);
        if (d < minDist) {
          minDist = d;
          nearestTorch = t;
        }
      }
    }

    if (nearestTorch) {
      nearestTorch.lit = false;
      this.player.waterPouches--;
      this.sound.playSteam();
      if (this.camera) this.camera.addTrauma(0.2);
      this.fx.addFloatText(nearestTorch.x, nearestTorch.y - 30, '💧 火把熄灭！暗道已成！', '#50e3c2');
      particles.emitSparkles(nearestTorch.x, nearestTorch.y, 16);
      this.fx.toast('💧 泼灭火把！制造黑暗通道！(剩余水袋: ' + this.player.waterPouches + ')', 2500);
    } else {
      this.fx.toast('周围没有可泼灭的火把！', 1500);
    }
  }

  update(rawDt) {
    if (!this.running || this.paused) return;
    const dt = Math.max(0.0001, rawDt || 0.016);

    this.animTime += dt;
    this.timer -= dt;
    physicsDebris.update(dt);

    // 火把光晕微幅跳动
    this.torches.forEach(t => {
      t.flicker = Math.sin(this.animTime * 15 + t.id) * 6;
    });

    // 摄像机镜头跟随
    this.camera.follow(this.player.hasRescued ? (this.player.x + 640) / 2 : this.player.x, this.player.y);
    this.camera.update(dt);

    // 福克支援冷却
    if (this.foggCooldown > 0) {
      this.foggCooldown -= dt;
      const cdText = document.getElementById('fogg-cd-text');
      const distractBtn = document.getElementById('btn-fogg-distract');
      if (cdText) cdText.textContent = this.foggCooldown > 0 ? Math.ceil(this.foggCooldown) + 's' : '就绪';
      if (distractBtn) distractBtn.disabled = this.foggCooldown > 0;
    }

    // 金币吸引声波扩散
    if (this.distractionRipple) {
      this.distractionRipple.radius += 140 * dt;
      this.distractionRipple.alpha -= 0.35 * dt;
      if (this.distractionRipple.alpha <= 0) {
        this.distractionRipple = null;
      }
    }

    // 按键 [C] 投掷金币声东击西
    if (this.input.input.keys['KeyC']) {
      this.triggerFoggDistract();
      this.input.input.keys['KeyC'] = false;
    }

    // 按键 [B / Q] 泼灭火把
    if (this.input.input.keys['KeyB'] || this.input.input.keys['KeyQ'] || this.input.input.buttons.justB) {
      this.extinguishNearestTorch();
      this.input.input.keys['KeyB'] = false;
      this.input.input.keys['KeyQ'] = false;
    }

    // 背后无声击晕守卫 [A / Space]
    if (this.input.input.buttons.justA || this.input.input.keys['Space']) {
      for (const g of this.guards) {
        if (!g.knockedOut) {
          const dist = Math.hypot(this.player.x - g.x, this.player.y - g.y);
          if (dist < 65) {
            const toPlayerAngle = Math.atan2(this.player.y - g.y, this.player.x - g.x);
            let angleDiff = Math.abs(toPlayerAngle - g.facingAngle);
            while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);

            // 只要在守卫后方 90 度扇区即可击晕
            if (angleDiff > Math.PI * 0.45) {
              g.knockedOut = true;
              g.visionRange = 0;
              this.sound.playCrash();
              if (this.camera) this.camera.addTrauma(0.35);
              if (this.fx) {
                this.fx.triggerHaptic(40);
                this.fx.addFloatText(g.x, g.y - 30, '🥷 背后无声勒晕守卫！', '#50e3c2');
              }
              particles.emitSparkles(g.x, g.y, 20);
              break;
            }
          }
        }
      }
    }

    // 开锁 QTE 状态
    if (this.isLockpicking) {
      this.lockDialAngle += this.lockSpeed * dt;
      if (this.lockDialAngle >= Math.PI * 2) {
        this.lockDialAngle -= Math.PI * 2;
      }

      if (this.input.input.buttons.justA || this.input.input.pointer.justDown || this.input.input.keys['Space']) {
        const inZone = this.lockDialAngle >= this.lockTargetStart && this.lockDialAngle <= this.lockTargetEnd;
        if (inZone) {
          this.aouda.locksRemaining--;
          this.sound.playCoinClink();
          if (this.camera) this.camera.addTrauma(0.2);
          this.fx.addFloatText(this.aouda.x, this.aouda.y - 30, '★ 斩断 1 道禁锢铁锁！', '#50e3c2');

          if (this.aouda.locksRemaining <= 0) {
            // 🌟 核心原著高潮：路路通假扮土邦王复活！
            this.isLockpicking = false;
            this.player.hasRescued = true;
            this.player.isDisguisedRajah = true;
            this.aouda.rescued = true;
            this.phase = 2;
            this.rajahShowTimer = 5.0;
            this.guardsFrozen = true;

            this.sound.playVictory();
            if (this.camera) this.camera.addTrauma(0.6);
            particles.emitSparkles(this.aouda.x, this.aouda.y, 40);
            this.fx.toast('👑 【假扮土邦王显灵！】路路通头戴王冠身披王袍巍然站起！全场僧侣吓得五体投地！护送艾娥达夫人全速冲向西门战象！', 5000);
          } else {
            this.lockTargetStart = Math.random() * (Math.PI * 1.2);
            this.lockTargetEnd = this.lockTargetStart + 0.55;
          }
        } else {
          this.sound.playCrash();
          if (this.camera) this.camera.addTrauma(0.3);
          this.fx.addFloatText(this.aouda.x, this.aouda.y - 30, '打草惊蛇！', '#ff4d4d');
        }
      }
      return;
    }

    // 土邦王显灵定格倒计时
    if (this.rajahShowTimer > 0) {
      this.rajahShowTimer -= dt;
      if (this.rajahShowTimer <= 0) {
        this.guardsFrozen = false;
        this.guards.forEach(g => {
          if (!g.knockedOut) {
            g.alertLevel = 2;
            g.visionRange = 260;
          }
        });
      }
    }

    // 玩家脚步声波衰减
    for (let i = this.player.soundRings.length - 1; i >= 0; i--) {
      const ring = this.player.soundRings[i];
      ring.radius += 110 * dt;
      ring.alpha -= 0.85 * dt;
      if (ring.alpha <= 0) {
        this.player.soundRings.splice(i, 1);
      }
    }

    // 猎犬巡逻
    if (!this.guardsFrozen) {
      this.dog.x += this.dog.speedX * dt;
      if (this.dog.x >= this.dog.endX) {
        this.dog.x = this.dog.endX;
        this.dog.speedX = -Math.abs(this.dog.speedX);
        this.dog.facingAngle = Math.PI;
      } else if (this.dog.x <= this.dog.startX) {
        this.dog.x = this.dog.startX;
        this.dog.speedX = Math.abs(this.dog.speedX);
        this.dog.facingAngle = 0;
      }
    }

    // 玩家移动操控
    const axis = this.input.input.axis;
    let dx = axis.x;
    let dy = axis.y;

    if (this.input.input.pointer.down && !this.input.isTouchDevice) {
      const p = this.input.input.pointer;
      const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
      if (dist > 15) {
        const pAngle = Math.atan2(p.y - this.player.y, p.x - this.player.x);
        dx = Math.cos(pAngle);
        dy = Math.sin(pAngle);
      }
    }

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy) || 1;
      this.player.facingAngle = Math.atan2(dy, dx);
      const moveX = (dx / len) * this.player.speed * dt;
      const moveY = (dy / len) * this.player.speed * dt;

      const nextX = Math.max(30, Math.min(1250, this.player.x + moveX));
      const nextY = Math.max(80, Math.min(680, this.player.y + moveY));

      let collide = false;
      for (const p of this.pillars) {
        if (
          nextX + this.player.radius > p.x &&
          nextX - this.player.radius < p.x + p.w &&
          nextY + this.player.radius > p.y &&
          nextY - this.player.radius < p.y + p.h
        ) {
          collide = true;
          break;
        }
      }

      if (!collide) {
        this.player.x = nextX;
        this.player.y = nextY;

        if (Math.random() > 0.8 && !this.player.isHiding) {
          this.player.soundRings.push({
            x: this.player.x,
            y: this.player.y,
            radius: 8,
            alpha: 0.6
          });
        }
      }
    }

    // 检查玩家是否在草丛或熄灭的阴影中
    this.player.isHiding = this.checkInStealthZone(this.player.x, this.player.y);

    // 猎犬听觉警戒
    if (!this.guardsFrozen) {
      const distToDog = Math.hypot(this.player.x - this.dog.x, this.player.y - this.dog.y);
      if (distToDog < this.dog.hearRadius && !this.player.isHiding) {
        this.dog.isAlert = true;
        this.sound.playStealthAlert(1);
        this.fx.addFloatText(this.dog.x, this.dog.y - 25, '🐕 猎犬狂吠！', '#ff4d4d');
        this.guards.forEach(g => {
          if (!g.knockedOut) {
            g.alertLevel = 1;
            g.facingAngle = Math.atan2(this.player.y - g.y, this.player.x - g.x);
          }
        });
      } else {
        this.dog.isAlert = false;
      }
    }

    // 守卫巡逻与光锥侦测
    if (!this.guardsFrozen) {
      for (const guard of this.guards) {
        if (guard.knockedOut) continue;

        if (guard.distractedTimer > 0) {
          guard.distractedTimer -= dt;
          if (guard.distractedTimer <= 0) {
            guard.investigatePos = null;
            guard.alertLevel = 0;
          }
        } else {
          guard.y += guard.speedY * dt;
          if (guard.y >= guard.endY) {
            guard.y = guard.endY;
            guard.speedY = -Math.abs(guard.speedY);
            guard.facingAngle = -Math.PI / 2;
          } else if (guard.y <= guard.startY) {
            guard.y = guard.startY;
            guard.speedY = Math.abs(guard.speedY);
            guard.facingAngle = Math.PI / 2;
          }
        }

        const dist = Math.hypot(this.player.x - guard.x, this.player.y - guard.y);
        // 如果处于隐匿状态，守卫视线大幅缩短
        const effectiveVisionRange = this.player.isHiding ? guard.visionRange * 0.25 : guard.visionRange;

        if (dist <= effectiveVisionRange) {
          const angle = Math.atan2(this.player.y - guard.y, this.player.x - guard.x);
          let diff = Math.abs(guard.facingAngle - angle);
          while (diff > Math.PI) diff -= Math.PI * 2;
          diff = Math.abs(diff);

          if (diff <= guard.visionAngle / 2) {
            const isBlocked = this.checkLineOfSightBlocked(guard.x, guard.y, this.player.x, this.player.y);
            if (!isBlocked) {
              guard.alertLevel = 2;
              this.triggerAlert();
            }
          }
        }
      }
    }

    // 靠近艾娥达神坛触发开锁
    const distToAouda = Math.hypot(this.player.x - this.aouda.x, this.player.y - this.aouda.y);
    if (!this.player.hasRescued && distToAouda < 75 && !this.isLockpicking) {
      this.isLockpicking = true;
      this.fx.toast('【解密转盘】当指针转入绿色区域时按下 [A/空格/点击] 斩断铁锁！', 3000);
    }

    // 撤离完成判定（抵达西门战象处）
    if (this.player.hasRescued) {
      if (
        this.player.x >= this.escapeZone.x &&
        this.player.x <= this.escapeZone.x + this.escapeZone.w &&
        this.player.y >= this.escapeZone.y &&
        this.player.y <= this.escapeZone.y + this.escapeZone.h
      ) {
        this.finishRescue(true);
      }
    }

    if (this.timer <= 0) {
      this.finishRescue(false);
    }
  }

  checkInStealthZone(px, py) {
    // 1. 在灌木草丛中
    for (const b of this.bushes) {
      if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
        return true;
      }
    }
    // 2. 在石柱正后方暗影处
    for (const p of this.pillars) {
      const dist = Math.hypot(px - (p.x + p.w / 2), py - (p.y + p.h / 2));
      if (dist < 65) return true;
    }
    return false;
  }

  checkLineOfSightBlocked(gx, gy, px, py) {
    for (const p of this.pillars) {
      if (px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h) {
        return true;
      }
    }
    return false;
  }

  triggerAlert() {
    if (this.detected) return;
    this.detected = true;
    this.sound.playStealthAlert(2);
    if (this.camera) this.camera.addTrauma(0.6);
    this.fx.toast('⚠ 警报！神庙武僧拉响警钟！强行护送突围！', 2500);

    setTimeout(() => {
      this.finishRescue(false);
    }, 1500);
  }

  finishRescue(cleanSuccess) {
    this.running = false;
    const foggBtn = document.getElementById('fogg-assist-btn-container');
    if (foggBtn) foggBtn.classList.add('hidden');

    this.sound.playVictory();

    this.complete({
      result: cleanSuccess ? 'perfect' : 'good',
      score: cleanSuccess ? 120 : 70,
      baseDays: 1.5,
      daysDelta: cleanSuccess ? -1.0 : 0,
      moneyDelta: 0,
      stamp: {
        id: 'calcutta_rescue',
        city: '萨蒂古神庙',
        date: '第 23 天',
        label: '萨蒂神庙大营救 (英雄勋章)',
        color: 'calcutta'
      },
      flags: {
        aoudaRescued: true,
        rajahDisguiseMaster: cleanSuccess
      },
      comment: cleanSuccess
        ? '福克：「路路通假扮土邦王显灵之计神乎其技！艾娥达夫人，战象已备好，我们即刻启程！」'
        : '福克：「虽有波折，但所幸艾娥达夫人安然无恙，八十天之约未受大碍。」'
    });
  }

  destroy() {
    super.destroy();
    const foggBtn = document.getElementById('fogg-assist-btn-container');
    if (foggBtn) foggBtn.classList.add('hidden');
    if (this.sound.music) this.sound.music.stopTheme();
  }

  render(ctx) {
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. 实景 2.5D 古印度暗夜神庙石砖底色
    ctx.fillStyle = '#0a0d10';
    ctx.fillRect(0, 0, w, h);

    // 曼荼罗石雕地砖几何网格
    ctx.save();
    ctx.strokeStyle = 'rgba(180, 140, 50, 0.12)';
    ctx.lineWidth = 1.5;
    for (let x = 0; x < w; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // 莲花同心圆装饰
    ctx.beginPath();
    ctx.arc(640, 360, 220, 0, Math.PI * 2);
    ctx.arc(640, 360, 340, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 2. 摄像机
    this.camera.apply(ctx);

    // 2.1 撤离安全区（西门接应口与战象奇阿尼）
    ctx.save();
    ctx.strokeStyle = '#50e3c2';
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(80, 227, 194, 0.12)';
    ctx.fillRect(this.escapeZone.x, this.escapeZone.y, this.escapeZone.w, this.escapeZone.h);
    ctx.strokeRect(this.escapeZone.x, this.escapeZone.y, this.escapeZone.w, this.escapeZone.h);

    // 西门古殿拱券与战象奇阿尼等待立绘
    ctx.fillStyle = '#2d1f14';
    ctx.fillRect(this.escapeZone.x - 10, this.escapeZone.y, 16, this.escapeZone.h);
    ctx.fillStyle = '#50e3c2';
    ctx.font = 'bold 15px "Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.fillText('🐘 西门战象接应点', this.escapeZone.x + this.escapeZone.w / 2, this.escapeZone.y + this.escapeZone.h / 2);
    ctx.restore();

    // 2.2 绘制茂密灌木草丛 (Stealth Bushes)
    for (const b of this.bushes) {
      SpriteEngine.drawTempleBush(ctx, b.x, b.y, b.w, b.h);
    }

    // 2.3 绘制古印度雕花石柱掩体 (Sandstone Pillars)
    for (const p of this.pillars) {
      SpriteEngine.drawTempleStoneWall(ctx, p.x, p.y, p.w, p.h);
    }

    // 2.4 火把与动态光晕 (Torches)
    for (const t of this.torches) {
      ctx.save();
      if (t.lit) {
        const tGrad = ctx.createRadialGradient(t.x, t.y, 5, t.x, t.y, 90 + t.flicker);
        tGrad.addColorStop(0, 'rgba(255, 140, 50, 0.7)');
        tGrad.addColorStop(0.5, 'rgba(255, 100, 30, 0.25)');
        tGrad.addColorStop(1, 'rgba(255, 60, 10, 0)');
        ctx.fillStyle = tGrad;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 90 + t.flicker, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffde59';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff4d4d';
        ctx.beginPath();
        ctx.arc(t.x, t.y - 4, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffe87c';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔥 火把 [B泼水]', t.x, t.y + 28);
      } else {
        ctx.fillStyle = '#222222';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#50e3c2';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💧 已熄灭(暗道)', t.x, t.y + 26);
      }
      ctx.restore();
    }

    // 2.5 猎犬与嗅觉警戒圈
    ctx.save();
    ctx.strokeStyle = this.dog.isAlert ? 'rgba(255, 77, 77, 0.5)' : 'rgba(255, 232, 124, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.dog.x, this.dog.y, this.dog.hearRadius, 0, Math.PI * 2);
    ctx.stroke();

    SpriteEngine.drawGuardDog(ctx, this.dog.x, this.dog.y, this.dog.facingAngle, this.dog.isAlert, this.animTime);
    ctx.restore();

    // 2.6 刚体物理碎片
    physicsDebris.render(ctx);

    // 2.7 守卫与动态光锥
    for (const g of this.guards) {
      ctx.save();
      if (!g.knockedOut && !this.guardsFrozen) {
        const coneGrad = ctx.createRadialGradient(g.x, g.y, 10, g.x, g.y, g.visionRange);
        if (g.alertLevel === 2) {
          coneGrad.addColorStop(0, 'rgba(255, 77, 77, 0.7)');
          coneGrad.addColorStop(1, 'rgba(255, 77, 77, 0.05)');
        } else {
          coneGrad.addColorStop(0, 'rgba(255, 232, 124, 0.55)');
          coneGrad.addColorStop(1, 'rgba(255, 232, 124, 0.02)');
        }

        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.moveTo(g.x, g.y);
        ctx.arc(
          g.x,
          g.y,
          g.visionRange,
          g.facingAngle - g.visionAngle / 2,
          g.facingAngle + g.visionAngle / 2
        );
        ctx.closePath();
        ctx.fill();
      }

      SpriteEngine.drawTempleGuard(ctx, g.x, g.y, g.facingAngle, g.alertLevel, g.knockedOut, this.animTime);
      ctx.restore();
    }

    // 2.8 艾娥达夫人火葬神坛 (Sacred Funeral Pyre)
    ctx.save();
    ctx.fillStyle = 'rgba(212, 175, 55, 0.2)';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.aouda.x, this.aouda.y, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (this.aoudaImg.complete && this.aoudaImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.aouda.x, this.aouda.y, 35, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.aoudaImg, this.aouda.x - 35, this.aouda.y - 35, 70, 70);
      ctx.restore();
    }

    if (!this.player.hasRescued) {
      ctx.fillStyle = '#ffde59';
      ctx.font = 'bold 14px "Baskerville", serif';
      ctx.textAlign = 'center';
      ctx.fillText('艾娥达夫人 [剩余 ' + this.aouda.locksRemaining + ' 道锁]', this.aouda.x, this.aouda.y + 50);
    }
    ctx.restore();

    // 2.9 玩家路路通 (暗夜潜行 / 假扮土邦王)
    SpriteEngine.drawInfiltrationPassepartout(
      ctx,
      this.player.x,
      this.player.y,
      this.player.facingAngle,
      this.player.isHiding,
      this.player.isDisguisedRajah,
      this.animTime
    );

    if (this.player.hasRescued) {
      if (this.aoudaImg.complete && this.aoudaImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.player.x - 45, this.player.y, 18, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(this.aoudaImg, this.player.x - 63, this.player.y - 18, 36, 36);
        ctx.restore();
      }
    }

    this.camera.restore(ctx);

    // 3. 开锁 QTE 模态转盘
    if (this.isLockpicking) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#f4ebd9';
      ctx.strokeStyle = '#8c6d23';
      ctx.lineWidth = 3;
      ctx.fillRect(w / 2 - 220, 160, 440, 360);
      ctx.strokeRect(w / 2 - 220, 160, 440, 360);

      ctx.fillStyle = '#2b1f17';
      ctx.font = 'bold 22px "Baskerville", serif';
      ctx.textAlign = 'center';
      ctx.fillText('【斩断禁锢铁锁链】(剩余 ' + this.aouda.locksRemaining + ' 道)', w / 2, 205);

      const cx = w / 2;
      const cy = 330;
      const r = 80;

      ctx.strokeStyle = '#3a2b1f';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#50e3c2';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(cx, cy, r, this.lockTargetStart, this.lockTargetEnd);
      ctx.stroke();

      const nx = cx + Math.cos(this.lockDialAngle) * (r - 5);
      const ny = cy + Math.sin(this.lockDialAngle) * (r - 5);
      ctx.strokeStyle = '#ff4d4d';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(nx, ny);
      ctx.stroke();

      ctx.fillStyle = '#ffde59';
      ctx.font = 'bold 16px "Baskerville", serif';
      ctx.fillText('指针经过【绿色区域】时按下 [A / 空格 / 点击]', w / 2, 470);
    }

    // 4. 顶部 HUD
    ctx.save();
    ctx.fillStyle = 'rgba(15, 10, 6, 0.88)';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.fillRect(120, 12, w - 240, 40);
    ctx.strokeRect(120, 12, w - 240, 40);

    ctx.font = 'bold 14px "Baskerville", serif';
    ctx.fillStyle = '#ffe87c';
    ctx.textAlign = 'left';
    ctx.fillText('🛕 萨蒂火祭神庙 · 暗夜潜行与营救艾娥达', 145, 37);

    ctx.textAlign = 'right';
    ctx.fillStyle = this.player.isHiding ? '#50e3c2' : '#ffffff';
    ctx.fillText('状态: ' + (this.player.isHiding ? '🌿 完全匿踪 (In Shadow)' : '👁️ 暴露在月光下') + ' | 💧 水袋: ' + this.player.waterPouches, w - 145, 37);
    ctx.restore();
  }
}
