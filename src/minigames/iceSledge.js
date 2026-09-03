// 《Fogg 的赌约》· 关8b 内布拉斯加极速风帆雪橇弯道赛 (正统 Pseudo-3D 街机赛道 · 冰刃飘移与大弯道走线竞速典藏版)
import { MiniGame } from './_base/MiniGame.js';
import { particles } from '../engine/particles.js';
import { physicsDebris } from '../engine/physics.js';
import { SpriteEngine } from '../engine/sprites.js';
import { GameImages } from '../assets/images.js';
import { Camera2D } from '../engine/camera.js';

export class IceSledgeMiniGame extends MiniGame {
  constructor(params) {
    super(params);

    this.camera = new Camera2D(1280, 720);

    // 赛道全局长度与分段曲率结构 (Track Length & Curvature Segments)
    this.trackLength = 2200; // 总赛程 2200 码
    this.trackSegments = [
      { start: 0, end: 320, curve: 0, label: '普拉特冰原发车直道' },
      { start: 320, end: 700, curve: 1.5, label: '弯道一：普拉特河大右急弯 (贴内道 Apex!)' },
      { start: 700, end: 1100, curve: -1.8, label: '弯道二：黑针松林左连环 S 弯 (飘移集气!)' },
      { start: 1100, end: 1500, curve: 2.2, label: '弯道三：暴风雪发卡大回旋 (急转飘移小喷!)' },
      { start: 1500, end: 1850, curve: 0, label: '冰封峡谷黄金加速直道 (顺风张帆!)' },
      { start: 1850, end: 2200, curve: -0.6, label: '奥马哈车站冲线跳台 (飞跃夺冠!)' }
    ];

    // 玩家雪橇动力学 (Player Sled Physics)
    this.player = {
      x: 0, // -1.0(左路肩) ~ 0(赛道中心) ~ +1.0(右路肩)
      distance: 0,
      speed: 50, // MPH
      baseSpeed: 50,
      maxSpeed: 95,
      driftDir: 0,
      driftCharge: 0,
      isDrifting: false,
      isTrimmingSail: false,
      isAirborne: false,
      airY: 0,
      jumpVy: 0,
      offroadTimer: 0,
      offroadToastTimer: 0,
      slipstreamTime: 0
    };

    // AI 竞争对手雪橇 (Rival Sail Sledges)
    this.rivals = [
      { id: 1, name: '荒原飞鹰号', x: -0.4, distance: 120, speed: 52, color: '#e53935' },
      { id: 2, name: '内布拉斯加快马', x: 0.35, distance: 280, speed: 56, color: '#1e88e5' },
      { id: 3, name: '落基山开拓者号', x: 0.1, distance: 540, speed: 60, color: '#43a047' }
    ];

    // 赛道地标与实体
    this.trackProps = [];
    this.initTrackProps();

    this.timer = 45.0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.rankPosition = 4;

    this.animTime = 0;
    this.sledgeBgImg = new Image();
    const sledgeSrc = GameImages.nebraska_blizzard_sledge || GameImages.nebraska_sledge || GameImages.nebraska_blizzard_sledge_art;
    if (sledgeSrc) this.sledgeBgImg.src = sledgeSrc;
  }

  initTrackProps() {
    this.trackProps = [
      { distance: 150, x: 0, type: 'boost' },
      { distance: 240, x: -0.3, type: 'warmer' },
      { distance: 420, x: 0.55, type: 'boost' },
      { distance: 520, x: -0.7, type: 'pine' },
      { distance: 620, x: 0.5, type: 'boost' },
      { distance: 780, x: -0.5, type: 'boost' },
      { distance: 880, x: 0, type: 'ramp' },
      { distance: 980, x: 0.6, type: 'pine' },
      { distance: 1050, x: -0.4, type: 'warmer' },
      { distance: 1180, x: 0.65, type: 'boost' },
      { distance: 1300, x: -0.6, type: 'pine' },
      { distance: 1400, x: 0.5, type: 'boost' },
      { distance: 1580, x: -0.2, type: 'boost' },
      { distance: 1680, x: 0.2, type: 'boost' },
      { distance: 1780, x: 0, type: 'boost' },
      { distance: 1950, x: 0, type: 'ramp' },
      { distance: 2160, x: 0, type: 'finish_gate' }
    ];
  }

