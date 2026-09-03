import { sound } from '../engine/audio.js';

export class DecisionModal {
  constructor() {
    this.modal = document.getElementById('decision-modal');
    this.titleEl = document.getElementById('decision-title');
    this.descEl = document.getElementById('decision-desc');
    this.optionsContainer = document.getElementById('decision-options');
  }

  show({ title, desc, options }) {
    return new Promise((resolve) => {
      if (!this.modal) return resolve(options[0]);

      if (this.titleEl) this.titleEl.textContent = title || '福克的绅士抉择';
      if (this.descEl) this.descEl.textContent = desc || '';

      if (this.optionsContainer) {
        this.optionsContainer.innerHTML = '';
        options.forEach((opt, idx) => {
          const btn = document.createElement('button');
          btn.className = 'decision-opt-btn';
          btn.id = 'decision-opt-' + idx;
          btn.innerHTML = `
            <span><strong>${opt.label}</strong></span>
            <span style="color: ${opt.costColor || '#8b1e1e'};">${opt.subText || ''}</span>
          `;
          btn.addEventListener('click', () => {
            sound.playCoinClink();
            this.hide();
            resolve(opt);
          });
          this.optionsContainer.appendChild(btn);
        });
      }

      this.modal.classList.remove('hidden');
      sound.playClick();
    });
  }

  hide() {
    if (this.modal) {
      this.modal.classList.add('hidden');
    }
  }
}

export const decisionModal = new DecisionModal();
