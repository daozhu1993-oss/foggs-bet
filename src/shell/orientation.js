// 屏幕方向检测与 1280x720 等比缩放适配器
import { events } from '../core/events.js';
export class OrientationAdapter {
  constructor() {
    this.container = document.getElementById('game-container');
    this.guard = document.getElementById('orientation-guard');
    this.baseWidth = 1280;
    this.baseHeight = 720;

    this.init();
  }

  init() {
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.handleResize(), 200);
    });
  }

  handleResize() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    // 电脑侧栏也可能很窄，不能要求桌面用户“旋转手机”才能进入。
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isPortrait = isTouchDevice && windowHeight > windowWidth && windowWidth < 768;
    if (isPortrait) events.emit('game:portrait');

    // 1. 竖屏提示
    if (this.guard) {
      if (isPortrait) {
        this.guard.classList.remove('hidden');
      } else {
        this.guard.classList.add('hidden');
      }
    }

    // 2. 计算 1280x720 等比缩放
    if (this.container) {
      const scaleX = windowWidth / this.baseWidth;
      const scaleY = windowHeight / this.baseHeight;
      const scale = Math.min(scaleX, scaleY);

      this.container.style.transform = `scale(${scale})`;
    }
  }
}
