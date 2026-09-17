// One campaign, one active challenge. Arcade scores never alter the travel ledger.
import { OrientationAdapter } from './shell/orientation.js';
import { InputManager } from './input/InputManager.js';
import { HUD } from './shell/hud.js';
import { WorldMap } from './shell/map.js';
import { PassportView } from './shell/passport.js';
import { arcadeManager } from './shell/arcade.js';
import { dialogue } from './shell/dialogue.js';
import { resultCard } from './shell/resultCard.js';
import { sharePoster } from './shell/shareCard.js';
import { miniGameRegistry } from './minigames/_base/registry.js';
import { particles } from './engine/particles.js';
import { fx } from './engine/fx.js';
import { sound } from './engine/audio.js';
import { GameImages } from './assets/images.js';
import { gameState } from './core/state.js';
import { StorageManager } from './core/storage.js';
import { events } from './core/events.js';
import { CHALLENGE_GUIDES } from './core/journey.js';
import { initBackdrop } from './engine/backdrop.js';
import { TacticalBriefing } from './shell/briefing.js';
import { runLeg0 } from './levels/leg0.js';
import { runLeg1 } from './levels/leg1.js';
import { runLeg2 } from './levels/leg2.js';
import { runLeg3 } from './levels/leg3.js';
import { runLeg4 } from './levels/leg4.js';
import { runLeg5 } from './levels/leg5.js';
import { runLeg6 } from './levels/leg6.js';
import { runLeg7 } from './levels/leg7.js';
import { runLeg8 } from './levels/leg8.js';
import { runLeg9 } from './levels/leg9.js';
import { runLeg10 } from './levels/leg10.js';

class GameApp {
  constructor() {
    this.container = document.getElementById('game-container');
    this.gameCanvas = document.getElementById('game-canvas');
    this.gameCtx = this.gameCanvas.getContext('2d');
    this.fxCanvas = document.getElementById('fx-canvas');
    this.fxCtx = this.fxCanvas.getContext('2d');
    this.orientation = new OrientationAdapter();
    this.input = new InputManager(this.container, this.gameCanvas);
    this.hud = new HUD();
    this.map = new WorldMap();
    this.passport = new PassportView();
    this.arcade = arcadeManager;
    this.backdrop = initBackdrop(this.gameCanvas);
    this.pauseModal = document.getElementById('pause-modal');
    this.activeMiniGame = null;
    this.currentChallenge = null;
    this.pauseReasons = new Set();
    this.isPaused = false;
    this.mode = 'title';
    this.lastTime = 0;
    this.fx = window.fx = fx;
    this.sound = window.sound = sound;
    particles.setCanvas(this.fxCanvas);
    this.initTitleScreen();
    this.bindGlobalEvents();
    this.startGameLoop();
  }

  initTitleScreen() {
    const title = document.getElementById('title-screen');
    if (GameImages.cover) {
      title.style.backgroundImage = `radial-gradient(circle at center, rgba(36,29,23,0.7) 0%, rgba(13,11,9,0.92) 100%), url(${GameImages.cover})`;
      title.style.backgroundSize = 'cover';
      title.style.backgroundPosition = 'center';
    }
    document.getElementById('hero-fogg-img').src = GameImages.fogg;
    document.getElementById('hero-pass-img').src = GameImages.passepartout;
    const load = document.getElementById('btn-load-game');
    load.classList.toggle('hidden', !StorageManager.hasSave());
    load.addEventListener('click', () => {
      if (this.mode !== 'title') return;
      if (!StorageManager.load()) {
        fx.toast('这份存档未能读取，可以重新开始旅程。');
        return;
      }
      this.enterCampaign();
    });
    document.getElementById('btn-start-game').addEventListener('click', () => {
      if (this.mode !== 'title') return;
      if (StorageManager.hasSave() && !window.confirm('重新启程会替换当前主线存档。确定开始新的旅程吗？')) return;
      gameState.reset();
      StorageManager.save();
      this.enterCampaign();
    });
  }

