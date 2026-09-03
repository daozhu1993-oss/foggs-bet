// 屏幕方向检测与 1280x720 等比缩放适配器
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
    const isPortrait = windowHeight > windowWidth && windowWidth < 768;

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
