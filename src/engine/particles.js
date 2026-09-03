// 粒子系统 ParticleSystem
export class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.particles = [];
  }

  setCanvas(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
  }

  // 1. 发射蒸汽云雾
  emitSteam(x, y, count = 3) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        type: 'steam',
        x: x + (Math.random() * 20 - 10),
        y: y + (Math.random() * 10 - 5),
        vx: (Math.random() * 2 - 1) * 0.8,
        vy: -Math.random() * 2.5 - 1.0,
        radius: Math.random() * 8 + 6,
        maxRadius: Math.random() * 25 + 20,
        alpha: 0.7,
        decay: Math.random() * 0.02 + 0.015,
        color: 'rgba(230, 230, 230, '
      });
    }
  }

  // 2. 发射地面奔跑尘土
  emitDust(x, y, count = 2) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        type: 'dust',
        x: x + (Math.random() * 10 - 5),
        y: y,
        vx: -Math.random() * 3 - 1,
        vy: -Math.random() * 1.5,
        radius: Math.random() * 5 + 3,
        alpha: 0.6,
        decay: Math.random() * 0.03 + 0.02,
        color: 'rgba(180, 150, 120, '
      });
    }
  }

  // 3. 发射金币与火花
  emitSparkles(x, y, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      this.particles.push({
        type: 'spark',
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 4 + 2,
        alpha: 1.0,
        decay: Math.random() * 0.03 + 0.02,
        color: Math.random() > 0.3 ? 'rgba(255, 222, 89, ' : 'rgba(255, 255, 255, '
      });
    }
  }

  // 4. 发射丛林树叶碎屑
  emitLeaves(x, y, count = 6) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        type: 'leaf',
        x: x + (Math.random() * 30 - 15),
        y: y + (Math.random() * 30 - 15),
        vx: (Math.random() * 4 - 2),
        vy: Math.random() * 3 + 1,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() * 0.2 - 0.1),
        size: Math.random() * 8 + 6,
        alpha: 0.9,
        decay: 0.015,
        color: Math.random() > 0.5 ? '#3b6e3b' : '#738a3a'
      });
    }
  }

  // 5. 发射炉膛飞溅火花
  emitSparks(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
      const speed = Math.random() * 4 + 2;
      this.particles.push({
        type: 'spark',
        x: x + (Math.random() * 20 - 10),
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3 + 2,
        alpha: 1.0,
        decay: Math.random() * 0.04 + 0.02,
        color: Math.random() > 0.4 ? 'rgba(255, 140, 0, ' : 'rgba(255, 220, 50, '
      });
    }
  }

  // 6. 发射冷凝水花粒子
  emitWaterSplash(x, y, count = 5) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * Math.PI;
      const speed = Math.random() * 3 + 1;
      this.particles.push({
        type: 'spark',
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        radius: Math.random() * 3 + 2,
        alpha: 0.8,
        decay: 0.03,
        color: 'rgba(112, 232, 255, '
      });
    }
  }

  // 7. 发射高爆炸药与炮火爆炸粒子 (Explosion Blast & Fiery Shockwave)
  emitExplosion(x, y, count = 30) {
    // 烈火爆芯与飞溅火星
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      this.particles.push({
        type: 'spark',
        x: x + (Math.random() * 16 - 8),
        y: y + (Math.random() * 16 - 8),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 6 + 4,
        alpha: 1.0,
        decay: Math.random() * 0.03 + 0.02,
        color: Math.random() > 0.4 ? 'rgba(255, 68, 0, ' : (Math.random() > 0.3 ? 'rgba(255, 200, 0, ' : 'rgba(255, 255, 255, ')
      });
    }
    // 伴随浓黑烟雾膨胀
    for (let i = 0; i < Math.floor(count / 3); i++) {
      this.particles.push({
        type: 'steam',
        x: x + (Math.random() * 30 - 15),
        y: y + (Math.random() * 20 - 10),
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 3 - 1,
        radius: Math.random() * 12 + 8,
        maxRadius: Math.random() * 40 + 30,
        alpha: 0.85,
        decay: 0.015,
        color: 'rgba(60, 45, 35, '
      });
    }
  }

  update(dt = 1/60) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.type === 'steam') {
        p.radius += (p.maxRadius - p.radius) * 0.05;
      }
      if (p.type === 'leaf') {
        p.rot += p.rotSpeed;
      }

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(targetCtx) {
    const ctx = targetCtx || this.ctx;
    if (!ctx) return;

    if (!targetCtx && this.canvas) {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.type === 'steam' || p.type === 'dust' || p.type === 'spark') {
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'leaf') {
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }

      ctx.restore();
    }
  }

  clear() {
    this.particles = [];
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

export const particles = new ParticleSystem();