  init() {
    this.player.x = 0;
    this.player.distance = 0;
    this.player.speed = 50;
    this.player.driftDir = 0;
    this.player.driftCharge = 0;
    this.player.isDrifting = false;
    this.player.isTrimmingSail = false;
    this.player.isAirborne = false;
    this.player.airY = 0;
    this.player.jumpVy = 0;
    this.player.offroadTimer = 0;
    this.player.offroadToastTimer = 0;
    this.player.slipstreamTime = 0;

    this.rivals[0].distance = 120;
    this.rivals[1].distance = 280;
    this.rivals[2].distance = 540;

    this.timer = 45.0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.rankPosition = 4;
    this.animTime = 0;

    this.camera.setWorldBounds(0, 1280, 0, 720);
    this.camera.follow(640, 360, true);

    this.input.configureUI({
      showDpad: true,
      showA: true,
      showB: true,
      labelA: '顺风扬帆 [W/空格]',
      labelB: '冰刃飘移 [S/下]'
    });

    if (this.sound.music) this.sound.music.playTheme('iceRacer');
    this.sound.playSteamWhistle();
    this.fx.toast('🏁 【冰原正统赛道飘移赛】[A/D 走线入弯] [S 飘移集气小喷] [W 顺风加速]！', 6000);
  }

  getCurvatureAt(dist) {
    for (const seg of this.trackSegments) {
      if (dist >= seg.start && dist < seg.end) {
        return seg.curve;
      }
    }
    return 0;
  }

  getSegmentLabelAt(dist) {
    for (const seg of this.trackSegments) {
      if (dist >= seg.start && dist < seg.end) {
        return seg.label;
      }
    }
    return '奥马哈冲刺段';
  }

