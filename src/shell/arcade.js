import { sound } from '../engine/audio.js';
import { events } from '../core/events.js';

// 玩法/计分修正后另存纪录，旧分数保留，不与新规则混排。
const ARCADE_SCORE_KEYS = { typhoonSailing: 'typhoonSailing_v87', circusAcrobat: 'circusAcrobat_v88',
  trainDefense: 'trainDefense_v88', iceSledge: 'iceSledge_v88',
  sanFranciscoBrawl: 'sanFranciscoBrawl_v88', atlanticBurning: 'atlanticBurning_v89' };

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
          if (this.campaignActive) return;
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
    const scoreKey = ARCADE_SCORE_KEYS[game] || game;
    if (score > (this.highScores[scoreKey] || 0)) {
      this.highScores[scoreKey] = score;
      try {
        localStorage.setItem('foggs_bet_arcade_scores', JSON.stringify(this.highScores));
      } catch (e) {}
      this.updateScoresUI();
    }
  }

  getHighScore(game) {
    return this.highScores[ARCADE_SCORE_KEYS[game] || game] || 0;
  }

  updateScoresUI() {
    if (!this.cards) return;
    this.cards.forEach(card => {
      const game = card.getAttribute('data-game');
      const scoreEl = card.querySelector('.best-score');
      if (scoreEl && game) {
        const score = this.getHighScore(game);
        scoreEl.textContent = `最高分: ${score}`;
      }
    });
  }

  setCampaignActive(active) {
    this.campaignActive = active;
    this.cards.forEach(card => { card.querySelector('.arcade-play-btn').disabled = active; });
    this.modal.querySelector('.arcade-subtitle').textContent = active
      ? '主线进行中：此处可看最高分。要练习其他关卡，请先在暂停菜单返回封面，主线进度会保留。'
      : '13 个独立挑战均可直接练习。只记录最高分，不改变主线存档。';
  }

  show() {
    this.updateScoresUI();
    if (this.modal) this.modal.classList.remove('hidden');
    sound.playCardFlip();
    events.emit('ui:overlay', { id: 'arcade', open: true });
  }

  hide() {
    if (this.modal) this.modal.classList.add('hidden');
    document.activeElement?.blur();
    events.emit('ui:overlay', { id: 'arcade', open: false });
  }
}

export const arcadeManager = new ArcadeManager();
