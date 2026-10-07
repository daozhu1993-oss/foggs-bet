import { gameState } from '../core/state.js';
import { sound } from '../engine/audio.js';
import { events } from '../core/events.js';
import { GameImages } from '../assets/images.js';
import { SpriteEngine } from '../engine/sprites.js';
import { fx } from '../engine/fx.js';

const STAMP_JOURNALS = {
  london: '伦敦改良俱乐部 · 启程：两万英镑赌约立定，向东踏入未知的世界。',
  suez: '苏伊士运河 · 英国领事馆：登上蒙古号皇家邮轮，劈波斩浪穿过红海。',
  bombay: '孟买总督府 · 抵达印度：火车前路断裂，奇阿尼巨象密林疾行。',
  calcutta: '加尔各答公堂 · 东印度公司：两千镑保释解救艾娥达，登船逃出法网。',
  hongkong: '香港维多利亚港：台风中租下双桅帆船坦克德尔号，冒死追赶上海邮轮。',
  yokohama: '日本横滨帝国通关：长鼻天狗人梯杂技惊艳相认，全员汇合登大太平洋轮。',
  sanfrancisco: '旧金山太平洋大铁路：穿过选战暴徒乱局，登上横贯大陆列车。',
  newyork: '纽约港口官印：风帆雪橇冰原狂飙五十迈，买下亨丽埃塔号商船。',
  liverpool: '利物浦皇家海关：拆船烧甲板硬渡大西洋，菲克斯验明清白误会冰释。',
  london_final: '伦敦改良俱乐部凯旋：日界线东行抢回一日，八十天赌约完胜！'
};

export class PassportView {
  constructor() {
    this.modal = document.getElementById('passport-modal');
    this.btnClose = document.getElementById('btn-close-passport');
    this.stampsGrid = document.getElementById('passport-stamps-grid');
    this.aoudaStatus = document.getElementById('passport-aouda-status');
    this.portraitCanvas = document.getElementById('passport-fogg-portrait');
    this.portraitCtx = this.portraitCanvas ? this.portraitCanvas.getContext('2d') : null;

    this.foggImg = new Image();
    if (GameImages.fogg) this.foggImg.src = GameImages.fogg;

    this.init();
  }

  init() {
    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => this.hide());
    }
    events.on('ui:open_passport', () => this.show());
    events.on('passport:stamped', () => this.renderStamps());

    this.drawPortrait();
  }

  drawPortrait() {
    if (!this.portraitCtx || !this.portraitCanvas) return;
    this.portraitCtx.clearRect(0, 0, this.portraitCanvas.width, this.portraitCanvas.height);

    if (this.foggImg.complete && this.foggImg.naturalWidth > 0) {
      this.portraitCtx.drawImage(this.foggImg, 0, 0, this.portraitCanvas.width, this.portraitCanvas.height);
    } else {
      this.foggImg.onload = () => {
        if (this.portraitCtx) {
          this.portraitCtx.drawImage(this.foggImg, 0, 0, this.portraitCanvas.width, this.portraitCanvas.height);
        }
      };
      SpriteEngine.drawFoggPortrait(this.portraitCtx, 10, 10, 80);
    }
  }

  show() {
    if (this.modal) this.modal.classList.remove('hidden');
    this.renderStamps();
    this.drawPortrait();
    sound.playCardFlip();
    events.emit('ui:overlay', { id: 'passport', open: true });
  }

  hide() {
    if (this.modal) this.modal.classList.add('hidden');
    document.activeElement?.blur();
    events.emit('ui:overlay', { id: 'passport', open: false });
  }

  renderStamps() {
    const state = gameState.get();
    if (this.aoudaStatus) {
      this.aoudaStatus.textContent = state.flags.aoudaRescued ? '艾娥达夫人 (已同行)' : '尚未同行';
      this.aoudaStatus.style.color = state.flags.aoudaRescued ? '#1a4329' : '#8c6d23';
    }

    if (!this.stampsGrid) return;
    this.stampsGrid.innerHTML = '';

    const allSlots = [
      { id: 'london', city: 'LONDON', date: '02 OCT 1872', auth: 'REFORM CLUB' },
      { id: 'suez', city: 'SUEZ', date: '09 OCT 1872', auth: 'BRITISH CONSULATE' },
      { id: 'bombay', city: 'BOMBAY', date: '20 OCT 1872', auth: 'GOVERNMENT HOUSE' },
      { id: 'calcutta', city: 'CALCUTTA', date: '25 OCT 1872', auth: 'EAST INDIA CO.' },
      { id: 'hongkong', city: 'HONG KONG', date: '06 NOV 1872', auth: 'VICTORIA HARBOR' },
      { id: 'yokohama', city: 'YOKOHAMA', date: '14 NOV 1872', auth: 'EMPIRE OF JAPAN' },
      { id: 'sanfrancisco', city: 'SAN FRANCISCO', date: '03 DEC 1872', auth: 'PACIFIC RAILROAD' },
      { id: 'newyork', city: 'NEW YORK', date: '11 DEC 1872', auth: 'PORT OF NEW YORK' },
      { id: 'liverpool', city: 'LIVERPOOL', date: '20 DEC 1872', auth: 'HM CUSTOMS' },
      { id: 'london_final', city: 'LONDON TRIUMPH', date: '21 DEC 1872', auth: '★ REFORM CLUB ★' }
    ];

    allSlots.forEach((slot, idx) => {
      const isStamped = state.passport.some(s => s.id === slot.id || (slot.id === 'calcutta' && (s.id === 'calcutta_aouda' || s.id === 'calcutta_court')));
      const slotEl = document.createElement('div');
      slotEl.className = `stamp-slot ${isStamped ? 'stamped' : ''}`;
      slotEl.title = isStamped ? `点击查阅 ${slot.city} 探险手账` : `未抵达 · ${slot.city}`;

      if (isStamped) {
        const stampData = state.passport.find(s => s.id === slot.id || (slot.id === 'calcutta' && (s.id === 'calcutta_aouda' || s.id === 'calcutta_court')));
        const rot = (((slot.city.charCodeAt(0) * 13 + idx) % 9) - 4).toFixed(1);
        slotEl.innerHTML = `
          <div class="stamp-seal stamp-slam-anim ${stampData.color || slot.id}" style="transform: rotate(${rot}deg);">
            <div class="seal-auth">${slot.auth}</div>
            <div class="seal-city">${stampData.city || slot.city}</div>
            <div class="seal-date">${stampData.date || slot.date}</div>
            <div class="seal-auth">★ VISA GRANTED ★</div>
          </div>
        `;
        slotEl.addEventListener('click', () => {
          if (sound && sound.playParchmentRustle) sound.playParchmentRustle();
          if (fx && fx.toast) fx.toast(`📜 【${slot.city} 探险手账】${STAMP_JOURNALS[slot.id] || '签证已核准通过。'}`);
        });
      } else {
        slotEl.innerHTML = `
          <div style="color: #a89a84; font-size: 13px; text-align: center;">
            <span style="font-size: 20px; display: block; margin-bottom: 4px;">⚓</span>
            [ 未抵达 · ${slot.city} ]
          </div>
        `;
        slotEl.addEventListener('click', () => {
          if (sound && sound.playClick) sound.playClick();
          if (fx && fx.toast) fx.toast(`⚓ 【${slot.city}】此地尚未完成探险盖章，继续前行吧。`);
        });
      }

      this.stampsGrid.appendChild(slotEl);
    });
  }
}
