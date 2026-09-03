import { sound } from '../engine/audio.js';

// 维多利亚古典拟态确认弹窗（替代原生破坏调性的 window.confirm）
export class ConfirmModal {
  static show({ title = '绅士的重要决断', desc = '此项操作将清空当前探险进度并重新开始，请谨慎确认。', confirmText = '确定重新启程', cancelText = '继续当前探险', isDanger = true }) {
    return new Promise((resolve) => {
      let modal = document.getElementById('confirm-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirm-modal';
        modal.className = 'modal-overlay hidden';
        const container = document.getElementById('game-container') || document.body;
        container.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="decision-box confirm-box">
          <div class="decision-header">
            <span class="decision-icon">${isDanger ? '⚠️' : '📜'}</span>
            <h3 id="confirm-title">${title}</h3>
          </div>
          <p class="decision-desc">${desc}</p>
          <div class="decision-options confirm-actions">
            <button id="btn-modal-cancel" class="secondary-btn">${cancelText}</button>
            <button id="btn-modal-confirm" class="${isDanger ? 'danger-btn' : 'gold-btn'}">${confirmText}</button>
          </div>
        </div>
      `;

      modal.classList.remove('hidden');
      sound.playClick();

      const btnCancel = modal.querySelector('#btn-modal-cancel');
      const btnConfirm = modal.querySelector('#btn-modal-confirm');

      const cleanup = (result) => {
        modal.classList.add('hidden');
        sound.playStampThud();
        resolve(result);
      };

      if (btnCancel) btnCancel.onclick = () => cleanup(false);
      if (btnConfirm) btnConfirm.onclick = () => cleanup(true);
    });
  }
}
