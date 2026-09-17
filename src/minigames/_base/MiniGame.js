// 小游戏基础抽象接口 MiniGame
export class MiniGame {
  constructor({ container, canvas, input, fx, sound, config = {} }) {
    this.container = container;
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.input = input;
    this.fx = fx;
    this.sound = sound;
    this.config = config;

    this.running = false;
    this.paused = false;
    this.onComplete = null; // 由主线注入的回调函数 (result) => {}
    this.destroyed = false;
    this.completed = false;
  }

  // 初始化（资源准备、实体生成）
  init() {}

  // 启动游戏循环
  start() {
    this.running = true;
    this.paused = false;
  }

  // 状态更新 (dt: 秒)
  update(dt) {}

  // 渲染绘制
  render(ctx) {}

  // 暂停
  pause() {
    this.paused = true;
  }

  // 恢复
  resume() {
    this.paused = false;
    if (this.pendingResult) {
      const result = this.pendingResult;
      this.pendingResult = null;
      this.complete(result);
    }
  }

  // 销毁并清理监听
  destroy() {
    this.destroyed = true;
    this.running = false;
  }

  // 结束本关小游戏并提交结果
  complete(result) {
    if (this.destroyed || this.completed) return;
    if (this.paused) { this.pendingResult = result; return; }
    this.completed = true;
    this.running = false;
    if (typeof this.onComplete === 'function') {
      this.onComplete(result);
    }
  }
}
