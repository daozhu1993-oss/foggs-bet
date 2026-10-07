import { gameState } from '../core/state.js';
import { TimeManager } from '../core/time.js';
import { MoneyManager } from '../core/money.js';
import { sound } from '../engine/audio.js';
import { events } from '../core/events.js';
import { getJourneyStatus } from '../core/journey.js';

export class HUD {
  constructor() {
    this.el = document.getElementById('hud');
    this.daysText = document.getElementById('hud-days-text');
    this.moneyText = document.getElementById('hud-money-text');
    this.locationText = document.getElementById('hud-location-text');
    this.watchHand = document.getElementById('watch-hand');
    this.pocketWatch = document.getElementById('hud-pocket-watch');
    this.btnSound = document.getElementById('btn-sound');
    this.soundLabel = document.getElementById('sound-label');
    this.btnMap = document.getElementById('btn-map');
    this.btnPassport = document.getElementById('btn-passport');
    this.btnPause = document.getElementById('btn-pause');

    this.displayedMoney = null;
    this.moneyAnimTimer = null;

    this.init();
  }

  init() {
    this.bindEvents();
    this.update();
  }

  show() {
    if (this.el) this.el.classList.remove('hidden');
  }

  hide() {
    if (this.el) this.el.classList.add('hidden');
  }

  setLocation(name) {
    if (this.locationText) {
      this.locationText.textContent = name;
    }
    // 根据地理坐标与关卡自适应流转六大洲沉浸声景
    if (name.includes('伦敦') || name.includes('多佛')) {
      sound.setAmbient('london');
    } else if (name.includes('苏伊士') || name.includes('红海') || name.includes('香港') || name.includes('海峡') || name.includes('横滨') || name.includes('太平洋')) {
      sound.setAmbient('sea');
    } else if (name.includes('印度') || name.includes('加尔各答') || name.includes('孟买')) {
      sound.setAmbient('jungle');
    } else if (name.includes('旧金山') || name.includes('洛矶山') || name.includes('雪原') || name.includes('铁路') || name.includes('内布拉斯加')) {
      sound.setAmbient('west');
    } else if (name.includes('大西洋') || name.includes('利物浦')) {
      sound.setAmbient('fire');
    }
  }

  update() {
    const state = gameState.get();
    const remaining = gameState.getRemainingDays();
    const progress = document.getElementById('hud-journey-status');
    if (progress) progress.textContent = getJourneyStatus(state).pace;

    if (this.daysText) {
      this.daysText.textContent = TimeManager.formatDays(remaining);
      if (remaining < 30) {
        this.daysText.style.color = '#ff6b6b';
      } else {
        this.daysText.style.color = '#ffde59';
      }
    }

    if (this.pocketWatch) {
      if (remaining <= 15) {
        this.pocketWatch.classList.add('watch-urgent');
      } else {
        this.pocketWatch.classList.remove('watch-urgent');
      }
    }

    if (this.moneyText) {
      const targetMoney = state.money.gbp;
      if (this.displayedMoney === null || typeof window === 'undefined' || (window.constructor && window.constructor.name === 'ElementDouble')) {
        this.displayedMoney = targetMoney;
        this.moneyText.textContent = MoneyManager.formatGBP(targetMoney);
      } else if (this.displayedMoney !== targetMoney) {
        const startMoney = this.displayedMoney;
        const diff = targetMoney - startMoney;
        const startTime = performance.now();
        const duration = 450;
        if (this.moneyAnimTimer) cancelAnimationFrame(this.moneyAnimTimer);
        if (diff > 0 && sound.playCoinClink) sound.playCoinClink();
        else if (diff < 0 && sound.playCoin) sound.playCoin();

        const animStep = (now) => {
          const elapsed = now - startTime;
          const progressVal = Math.min(1, elapsed / duration);
          const eased = 1 - Math.pow(1 - progressVal, 2);
          const current = Math.round(startMoney + diff * eased);
          this.displayedMoney = current;
          if (this.moneyText) this.moneyText.textContent = MoneyManager.formatGBP(current);
          if (progressVal < 1) {
            this.moneyAnimTimer = requestAnimationFrame(animStep);
          } else {
            this.displayedMoney = targetMoney;
            if (this.moneyText) this.moneyText.textContent = MoneyManager.formatGBP(targetMoney);
          }
        };
        this.moneyAnimTimer = requestAnimationFrame(animStep);
      }
    }

    if (this.watchHand) {
      const angle = (state.time.elapsed / state.time.totalDays) * 360;
      this.watchHand.style.transform = `rotate(${angle}deg)`;
    }
  }

  bindEvents() {
    events.on('state:changed', () => this.update());
    events.on('time:changed', () => this.update());
    events.on('money:changed', () => this.update());

    if (this.btnSound) {
      const syncSoundUI = (enabled) => {
        if (this.soundLabel) this.soundLabel.textContent = enabled ? '音效' : '静音';
        this.btnSound.classList.toggle('sound-muted', !enabled);
        this.btnSound.title = enabled ? '声音开 (点击静音)' : '声音关 (点击开启)';
      };
      syncSoundUI(sound.enabled);

      this.btnSound.addEventListener('click', () => {
        const enabled = sound.toggle();
        syncSoundUI(enabled);
        if (sound.playClick) sound.playClick();
      });
    }

    if (this.btnMap) {
      this.btnMap.addEventListener('click', () => {
        events.emit('ui:open_map');
      });
    }

    if (this.btnPassport) {
      this.btnPassport.addEventListener('click', () => {
        events.emit('ui:open_passport');
      });
    }

    if (this.btnPause) {
      this.btnPause.addEventListener('click', () => {
        events.emit('game:toggle_pause');
      });
    }
  }
}