  update(rawDt) {
    if (!this.running || this.paused) return;
    const dt = Math.max(0.0001, rawDt || 0.016);

    this.timer -= dt;
    this.animTime += dt;

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    if (this.player.offroadToastTimer > 0) {
      this.player.offroadToastTimer -= dt;
    }

    const inp = this.input ? this.input.input : null;
    const keys = inp ? (inp.keys || {}) : {};
    const btns = inp ? (inp.buttons || {}) : {};
    const axis = inp ? (inp.axis || { x: 0, y: 0 }) : { x: 0, y: 0 };
    const pointer = inp ? (inp.pointer || {}) : {};

    // 1. 转向与走线输入
    let steerDir = 0;
    if (keys['ArrowLeft'] || keys['KeyA'] || btns.left || axis.x < -0.2) steerDir -= 1;
    if (keys['ArrowRight'] || keys['KeyD'] || btns.right || axis.x > 0.2) steerDir += 1;

    if (pointer.down) {
      const cx = (pointer.x - 640) / 450;
      if (Math.abs(cx - this.player.x) > 0.1) {
        steerDir = Math.sign(cx - this.player.x);
      }
    }

    // 2. 顺风扬帆破风加速 (W / Space / Button A)
    this.player.isTrimmingSail = keys['KeyW'] || keys['Space'] || btns.A || (pointer.down && pointer.y < 340);

    if (this.player.isTrimmingSail) {
      this.player.speed = Math.min(this.player.maxSpeed, this.player.speed + 15 * dt);
      if (Math.random() < 0.4) particles.emitSteam(640 + this.player.x * 380, 560, 2);
    } else {
      if (this.player.speed > this.player.baseSpeed) {
        this.player.speed -= 6 * dt;
      }
    }

    // 3. 弯道离心力物理 (Centrifugal Force)
    const currentCurve = this.getCurvatureAt(this.player.distance);
    const centrifugalForce = currentCurve * (this.player.speed / 50) * 0.95;

    // 4. 冰刃飘移机制 (Power Slide Drift & Mini-Turbo)
    const wantsDrift = (keys['KeyS'] || keys['ArrowDown'] || btns.B) && steerDir !== 0;

    if (wantsDrift && !this.player.isAirborne) {
      this.player.isDrifting = true;
      this.player.driftDir = steerDir;
      this.player.driftCharge = Math.min(100, this.player.driftCharge + 65 * dt);

      this.player.x += (steerDir * 1.8 - centrifugalForce * 0.4) * dt;

      const screenPx = 640 + this.player.x * 380;
      particles.emitSparkles(screenPx - steerDir * 40, 560, 4);

    } else if (this.player.isDrifting) {
      if (this.player.driftCharge >= 30) {
        this.sound.playWhoosh();
        const boostAmt = this.player.driftCharge >= 70 ? 28 : 18;
        this.player.speed = Math.min(this.player.maxSpeed, this.player.speed + boostAmt);
        const screenPx = 640 + this.player.x * 380;
        this.fx.addFloatText(screenPx, 460, '⚡ MINI-TURBO 极速小喷! +' + boostAmt + 'MPH', '#00e5ff');
        particles.emitSparkles(screenPx, 530, 25);
        if (this.camera) this.camera.addTrauma(0.32);
      }
      this.player.isDrifting = false;
      this.player.driftCharge = 0;
      this.player.driftDir = 0;
    } else {
      this.player.driftDir = steerDir * 0.5;
      this.player.x += (steerDir * 1.3 - centrifugalForce * 0.8) * dt;
    }

    // 5. 赛道路肩与深雪减速物理 (防重复弹窗)
    const isOffroad = Math.abs(this.player.x) > 0.88;
    if (isOffroad && !this.player.isAirborne) {
      this.player.offroadTimer += dt;
      this.player.speed = Math.max(26, this.player.speed - 35 * dt);
      const screenPx = 640 + this.player.x * 380;
      particles.emitSparkles(screenPx, 550, 5);

      if (this.player.offroadToastTimer <= 0) {
        this.sound.playCrash();
        this.fx.addFloatText(screenPx, 480, '⚠️ 陷入深雪道牙！减速', '#ff4d4d');
        this.player.offroadToastTimer = 1.8;
      }
    } else {
      this.player.offroadTimer = 0;
    }

    this.player.x = Math.max(-1.25, Math.min(1.25, this.player.x));

    // 6. 凌空跳台飞跃物理
    if (this.player.isAirborne) {
      this.player.airY += this.player.jumpVy * dt;
      this.player.jumpVy -= 420 * dt;
      if (this.player.airY <= 0) {
        this.player.airY = 0;
        this.player.isAirborne = false;
        this.sound.playCrash();
        const screenPx = 640 + this.player.x * 380;
        particles.emitSparkles(screenPx, 550, 20);
        this.fx.addFloatText(screenPx, 460, '★ 完美着陆!', '#50e3c2');
      }
    }

    // 7. 里程推进
    this.player.distance += this.player.speed * 2.4 * dt;
    this.score += Math.floor(this.player.speed * 1.6 * dt);

    // 8. 竞争对手 AI 模拟
    let aheadCount = 0;
    for (const r of this.rivals) {
      r.distance += r.speed * 2.35 * dt;

      const distDiff = r.distance - this.player.distance;
      const xDiff = Math.abs(r.x - this.player.x);

      if (distDiff > 0 && distDiff < 60 && xDiff < 0.25) {
        this.player.slipstreamTime += dt;
        if (this.player.slipstreamTime > 1.0) {
          this.player.slipstreamTime = 0;
          this.sound.playWhoosh();
          this.player.speed = Math.min(this.player.maxSpeed, this.player.speed + 16);
          const screenPx = 640 + this.player.x * 380;
          this.fx.addFloatText(screenPx, 460, '💨 尾流破风吸附加速! +16MPH', '#ffd700');
          particles.emitSparkles(screenPx, 520, 16);
        }
      }

      if (this.player.distance > r.distance && this.player.distance - r.distance < 8) {
        this.sound.playVictory();
        this.combo++;
        this.comboTimer = 3.0;
        this.score += 400;
        const screenPx = 640 + this.player.x * 380;
        this.fx.addFloatText(screenPx, 440, '🏁 超越 ' + r.name + '! +400', '#ffd700');
      }

      if (r.distance > this.player.distance) aheadCount++;
    }
    this.rankPosition = 1 + aheadCount;

    // 9. 赛道固定道具交互判定
    for (const prop of this.trackProps) {
      if (!prop.collected && Math.abs(prop.distance - this.player.distance) < 18) {
        const dx = Math.abs(prop.x - this.player.x);
        const screenPx = 640 + this.player.x * 380;

        if (prop.type === 'boost' && dx < 0.45) {
          prop.collected = true;
          this.sound.playCoin();
          this.player.speed = Math.min(this.player.maxSpeed, this.player.speed + 18);
          this.combo++;
          this.comboTimer = 2.5;
          const pts = 300 * (1 + this.combo * 0.2);
          this.score += pts;
          this.fx.addFloatText(screenPx, 460, '⚡ 黄金加速板! +' + Math.floor(pts), '#ffd700');
          particles.emitSparkles(screenPx, 520, 20);

        } else if (prop.type === 'warmer' && dx < 0.35) {
          prop.collected = true;
          this.sound.playVictory();
          this.timer += 2.5;
          this.score += 400;
          this.fx.addFloatText(screenPx, 460, '☕ 暖炉驱寒! 时间+2.5s', '#ff77aa');
          particles.emitSparkles(screenPx, 520, 16);

        } else if (prop.type === 'ramp' && dx < 0.5) {
          prop.collected = true;
          this.player.isAirborne = true;
          this.player.jumpVy = 260;
          this.sound.playJump();
          this.score += 600;
          this.fx.addFloatText(screenPx, 420, '🦅 凌空大飞跃! +600', '#00e5ff');
          if (this.camera) this.camera.addTrauma(0.4);

        } else if (prop.type === 'pine' && dx < 0.35 && !this.player.isAirborne) {
          prop.collected = true;
          this.sound.playCrash();
          this.player.speed = Math.max(24, this.player.speed - 22);
          this.fx.flashRed(140);
          this.fx.addFloatText(screenPx, 460, '🌲 撞击松树倒木！-22MPH', '#ff4d4d');
          if (this.camera) this.camera.addTrauma(0.45);
        }
      }
    }

    if (this.player.distance >= this.trackLength || this.timer <= 0) {
      this.finishGame();
    }
  }

