// 《Fogg 的赌约》· 关5 南中国海狂暴台风 · 坦克德尔号大突围 (经典海上雷霆战机 / 史诗硬核大 Boss 双阶段典藏版)
import { MiniGame } from './_base/MiniGame.js';
import { particles } from '../engine/particles.js';
import { SpriteEngine } from '../engine/sprites.js';
import { GameImages } from '../assets/images.js';
import { Camera2D } from '../engine/camera.js';
import { physicsDebris } from '../engine/physics.js';

export class TyphoonSailingMiniGame extends MiniGame {
  constructor(params) {
    super(params);

    this.camera = new Camera2D(1280, 720);

    // 坦克德尔号战船模型 (Player Ship)
    this.boat = {
      x: 640,
      y: 560,
      w: 80,
      h: 90,
      speed: 480,
      weaponLevel: 1, // 1: 单发, 2: 双联, 3: 三向, 4: 满级极光
      shield: 1,      // 能量护盾
      bombs: 3,       // 穿云核爆信号弹
      fireTimer: 0,
      fireInterval: 0.14,
      tilt: 0,
      invulnerableTimer: 0
    };

    this.timer = 95.0; // 充足的史诗 Boss 决战时间
    this.distance = 0;
    this.targetDistance = 3000;
    this.score = 0;
    this.animTime = 0;
    this.waveTime = 0;
    this.flashAlpha = 0;

    // 子弹池
    this.playerBullets = [];
    this.enemyBullets = [];
    this.clusterOrbs = []; // 散裂高能雷球

    // 敌人与障碍池
    this.enemies = [];
    this.powerUps = [];
    this.spawnTimer = 0.8;

    // 🌟 双阶段史诗关底 Boss：台风海怪克拉肯巨兽 (Multi-Phase Epic Boss)
    this.boss = null;
    this.bossDefeated = false;

    // 终点对接：科罗拉多号大客轮
    this.isApproachingSteamer = false;
    this.steamerY = -400;

    // 雨滴
    this.rainDrops = [];
    for (let i = 0; i < 50; i++) {
      this.rainDrops.push({
        x: Math.random() * 1280,
        y: Math.random() * 720,
        len: 20 + Math.random() * 25,
        speed: 700 + Math.random() * 400
      });
    }

    // 雷暴闪电
    this.lightningTimer = 4.0;
    this.lightningAlpha = 0;

    this.typhoonBgImg = new Image();
    const typhoonSrc = GameImages.south_china_sea_typhoon || GameImages.hongkong || GameImages.south_china_sea_typhoon_art;
    if (typhoonSrc) this.typhoonBgImg.src = typhoonSrc;
  }

  init() {
    this.boat.x = 640;
    this.boat.y = 560;
    this.boat.weaponLevel = 1;
    this.boat.shield = 1;
    this.boat.bombs = 3;
    this.boat.fireTimer = 0;
    this.boat.tilt = 0;
    this.boat.invulnerableTimer = 0;

    this.timer = 95.0;
    this.distance = 0;
    this.score = 0;
    this.animTime = 0;
    this.waveTime = 0;
    this.flashAlpha = 0;

    this.playerBullets = [];
    this.enemyBullets = [];
    this.clusterOrbs = [];
    this.enemies = [];
    this.powerUps = [];
    this.spawnTimer = 0.6;
    this.boss = null;
    this.bossDefeated = false;

    this.isApproachingSteamer = false;
    this.steamerY = -400;

    this.camera.setWorldBounds(0, 1280, 0, 720);
    this.camera.follow(640, 360, true);

    this.input.configureUI({
      showDpad: true,
      showA: true,
      showB: true,
      labelA: '连发主炮',
      labelB: '穿云核爆'
    });

    if (this.sound.music) this.sound.music.playTheme('steamer');
    this.fx.toast('【海上雷霆大突围】[WASD/方向键/滑动] 移动战船 | [空格/A] 密集开炮 | 拾取 [P] 升级火力 | [B/Q] 释放穿云核爆！', 5500);
  }

  // 释放全屏大招【穿云核爆信号弹】
  triggerMegaBomb() {
    if (this.boat.bombs <= 0) {
      this.fx.toast('⚠️ 信号弹已耗尽！击沉海盗船可掉落补给！', 1500);
      return;
    }

    this.boat.bombs--;
    this.flashAlpha = 0.95;
    this.sound.playThunder();
    this.sound.playCrash();
    if (this.camera) this.camera.addTrauma(0.5);

    // 清除全屏敌方子弹与散裂雷球
    this.enemyBullets = [];
    this.clusterOrbs = [];

    // 对全屏小怪造成核爆伤害
    for (const e of this.enemies) {
      if (e.alive) {
        e.hp -= 260;
        particles.emitSparkles(e.x, e.y, 20);
        if (e.hp <= 0) {
          e.alive = false;
          this.score += 200;
          if (this.boss && this.boss.phase === 1 && e.isBossGuard) {
            this.checkBossGuardsStatus();
          }
        }
      }
    }

    // Boss 受到重创
    if (this.boss && this.boss.alive && this.boss.transitionTimer <= 0) {
      const dmg = this.boss.shieldActive ? 120 : 350;
      this.boss.hp -= dmg;
      this.boss.hitFlashTimer = 0.15;
      particles.emitSparkles(this.boss.x, this.boss.y, 35);
      if (this.boss.hp <= 0) {
        if (this.boss.phase === 1) this.triggerBossPhase2();
        else this.killBoss();
      }
    }

    this.fx.addFloatText(this.boat.x, this.boat.y - 70, '💥 穿云核爆！全屏清弹！', '#ffd700');
    if (this.fx) this.fx.triggerHaptic(70);
  }

