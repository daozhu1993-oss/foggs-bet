import { gameState } from '../core/state.js';
import { sound } from '../engine/audio.js';
import { events } from '../core/events.js';
import { GameImages } from '../assets/images.js';
import { SpriteEngine } from '../engine/sprites.js';

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
  }

  hide() {
    if (this.modal) this.modal.classList.add('hidden');
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

    allSlots.forEach(slot => {
      const isStamped = state.passport.some(s => s.id === slot.id || (slot.id === 'calcutta' && (s.id === 'calcutta_aouda' || s.id === 'calcutta_court')));
      const slotEl = document.createElement('div');
      slotEl.className = `stamp-slot ${isStamped ? 'stamped' : ''}`;

      if (isStamped) {
        const stampData = state.passport.find(s => s.id === slot.id || (slot.id === 'calcutta' && (s.id === 'calcutta_aouda' || s.id === 'calcutta_court')));
        slotEl.innerHTML = `
          <div class="stamp-seal stamp-slam-anim ${stampData.color || slot.id}">
            <div class="seal-auth">${slot.auth}</div>
            <div class="seal-city">${stampData.city || slot.city}</div>
            <div class="seal-date">${stampData.date || slot.date}</div>
            <div class="seal-auth">★ VISA GRANTED ★</div>
          </div>
        `;
      } else {
        slotEl.innerHTML = `
          <div style="color: #a89a84; font-size: 13px; text-align: center;">
            <span style="font-size: 20px; display: block; margin-bottom: 4px;">⚓</span>
            [ 未抵达 · ${slot.city} ]
          </div>
        `;
      }

      this.stampsGrid.appendChild(slotEl);
    });
  }
}
