// 跨端归一化输入抽象层 InputManager
import { fx } from '../engine/fx.js';

export class InputManager {
  constructor(container, canvas) {
    this.container = container || document.getElementById('game-container');
    this.canvas = canvas || document.getElementById('game-canvas');
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    this.input = {
      pointer: { x: 0, y: 0, down: false, justDown: false, justUp: false },
      axis: { x: 0, y: 0 },
      buttons: {
        A: false,
        B: false,
        C: false,
        up: false,
        down: false,
        left: false,
        right: false,
        justA: false,
        justB: false,
        justC: false
      },
      keys: {},
      gesture: { swipe: null }
    };

    this.touchStartPos = { x: 0, y: 0, time: 0 };
    this.activeKeyMap = new Set();
    this.initListeners();
    this.setupVirtualControls();
  }

  // 计算等比缩放后的逻辑坐标 (1280x720)
  getLogicalCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  initListeners() {
    // 1. 鼠标/触控指针监听
    const handlePointerDown = (e) => {
      const coords = this.getLogicalCoords(e.clientX, e.clientY);
      this.input.pointer.x = coords.x;
      this.input.pointer.y = coords.y;
      this.input.pointer.down = true;
      this.input.pointer.justDown = true;

      this.touchStartPos = { x: coords.x, y: coords.y, time: Date.now() };
    };

    const handlePointerMove = (e) => {
      const coords = this.getLogicalCoords(e.clientX, e.clientY);
      this.input.pointer.x = coords.x;
      this.input.pointer.y = coords.y;
    };

    const handlePointerUp = (e) => {
      this.input.pointer.down = false;
      this.input.pointer.justUp = true;

      // 手势识别
      const coords = this.getLogicalCoords(e.clientX, e.clientY);
      const dx = coords.x - this.touchStartPos.x;
      const dy = coords.y - this.touchStartPos.y;
      const dt = Date.now() - this.touchStartPos.time;

      if (dt < 400 && (Math.abs(dx) > 40 || Math.abs(dy) > 40)) {
        if (Math.abs(dx) > Math.abs(dy)) {
          this.input.gesture.swipe = dx > 0 ? 'right' : 'left';
        } else {
          this.input.gesture.swipe = dy > 0 ? 'down' : 'up';
        }
      }
    };

    this.canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // 2. 键盘监听
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      this.input.keys[e.code] = true;

      if (!this.activeKeyMap.has(e.code)) {
        this.activeKeyMap.add(e.code);
        this.processKey(e.code, true);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.input.keys[e.code] = false;
      this.activeKeyMap.delete(e.code);
      this.processKey(e.code, false);
    });
  }

  processKey(code, isDown) {
    switch (code) {
      case 'ArrowUp':
      case 'KeyW':
        this.input.buttons.up = isDown;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.input.buttons.down = isDown;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.input.buttons.left = isDown;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.input.buttons.right = isDown;
        break;
      case 'Space':
      case 'KeyJ':
      case 'Enter':
        this.input.buttons.A = isDown;
        if (isDown) this.input.buttons.justA = true;
        break;
      case 'KeyK':
      case 'KeyZ':
      case 'ShiftLeft':
      case 'ShiftRight':
        this.input.buttons.B = isDown;
        if (isDown) this.input.buttons.justB = true;
        break;
      case 'KeyC':
        this.input.buttons.C = isDown;
        if (isDown) this.input.buttons.justC = true;
        break;
    }
    this.updateAxes();
  }

  updateAxes() {
    let x = 0;
    let y = 0;
    if (this.input.buttons.right) x += 1;
    if (this.input.buttons.left) x -= 1;
    if (this.input.buttons.down) y += 1;
    if (this.input.buttons.up) y -= 1;

    this.input.axis.x = x;
    this.input.axis.y = y;
  }

  setupVirtualControls() {
    const touchControls = document.getElementById('touch-controls');
    if (!touchControls) return;

    // 默认触屏设备展示，PC 隐藏
    if (this.isTouchDevice) {
      touchControls.classList.remove('hidden');
    }

    const bindButton = (el, pressAction, releaseAction) => {
      if (!el) return;
      const onDown = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        el.classList.add('active');
        pressAction();
      };
      const onUp = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        el.classList.remove('active');
        releaseAction();
      };
      el.addEventListener('pointerdown', onDown);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
      el.addEventListener('pointerleave', onUp);
    };

    // 虚拟方向键绑定 (带轻微物理触感反馈)
    const dpadUp = document.querySelector('.dpad-up');
    const dpadDown = document.querySelector('.dpad-down');
    const dpadLeft = document.querySelector('.dpad-left');
    const dpadRight = document.querySelector('.dpad-right');

    bindButton(dpadUp, () => { this.input.buttons.up = true; this.updateAxes(); fx.hapticLight(); }, () => { this.input.buttons.up = false; this.updateAxes(); });
    bindButton(dpadDown, () => { this.input.buttons.down = true; this.updateAxes(); fx.hapticLight(); }, () => { this.input.buttons.down = false; this.updateAxes(); });
    bindButton(dpadLeft, () => { this.input.buttons.left = true; this.updateAxes(); fx.hapticLight(); }, () => { this.input.buttons.left = false; this.updateAxes(); });
    bindButton(dpadRight, () => { this.input.buttons.right = true; this.updateAxes(); fx.hapticLight(); }, () => { this.input.buttons.right = false; this.updateAxes(); });

    // 动作按键绑定 (A / B / C)
    const btnA = document.getElementById('touch-btn-a');
    const btnB = document.getElementById('touch-btn-b');
    const btnC = document.getElementById('touch-btn-c');

    bindButton(btnA, () => {
      this.input.buttons.A = true;
      this.input.buttons.justA = true;
      fx.hapticMedium();
    }, () => {
      this.input.buttons.A = false;
    });

    bindButton(btnB, () => {
      this.input.buttons.B = true;
      this.input.buttons.justB = true;
      fx.hapticMedium();
    }, () => {
      this.input.buttons.B = false;
    });

    if (btnC) {
      bindButton(btnC, () => {
        this.input.buttons.C = true;
        this.input.buttons.justC = true;
        fx.hapticHeavy();
      }, () => {
        this.input.buttons.C = false;
      });
    }
  }

  // 供小游戏按需配置按键文案或显隐
  configureUI({ showDpad = true, showA = true, showB = true, showC = false, labelA = '跳跃', labelB = '滑铲', labelC = '特技' } = {}) {
    const touchControls = document.getElementById('touch-controls');
    if (!touchControls) return;

    if (this.isTouchDevice) {
      touchControls.classList.remove('hidden');
    }

    const dpad = document.getElementById('touch-dpad');
    const btnA = document.getElementById('touch-btn-a');
    const btnB = document.getElementById('touch-btn-b');
    const btnC = document.getElementById('touch-btn-c');
    const subA = document.getElementById('btn-a-sub');
    const subB = document.getElementById('btn-b-sub');
    const subC = document.getElementById('btn-c-sub');

    if (dpad) dpad.style.display = showDpad ? 'flex' : 'none';
    if (btnA) btnA.style.display = showA ? 'flex' : 'none';
    if (btnB) btnB.style.display = showB ? 'flex' : 'none';
    if (btnC) btnC.style.display = showC ? 'flex' : 'none';
    if (subA) subA.textContent = labelA;
    if (subB) subB.textContent = labelB;
    if (subC) subC.textContent = labelC;
  }

  // 根据当前活跃小游戏，智能自适应移动端操作布局与按键语义
  adaptControlsForGame(gameName) {
    switch (gameName) {
      case 'whist':
      case 'courtBail':
        // 纯卡牌与文字推理，完全隐藏虚拟十字键与动作按键，保持全屏无遮挡
        this.configureUI({ showDpad: false, showA: false, showB: false, showC: false });
        break;
      case 'parkour':
        this.configureUI({ showDpad: false, showA: true, showB: true, showC: false, labelA: '跳跃', labelB: '滑铲' });
        break;
      case 'steamOverdrive':
        this.configureUI({ showDpad: true, showA: true, showB: true, showC: false, labelA: '超频', labelB: '调压' });
        break;
      case 'elephantRide':
        this.configureUI({ showDpad: true, showA: true, showB: true, showC: false, labelA: '象鼻轰击', labelB: '战象咆哮' });
        break;
      case 'stealthRescue':
        this.configureUI({ showDpad: true, showA: true, showB: true, showC: false, labelA: '伏地潜行', labelB: '击晕守卫' });
        break;
      case 'typhoonSailing':
        this.configureUI({ showDpad: true, showA: true, showB: true, showC: false, labelA: '扬帆破浪', labelB: '排空压舱' });
        break;
      case 'circusAcrobat':
        this.configureUI({ showDpad: true, showA: true, showB: false, showC: false, labelA: '起跳' });
        break;
      case 'sanFranciscoBrawl':
        this.configureUI({ showDpad: true, showA: true, showB: true, showC: true, labelA: '重拳', labelB: '飞踢', labelC: '防御' });
        break;
      case 'trainDefense':
        // 列车射击：支持触屏直接点射，同时提供开火、换弹、专注模式键
        this.configureUI({ showDpad: false, showA: true, showB: true, showC: true, labelA: '射击', labelB: '换弹', labelC: '专注' });
        break;
      case 'iceSledge':
        this.configureUI({ showDpad: true, showA: true, showB: false, showC: false, labelA: '顺风加速' });
        break;
      case 'atlanticBurning':
        this.configureUI({ showDpad: false, showA: true, showB: true, showC: true, labelA: '投煤', labelB: '拆板', labelC: '泄压' });
        break;
      case 'londonFinale':
        this.configureUI({ showDpad: true, showA: true, showB: false, showC: false, labelA: '扬鞭绝杀' });
        break;
      default:
        this.configureUI({ showDpad: true, showA: true, showB: true, showC: false, labelA: '确认', labelB: '返回' });
    }
  }

  // 每一帧结束时清理单次触发状态
  endFrame() {
    this.input.pointer.justDown = false;
    this.input.pointer.justUp = false;
    this.input.buttons.justA = false;
    this.input.buttons.justB = false;
    this.input.buttons.justC = false;
    this.input.gesture.swipe = null;
  }

  getSnapshot() {
    return this.input;
  }
}
