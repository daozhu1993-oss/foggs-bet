// 2D 动态游戏摄像机引擎 (平滑阻尼跟随、冲击震屏、动态变焦、慢动作)
export class Camera2D {
  constructor(viewportWidth = 1280, viewportHeight = 720) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;

    this.x = viewportWidth / 2;
    this.y = viewportHeight / 2;
    this.targetX = this.x;
    this.targetY = this.y;

    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.zoomSpeed = 4.0;

    // 震屏系统 (Trauma-based Screen Shake)
    this.trauma = 0; // 0 ~ 1
    this.maxShakeX = 18;
    this.maxShakeY = 14;
    this.maxRot = 0.04; // 弧度
    this.traumaDecay = 1.4; // 每秒衰减率

    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this.shakeRotation = 0;

    this.damping = 0.12; // 跟随阻尼系数
    this.worldBounds = { minX: 0, maxX: 1280, minY: 0, maxY: 720 };
  }

  setWorldBounds(minX, maxX, minY, maxY) {
    this.worldBounds = { minX, maxX, minY, maxY };
  }

  follow(targetX, targetY, immediate = false) {
    this.targetX = targetX;
    this.targetY = targetY;
    if (immediate) {
      this.x = targetX;
      this.y = targetY;
    }
  }

  setZoom(zoom, immediate = false) {
    this.targetZoom = zoom;
    if (immediate) this.zoom = zoom;
  }

  // 施加震屏创伤值 (0.0 ~ 1.0)
  addTrauma(amount = 0.5) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  update(dt) {
    // 1. 平滑阻尼跟随
    this.x += (this.targetX - this.x) * (1 - Math.pow(this.damping, dt * 60));
    this.y += (this.targetY - this.y) * (1 - Math.pow(this.damping, dt * 60));

    // 边界限制
    const halfW = (this.viewportWidth / 2) / this.zoom;
    const halfH = (this.viewportHeight / 2) / this.zoom;
    this.x = Math.max(this.worldBounds.minX + halfW, Math.min(this.worldBounds.maxX - halfW, this.x));
    this.y = Math.max(this.worldBounds.minY + halfH, Math.min(this.worldBounds.maxY - halfH, this.y));

    // 2. 平滑变焦
    this.zoom += (this.targetZoom - this.zoom) * dt * this.zoomSpeed;

    // 3. 创伤震动计算 (平方衰减带来真实的冲击反弹感)
    if (this.trauma > 0) {
      const shakeFactor = this.trauma * this.trauma;
      const seed = Date.now() * 0.05;
      this.shakeOffsetX = (Math.sin(seed * 1.7) * 2 - 1) * this.maxShakeX * shakeFactor;
      this.shakeOffsetY = (Math.cos(seed * 2.3) * 2 - 1) * this.maxShakeY * shakeFactor;
      this.shakeRotation = (Math.sin(seed * 3.1) * 2 - 1) * this.maxRot * shakeFactor;

      this.trauma = Math.max(0, this.trauma - this.traumaDecay * dt);
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
      this.shakeRotation = 0;
    }
  }

  // 应用摄像机变换矩阵至 Canvas Context
  apply(ctx) {
    ctx.save();
    // 移动至视口中心
    ctx.translate(this.viewportWidth / 2 + this.shakeOffsetX, this.viewportHeight / 2 + this.shakeOffsetY);
    ctx.rotate(this.shakeRotation);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  // 还原变换
  restore(ctx) {
    ctx.restore();
  }

  // 屏幕坐标转换为世界坐标
  screenToWorld(screenX, screenY) {
    const centeredX = (screenX - this.viewportWidth / 2) / this.zoom;
    const centeredY = (screenY - this.viewportHeight / 2) / this.zoom;
    return {
      x: centeredX + this.x,
      y: centeredY + this.y
    };
  }
}