  update(rawDt) {
    if (!this.running || this.paused) return;
    const dt = Math.max(0.0001, rawDt || 0.016);

    this.animTime += dt;
    this.waveTime += dt * 3.5;
    this.timer -= dt;

    if (this.boat.invulnerableTimer > 0) {
      this.boat.invulnerableTimer -= dt;
    }

    const inp = this.input ? this.input.input : null;
    const keys = inp ? (inp.keys || {}) : {};
    const btns = inp ? (inp.buttons || {}) : {};
    const axis = inp ? (inp.axis || { x: 0, y: 0 }) : { x: 0, y: 0 };
    const pointer = inp ? (inp.pointer || {}) : {};

    // 1. 战船走位操控 (Player Movement)
    let mx = 0;
    let my = 0;

    if (keys['ArrowLeft'] || keys['KeyA'] || btns.left || axis.x < -0.2) mx -= 1;
    if (keys['ArrowRight'] || keys['KeyD'] || btns.right || axis.x > 0.2) mx += 1;
    if (keys['ArrowUp'] || keys['KeyW'] || btns.up || axis.y < -0.2) my -= 1;
    if (keys['ArrowDown'] || keys['KeyS'] || btns.down || axis.y > 0.2) my += 1;

    if (pointer.down) {
      const dx = pointer.x - this.boat.x;
      const dy = pointer.y - this.boat.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 15) {
        mx = dx / dist;
        my = dy / dist;
      }
    }

    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my) || 1;
      this.boat.x += (mx / len) * this.boat.speed * dt;
      this.boat.y += (my / len) * this.boat.speed * dt;
    }

    this.boat.x = Math.max(80, Math.min(1200, this.boat.x));
    this.boat.y = Math.max(120, Math.min(660, this.boat.y));
    this.boat.tilt = mx * 0.18 + Math.sin(this.waveTime) * 0.05;

    // 2. 武器自动连射 (Auto Cannon Fire)
    this.boat.fireTimer -= dt;
    const isFiring = keys['Space'] || keys['KeyJ'] || btns.A || pointer.down || true;

    if (isFiring && this.boat.fireTimer <= 0) {
      this.boat.fireTimer = this.boat.fireInterval;
      this.sound.playPop();

      const bx = this.boat.x;
      const by = this.boat.y - 45;

      if (this.boat.weaponLevel === 1) {
        this.playerBullets.push({ x: bx, y: by, vx: 0, vy: -900, power: 25, isLaser: false });
      } else if (this.boat.weaponLevel === 2) {
        this.playerBullets.push({ x: bx - 16, y: by, vx: 0, vy: -950, power: 28, isLaser: false });
        this.playerBullets.push({ x: bx + 16, y: by, vx: 0, vy: -950, power: 28, isLaser: false });
      } else if (this.boat.weaponLevel === 3) {
        this.playerBullets.push({ x: bx, y: by, vx: 0, vy: -980, power: 30, isLaser: false });
        this.playerBullets.push({ x: bx - 16, y: by, vx: -200, vy: -950, power: 26, isLaser: false });
        this.playerBullets.push({ x: bx + 16, y: by, vx: 200, vy: -950, power: 26, isLaser: false });
      } else {
        this.playerBullets.push({ x: bx, y: by - 10, vx: 0, vy: -1200, power: 55, isLaser: true });
        this.playerBullets.push({ x: bx - 24, y: by, vx: -260, vy: -980, power: 28, isLaser: false });
        this.playerBullets.push({ x: bx + 24, y: by, vx: 260, vy: -980, power: 28, isLaser: false });
        this.playerBullets.push({ x: bx - 12, y: by, vx: 0, vy: -1000, power: 30, isLaser: false });
        this.playerBullets.push({ x: bx + 12, y: by, vx: 0, vy: -1000, power: 30, isLaser: false });
      }
    }

    // 3. 释放全屏大招 [B / KeyQ]
    if (keys['KeyB'] || keys['KeyQ'] || btns.justB) {
      this.triggerMegaBomb();
      keys['KeyB'] = false;
      keys['KeyQ'] = false;
    }

    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 2.2);
    }

    // 4. 玩家子弹更新与打击判定 (Bullet Impact & Boss Damage)
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const b = this.playerBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // 击中普通敌人 / 护卫触手
      for (const e of this.enemies) {
        if (e.alive) {
          const dist = Math.hypot(b.x - e.x, b.y - e.y);
          if (dist < e.radius + 18) {
            e.hp -= b.power;
            this.sound.playCrash();
            particles.emitSparkles(b.x, b.y, 6);
            if (!b.isLaser) b.dead = true;

            if (e.hp <= 0) {
              e.alive = false;
              this.score += e.scoreVal;
              this.sound.playVictory();
              particles.emitSparkles(e.x, e.y, 22);

              if (this.boss && this.boss.alive && this.boss.phase === 1 && e.isBossGuard) {
                this.checkBossGuardsStatus();
              }

              if (Math.random() < 0.45 || e.type === 'pirate' || e.isBossGuard) {
                const types = ['P', 'P', 'S', 'B'];
                const pType = types[Math.floor(Math.random() * types.length)];
                this.powerUps.push({
                  x: e.x,
                  y: e.y,
                  type: pType,
                  radius: 20,
                  vy: 90,
                  alive: true
                });
              }
            }
            break;
          }
        }
      }

      // 击中 Boss (硬核血量与弱点机制)
      if (this.boss && this.boss.alive && this.boss.transitionTimer <= 0) {
        const bDist = Math.hypot(b.x - this.boss.x, b.y - this.boss.y);
        if (bDist < 95) {
          this.boss.hitFlashTimer = 0.08;
          let dmg = b.power;

          if (this.boss.phase === 1) {
            if (this.boss.shieldActive) {
              // 阶段 1 护盾开启：受到伤害减少 75%
              dmg *= 0.25;
              this.sound.playTick();
              particles.emitSparkles(b.x, b.y, 3);
            } else {
              // 破防眩晕状态：受到 150% 爆发伤害
              dmg *= 1.5;
              this.sound.playCrash();
              particles.emitSparkles(b.x, b.y, 8);
            }
          } else {
            // 阶段 2 灭世狂暴：弱点核心（中央 36px 范围）受到 150% 暴击，装甲仅受 45% 伤害
            const weakDist = Math.hypot(b.x - this.boss.x, b.y - (this.boss.y + 5));
            if (weakDist < 36) {
              dmg *= 1.5;
              this.sound.playCoin();
              if (Math.random() < 0.2) this.fx.addFloatText(b.x, b.y - 15, '★ CRITICAL!', '#ffd700');
              particles.emitSparkles(b.x, b.y, 10);
            } else {
              dmg *= 0.45;
              this.sound.playCrash();
              particles.emitSparkles(b.x, b.y, 4);
            }
          }

          this.boss.hp -= dmg;
          if (!b.isLaser) b.dead = true;

          // 阶段转换判定
          if (this.boss.hp <= 0) {
            if (this.boss.phase === 1) {
              this.triggerBossPhase2();
            } else {
              this.killBoss();
            }
          }
        }
      }

      if (b.dead || b.y < -40 || b.x < -30 || b.x > 1310) {
        this.playerBullets.splice(i, 1);
      }
    }

    // 5. 散裂雷球更新 (Cluster Orbs)
    for (let i = this.clusterOrbs.length - 1; i >= 0; i--) {
      const orb = this.clusterOrbs[i];
      orb.y += orb.vy * dt;
      orb.fuse -= dt;

      if (orb.fuse <= 0) {
        // 散裂成 8 发高能雷电弹
        this.sound.playCrash();
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          this.enemyBullets.push({
            x: orb.x,
            y: orb.y,
            vx: Math.cos(a) * 260,
            vy: Math.sin(a) * 260
          });
        }
        particles.emitSparkles(orb.x, orb.y, 16);
        this.clusterOrbs.splice(i, 1);
      }
    }

    // 6. 敌方子弹更新与玩家碰撞 (Enemy Bullets & Sweeping Laser Damage)
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const eb = this.enemyBullets[i];
      eb.x += eb.vx * dt;
      eb.y += eb.vy * dt;

      if (this.boat.invulnerableTimer <= 0) {
        const pDist = Math.hypot(eb.x - this.boat.x, eb.y - this.boat.y);
        if (pDist < 28) {
          eb.dead = true;
          this.applyPlayerHit();
        }
      }

      if (eb.dead || eb.y > 760 || eb.x < -30 || eb.x > 1310) {
        this.enemyBullets.splice(i, 1);
      }
    }

    // 阶段 2 扫射激光命中玩家判定 (Sweeping Laser Damage)
    if (this.boss && this.boss.alive && this.boss.isFiringLaser && this.boat.invulnerableTimer <= 0) {
      // 激光起点 (boss.x, boss.y + 35) 到 (boss.laserSweepX, 720) 的线段距离
      const x1 = this.boss.x;
      const y1 = this.boss.y + 35;
      const x2 = this.boss.laserSweepX;
      const y2 = 720;

      const px = this.boat.x;
      const py = this.boat.y;

      const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
      const t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2));
      const projX = x1 + t * (x2 - x1);
      const projY = y1 + t * (y2 - y1);
      const distToLaser = Math.hypot(px - projX, py - projY);

      if (distToLaser < 38) {
        this.applyPlayerHit();
      }
    }

    // 7. 道具飘落与拾取 (Power-Ups)
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      pu.y += pu.vy * dt;

      if (pu.alive) {
        const puDist = Math.hypot(pu.x - this.boat.x, pu.y - this.boat.y);
        if (puDist < pu.radius + 32) {
          pu.alive = false;
          this.sound.playCoin();

          if (pu.type === 'P') {
            this.boat.weaponLevel = Math.min(4, this.boat.weaponLevel + 1);
            this.fx.addFloatText(this.boat.x, this.boat.y - 40, '⚡ 火力升级！LEVEL ' + this.boat.weaponLevel + '!', '#ff4d4d');
          } else if (pu.type === 'S') {
            this.boat.shield = Math.min(3, this.boat.shield + 1);
            this.fx.addFloatText(this.boat.x, this.boat.y - 40, '🛡️ 护盾激活！', '#50e3c2');
          } else if (pu.type === 'B') {
            this.boat.bombs = Math.min(5, this.boat.bombs + 1);
            this.fx.addFloatText(this.boat.x, this.boat.y - 40, '💥 获得穿云核爆信号弹！', '#ffd700');
          }
          particles.emitSparkles(pu.x, pu.y, 20);
        }
      }

      if (pu.y > 760) this.powerUps.splice(i, 1);
    }

    // 8. 敌人生成与 Boss 战阶段推进 (Progression)
    this.distance += 45 * dt;

    if (this.distance < 1800 && !this.boss) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const rand = Math.random();
        const spawnX = 120 + Math.random() * 1040;

        if (rand < 0.3) {
          this.enemies.push({
            type: 'reef',
            x: spawnX,
            y: -50,
            vx: 0,
            vy: 160,
            radius: 30,
            hp: 35,
            maxHp: 35,
            scoreVal: 80,
            shootTimer: 999,
            alive: true
          });
        } else if (rand < 0.7) {
          this.enemies.push({
            type: 'pirate',
            x: spawnX,
            y: -60,
            vx: (Math.random() - 0.5) * 80,
            vy: 180,
            radius: 32,
            hp: 80,
            maxHp: 80,
            scoreVal: 160,
            shootTimer: 0.8,
            dashTimer: 2.0,
            alive: true
          });
        } else {
          this.enemies.push({
            type: 'tentacle',
            x: Math.max(150, Math.min(1130, this.boat.x + (Math.random() - 0.5) * 260)),
            y: -70,
            vx: 0,
            vy: 140,
            radius: 34,
            hp: 120,
            maxHp: 120,
            scoreVal: 240,
            shootTimer: 1.0,
            sweepTimer: 1.5,
            alive: true
          });
        }
        this.spawnTimer = 0.8 + Math.random() * 0.6;
      }
    } else if (!this.boss && !this.bossDefeated) {
      // 🌟 召唤关底史诗 Boss 阶段 1！
      this.spawnBossPhase1();
    }

    // 敌人移动与开火 AI
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.type === 'pirate') {
        const toPlayerX = this.boat.x - e.x;
        e.vx += Math.sign(toPlayerX) * 220 * dt;
        e.vx = Math.max(-240, Math.min(240, e.vx));
        e.x += e.vx * dt;
        e.y += e.vy * dt;

        e.dashTimer -= dt;
        if (e.dashTimer <= 0 && e.y < this.boat.y - 80) {
          e.vy = 320;
          e.dashTimer = 3.0;
        }

        e.shootTimer -= dt;
        if (e.shootTimer <= 0 && e.alive && e.y > 40 && e.y < 550) {
          const mainAngle = Math.atan2(this.boat.y - e.y, this.boat.x - e.x);
          [-0.22, 0, 0.22].forEach(off => {
            this.enemyBullets.push({
              x: e.x,
              y: e.y + 20,
              vx: Math.cos(mainAngle + off) * 280,
              vy: Math.sin(mainAngle + off) * 280
            });
          });
          e.shootTimer = 1.4 + Math.random() * 0.6;
        }
      } else if (e.type === 'tentacle') {
        if (e.isBossGuard) {
          if (this.boss && this.boss.alive) {
            e.x = this.boss.x + e.guardOffset;
            e.y = this.boss.y + 35;
          }
        } else {
          e.sweepTimer -= dt;
          if (e.sweepTimer <= 0) {
            const sweepDir = this.boat.x > e.x ? 1 : -1;
            e.vx = sweepDir * 180;
            e.sweepTimer = 2.0;
          }
          e.x += e.vx * dt;
          e.y += e.vy * dt;
        }

        e.shootTimer -= dt;
        if (e.shootTimer <= 0 && e.alive && e.y > 40 && e.y < 520) {
          [-0.35, -0.12, 0.12, 0.35].forEach(off => {
            this.enemyBullets.push({
              x: e.x,
              y: e.y + 25,
              vx: Math.sin(off) * 260,
              vy: Math.cos(off) * 260
            });
          });
          e.shootTimer = e.isBossGuard ? 1.2 : 1.6;
        }
      } else {
        const distToBoat = Math.hypot(this.boat.x - e.x, this.boat.y - e.y);
        if (distToBoat < 350) {
          e.x += (this.boat.x - e.x) * 0.45 * dt;
        }
        e.y += e.vy * dt;
      }

      if (e.y > 760 && !e.isBossGuard) this.enemies.splice(i, 1);
    }

    // 🌟 Boss 阶段深度 AI (Phase 1 & Phase 2 Multi-Stage AI)
    if (this.boss && this.boss.alive) {
      if (this.boss.hitFlashTimer > 0) {
        this.boss.hitFlashTimer -= dt;
      }
      if (this.boss.transitionTimer > 0) {
        this.boss.transitionTimer -= dt;
      }

      if (this.boss.phase === 1) {
        // 阶段 1：平滑锁定玩家走位与雷暴弹幕
        this.boss.x += (this.boat.x - this.boss.x) * 1.6 * dt;
        this.boss.x = Math.max(220, Math.min(1060, this.boss.x));

        // 破防眩晕计时
        if (!this.boss.shieldActive) {
          this.boss.breakTimer -= dt;
          if (this.boss.breakTimer <= 0) {
            // 护盾重新生成并刷新双护卫触手
            this.respawnBossGuards();
          }
        }

        this.boss.shootTimer -= dt;
        if (this.boss.shootTimer <= 0) {
          this.boss.shootTimer = 1.3;
          // 螺旋风暴雷暴弹
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
            this.enemyBullets.push({
              x: this.boss.x,
              y: this.boss.y + 35,
              vx: Math.cos(a + this.animTime * 2) * 240,
              vy: Math.sin(a + this.animTime * 2) * 240
            });
          }
        }
      } else {
        // 🌟 阶段 2：灭世狂暴克拉肯 (高速追踪 + 动态横向扫射激光死光 + 散裂高能雷球)
        this.boss.x += (this.boat.x - this.boss.x) * 2.6 * dt;
        this.boss.x = Math.max(180, Math.min(1100, this.boss.x));

        // 激光充能与动态横向扫射循环
        if (this.boss.isChargingLaser) {
          this.boss.laserTimer -= dt;
          this.boss.laserChargeRatio = 1.0 - this.boss.laserTimer / 1.2;
          this.boss.laserSweepX = this.boat.x; // 预警瞄准玩家

          if (this.boss.laserTimer <= 0) {
            this.boss.isChargingLaser = false;
            this.boss.isFiringLaser = true;
            this.boss.laserDuration = 1.5;
            this.boss.laserSweepStartX = this.boat.x - 220;
            this.boss.laserSweepTargetX = this.boat.x + 220;
            this.sound.playThunder();
            if (this.camera) this.camera.addTrauma(0.5);
          }
        } else if (this.boss.isFiringLaser) {
          this.boss.laserDuration -= dt;
          // 横向扫射插值
          const sweepProgress = 1.0 - this.boss.laserDuration / 1.5;
          this.boss.laserSweepX = this.boss.laserSweepStartX + (this.boss.laserSweepTargetX - this.boss.laserSweepStartX) * sweepProgress;

          if (this.boss.laserDuration <= 0) {
            this.boss.isFiringLaser = false;
          }
        } else {
          // 常规弹幕与招式轮换
          this.boss.shootTimer -= dt;
          if (this.boss.shootTimer <= 0) {
            this.boss.attackPhase = (this.boss.attackPhase + 1) % 4;

            if (this.boss.attackPhase === 0) {
              // 1. 蓄力扫射灭世死光
              this.boss.isChargingLaser = true;
              this.boss.laserTimer = 1.2;
              this.boss.shootTimer = 4.0;
              this.fx.toast('⚠️ 警告！克拉肯正在蓄力【灭世扫射死光】！立即大幅横向机动！', 2200);
            } else if (this.boss.attackPhase === 1) {
              // 2. 发射散裂高能雷球 (Cluster Orbs)
              [-140, 0, 140].forEach(ox => {
                this.clusterOrbs.push({
                  x: this.boss.x + ox,
                  y: this.boss.y + 40,
                  vy: 220,
                  fuse: 1.1
                });
              });
              this.boss.shootTimer = 1.8;
            } else if (this.boss.attackPhase === 2) {
              // 3. 高速狙击雷暴五连发
              const aimAngle = Math.atan2(this.boat.y - this.boss.y, this.boat.x - this.boss.x);
              [-0.2, -0.1, 0, 0.1, 0.2].forEach(off => {
                this.enemyBullets.push({
                  x: this.boss.x,
                  y: this.boss.y + 35,
                  vx: Math.cos(aimAngle + off) * 380,
                  vy: Math.sin(aimAngle + off) * 380
                });
              });
              this.boss.shootTimer = 1.3;
            } else {
              // 4. 全弹狂暴风暴雨 (18-Way Spiral)
              for (let a = 0; a < Math.PI * 2; a += Math.PI / 9) {
                this.enemyBullets.push({
                  x: this.boss.x,
                  y: this.boss.y + 35,
                  vx: Math.cos(a + this.animTime * 3) * 260,
                  vy: Math.sin(a + this.animTime * 3) * 260
                });
              }
              this.boss.shootTimer = 1.5;
            }
          }
        }
      }
    }

    // 9. 终点：科罗拉多号大客轮对接 (SS Colorado Steamer)
    if ((this.bossDefeated || this.distance >= this.targetDistance) && !this.isApproachingSteamer) {
      this.isApproachingSteamer = true;
      this.sound.playSteamWhistle();
      this.fx.toast('🚢 穿透台风雷暴！前方出现太平洋客轮「科罗拉多号」！全员凯旋登船！', 5000);
    }

    if (this.isApproachingSteamer) {
      this.steamerY += 90 * dt;
      if (this.steamerY >= 200) {
        this.finishGame();
      }
    }

    // 10. 雷暴天气与雨丝
    this.lightningTimer -= dt;
    if (this.lightningTimer <= 0) {
      this.lightningAlpha = 0.85;
      this.sound.playThunder();
      if (this.camera) this.camera.addTrauma(0.3);
      this.lightningTimer = 4.5 + Math.random() * 4.0;
    }
    if (this.lightningAlpha > 0) {
      this.lightningAlpha = Math.max(0, this.lightningAlpha - dt * 3.5);
    }

    this.rainDrops.forEach(r => {
      r.y += r.speed * dt;
      r.x -= 120 * dt;
      if (r.y > 720) {
        r.y = -20;
        r.x = Math.random() * 1280 + 100;
      }
    });

    if (this.timer <= 0) {
      this.finishGame();
    }
  }

  // 玩家受击处理
  applyPlayerHit() {
    if (this.boat.shield > 0) {
      this.boat.shield--;
      this.sound.playCrash();
      this.fx.addFloatText(this.boat.x, this.boat.y - 30, '🛡️ 护盾抵挡冲击！', '#50e3c2');
      particles.emitSparkles(this.boat.x, this.boat.y, 16);
      this.boat.invulnerableTimer = 1.0;
    } else {
      this.boat.weaponLevel = Math.max(1, this.boat.weaponLevel - 1);
      this.sound.playCrash();
      if (this.camera) this.camera.addTrauma(0.4);
      if (this.fx) this.fx.flashRed(160);
      this.fx.addFloatText(this.boat.x, this.boat.y - 30, '⚠️ 船体中弹！火力降级！', '#ff4d4d');
      this.boat.invulnerableTimer = 1.5;
    }
  }

  // 生成 Boss 阶段 1 (Titanium Health & Dual Guards)
  spawnBossPhase1() {
    this.boss = {
      x: 640,
      y: 180,
      phase: 1,
      hp: 2600,
      maxHp: 2600,
      shieldActive: true,
      breakTimer: 0,
      hitFlashTimer: 0,
      transitionTimer: 0,
      shootTimer: 1.0,
      attackPhase: 0,
      isChargingLaser: false,
      isFiringLaser: false,
      laserSweepX: 640,
      alive: true
    };

    this.enemies.push({
      type: 'tentacle',
      x: this.boss.x - 160,
      y: this.boss.y + 35,
      guardOffset: -160,
      isBossGuard: true,
      radius: 34,
      hp: 550,
      maxHp: 550,
      scoreVal: 300,
      shootTimer: 0.8,
      alive: true
    });

    this.enemies.push({
      type: 'tentacle',
      x: this.boss.x + 160,
      y: this.boss.y + 35,
      guardOffset: 160,
      isBossGuard: true,
      radius: 34,
      hp: 550,
      maxHp: 550,
      scoreVal: 300,
      shootTimer: 0.8,
      alive: true
    });

    this.sound.playSteamWhistle();
    this.fx.toast('⚠️ 阶段 1：克拉肯展开深海雷暴护盾 (75% 减伤)！先斩断左右护卫触手破防！', 5000);
  }

  // 检查护卫触手状态
  checkBossGuardsStatus() {
    const guardsAlive = this.enemies.filter(e => e.isBossGuard && e.alive).length;
    if (guardsAlive === 0 && this.boss && this.boss.shieldActive) {
      this.boss.shieldActive = false;
      this.boss.breakTimer = 4.0;
      this.sound.playVictory();
      if (this.camera) this.camera.addTrauma(0.45);
      this.fx.addFloatText(this.boss.x, this.boss.y - 40, '★ SHIELD BREAK! 破防眩晕 4 秒！150% 爆发！', '#ffd700');
      this.fx.toast('★ 护盾破碎！克拉肯陷入破防眩晕！全力输出！', 3500);
      particles.emitSparkles(this.boss.x, this.boss.y, 40);
    }
  }

  // 重新生成护卫触手
  respawnBossGuards() {
    if (!this.boss || !this.boss.alive || this.boss.phase !== 1) return;
    this.boss.shieldActive = true;
    this.fx.toast('⚠️ 克拉肯重新唤醒深海雷暴护盾！', 2500);

    this.enemies.push({
      type: 'tentacle',
      x: this.boss.x - 160,
      y: this.boss.y + 35,
      guardOffset: -160,
      isBossGuard: true,
      radius: 34,
      hp: 450,
      maxHp: 450,
      scoreVal: 200,
      shootTimer: 0.8,
      alive: true
    });

    this.enemies.push({
      type: 'tentacle',
      x: this.boss.x + 160,
      y: this.boss.y + 35,
      guardOffset: 160,
      isBossGuard: true,
      radius: 34,
      hp: 450,
      maxHp: 450,
      scoreVal: 200,
      shootTimer: 0.8,
      alive: true
    });
  }

  // 触发 Boss 阶段 2：灭世狂暴 (HP 4200)
  triggerBossPhase2() {
    this.boss.phase = 2;
    this.boss.hp = 4200;
    this.boss.maxHp = 4200;
    this.boss.shieldActive = false;
    this.boss.transitionTimer = 1.5; // 转场无敌帧
    this.boss.shootTimer = 1.5;
    this.boss.isChargingLaser = false;
    this.boss.isFiringLaser = false;

    // 清除场上普通敌人与敌弹
    this.enemies = this.enemies.filter(e => !e.isBossGuard);
    this.enemyBullets = [];
    this.clusterOrbs = [];

    this.sound.playThunder();
    this.sound.playSteamWhistle();
    if (this.camera) this.camera.addTrauma(0.8);
    this.fx.flashRed(300);
    this.fx.addFloatText(this.boss.x, this.boss.y - 50, '🔥 PHASE 2: 灭世狂暴觉醒！', '#ff0044');
    this.fx.toast('🔥 阶段 2 狂暴觉醒！瞄准中央【弱点风暴之心】暴击轰杀！注意闪避扫射死光！', 5500);
    particles.emitSparkles(this.boss.x, this.boss.y, 60);
  }

  // 击杀 Boss
  killBoss() {
    this.boss.alive = false;
    this.bossDefeated = true;
    this.score += 5000;
    this.sound.playVictory();
    if (this.camera) this.camera.addTrauma(0.85);
    this.fx.addFloatText(this.boss.x, this.boss.y, '🎉 彻底歼灭台风克拉肯巨兽！+5000', '#ffd700');
    particles.emitSparkles(this.boss.x, this.boss.y, 80);
    physicsDebris.spawnCoinFountain(this.boss.x, this.boss.y, 35);
  }

  finishGame() {
    this.running = false;
    const isSuccess = this.bossDefeated || this.distance >= this.targetDistance || this.isApproachingSteamer;
    const rank = isSuccess && this.timer > 10 && this.boat.weaponLevel >= 2 ? 'S' : (isSuccess ? 'A' : 'B');
    const daysDelta = rank === 'S' ? -1.0 : 0;

    this.sound.playVictory();

    setTimeout(() => {
      this.complete({
        result: isSuccess ? 'perfect' : 'good',
        rank,
        score: this.score + (isSuccess ? 3000 : 500),
        daysDelta,
        moneyDelta: -500,
        flags: {
          typhoonConquered: true,
          steamerBoarded: true,
          bossKrakenDefeated: this.bossDefeated
        },
        comment: isSuccess
          ? '约翰船长：「灭世克拉肯巨兽彻底沉入海底！科罗拉多号汽笛长鸣！福克先生，我们成功赶上了前往横滨与旧金山的远洋巨轮！」'
          : '坦克德尔号虽历经惊涛骇浪与海怪突袭，终护送全员安然赶赴横滨港口。'
      });
    }, 1000);
  }

  render(ctx) {
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. 实景南中国海透纳暴风雨海面背景
    if (this.typhoonBgImg && this.typhoonBgImg.complete && this.typhoonBgImg.naturalWidth > 0) {
      ctx.drawImage(this.typhoonBgImg, 0, 0, w, h);
      ctx.fillStyle = 'rgba(5, 12, 20, 0.32)';
      ctx.fillRect(0, 0, w, h);
    } else {
      const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
      oceanGrad.addColorStop(0, '#050912');
      oceanGrad.addColorStop(0.4, '#0a1626');
      oceanGrad.addColorStop(0.8, '#082535');
      oceanGrad.addColorStop(1, '#051824');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. 雷暴全屏白紫高能辉光
    if (this.lightningAlpha > 0) {
      ctx.fillStyle = 'rgba(215, 230, 255, ' + (this.lightningAlpha * 0.45) + ')';
      ctx.fillRect(0, 0, w, h);
    }

    // 3. 层层席卷的物理巨浪海面 (Rolling Sea Layers)
    for (let layer = 1; layer <= 3; layer++) {
      ctx.fillStyle = layer === 1 ? 'rgba(10, 42, 65, 0.55)' : (layer === 2 ? 'rgba(12, 60, 88, 0.72)' : 'rgba(15, 78, 110, 0.88)');
      ctx.beginPath();
      ctx.moveTo(0, 160 + layer * 85);
      for (let x = 0; x <= w; x += 40) {
        const wy = 160 + layer * 85 + Math.sin(x * 0.018 + this.waveTime * layer) * (18 + layer * 8);
        ctx.lineTo(x, wy);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
    }

    // 4. 绘制飘落的强化道具 (Power-Ups)
    for (const pu of this.powerUps) {
      if (pu.alive) {
        SpriteEngine.drawPowerUpItem(ctx, pu.x, pu.y, pu.type, this.animTime);
      }
    }

    // 5. 绘制敌人 (Enemies)
    for (const e of this.enemies) {
      if (e.alive) {
        if (e.type === 'pirate') {
          SpriteEngine.drawPirateCutter(ctx, e.x, e.y, this.animTime);
        } else if (e.type === 'tentacle') {
          SpriteEngine.drawKrakenTentacle(ctx, e.x, e.y, e.hp / e.maxHp, this.animTime);
        } else {
          SpriteEngine.drawSeaReefRock(ctx, e.x, e.y, e.radius, this.animTime);
        }
      }
    }

    // 6. 绘制关底 Boss：双阶段克拉肯巨兽 (Kraken Boss)
    if (this.boss && this.boss.alive) {
      SpriteEngine.drawKrakenBoss(
        ctx,
        this.boss.x,
        this.boss.y,
        this.boss.hp / this.boss.maxHp,
        this.boss.phase,
        this.boss.shieldActive,
        this.boss.isChargingLaser,
        this.boss.laserChargeRatio,
        this.boss.hitFlashTimer > 0,
        this.animTime
      );

      // 阶段 2 绘制动态横向扫射激光束
      if (this.boss.isFiringLaser) {
        SpriteEngine.drawKrakenLaser(ctx, this.boss.x, this.boss.y + 35, this.boss.laserSweepX, 720, this.animTime);
      }
    }

    // 7. 绘制散裂高能雷球 (Cluster Orbs)
    ctx.save();
    for (const orb of this.clusterOrbs) {
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // 8. 绘制终点：科罗拉多号大客轮 (SS Colorado)
    if (this.isApproachingSteamer) {
      SpriteEngine.drawSSColoradoSteamer(ctx, w / 2, this.steamerY, 440, 200, this.animTime);
    }

    // 9. 绘制玩家子弹 (Player Bullets)
    ctx.save();
    for (const b of this.playerBullets) {
      if (b.isLaser) {
        ctx.strokeStyle = '#50e3c2';
        ctx.lineWidth = 14;
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x, b.y - 120);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x, b.y - 120);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y - 1, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // 10. 绘制敌方红色风暴弹幕 (Enemy Bullets)
    ctx.save();
    ctx.fillStyle = '#ff0055';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 8;
    for (const eb of this.enemyBullets) {
      ctx.beginPath();
      ctx.arc(eb.x, eb.y, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // 11. 绘制主角「坦克德尔号」战船 (Player Ship)
    ctx.save();
    if (this.boat.invulnerableTimer > 0 && Math.sin(this.animTime * 30) > 0) {
      ctx.globalAlpha = 0.5;
    }
    SpriteEngine.drawTankadereSchooner(
      ctx,
      this.boat.x,
      this.boat.y,
      this.boat.tilt,
      0.8,
      this.boat.weaponLevel >= 3,
      this.animTime
    );

    // 护盾光环 (Shield Bubble)
    if (this.boat.shield > 0) {
      ctx.strokeStyle = 'rgba(80, 227, 194, 0.85)';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(this.boat.x, this.boat.y, 52, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // 12. 倾盆暴雨雨丝渲染 (Storm Raindrops)
    ctx.save();
    ctx.strokeStyle = 'rgba(200, 225, 255, 0.42)';
    ctx.lineWidth = 1.5;
    this.rainDrops.forEach(r => {
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - 8, r.y + r.len);
      ctx.stroke();
    });
    ctx.restore();

    // 13. 穿云核爆闪光
    if (this.flashAlpha > 0) {
      ctx.fillStyle = 'rgba(255, 235, 170, ' + this.flashAlpha + ')';
      ctx.fillRect(0, 0, w, h);
    }

    // 14. 顶部 HUD 街机仪表盘
    this.drawArcadeHUD(ctx);
  }

  drawArcadeHUD(ctx) {
    const w = this.canvas.width;
    ctx.save();

    // 顶部黑金控制面板
    ctx.fillStyle = 'rgba(8, 14, 22, 0.92)';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.fillRect(100, 12, w - 200, 52);
    ctx.strokeRect(100, 12, w - 200, 52);

    // 1. 火力等级指示
    ctx.fillStyle = '#ff4d4d';
    ctx.font = '900 16px "Baskerville", serif';
    ctx.textAlign = 'left';
    ctx.fillText('⚡ 火力: LV.' + this.boat.weaponLevel, 125, 43);

    // 2. 护盾与核爆大招
    ctx.fillStyle = '#50e3c2';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('🛡️ 护盾: ' + this.boat.shield + ' | 💥 核爆: ' + this.boat.bombs + ' [B/Q]', 250, 43);

    // 3. 航程进度
    const prog = Math.min(1.0, this.distance / this.targetDistance);
    const barX = 540;
    const barW = 280;

    ctx.fillStyle = '#1c2321';
    ctx.fillRect(barX, 26, barW, 16);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, 26, barW, 16);

    ctx.fillStyle = '#ffd700';
    ctx.fillRect(barX + 2, 28, (barW - 4) * prog, 12);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      '航程: ' + Math.floor(this.distance) + ' / ' + this.targetDistance + ' nm (' + Math.floor(prog * 100) + '%)',
      barX + barW / 2,
      39
    );

    // 4. 战绩得分与倒计时
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffe87c';
    ctx.font = '900 15px "Baskerville", serif';
    ctx.fillText('🏆 ' + this.score + ' PTS | ⏱️ ' + Math.ceil(this.timer) + 's', w - 125, 43);

    ctx.restore();
  }
}
