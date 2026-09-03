// 《Fogg 的赌约》· 关10 伦敦终极绝杀（美术重塑典藏版）
import { MiniGame } from './_base/MiniGame.js';
import { particles } from '../engine/particles.js';
import { GameImages } from '../assets/images.js';

export class LondonFinaleMiniGame extends MiniGame {
  constructor(params) {
    super(params);

    this.phase = 1; // 1: 浑天仪日界线顿悟, 2: 帕尔麦街马车绝杀冲刺
    this.tzOffset = 0;
    this.epiphanyUnlocked = false;

    this.cab = {
      x: 640,
      y: 520,
      w: 85,
      h: 115,
      vx: 0,
      speed: 35
    };
    this.dashTimer = 40.0;
    this.distance = 0;
    this.targetDistance = 1500;
    this.obstacles = [];
    this.spawnTimer = 0.5;
    this.score = 0;
    this.fogOffset = 0;
    this.londonNightBgImg = new Image();
    const londonSrc = GameImages.london_pall_mall_fog_night || GameImages.london_finale || GameImages.london_pall_mall_fog_night_art;
    if (londonSrc) this.londonNightBgImg.src = londonSrc;
  }

  init() {
    this.phase = 1;
    this.tzOffset = 0;
    this.epiphanyUnlocked = false;

    this.cab.x = this.canvas.width / 2;
    this.cab.vx = 0;
    this.cab.speed = 35;
    this.dashTimer = 40.0;
    this.distance = 0;
    this.obstacles = [];
    this.spawnTimer = 0.5;
    this.score = 0;
    this.fogOffset = 0;
  }

  update(rawDt) {
    if (!this.running || this.paused) return;
    const dt = Math.max(0.0001, rawDt || 0.016);
    this.fogOffset += dt * 40;

    const inp = this.input ? this.input.input : null;
    const keys = inp ? (inp.keys || {}) : {};
    const btns = inp ? (inp.buttons || {}) : {};
    const axis = inp ? (inp.axis || { x: 0, y: 0 }) : { x: 0, y: 0 };
    const pointer = inp ? (inp.pointer || {}) : {};

    if (this.phase === 1) {
      if (keys['ArrowLeft'] || keys['KeyA'] || btns.left) this.tzOffset -= 14 * dt;
      if (keys['ArrowRight'] || keys['KeyD'] || btns.right) this.tzOffset += 14 * dt;

      if (pointer.down) {
        if (pointer.x < this.canvas.width / 2 - 20) this.tzOffset -= 16 * dt;
        else if (pointer.x > this.canvas.width / 2 + 20) this.tzOffset += 16 * dt;
      }

      if (this.tzOffset >= 20 || keys['Space'] || btns.justA) {
        this.epiphanyUnlocked = true;
        this.sound.playBigBen();
        this.fx.addFloatText(640, 320, '★ 顿悟！一路向东航行多得整整一天！今天是星期六！', '#ffd700');
        particles.emitSparkles(640, 360, 35);
        setTimeout(() => {
          this.phase = 2;
          this.fx.toast('【绝杀冲刺】驾驶四轮特快马车直扑帕尔麦街改良俱乐部！', 3000);
        }, 1200);
      }
    } else {
      this.dashTimer -= dt;

      let steerDir = 0;
      if (keys['ArrowLeft'] || keys['KeyA'] || btns.left || axis.x < -0.2) steerDir -= 1;
      if (keys['ArrowRight'] || keys['KeyD'] || btns.right || axis.x > 0.2) steerDir += 1;

      if (pointer.down) {
        if (pointer.x < this.cab.x - 20) steerDir = -1;
        else if (pointer.x > this.cab.x + 20) steerDir = 1;
      }

      this.cab.vx = steerDir * 440;
      this.cab.x += this.cab.vx * dt;
      this.cab.x = Math.max(130, Math.min(this.canvas.width - 130, this.cab.x));

      if (keys['Space'] || keys['KeyJ'] || btns.justA) {
        this.cab.speed = Math.min(68, this.cab.speed + 28 * dt);
        this.sound.playWhoosh();
        particles.emitSparks(this.cab.x, this.cab.y + 45, 4);
      } else {
        this.cab.speed = Math.max(30, this.cab.speed - 10 * dt);
      }

      this.distance += this.cab.speed * 2.2 * dt;
      this.score += Math.floor(this.cab.speed * dt);

      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.obstacles.push({
          x: 150 + Math.random() * (this.canvas.width - 300),
          y: 80,
          radius: 32,
          alive: true
        });
        this.spawnTimer = 0.55 + Math.random() * 0.4;
      }

      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const o = this.obstacles[i];
        o.y += (230 + this.cab.speed * 4) * dt;

        if (o.alive && Math.abs(o.x - this.cab.x) < 48 && Math.abs(o.y - this.cab.y) < 48) {
          o.alive = false;
          this.sound.playCrash();
          this.cab.speed = 20;
          this.fx.flashRed(150);
          this.fx.addFloatText(this.cab.x, this.cab.y - 20, '⚠️ 避让行人！减速', '#ff4d4d');
        }

        if (o.y > 720) this.obstacles.splice(i, 1);
      }

