import { sound } from './audio.js';

class FXManager {
  constructor() {
    this.floatTexts = [];
    this.shakeOffset = { x: 0, y: 0 };
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.hitstopTimer = 0;
    this.flashAlpha = 0;
    this.redVignetteAlpha = 0;
    this.vignetteEnabled = true; // 1872 维多利亚古典复古暗角与铜版色调滤镜

    // 福克先生 · 宝玑怀表子弹时间 (Bullet Time)
    this.bulletTimeActive = false;
    this.bulletTimeTimer = 0;
    this.bulletTimeDuration = 3.5;
    this.bulletTimeScale = 0.35;
    this.bulletTimeCooldown = 0;
  }

  activateBulletTime() {
    if (this.bulletTimeActive || this.bulletTimeCooldown > 0) return false;
    this.bulletTimeActive = true;
    this.bulletTimeTimer = this.bulletTimeDuration;
    this.bulletTimeCooldown = 8.0; // 8秒冷却
    this.triggerHaptic(50);
    this.shake(200, 4);
    if (sound && sound.playClockTick) sound.playClockTick();
    else if (sound && sound.playTick) sound.playTick(true);
    this.toast('⏱ 福克绅士怀表：【子弹时间】发动！', 1800);
    return true;
  }

  getTimeDilation() {
    return this.bulletTimeActive ? this.bulletTimeScale : 1.0;
  }

  shake(duration = 300, intensity = 8) {
    this.shakeTimer = duration / 1000;
    this.shakeIntensity = intensity;
    const container = document.getElementById('game-container');
    if (container) {
      container.classList.remove('shake-screen');
      void container.offsetWidth; // Trigger reflow
      container.classList.add('shake-screen');
      setTimeout(() => {
        container.classList.remove('shake-screen');
      }, duration);
    }
  }

  hitstop(ms = 60) {
    this.hitstopTimer = ms / 1000;
  }

  flash(color = '#ffffff', duration = 150) {
    this.flashColor = color;
    this.flashAlpha = 0.6;
    setTimeout(() => {
      this.flashAlpha = 0;
    }, duration);
  }

  flashRed(duration = 220) {
    this.redVignetteAlpha = 0.65;
    this.triggerHaptic(35);
    setTimeout(() => {
      this.redVignetteAlpha = 0;
    }, duration);
  }

  triggerHaptic(ms = 30) {
    const nav = (typeof window !== 'undefined' && window.navigator) || (typeof navigator !== 'undefined' && navigator);
    if (nav && typeof nav.vibrate === 'function') {
      try {
        nav.vibrate(ms);
      } catch (e) {}
    }
  }

  hapticLight() { this.triggerHaptic(15); }
  hapticMedium() { this.triggerHaptic(30); }
  hapticHeavy() { this.triggerHaptic(55); }
  hapticSuccess() { this.triggerHaptic([20, 35, 45]); }

  toggleVignette() {
    this.vignetteEnabled = !this.vignetteEnabled;
    this.toast(this.vignetteEnabled ? '🎨 维多利亚胶片暗角已开启' : '🎨 复古滤镜已关闭', 1500);
    return this.vignetteEnabled;
  }

  toast(text, duration = 2500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toastEl = document.createElement('div');
    toastEl.className = 'toast-msg';
    toastEl.textContent = text;
    container.appendChild(toastEl);

    sound.playClick();

    setTimeout(() => {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateY(-20px)';
      toastEl.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        if (toastEl.parentNode) {
          toastEl.parentNode.removeChild(toastEl);
        }
      }, 300);
    }, duration);
  }

  addFloatText(x, y, text, color = '#ffde59') {
    this.floatTexts.push({
      x,
      y,
      text,
      color,
      vy: -2,
      alpha: 1.0,
      decay: 0.02
    });
  }

  update(dt = 1/60) {
    // 更新子弹时间与冷却
    if (this.bulletTimeActive) {
      this.bulletTimeTimer -= dt;
      if (this.bulletTimeTimer <= 0) {
        this.bulletTimeActive = false;
        this.toast('子弹时间结束', 1000);
      }
    }
    if (this.bulletTimeCooldown > 0) {
      this.bulletTimeCooldown -= dt;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return false;
    }

    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      this.shakeOffset.x = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeOffset.y = (Math.random() - 0.5) * this.shakeIntensity;
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
    }

    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      const ft = this.floatTexts[i];
      ft.y += ft.vy;
      ft.alpha -= ft.decay;
      if (ft.alpha <= 0) {
        this.floatTexts.splice(i, 1);
      }
    }

    return true;
  }

  render(ctx) {
    if (!ctx) return;

    // 0. 维多利亚古典复古镜头暗角与暖色温环境光 (1872 Daguerreotype Lens Vignette & Antique Copperplate Tone)
    if (this.vignetteEnabled) {
      ctx.save();
      // 四角柔和失光暗角 (边缘自然衰减)
      const vigGrad = ctx.createRadialGradient(640, 360, 380, 640, 360, 750);
      vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vigGrad.addColorStop(0.68, 'rgba(28, 18, 12, 0.12)');
      vigGrad.addColorStop(1, 'rgba(12, 7, 4, 0.46)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, 1280, 720);

      // 暖色古籍铜版纸微光 (Warm Antique Tone) - 消除写实背景与精灵抠图的硬边与色温割裂
      ctx.fillStyle = 'rgba(218, 178, 120, 0.035)';
      ctx.fillRect(0, 0, 1280, 720);
      ctx.restore();
    }

    // 1. 宝玑怀表子弹时间金色齿轮光晕
    if (this.bulletTimeActive) {
      ctx.save();
      // 金色时间暗角
      const goldGrad = ctx.createRadialGradient(640, 360, 250, 640, 360, 720);
      goldGrad.addColorStop(0, 'rgba(212, 175, 55, 0.05)');
      goldGrad.addColorStop(1, 'rgba(180, 130, 20, 0.45)');
      ctx.fillStyle = goldGrad;
      ctx.fillRect(0, 0, 1280, 720);

      // 屏幕中央大怀表半透明刻度
      ctx.strokeStyle = 'rgba(255, 232, 124, 0.25)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(640, 360, 180, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffe87c';
      ctx.font = 'bold 22px "Baskerville", serif';
      ctx.textAlign = 'center';
      ctx.fillText(`⏱ 子弹时间: ${this.bulletTimeTimer.toFixed(1)}s`, 640, 80);
      ctx.restore();
    }

    // 2. 全屏伤害暗红晕影
    if (this.redVignetteAlpha > 0) {
      ctx.save();
      const grad = ctx.createRadialGradient(640, 360, 200, 640, 360, 750);
      grad.addColorStop(0, 'rgba(255, 0, 0, 0)');
      grad.addColorStop(1, `rgba(220, 20, 20, ${this.redVignetteAlpha})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);
      ctx.restore();
    }

    // 3. 闪光滤镜
    if (this.flashAlpha > 0) {
      ctx.save();
      ctx.fillStyle = this.flashColor;
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillRect(0, 0, 1280, 720);
      ctx.restore();
    }

    // 4. 浮动文字
    for (const ft of this.floatTexts) {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 20px "Baskerville", serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }
}

export const fx = new FXManager();