  enterCampaign() {
    sound.init();
    sound.resume();
    this.mode = 'campaign';
    this.arcade.setCampaignActive(true);
    document.getElementById('title-screen').classList.add('hidden');
    this.hud.show();
    document.getElementById('btn-arcade-hud').classList.remove('hidden');
    this.resumeFromSave();
  }

  setPauseReason(reason, paused) {
    if (paused) this.pauseReasons.add(reason);
    else this.pauseReasons.delete(reason);
    const next = this.pauseReasons.size > 0;
    if (next === this.isPaused) return;
    this.isPaused = next;
    this.input.setEnabled(!next && !!this.activeMiniGame);
    sound.setPaused(next);
    if (this.activeMiniGame) {
      if (next) this.activeMiniGame.pause();
      else this.activeMiniGame.resume();
    }
    document.getElementById('btn-pause').setAttribute('aria-pressed', String(next));
  }

  showPause(message) {
    const briefing = document.getElementById('briefing-modal');
    if (briefing && !briefing.classList.contains('hidden')) return;
    if (!this.activeMiniGame && this.mode !== 'campaign') return;
    this.setPauseReason('manual', true);
    document.getElementById('pause-challenge').textContent = this.currentChallenge
      ? CHALLENGE_GUIDES[this.currentChallenge.name].title : this.hud.locationText.textContent;
    document.getElementById('btn-retry-active').disabled = !this.activeMiniGame;
    document.getElementById('pause-note').textContent = message || '时间和音乐已暂停。重试不扣旅费；返回封面保留已完成航段，当前航段下次重玩。';
    this.pauseModal.classList.remove('hidden');
    document.getElementById('btn-resume-game').focus();
  }

  resumePlay() {
    this.pauseModal.classList.add('hidden');
    document.activeElement?.blur();
    this.setPauseReason('manual', false);
  }

