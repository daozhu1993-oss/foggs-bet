import { sound } from '../engine/audio.js';
import { TimeManager } from '../core/time.js';
import { MoneyManager } from '../core/money.js';
import { gameState } from '../core/state.js';
import { previewLeg } from '../core/resolve.js';
import { getJourneyStatus } from '../core/journey.js';

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
      const arcade = record.mode === 'arcade';
      const preview = previewLeg(record);
      this.modal.querySelector('.result-stats-row').classList.toggle('hidden', arcade);
      const score = document.getElementById('result-score-detail');
      score.textContent = record.score === undefined ? '' : `本次 ${Math.round(record.score)} 分${arcade ? ` · 个人最佳 ${record.bestScore} 分` : ''}`;
      const impact = document.getElementById('result-journey-impact');
      if (arcade) impact.textContent = '自由挑战 · 主线存档保持不变';
      else {
        const state = gameState.get();
        const legId = record.legId || state.currentLeg;
        const after = { ...state, time: { ...state.time, elapsed: preview.elapsedAfter },
          legResults: { ...state.legResults, [legId]: record } };
        impact.textContent = `${getJourneyStatus(after).pace} · 确认后余款 ${MoneyManager.formatGBP(preview.remainingGBP)}${preview.elapsedAfter > state.time.totalDays ? ' · 已超过八十天' : ''}`;
      }
      this.btnNext.textContent = arcade ? '回到自由挑战' : '确认账单 · 继续旅程 ➔';
      this.btnRetry.textContent = '再试一次 · 不重复扣费';

      if (this.titleEl) this.titleEl.textContent = record.title || '航段完成';

      if (this.ribbonEl) {
        if (record.result === 'perfect') {
          this.ribbonEl.textContent = '★ 表现出色';
          this.ribbonEl.style.background = '#8b1e1e';
        } else if (record.result === 'good') {
          this.ribbonEl.textContent = '顺利完成';
          this.ribbonEl.style.background = '#1a4329';
        } else {
          this.ribbonEl.textContent = '⚠ 经历波折 ⚠';
          this.ribbonEl.style.background = '#7a3a0e';
        }
      }

      const daysDelta = record.daysDelta || 0;
      const daysSpent = preview.daysSpent;
      const remainingDays = preview.remainingDays;
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
      if (record.result === 'perfect' || record.result === 'good') sound.playVictory();
    });
  }

  hide() {
    if (this.modal) this.modal.classList.add('hidden');
  }
}

export const resultCard = new ResultCard();
