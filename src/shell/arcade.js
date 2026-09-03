import { sound } from '../engine/audio.js';
import { events } from '../core/events.js';

export class ArcadeManager {
  constructor() {
    this.modal = document.getElementById('arcade-modal');
    this.btnClose = document.getElementById('btn-close-arcade');
    this.btnOpenHud = document.getElementById('btn-arcade-hud');
    this.btnOpenTitle = document.getElementById('btn-open-arcade');
    this.btnOpenFinal = document.getElementById('btn-open-arcade-final');

    this.cards = document.querySelectorAll('.arcade-card');
    this.highScores = this.loadHighScores();

    this.init();
  }

  init() {
    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => this.hide());
    }
    if (this.btnOpenHud) {
      this.btnOpenHud.addEventListener('click', () => this.show());
    }
    if (this.btnOpenTitle) {
      this.btnOpenTitle.addEventListener('click', () => this.show());
    }
    if (this.btnOpenFinal) {
      this.btnOpenFinal.addEventListener('click', () => this.show());
    }

    this.cards.forEach(card => {
      const game = card.getAttribute('data-game');
      const btn = card.querySelector('.arcade-play-btn');
      if (btn) {
        btn.addEventListener('click', (e) => {
          if (e && e.stopPropagation) e.stopPropagation();
          this.hide();
          events.emit('arcade:start_game', game);
        });
      }
    });

    this.updateScoresUI();
  }

  loadHighScores() {
    try {
      const raw = localStorage.getItem('foggs_bet_arcade_scores');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  saveHighScore(game, score) {
    if (score > (this.highScores[game] || 0)) {
      this.highScores[game] = score;
      try {
        localStorage.setItem('foggs_bet_arcade_scores', JSON.stringify(this.highScores));
      } catch (e) {}
      this.updateScoresUI();
    }
  }

  updateScoresUI() {
    if (!this.cards) return;
    this.cards.forEach(card => {
      const game = card.getAttribute('data-game');
      const scoreEl = card.querySelector('.best-score');
      if (scoreEl && game) {
        const score = this.highScores[game] || 0;
        scoreEl.textContent = game === 'whist' ? `最高: ${score} 墩` : `最高分: ${score}`;
      }
    });
  }

  show() {
    this.updateScoresUI();
    if (this.modal) this.modal.classList.remove('hidden');
    sound.playCardFlip();
  }

  hide() {
    if (this.modal) this.modal.classList.add('hidden');
  }
}

export const arcadeManager = new ArcadeManager();