  finishGame() {
    this.running = false;
    const isSuccess = this.player.distance >= this.trackLength;
    const rank = isSuccess && this.rankPosition === 1 ? 'S' : (isSuccess ? 'A' : 'B');

    this.sound.playVictory();
    this.sound.playSteamWhistle();

    setTimeout(() => {
      this.complete({
        result: isSuccess ? 'perfect' : 'pass',
        rank,
        score: this.score + (5 - this.rankPosition) * 500 + Math.floor(this.player.speed * 20),
        daysDelta: rank === 'S' ? -0.5 : 0,
        comment: isSuccess
          ? '★ 马奇风帆雪橇以第 ' + this.rankPosition + ' 名率先横穿 2200 码冰原赛道，成功冲入奥马哈车站！'
          : '雪橇滑行抵达内布拉斯加东部，顺利换乘快车直扑纽约！',
        flags: { iceSledgeWon: true, rank1st: this.rankPosition === 1 }
      });
    }, 1000);
  }

  render(ctx) {
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. 实景 16:9 内布拉斯加极地暴风雪雪原背景原画
    if (this.sledgeBgImg && this.sledgeBgImg.complete && this.sledgeBgImg.naturalWidth > 0) {
      ctx.drawImage(this.sledgeBgImg, 0, 0, w, h);
    } else {
      const snowGrad = ctx.createLinearGradient(0, 0, 0, h);
      snowGrad.addColorStop(0, '#546e7a');
      snowGrad.addColorStop(0.4, '#90a4ae');
      snowGrad.addColorStop(0.8, '#cfd8dc');
      snowGrad.addColorStop(1, '#eceff1');
      ctx.fillStyle = snowGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. 绘制平滑连续的 Pseudo-3D 弯道冰原赛道
    this.drawPseudo3DCurvedTrack(ctx);

    // 3. 绘制赛道上的竞争对手雪橇
    for (const r of this.rivals) {
      const relDist = r.distance - this.player.distance;
      if (relDist > -30 && relDist < 260) {
        const depthScale = Math.max(0.3, 1.0 - relDist / 280);
        const rx = 640 + (r.x * 420 + this.getCurvatureAt(r.distance) * (260 - relDist) * 0.3) * depthScale;
        const ry = 540 - relDist * 1.1;

        ctx.save();
        ctx.translate(rx, ry);
        ctx.scale(depthScale * 0.9, depthScale * 0.9);
        SpriteEngine.drawIceSledge(ctx, 0, 0, r.speed, 0, false, this.animTime);

        ctx.fillStyle = r.color;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(r.name, 0, -180);
        ctx.restore();
      }
    }

    // 4. 绘制玩家真正 3D 后视维多利亚风帆雪橇 (Master Player Sledge viewed from rear)
    const playerScreenX = 640 + this.player.x * 380;
    const playerScreenY = 560 - this.player.airY;

    ctx.save();
    ctx.translate(playerScreenX, playerScreenY);
    ctx.scale(1.15, 1.15);
    SpriteEngine.drawIceSledge(
      ctx,
      0,
      0,
      this.player.speed,
      this.player.driftDir,
      this.player.isTrimmingSail,
      this.animTime
    );
    ctx.restore();

    // 5. 迎面呼啸而过的 3D 暴风雪极速粒子流
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (let i = 0; i < 45; i++) {
      const sx = (i * 28 + this.player.distance * 1.5 + Math.sin(i + this.animTime) * 40) % w;
      const sy = (i * 22 + this.player.distance * 2.8) % h;
      const sz = ((i % 4) + 1.2) * (this.player.speed / 50);
      ctx.beginPath();
      ctx.arc(sx, sy, sz, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 6. 顶部经典街机赛车 HUD 仪表盘
    this.drawArcadeRacerHUD(ctx);
  }

  // 核心渲染：平滑连续的 3D 弯道冰原赛道
  drawPseudo3DCurvedTrack(ctx) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    const horizonY = 300;
    const currentCurve = this.getCurvatureAt(this.player.distance);
    const vanishingX = 640 + currentCurve * 150;

    ctx.save();

    // 1. 连续平滑绘制 3D 赛道梯形切片
    const steps = 24;
    for (let i = 0; i < steps; i++) {
      const t1 = i / steps;
      const t2 = (i + 1) / steps;

      const y1 = horizonY + (h - horizonY) * Math.pow(t1, 1.7);
      const y2 = horizonY + (h - horizonY) * Math.pow(t2, 1.7);

      const curveOffset1 = currentCurve * Math.pow(1 - t1, 1.5) * 140;
      const curveOffset2 = currentCurve * Math.pow(1 - t2, 1.5) * 140;

      const halfW1 = 70 + Math.pow(t1, 1.2) * 520;
      const halfW2 = 70 + Math.pow(t2, 1.2) * 520;

      const segDist = this.player.distance * 0.2 + i;
      const isAlt = Math.floor(segDist) % 2 === 0;

      // 冰面底色
      ctx.fillStyle = isAlt ? 'rgba(55, 95, 135, 0.95)' : 'rgba(45, 80, 115, 0.95)';
      ctx.beginPath();
      ctx.moveTo(640 + curveOffset1 - halfW1, y1);
      ctx.lineTo(640 + curveOffset1 + halfW1, y1);
      ctx.lineTo(640 + curveOffset2 + halfW2, y2);
      ctx.lineTo(640 + curveOffset2 - halfW2, y2);
      ctx.closePath();
      ctx.fill();

      // 3D 连续红白道牙 (Continuous Interlocking Kerbs)
      const kerbW1 = 18 + t1 * 40;
      const kerbW2 = 18 + t2 * 40;
      ctx.fillStyle = isAlt ? '#ffffff' : '#d32f2f';

      // 左道牙
      ctx.beginPath();
      ctx.moveTo(640 + curveOffset1 - halfW1 - kerbW1, y1);
      ctx.lineTo(640 + curveOffset1 - halfW1, y1);
      ctx.lineTo(640 + curveOffset2 - halfW2, y2);
      ctx.lineTo(640 + curveOffset2 - halfW2 - kerbW2, y2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = isAlt ? '#b0bec5' : '#8b0000';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 右道牙
      ctx.beginPath();
      ctx.moveTo(640 + curveOffset1 + halfW1, y1);
      ctx.lineTo(640 + curveOffset1 + halfW1 + kerbW1, y1);
      ctx.lineTo(640 + curveOffset2 + halfW2 + kerbW2, y2);
      ctx.lineTo(640 + curveOffset2 + halfW2, y2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 2. 赛道冰面纵向反光车辙与冰纹
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 2;
    for (let r = -2; r <= 2; r++) {
      if (r === 0) continue;
      const rx = r * 140;
      ctx.beginPath();
      ctx.moveTo(vanishingX + rx * 0.12, horizonY);
      ctx.quadraticCurveTo(640 + currentCurve * 60 + rx * 0.6, 510, 640 + rx, 720);
      ctx.stroke();
    }

    // 3. 赛道中央透视虚线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([20, 20]);
    ctx.beginPath();
    ctx.moveTo(vanishingX, horizonY);
    ctx.lineTo(640, 720);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. 弯道最佳内切走线提示 (Apex Line)
    if (Math.abs(currentCurve) > 0.5) {
      const apexSign = Math.sign(currentCurve);
      ctx.strokeStyle = 'rgba(80, 227, 194, 0.75)';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(vanishingX + apexSign * 35, horizonY);
      ctx.quadraticCurveTo(640 + apexSign * 260, 500, 640 + apexSign * 110, 720);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 5. 赛道两侧 3D 针叶松树 (Trackside Pine Trees)
    for (let p = 0; p < 7; p++) {
      const pDist = (p * 50 + (this.player.distance % 50)) / 350;
      const t = Math.max(0.05, Math.min(1.0, 1.0 - pDist));
      const py = horizonY + (h - horizonY) * Math.pow(t, 1.7);
      const curveOff = currentCurve * Math.pow(1 - t, 1.5) * 140;
      const halfW = 70 + Math.pow(t, 1.2) * 520;
      const treeScale = 28 + t * 75;

      SpriteEngine.drawPineTree3D(ctx, 640 + curveOff - halfW - 65 * t, py, treeScale);
      SpriteEngine.drawPineTree3D(ctx, 640 + curveOff + halfW + 65 * t, py, treeScale);
    }

    // 6. 绘制所有纯手绘赛道道具 (0 字文污染！)
    for (const prop of this.trackProps) {
      const relDist = prop.distance - this.player.distance;
      if (relDist > 0 && relDist < 340 && !prop.collected) {
        const t = Math.max(0, Math.min(1.0, 1.0 - relDist / 340));
        const py = horizonY + (h - horizonY) * Math.pow(t, 1.7);
        const curveOff = currentCurve * Math.pow(1 - t, 1.5) * 140;
        const px = 640 + curveOff + prop.x * (70 + Math.pow(t, 1.2) * 520);
        const pSize = 20 + t * 50;

        if (prop.type === 'boost') {
          SpriteEngine.drawBoostPad(ctx, px, py, pSize, this.animTime);
        } else if (prop.type === 'warmer') {
          SpriteEngine.drawSamovarWarmer(ctx, px, py, pSize, this.animTime);
        } else if (prop.type === 'ramp') {
          SpriteEngine.drawJumpRamp(ctx, px, py, pSize, this.animTime);
        } else if (prop.type === 'pine') {
          SpriteEngine.drawSnowLog(ctx, px, py, pSize);
        } else if (prop.type === 'finish_gate') {
          SpriteEngine.drawFinishGantry(ctx, px, py, 140 + t * 400, 80 + t * 150);
        }
      }
    }

    ctx.restore();
  }

  drawArcadeRacerHUD(ctx) {
    const w = this.canvas.width;
    ctx.save();

    // 1. 左侧：时速表与赛段提示
    ctx.fillStyle = 'rgba(15, 25, 35, 0.94)';
    ctx.fillRect(40, 25, 280, 70);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 25, 280, 70);

    ctx.fillStyle = this.player.speed >= 75 ? '#ffd700' : '#ffffff';
    ctx.font = 'bold 22px "Baskerville", serif';
    ctx.textAlign = 'left';
    ctx.fillText('🎿 ' + Math.floor(this.player.speed) + ' MPH', 55, 54);

    ctx.fillStyle = '#00e5ff';
    ctx.font = '11px sans-serif';
    ctx.fillText(this.getSegmentLabelAt(this.player.distance), 55, 80);

    // 2. 中间：奥马哈赛程进度与名次
    const barW = 340;
    ctx.fillStyle = 'rgba(15, 25, 35, 0.94)';
    ctx.fillRect(w / 2 - barW / 2, 25, barW, 50);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(w / 2 - barW / 2, 25, barW, 50);

    const distProg = Math.min(1.0, this.player.distance / this.trackLength);
    const distGrad = ctx.createLinearGradient(w / 2 - barW / 2, 25, w / 2 + barW / 2, 25);
    distGrad.addColorStop(0, '#00e5ff');
    distGrad.addColorStop(1, '#ffd700');
    ctx.fillStyle = distGrad;
    ctx.fillRect(w / 2 - barW / 2 + 3, 28, (barW - 6) * distProg, 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏁 排名: 第 ' + this.rankPosition + ' 位 | 赛程: ' + Math.floor(this.player.distance) + ' / ' + this.trackLength + ' 码 | 倒计时: ' + Math.ceil(this.timer) + 's', w / 2, 64);

    // 3. 右侧：飘移集气小喷槽
    ctx.fillStyle = 'rgba(15, 25, 35, 0.94)';
    ctx.fillRect(w - 300, 25, 260, 70);
    ctx.strokeStyle = this.player.driftCharge >= 30 ? '#ffd700' : '#00e5ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(w - 300, 25, 260, 70);

    ctx.fillStyle = this.player.isDrifting ? '#ffd700' : '#eceff1';
    ctx.font = 'bold 14px "Baskerville", serif';
    ctx.textAlign = 'left';
    ctx.fillText(this.player.isDrifting ? '⚡ 冰刃飘移集气中!' : '🎿 弯道飘移 [按 S/下]', w - 285, 50);

    const chargeProg = this.player.driftCharge / 100;
    ctx.fillStyle = '#263238';
    ctx.fillRect(w - 285, 62, 230, 18);
    if (this.player.driftCharge > 0) {
      ctx.fillStyle = chargeProg >= 0.7 ? '#ffd700' : '#00e5ff';
      ctx.fillRect(w - 285, 62, 230 * chargeProg, 18);
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.player.driftCharge >= 70 ? '🔥 SUPER TURBO READY!' : '集气松开发动小喷', w - 170, 76);

    // 4. 连击提示
    if (this.combo > 1) {
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 18;
      ctx.font = '900 28px "Baskerville", serif';
      ctx.textAlign = 'left';
      ctx.fillText(this.combo + ' HITS COMBO! ★', 55, 130);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}
