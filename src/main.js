// 《Fogg 的赌约》· 主控制调度中心 v5.0 (全场景原画背景与全精灵动作版)
import { OrientationAdapter } from './shell/orientation.js';
import { InputManager } from './input/InputManager.js';
import { HUD } from './shell/hud.js';
import { WorldMap } from './shell/map.js';
import { PassportView } from './shell/passport.js';
import { arcadeManager } from './shell/arcade.js';
import { dialogue } from './shell/dialogue.js';
import { decisionModal } from './shell/decisionModal.js';
import { resultCard } from './shell/resultCard.js';
import { sharePoster } from './shell/shareCard.js';
import { miniGameRegistry } from './minigames/_base/registry.js';
import { particles } from './engine/particles.js';
import { fx } from './engine/fx.js';
import { sound } from './engine/audio.js';
import { GameImages } from './assets/images.js';
import { SpriteEngine } from './engine/sprites.js';
import { gameState } from './core/state.js';
import { StorageManager } from './core/storage.js';
import { events } from './core/events.js';
import { initBackdrop, sceneBackdrop } from './engine/backdrop.js';
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

    this.activeMiniGame = null;
    this.isPaused = false;
    this.lastTime = 0;

    this.fx = fx;
    this.sound = sound;
    window.fx = fx;
    window.sound = sound;

    particles.setCanvas(this.fxCanvas);

    this.initTitleScreen();
    this.bindGlobalEvents();
    this.startGameLoop();
  }

  initTitleScreen() {
    const titleScreen = document.getElementById('title-screen');
    const btnStart = document.getElementById('btn-start-game');
    const btnLoad = document.getElementById('btn-load-game');

    // 封面高精原画背景装饰
    if (GameImages.cover) {
      titleScreen.style.backgroundImage = `radial-gradient(circle at center, rgba(36,29,23,0.7) 0%, rgba(13,11,9,0.92) 100%), url(${GameImages.cover})`;
      titleScreen.style.backgroundSize = 'cover';
      titleScreen.style.backgroundPosition = 'center';
    }

    // 设置封面主角高精立绘
    const foggImgEl = document.getElementById('hero-fogg-img');
    if (foggImgEl && GameImages.fogg) {
      foggImgEl.src = GameImages.fogg;
    }

    const passImgEl = document.getElementById('hero-pass-img');
    if (passImgEl && GameImages.passepartout) {
      passImgEl.src = GameImages.passepartout;
    }

    if (StorageManager.hasSave()) {
      btnLoad.classList.remove('hidden');
      btnLoad.addEventListener('click', () => {
        sound.init();
        sound.resume();
        sound.setAmbient('london');
        StorageManager.load();
        titleScreen.classList.add('hidden');
        this.showHudArcadeBtn();
        this.resumeFromSave();
      });
    }

    if (btnStart) {
      btnStart.addEventListener('click', () => {
        sound.init();
        sound.resume();
        sound.setAmbient('london');
        gameState.reset();
        titleScreen.classList.add('hidden');
        this.showHudArcadeBtn();
        this.startMainCampaign();
      });
    }
  }

  showHudArcadeBtn() {
    const btn = document.getElementById('btn-arcade-hud');
    if (btn) btn.classList.remove('hidden');
  }

  bindGlobalEvents() {
    events.on('game:toggle_pause', () => {
      this.isPaused = !this.isPaused;
      if (this.activeMiniGame) {
        if (this.isPaused) this.activeMiniGame.pause();
        else this.activeMiniGame.resume();
      }
      fx.toast(this.isPaused ? '⏸️ 游戏已暂停' : '▶️ 游戏继续');
    });

    events.on('arcade:start_game', async (gameName) => {
      sound.init();
      sound.resume();
      const shouldRestoreDialogue = dialogue.isVisible();
      const previousLocation = this.hud.locationText?.textContent;
      if (shouldRestoreDialogue) dialogue.hide();
      const titleScreen = document.getElementById('title-screen');
      if (titleScreen) titleScreen.classList.add('hidden');
      if (gameName === 'steamOverdrive') this.hud.setLocation('红海 · 蒙古号轮机舱');
      this.hud.show();
      this.showHudArcadeBtn();

      fx.toast(`🎪 启动游乐场独立挑战: [${gameName}]`);
      const res = await this.runMiniGame(gameName, { difficulty: 1 });
      this.arcade.saveHighScore(gameName, res.score || 0);

      fx.toast(`★ 挑战完成！成绩: ${res.score || 0}`, 3000);
      if (previousLocation) this.hud.setLocation(previousLocation);
      if (shouldRestoreDialogue) dialogue.show();
      this.arcade.show();
    });
  }

  startGameLoop() {
    const loop = (timestamp) => {
      if (!this.lastTime) this.lastTime = timestamp;
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
      this.lastTime = timestamp;

      if (!this.isPaused) {
        try {
          if (this.activeMiniGame && this.activeMiniGame.running && !this.activeMiniGame.paused) {
            this.activeMiniGame.update(dt);

            this.gameCtx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
            this.activeMiniGame.render(this.gameCtx);
          } else if (!this.activeMiniGame && this.backdrop) {
            this.backdrop.render();
          }
        } catch (renderErr) {
          console.error('[GameApp] MiniGame loop error:', renderErr);
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

  async runMiniGame(gameName, config = {}) {
    const briefingConfig = {
      whist: {
        title: '改良俱乐部 · 惠斯特 7 墩大师决战',
        subtitle: '立下吃墩合约，跟出同花色，善用红桃王牌绝杀！',
        controls: [
          { key: '拖拽 / 点击', desc: '选择手牌打入牌桌' },
          { key: '♥ 红桃', desc: '常驻王牌定乾坤' }
        ]
      },
      parkour: {
        title: '多佛码头 · 三阶段赶船飞跃',
        subtitle: '争分夺秒登上蒙古号班轮，躲避障碍夺回护照！',
        controls: [
          { key: 'A / ↑ / 空格', desc: '二段腾空跳跃' },
          { key: 'B / ↓', desc: '低空贴地滑铲' }
        ]
      },
      steamOverdrive: {
        title: '红海风暴 · 蒙古号轮机舱高压超频',
        subtitle: '跟随 120 BPM 蒸汽冲程，连续打击推动蒙古号穿越季风！',
        controls: [
          { key: 'D / A / ←', desc: '红轨：司炉重铲投煤' },
          { key: 'K / L / →', desc: '蓝轨：活塞蒸汽调压' },
          { key: '空格 / J / 双键', desc: '金色双音：飞轮同步超频' }
        ]
      },
      elephantRide: {
        title: '印度雨林 · 战象狂暴突进三部曲',
        subtitle: '穿梭三道林道，挥舞象鼻开山，咆哮震退丛林猛虎！',
        controls: [
          { key: '↑ / ↓ / 滑动', desc: '上下车道平滑切换' },
          { key: 'A / 空格', desc: '象鼻重击轰碎古木巨岩' },
          { key: 'B', desc: '战象咆哮震退猛兽' }
        ]
      },
      stealthRescue: {
        title: '火祭神庙 · 暗夜潜行与铁锁营救',
        subtitle: '避开守卫视野与猎犬嗅觉，泼水造影，斩断锁链！',
        controls: [
          { key: '方向键 / 摇杆', desc: '阴影中潜行隐蔽' },
          { key: 'B', desc: '水袋泼灭火把' },
          { key: 'A / 空格', desc: '转盘精准解开铁锁' }
        ]
      },
      courtBail: {
        title: '加尔各答公堂 · 涉外法理辩护与保释',
        subtitle: '法庭智斗击退菲克斯诬告，呈递两千英镑保释金！',
        controls: [
          { key: '1 / 2 / 3 / 点击', desc: '选择最佳法律辩词' },
          { key: '空格', desc: '当庭认缴保释金' }
        ]
      },
      typhoonSailing: {
        title: '南中国海 · 坦克德尔号台风搏击',
        subtitle: '狂暴台风中操纵小帆船，调控帆位，发射信号弹锁定信标！',
        controls: [
          { key: '← / → / A / D', desc: '舵向迎浪破波' },
          { key: '↑ / ↓ / W / S', desc: '升降帆位调控航速' },
          { key: '空格', desc: '发射穿云信号弹' }
        ]
      },
      circusAcrobat: {
        title: '日本横滨 · 长鼻天狗马戏团叠罗汉',
        subtitle: '高空维持物理力矩平衡，在层层罗汉顶端与主人相认重聚！',
        controls: [
          { key: '← / → / A / D', desc: '倾斜力矩反向校正' },
          { key: '空格', desc: '发现台下福克飞身扑救' }
        ]
      },
      sanFranciscoBrawl: {
        title: '美西旧金山 · 选战酒馆大乱斗',
        subtitle: '混乱选战街头突围，挥舞拐杖格挡投掷物，掩护福克登车！',
        controls: [
          { key: '← / → / A / D', desc: '酒馆走位躲避' },
          { key: '空格 / J', desc: '挥舞法式拐杖格挡' },
          { key: '↓ / S', desc: '吧台下蹲规避飞杯' }
        ]
      },
      trainDefense: {
        title: '洛矶山脉 · 列车车顶防守与断桥飞跃',
        subtitle: '疾驰机车车顶拔枪御敌，全速推满油门飞跃断桥！',
        controls: [
          { key: '方向键 / 鼠标', desc: '准星瞄准追兵' },
          { key: '空格 / 点击', desc: '左轮手枪速射' }
        ]
      },
      iceSledge: {
        title: '内布拉斯加 · 风帆雪橇冰原狂飙',
        subtitle: '暴风雪大平原 50 迈狂飙，顺风滑行避开冰隙直扑纽约！',
        controls: [
          { key: '← / → / A / D', desc: '雪橇滑轨转向' },
          { key: '捕捉顺风区', desc: '极速冲刺' }
        ]
      },
      atlanticBurning: {
        title: '大西洋 · 亨丽埃塔号拆船大燃烧',
        subtitle: '煤炭燃尽！下令拆卸甲板与船舱投炉，烈火冲滩利物浦！',
        controls: [
          { key: '1 / 2 / 3', desc: '拆解甲板/船舱/主桅' },
          { key: '空格 / J', desc: '投木入炉极速超频' }
        ]
      },
      londonFinale: {
        title: '伦敦改良俱乐部 · 日界线顿悟与 80 秒绝杀',
        subtitle: '跨越 360° 经度夺回一天！最后 80 秒马车破门绝杀！',
        controls: [
          { key: '← / →', desc: '经度时差顿悟 / 马车操舵' },
          { key: '空格', desc: '扬鞭飞车破门' }
        ]
      }
    };

    if (briefingConfig[gameName]) {
      await TacticalBriefing.show(briefingConfig[gameName]);
    }

    return new Promise((resolve) => {
      if (this.activeMiniGame) {
        this.activeMiniGame.destroy();
        this.activeMiniGame = null;
      }

      this.activeMiniGame = miniGameRegistry.create(gameName, {
        container: this.container,
        canvas: this.gameCanvas,
        input: this.input,
        fx,
        sound,
        config
      });

      this.activeMiniGame.init();
      if (this.input && this.input.adaptControlsForGame) {
        this.input.adaptControlsForGame(gameName);
      }

      const ambientMap = {
        whist: 'london',
        londonFinale: 'london',
        parkour: 'sea',
        steamOverdrive: 'sea',
        typhoonSailing: 'sea',
        circusAcrobat: 'sea',
        elephantRide: 'jungle',
        stealthRescue: 'jungle',
        courtBail: 'jungle',
        sanFranciscoBrawl: 'west',
        trainDefense: 'west',
        iceSledge: 'west',
        atlanticBurning: 'fire'
      };
      if (sound && sound.setAmbient && ambientMap[gameName]) {
        sound.setAmbient(ambientMap[gameName]);
      }

      this.activeMiniGame.onComplete = (result) => {
        if (this.input && this.input.configureUI) {
          this.input.configureUI({ showDpad: false, showA: false, showB: false, showC: false });
        }
        if (this.activeMiniGame) {
          this.activeMiniGame.destroy();
          this.activeMiniGame = null;
        }
        this.gameCtx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
        resolve(result);
      };

      this.activeMiniGame.start();
    });
  }

  async startMainCampaign() {
    try {
      const legs = [
        runLeg0, runLeg1, runLeg2, runLeg3,
        runLeg4, runLeg5, runLeg6, runLeg7,
        runLeg8, runLeg9, runLeg10
      ];

      gameState.setLeg('leg0');
      for (let i = 0; i < legs.length; i++) {
        const nextLeg = await legs[i]({ gameRunner: this, hud: this.hud });
        gameState.setLeg(nextLeg);
      }
      gameState.setLeg('completed');
    } catch (err) {
      console.error('[GameApp] Campaign error:', err);
    }
  }

  async resumeFromSave() {
    const currentLeg = gameState.get().currentLeg || 'leg0';
    if (currentLeg === 'completed') {
      sharePoster.show();
      return;
    }
    const legMap = {
      leg0: 0, leg1: 1, leg2: 2, leg3: 3,
      leg4: 4, leg5: 5, leg6: 6, leg7: 7,
      leg8: 8, leg9: 9, leg10: 10
    };

    const startIndex = legMap[currentLeg] !== undefined ? legMap[currentLeg] : 0;
    const legs = [
      runLeg0, runLeg1, runLeg2, runLeg3,
      runLeg4, runLeg5, runLeg6, runLeg7,
      runLeg8, runLeg9, runLeg10
    ];

    try {
      for (let i = startIndex; i < legs.length; i++) {
        const nextLeg = await legs[i]({ gameRunner: this, hud: this.hud });
        gameState.setLeg(nextLeg);
      }
      gameState.setLeg('completed');
    } catch (err) {
      console.error('[GameApp] Resume error:', err);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.gameApp = new GameApp();
});
