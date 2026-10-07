// 维多利亚古典航海定制光标 (仅桌面精细指针激活，移动端完全原生无干扰)
export class VictorianCursor {
  constructor() {
    this.cursorEl = document.getElementById('custom-cursor');
    this.followerEl = document.getElementById('cursor-follower');
    if (!this.cursorEl || !this.followerEl) return;

    this.mouse = { x: -100, y: -100 };
    this.follower = { x: -100, y: -100 };
    this.isVisible = false;
    this.isHovering = false;
    this.animId = null;

    this.init();
  }

  init() {
    // 触控设备或不支持 hover 时直接跳过，保持纯原生触控
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;

    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mousedown', () => this.onMouseDown());
    window.addEventListener('mouseup', () => this.onMouseUp());
    document.addEventListener('mouseleave', () => this.onMouseLeave());
    document.addEventListener('mouseenter', () => this.onMouseEnter());

    // 监听可交互元素悬停
    document.addEventListener('mouseover', (e) => {
      const target = e.target && e.target.closest && e.target.closest('button, a, .arcade-card, .stamp-slot, [role="button"], input, .hud-btn, .action-btn, .decision-opt-btn, .start-btn');
      if (target) {
        this.isHovering = true;
        document.body.classList.add('cursor-hover');
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target && e.target.closest && e.target.closest('button, a, .arcade-card, .stamp-slot, [role="button"], input, .hud-btn, .action-btn, .decision-opt-btn, .start-btn');
      if (target) {
        this.isHovering = false;
        document.body.classList.remove('cursor-hover');
      }
    });

    this.startLoop();
  }

  onMouseMove(e) {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
    if (!this.isVisible) {
      this.isVisible = true;
      if (this.cursorEl) this.cursorEl.style.opacity = '1';
      if (this.followerEl) this.followerEl.style.opacity = '1';
    }
  }

  onMouseDown() {
    document.body.classList.add('cursor-click');
  }

  onMouseUp() {
    document.body.classList.remove('cursor-click');
  }

  onMouseLeave() {
    this.isVisible = false;
    if (this.cursorEl) this.cursorEl.style.opacity = '0';
    if (this.followerEl) this.followerEl.style.opacity = '0';
  }

  onMouseEnter() {
    this.isVisible = true;
    if (this.cursorEl) this.cursorEl.style.opacity = '1';
    if (this.followerEl) this.followerEl.style.opacity = '1';
  }

  startLoop() {
    const loop = () => {
      if (this.isVisible && this.cursorEl && this.followerEl) {
        // 光标中心点实时响应
        this.cursorEl.style.transform = `translate3d(${this.mouse.x}px, ${this.mouse.y}px, 0) translate(-50%, -50%)`;

        // 外环弹簧追随 (Lerp 插值)
        this.follower.x += (this.mouse.x - this.follower.x) * 0.2;
        this.follower.y += (this.mouse.y - this.follower.y) * 0.2;
        this.followerEl.style.transform = `translate3d(${this.follower.x}px, ${this.follower.y}px, 0) translate(-50%, -50%)`;
      }
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }
}
