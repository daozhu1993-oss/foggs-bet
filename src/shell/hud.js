import { gameState } from '../core/state.js';
import { TimeManager } from '../core/time.js';
import { MoneyManager } from '../core/money.js';
import { sound } from '../engine/audio.js';
import { events } from '../core/events.js';

export class HUD {
  constructor() {
    this.el = document.getElementById('hud');
    this.daysText = document.getElementById('hud-days-text');
    this.moneyText = document.getElementById('hud-money-text');
    this.locationText = document.getElementById('hud-location-text');
    this.watchHand = document.getElementById('watch-hand');
    this.btnSound = document.getElementById('btn-sound');
    this.btnMap = document.getElementById('btn-map');
    this.btnPassport = document.getElementById('btn-passport');
    this.btnPause = document.getElementById('btn-pause');

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

    if (this.daysText) {
      this.daysText.textContent = TimeManager.formatDays(remaining);
      if (remaining < 30) {
        this.daysText.style.color = '#ff6b6b';
      } else {
        this.daysText.style.color = '#ffde59';
      }
    }

    if (this.moneyText) {
      this.moneyText.textContent = MoneyManager.formatGBP(state.money.gbp);
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
      this.btnSound.addEventListener('click', () => {
        const enabled = sound.toggle();
        this.btnSound.textContent = enabled ? '🔊 音效' : '🔇 静音';
        sound.playClick();
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
