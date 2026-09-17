import { sound } from '../engine/audio.js';

export class TacticalBriefing {
  static show({ title, subtitle, goal, tip, controls = [] }) {
    return new Promise((resolve) => {
      let modal = document.getElementById('briefing-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'briefing-modal';
        modal.className = 'briefing-overlay';
        document.getElementById('game-container').appendChild(modal);
      }
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'briefing-title');
      // These strings are authored locally, never loaded from a save or a URL.
      modal.innerHTML = `
        <div class="briefing-card">
          <span class="briefing-tag">下一段旅程 · 准备好再出发</span>
          <h2 class="briefing-title" id="briefing-title">${title}</h2>
          <p class="briefing-sub">${subtitle}</p>
          <p class="briefing-goal"><strong>这一关要做什么</strong><br>${goal}</p>
          <div class="control-badge-list">${controls.map(c => `
            <div class="control-item"><span class="control-key">${c.key}</span>
            <span class="control-desc">${c.desc}</span></div>`).join('')}</div>
          <p class="briefing-tip">小窍门：${tip}</p>
          <button class="gold-btn" id="briefing-start">我准备好了 · 开始</button>
          <button class="briefing-back" id="briefing-exit">返回封面 · 保留已完成进度</button>
          <p class="briefing-status" aria-live="polite">阅读期间不计时 · 游玩中按 Esc 暂停</p>
        </div>`;
      modal.classList.remove('hidden');
      const button = modal.querySelector('#briefing-start');
      const status = modal.querySelector('.briefing-status');
      modal.querySelector('#briefing-exit').addEventListener('click', () => window.location.reload());
      button.focus({ preventScroll: true });
      let started = false;
      button.addEventListener('click', () => {
        if (started) return;
        started = true;
        button.disabled = true;
        let remaining = 3;
        status.textContent = `${remaining} · 准备出发`;
        sound.playTick();
        const timer = setInterval(() => {
          if (document.hidden) return;
          remaining -= 1;
          if (remaining > 0) {
            status.textContent = `${remaining} · 准备出发`;
            sound.playTick();
          } else {
            clearInterval(timer);
            button.blur();
            modal.classList.add('hidden');
            resolve();
          }
        }, 700);
      });
    });
  }
}
