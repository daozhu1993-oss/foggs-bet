import { sound } from '../engine/audio.js';

// 战术任务简报与 3-2-1 倒计时缓冲器
export class TacticalBriefing {
  static show({ title, subtitle, controls = [], duration = 2.5 }) {
    return new Promise((resolve) => {
      let modal = document.getElementById('briefing-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'briefing-modal';
        modal.className = 'briefing-overlay';
        const container = document.getElementById('game-container') || document.body;
        container.appendChild(modal);
      }

      const ctrlList = Array.isArray(controls) ? controls : [];
      let timeLeft = duration;
      const startTime = Date.now();

      modal.innerHTML = `
        <div class="briefing-card">
          <div class="briefing-header">
            <span class="briefing-tag">📜 任务战术简报</span>
            <h2 class="briefing-title">${title || '挑战开始'}</h2>
            <p class="briefing-sub">${subtitle || '保持专注，分秒必争！'}</p>
          </div>
          <div class="briefing-controls">
            <div class="control-badge-list">
              ${ctrlList.map(c => `
                <div class="control-item">
                  <span class="control-key">${c.key || ''}</span>
                  <span class="control-desc">${c.desc || ''}</span>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="briefing-countdown">
            <div class="countdown-dial">
              <span id="briefing-count-num">${Math.ceil(timeLeft)}</span>
            </div>
            <span class="countdown-hint">按 [空格/触屏] 立即开战</span>
          </div>
        </div>
      `;

      modal.classList.remove('hidden');
      sound.playTick(true);

      let timerId = null;
      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;
        clearInterval(timerId);
        window.removeEventListener('keydown', handleKey);
        modal.removeEventListener('pointerdown', handlePointer);
        modal.classList.add('hidden');
        sound.playStampThud();
        resolve();
      };

      const handleKey = (e) => {
        if (Date.now() - startTime < 350) return; // 350ms 防连击跳过保护
        if (e.code === 'Space' || e.code === 'Enter') {
          finish();
        }
      };

      const handlePointer = () => {
        if (Date.now() - startTime < 350) return;
        finish();
      };

      window.addEventListener('keydown', handleKey);
      modal.addEventListener('pointerdown', handlePointer);

      const numEl = document.getElementById('briefing-count-num');
      timerId = setInterval(() => {
        timeLeft -= 0.5;
        if (numEl) {
          numEl.textContent = Math.max(1, Math.ceil(timeLeft));
        }
        sound.playTick(true);
        if (timeLeft <= 0) {
          finish();
        }
      }, 500);
    });
  }
}
