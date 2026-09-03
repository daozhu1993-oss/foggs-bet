// 2D 刚体碎片物理粒子系统 (碎裂飞溅、弹性反弹、旋转翻滚、重力抛射)
export class PhysicsDebrisSystem {
  constructor() {
    this.debris = [];
  }

  // 1. 爆裂产生木屑/木块刚体
  spawnWoodSplinters(x, y, count = 16, force = 500) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI) - Math.PI; // 向上方扇形喷射
      const speed = Math.random() * force + 150;
      this.debris.push({
        type: 'wood',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() * 12 - 6),
        w: Math.random() * 12 + 6,
        h: Math.random() * 6 + 3,
        color: Math.random() > 0.4 ? '#8c593b' : '#5a3d28',
        gravity: 1200,
        bounce: 0.35,
        friction: 0.88,
        groundY: y + (Math.random() * 40 + 20),
        life: 2.5,
        maxLife: 2.5
      });
    }
  }

  // 2. 爆裂产生古迹碎石刚体
  spawnStoneDebris(x, y, count = 12, force = 450) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI) - Math.PI;
      const speed = Math.random() * force + 120;
      this.debris.push({
        type: 'stone',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() * 10 - 5),
        w: Math.random() * 14 + 8,
        h: Math.random() * 12 + 8,
        color: Math.random() > 0.5 ? '#5c6368' : '#383e42',
        gravity: 1400,
        bounce: 0.25,
        friction: 0.85,
        groundY: y + (Math.random() * 40 + 20),
        life: 2.5,
        maxLife: 2.5
      });
    }
  }

  // 3. 喷发金币抛射
  spawnCoinFountain(x, y, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() * 1.2 - 0.6);
      const speed = Math.random() * 350 + 200;
      this.debris.push({
        type: 'coin',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: 0,
        vRot: Math.random() * 15 + 5,
        radius: 6,
        color: '#ffde59',
        gravity: 900,
        bounce: 0.55,
        friction: 0.92,
        groundY: y + 50,
        life: 2.0,
        maxLife: 2.0
      });
    }
  }

  update(dt) {
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= dt;

      // 物理运动
      d.vy += d.gravity * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rot += d.vRot * dt;

      // 地面碰撞与弹性反弹
      if (d.y >= d.groundY) {
        d.y = d.groundY;
        d.vy = -d.vy * d.bounce;
        d.vx *= d.friction;
        d.vRot *= d.friction;

        if (Math.abs(d.vy) < 40) d.vy = 0;
      }

      if (d.life <= 0) {
        this.debris.splice(i, 1);
      }
    }
  }

  render(ctx) {
    for (const d of this.debris) {
      ctx.save();
      const alpha = Math.min(1.0, d.life / 0.5);
      ctx.globalAlpha = alpha;
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);

      if (d.type === 'coin') {
        ctx.fillStyle = d.color;
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, d.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = d.color;
        ctx.strokeStyle = '#1a140e';
        ctx.lineWidth = 1;
        ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h);
        ctx.strokeRect(-d.w / 2, -d.h / 2, d.w, d.h);
      }

      ctx.restore();
    }
  }

  clear() {
    this.debris = [];
  }
}

export const physicsDebris = new PhysicsDebrisSystem();