      if (this.distance >= this.targetDistance || this.dashTimer <= 0) {
        this.finishGame();
      }
    }
  }

  finishGame() {
    this.running = false;
    setTimeout(() => {
      this.sound.playBigBen();
      this.complete({
        result: 'perfect',
        rank: 'S',
        score: this.score + 2000,
        daysDelta: -1.0,
        comment: '★ 历史性绝杀！福克先生在第 80 天 20 点 45 分跨入改良俱乐部大门！',
        flags: { gameCompleted: true, betWon: true }
      });
    }, 800);
  }

  render(ctx) {
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (this.phase === 1) {
      // 阶段一：维多利亚黄铜浑天仪日界线顿悟手绘场景
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#0c1322');
      bgGrad.addColorStop(0.5, '#1e1a17');
      bgGrad.addColorStop(1, '#0c0a08');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#ffe87c';
      ctx.font = 'bold 24px "Baskerville", serif';
      ctx.textAlign = 'center';
      ctx.fillText('🌍 经度时空之谜 · 国际日期变更线日界线顿悟', w / 2, 65);

      // 巨型黄铜浑天仪同心圆环 (Brass Armillary Sphere)
      const cx = w / 2;
      const cy = 330;

      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, 175, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#8c6d23';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 140, 0, Math.PI * 2);
      ctx.stroke();

      // 经度刻度线与 24 时区表
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const x1 = cx + Math.cos(a) * 165;
        const y1 = cy + Math.sin(a) * 165;
        const x2 = cx + Math.cos(a) * 145;
        const y2 = cy + Math.sin(a) * 145;
        ctx.strokeStyle = i % 6 === 0 ? '#ffd700' : '#d4af37';
        ctx.lineWidth = i % 6 === 0 ? 3 : 1.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.fillStyle = '#ffde59';
      ctx.font = 'bold 18px "Baskerville", serif';
      ctx.fillText('一路向东环球 ➔ 跨越 360° 经线 ➔ 夺回整整 24 小时！', cx, cy - 15);
      ctx.fillStyle = '#50e3c2';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('今天是 1872年12月21日 星期六！赌约尚未截止！', cx, cy + 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('按 [空格] 或 [→] 确认顿悟，即刻启程飞车！', cx, 570);
    } else {
      // 阶段二：实景 16:9 帕尔麦街煤气灯迷雾与大本钟手绘油画原画 (Pall Mall London Night Fog)
      if (this.londonNightBgImg && this.londonNightBgImg.complete && this.londonNightBgImg.naturalWidth > 0) {
        ctx.drawImage(this.londonNightBgImg, 0, 0, w, h);
        ctx.fillStyle = 'rgba(20, 16, 12, 0.25)';
        ctx.fillRect(0, 0, w, h);
      } else {
        const fogGrad = ctx.createLinearGradient(0, 0, 0, h);
        fogGrad.addColorStop(0, '#2e261f');
        fogGrad.addColorStop(0.5, '#4a3d31');
        fogGrad.addColorStop(1, '#201812');
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // 绘制【维多利亚四轮特快双马马车与飞驰车灯】
      ctx.save();
      ctx.translate(this.cab.x, this.cab.y);

      const gallopBob = Math.sin(Date.now() * 0.015) * 5;

      // 前方两匹疾驰的黑色纯种骏马 (Twin Galloping Steeds)
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      // 左马
      ctx.ellipse(-20, -this.cab.h / 2 - 45 + gallopBob, 14, 28, 0, 0, Math.PI * 2);
      // 右马
      ctx.ellipse(20, -this.cab.h / 2 - 45 - gallopBob, 14, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 皮革缰绳
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-15, -this.cab.h / 2 - 25);
      ctx.lineTo(-10, -this.cab.h / 2);
      ctx.moveTo(15, -this.cab.h / 2 - 25);
      ctx.lineTo(10, -this.cab.h / 2);
      ctx.stroke();

      // 车厢外壳（深黑漆面配金边）
      ctx.fillStyle = '#140e09';
      ctx.fillRect(-this.cab.w / 2, -this.cab.h / 2, this.cab.w, this.cab.h);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 3;
      ctx.strokeRect(-this.cab.w / 2, -this.cab.h / 2, this.cab.w, this.cab.h);

      // 车后座高耸车夫（挥舞皮鞭）
      ctx.fillStyle = '#261a10';
      ctx.fillRect(-14, this.cab.h / 2 - 18, 28, 22);
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(0, this.cab.h / 2 - 12, 6, 0, Math.PI * 2);
      ctx.fill();

      // 左右黄铜车灯与穿透浓雾的强光光锥 (Volumetric Lantern Beams)
      ctx.fillStyle = 'rgba(255, 235, 140, 0.4)';
      ctx.beginPath();
      ctx.moveTo(-this.cab.w / 2 - 6, -this.cab.h / 2 + 10);
      ctx.lineTo(-this.cab.w / 2 - 65, -this.cab.h / 2 - 110);
      ctx.lineTo(-this.cab.w / 2 + 25, -this.cab.h / 2 - 110);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(this.cab.w / 2 + 6, -this.cab.h / 2 + 10);
      ctx.lineTo(this.cab.w / 2 - 25, -this.cab.h / 2 - 110);
      ctx.lineTo(this.cab.w / 2 + 65, -this.cab.h / 2 - 110);
      ctx.closePath();
      ctx.fill();

      // 车体金色花押
      ctx.fillStyle = '#ffe87c';
      ctx.font = 'bold 12px "Baskerville", serif';
      ctx.textAlign = 'center';
      ctx.fillText('★ REFORM CLUB EXPRESS ★', 0, 4);
      ctx.restore();

      // 路障与货箱
      for (const o of this.obstacles) {
        if (o.alive) {
          ctx.fillStyle = '#4a2f1b';
          ctx.beginPath();
          ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('📦 避让', o.x, o.y + 4);
        }
      }

      // 底部 HUD
      ctx.fillStyle = 'rgba(12, 8, 5, 0.95)';
      ctx.fillRect(180, 645, w - 360, 60);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.strokeRect(180, 645, w - 360, 60);

      const prog = Math.min(1.0, this.distance / this.targetDistance);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(200, 658, (w - 400) * prog, 14);

      ctx.fillStyle = '#ffe87c';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🏁 冲向改良俱乐部: ${Math.floor(this.distance)} / ${this.targetDistance}m | 速度: ${this.cab.speed} MPH | [空格] 扬鞭飞车 | 剩余: ${Math.ceil(this.dashTimer)}s`, w / 2, 688);
    }
  }
}
