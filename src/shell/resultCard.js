import { sound } from '../engine/audio.js';
import { TimeManager } from '../core/time.js';
import { MoneyManager } from '../core/money.js';
import { gameState } from '../core/state.js';

export class ResultCard {
  constructor() {
    this.modal = document.getElementById('result-modal');
    this.ribbonEl = document.getElementById('result-rating-ribbon');
    this.titleEl = document.getElementById('result-leg-title');
    this.daysDiffEl = document.getElementById('result-days-diff');
    this.moneyDiffEl = document.getElementById('result-money-diff');
    this.totalDaysEl = document.getElementById('result-total-days-left');
    this.commentEl = document.getElementById('result-comment');
    this.btnNext = document.getElementById('btn-next-leg');
    this.btnRetry = document.getElementById('btn-retry-leg');

    this.resolvePromise = null;
    this.init();
  }

  init() {
    if (this.btnNext) {
      this.btnNext.addEventListener('click', () => {
        sound.playStampThud();
        this.hide();
        if (this.resolvePromise) {
          const resolve = this.resolvePromise;
          this.resolvePromise = null;
          resolve('next');
        }
      });
    }

    if (this.btnRetry) {
      this.btnRetry.addEventListener('click', () => {
        sound.playClick();
        this.hide();
        if (this.resolvePromise) {
          const resolve = this.resolvePromise;
          this.resolvePromise = null;
          resolve('retry');
        }
      });
    }
  }

  show(record) {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;

      if (this.titleEl) this.titleEl.textContent = record.title || '航段完成';

      if (this.ribbonEl) {
        if (record.result === 'perfect') {
          this.ribbonEl.textContent = '★ PERFECT 完美节约 ★';
          this.ribbonEl.style.background = '#8b1e1e';
        } else if (record.result === 'good') {
          this.ribbonEl.textContent = '✔ GOOD 按期抵达 ✔';
          this.ribbonEl.style.background = '#1a4329';
        } else {
          this.ribbonEl.textContent = '⚠ 经历波折 ⚠';
          this.ribbonEl.style.background = '#7a3a0e';
        }
      }

      const daysDelta = record.daysDelta || 0;
      const daysSpent = record.daysSpent !== undefined ? record.daysSpent : Math.max(0, Math.round(((record.baseDays || 0) + daysDelta) * 10) / 10);
      const remainingDays = record.remainingDays !== undefined ? record.remainingDays : gameState.getRemainingDays();
      const moneyDelta = record.moneyDelta || 0;

      if (this.daysDiffEl) {
        const sign = daysDelta > 0 ? '+' : '';
        this.daysDiffEl.textContent = sign + daysDelta + ' 天 (共耗' + daysSpent + '天)';
        this.daysDiffEl.style.color = daysDelta <= 0 ? '#1a4329' : '#8b1e1e';
      }

      if (this.moneyDiffEl) {
        this.moneyDiffEl.textContent = moneyDelta !== 0 ? MoneyManager.formatGBP(moneyDelta) : '£0';
        this.moneyDiffEl.style.color = moneyDelta < 0 ? '#8b1e1e' : '#1a4329';
      }

      if (this.totalDaysEl) {
        this.totalDaysEl.textContent = TimeManager.formatDays(remainingDays);
      }

      if (this.commentEl) {
        this.commentEl.textContent = record.comment || '福克：「正如钟表所示，继续前行。」';
      }

      if (this.modal) this.modal.classList.remove('hidden');
      sound.playVictory();
    });
  }

  hide() {
    if (this.modal) this.modal.classList.add('hidden');
  }
}

export const resultCard = new ResultCard();