  bindGlobalEvents() {
    events.on('game:toggle_pause', () => {
      if (!this.pauseModal.classList.contains('hidden')) this.resumePlay();
      else this.showPause();
    });
    events.on('ui:overlay', ({ id, open }) => this.setPauseReason(id, open));
    events.on('game:portrait', () => {
      if (this.activeMiniGame) this.showPause('竖屏时已暂停。把手机横过来，再继续这一程。');
    });
    document.getElementById('btn-resume-game').addEventListener('click', () => this.resumePlay());
    document.getElementById('btn-retry-active').addEventListener('click', () => {
      const challenge = this.currentChallenge;
      this.clearChallenge();
      this.resumePlay();
      challenge?.launch();
    });
    document.getElementById('btn-exit-game').addEventListener('click', () => window.location.reload());
    window.addEventListener('keydown', e => {
      if (e.code !== 'Escape' || e.repeat) return;
      e.preventDefault();
      if (this.pauseReasons.has('map')) this.map.hide();
      else if (this.pauseReasons.has('passport')) this.passport.hide();
      else if (this.pauseReasons.has('arcade')) this.arcade.hide();
      else events.emit('game:toggle_pause');
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.activeMiniGame) this.showPause('切换页面时已为你暂停。准备好后再继续。');
    });
    window.addEventListener('blur', () => {
      if (this.activeMiniGame) this.showPause('离开游戏窗口时已暂停。准备好后再继续。');
    });
    events.on('arcade:start_game', async name => {
      if (this.mode === 'campaign' || this.currentChallenge) return;
      this.mode = 'arcade';
      sound.init();
      sound.resume();
      document.getElementById('title-screen').classList.add('hidden');
      sharePoster.hide();
      this.hud.show();
      this.hud.setLocation(CHALLENGE_GUIDES[name].location);
      document.getElementById('btn-arcade-hud').classList.add('hidden');
      try {
        let action;
        do {
          const result = await this.runMiniGame(name, { difficulty: 1 });
          this.arcade.saveHighScore(name, result.score || 0);
          action = await resultCard.show({ ...result, mode: 'arcade', title: CHALLENGE_GUIDES[name].title,
            comment: result.comment || '每一次练习都不影响主线时间与旅费。',
            bestScore: this.arcade.getHighScore(name) });
        } while (action === 'retry');
        this.mode = 'title';
        this.hud.hide();
        document.getElementById('title-screen').classList.remove('hidden');
        this.arcade.show();
      } catch (error) {
        console.error('[GameApp] Arcade:', error);
        fx.toast('挑战未能启动，请刷新重试。主线存档未改动。');
      }
    });
  }

  startGameLoop() {
    const loop = timestamp => {
      const dt = Math.min((timestamp - (this.lastTime || timestamp)) / 1000, 0.1);
      this.lastTime = timestamp;
      if (!this.isPaused) {
        try {
          const game = this.activeMiniGame;
          if (game?.running && !game.paused) {
            game.update(dt);
            this.gameCtx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
            if (!game.destroyed) game.render(this.gameCtx);
          } else if (!game) this.backdrop?.render();
        } catch (error) {
          console.error('[GameApp] Challenge:', error);
          this.showPause('这一局遇到了异常。可以重试本关，或返回封面；已完成的航段仍保留。');
        }
        fx.update(dt);
        particles.update(dt);
        this.fxCtx.clearRect(0, 0, this.fxCanvas.width, this.fxCanvas.height);
        particles.render(this.fxCtx);
        fx.render(this.fxCtx);
      }
      this.input.endFrame();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  clearChallenge() {
    this.activeMiniGame?.destroy();
    this.activeMiniGame = null;
    sound.music.stopTheme();
    this.input.setEnabled(false);
    this.input.configureUI({ showDpad: false, showA: false, showB: false, showC: false });
    this.gameCtx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
  }

  runMiniGame(name, config = {}) {
    return new Promise((resolve, reject) => {
      const challenge = { name, launch: async () => {
        try {
          this.clearChallenge();
          await TacticalBriefing.show(CHALLENGE_GUIDES[name]);
          const game = miniGameRegistry.create(name, { container: this.container, canvas: this.gameCanvas,
            input: this.input, fx, sound, config });
          this.activeMiniGame = game;
          game.init();
          this.input.adaptControlsForGame(name);
          const zone = { whist: 'london', londonFinale: 'london', elephantRide: 'jungle', stealthRescue: 'jungle',
            courtBail: 'jungle', sanFranciscoBrawl: 'west', trainDefense: 'west', iceSledge: 'west', atlanticBurning: 'fire' };
          sound.setAmbient(zone[name] || 'sea');
          game.onComplete = result => {
            if (this.activeMiniGame !== game) return;
            this.clearChallenge();
            this.currentChallenge = null;
            resolve(result);
          };
          document.activeElement?.blur();
          game.start();
          this.input.setEnabled(!this.isPaused);
          if (this.isPaused) game.pause();
        } catch (error) {
          this.clearChallenge();
          this.currentChallenge = null;
          reject(error);
        }
      } };
      this.currentChallenge = challenge;
      challenge.launch();
    });
  }

  async resumeFromSave() {
    const legs = [runLeg0, runLeg1, runLeg2, runLeg3, runLeg4, runLeg5, runLeg6, runLeg7, runLeg8, runLeg9, runLeg10];
    const current = gameState.get().currentLeg;
    try {
      if (current === 'completed') sharePoster.show();
      else {
        const start = Number(current.replace('leg', '')) || 0;
        for (let i = start; i < legs.length; i++) {
          await legs[i]({ gameRunner: this, hud: this.hud });
        }
      }
      this.mode = 'complete';
      this.arcade.setCampaignActive(false);
    } catch (error) {
      console.error('[GameApp] Campaign:', error);
      fx.toast('旅程暂时中断。刷新后可从最近完成的航段继续。', 6000);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => { window.gameApp = new GameApp(); });
