import { sound } from '../engine/audio.js';
import { GameImages } from '../assets/images.js';
import { SpriteEngine } from '../engine/sprites.js';

export class DialogueSystem {
  constructor() {
    this.container = document.getElementById('dialogue-container');
    this.speakerEl = document.getElementById('dialogue-speaker');
    this.avatarCanvas = document.getElementById('speaker-avatar-canvas');
    this.avatarCtx = this.avatarCanvas ? this.avatarCanvas.getContext('2d') : null;
    this.textEl = document.getElementById('dialogue-text');

    this.currentSequence = [];
    this.currentIndex = 0;
    this.isTyping = false;
    this.currentText = '';
    this.lastAdvanceTime = 0;
    this.typeInterval = null;
    this.resolvePromise = null;

    this.loadedImages = {};
    this.preloadImages();
    this.init();
  }

  preloadImages() {
    const keys = ['fogg', 'passepartout', 'fix', 'aouda', 'stuart_portrait', 'judge_obadiah', 'fix_prosecutor'];
    keys.forEach(k => {
      if (GameImages[k] && !this.loadedImages[k]) {
        const img = new Image();
        img.src = GameImages[k];
        this.loadedImages[k] = img;
      }
    });
  }

  init() {
    if (this.container) {
      this.container.addEventListener('click', () => this.handleAdvance());
    }
    window.addEventListener('keydown', (e) => {
      if (['Space', 'Enter'].includes(e.code) && this.isVisible()) {
        e.preventDefault();
        this.handleAdvance();
      }
    });
  }

  isVisible() {
    return this.container && !this.container.classList.contains('hidden');
  }

  show() {
    if (this.container) this.container.classList.remove('hidden');
  }

  hide() {
    if (this.container) this.container.classList.add('hidden');
  }

  playSequence(sequence) {
    return new Promise((resolve) => {
      this.currentSequence = sequence;
      this.currentIndex = 0;
      this.resolvePromise = resolve;
      this.lastAdvanceTime = Date.now() + 250; // 250ms 防穿透保护
      this.show();
      this.renderCurrentLine();
    });
  }

  renderCurrentLine() {
    if (this.currentIndex >= this.currentSequence.length) {
      this.hide();
      if (this.resolvePromise) {
        const resolve = this.resolvePromise;
        this.resolvePromise = null;
        resolve();
      }
      return;
    }

    const item = this.currentSequence[this.currentIndex];
    if (this.speakerEl) this.speakerEl.textContent = item.speaker || '旁白';

    // 绘制高精立绘头像
    if (this.avatarCtx && this.avatarCanvas) {
      const w = this.avatarCanvas.width || 70;
      const h = this.avatarCanvas.height || 70;
      this.avatarCtx.clearRect(0, 0, w, h);

      const speaker = item.speaker || '';
      let imgKey = 'fogg';

      if (speaker.includes('福克') || item.avatar === 'fogg' || item.avatar === '🎩') {
        imgKey = 'fogg';
      } else if (speaker.includes('路路通') || item.avatar === 'passepartout' || item.avatar === '🏃') {
        imgKey = 'passepartout';
      } else if (speaker.includes('斯图尔特')) {
        imgKey = 'stuart_portrait';
      } else if (speaker.includes('法官') || speaker.includes('奥巴底亚')) {
        imgKey = 'judge_obadiah';
      } else if (speaker.includes('检控') || speaker.includes('检察官')) {
        imgKey = 'fix_prosecutor';
      } else if (speaker.includes('菲克斯') || speaker.includes('Fix') || item.avatar === 'fix' || item.avatar === '🕵️' || speaker.includes('列车长') || speaker.includes('船长') || speaker.includes('领事') || speaker.includes('班主') || speaker.includes('司机') || speaker.includes('发明家') || speaker.includes('传令官') || speaker.includes('绅士') || speaker.includes('暴徒')) {
        imgKey = 'fix';
      } else if (speaker.includes('艾娥达') || item.avatar === 'aouda' || item.avatar === '🧕') {
        imgKey = 'aouda';
      }

      if (!this.loadedImages[imgKey] && GameImages[imgKey]) {
        const img = new Image();
        img.src = GameImages[imgKey];
        this.loadedImages[imgKey] = img;
      }

      const drawAvatar = (imageObj) => {
        if (!this.avatarCtx || !this.avatarCanvas) return;
        this.avatarCtx.clearRect(0, 0, w, h);

        // 绘制圆形剪裁立绘
        this.avatarCtx.save();
        this.avatarCtx.beginPath();
        this.avatarCtx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
        this.avatarCtx.clip();

        if (imageObj && imageObj.complete && imageObj.naturalWidth > 0) {
          this.avatarCtx.drawImage(imageObj, 0, 0, w, h);
        } else {
          // 优雅备用色块
          this.avatarCtx.fillStyle = '#3a2e22';
          this.avatarCtx.fillRect(0, 0, w, h);
        }
        this.avatarCtx.restore();

        // 绘制外圈维多利亚黄铜金边
        this.avatarCtx.save();
        this.avatarCtx.beginPath();
        this.avatarCtx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
        this.avatarCtx.strokeStyle = '#d4af37';
        this.avatarCtx.lineWidth = 3;
        this.avatarCtx.stroke();
        this.avatarCtx.restore();
      };

      const img = this.loadedImages[imgKey];
      if (img) {
        if (img.complete && img.naturalWidth > 0) {
          drawAvatar(img);
        } else {
          img.onload = () => drawAvatar(img);
          drawAvatar(null);
        }
      } else {
        drawAvatar(null);
      }
    }

    this.typewriteText(item.text);
  }

  typewriteText(text) {
    if (this.typeInterval) clearInterval(this.typeInterval);
    this.isTyping = true;
    this.currentText = text;
    this.textEl.textContent = '';
    let idx = 0;

    this.typeInterval = setInterval(() => {
      if (idx < text.length) {
        this.textEl.textContent += text[idx];
        if (idx % 3 === 0) sound.playClick();
        idx++;
      } else {
        clearInterval(this.typeInterval);
        this.isTyping = false;
      }
    }, 22);
  }

  handleAdvance() {
    if (Date.now() < this.lastAdvanceTime) return;
    this.lastAdvanceTime = Date.now() + 80;
    if (this.isTyping) {
      clearInterval(this.typeInterval);
      this.textEl.textContent = this.currentText;
      this.isTyping = false;
    } else {
      this.currentIndex++;
      this.renderCurrentLine();
    }
  }
}

export const dialogue = new DialogueSystem();
