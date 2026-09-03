// 小游戏注册表 MiniGame Registry
import { WhistMiniGame } from '../whist.js';
import { ParkourMiniGame } from '../parkour.js';
import { ElephantRideMiniGame } from '../elephantRide.js';
import { StealthRescueMiniGame } from '../stealthRescue.js';
import { SteamOverdriveMiniGame } from '../steamOverdrive.js';
import { CourtBailMiniGame } from '../courtBail.js';
import { TyphoonSailingMiniGame } from '../typhoonSailing.js';
import { CircusAcrobatMiniGame } from '../circusAcrobat.js';
import { SanFranciscoBrawlMiniGame } from '../sanFranciscoBrawl.js';
import { TrainDefenseMiniGame } from '../trainDefense.js';
import { IceSledgeMiniGame } from '../iceSledge.js';
import { AtlanticBurningMiniGame } from '../atlanticBurning.js';
import { LondonFinaleMiniGame } from '../londonFinale.js';

class MiniGameRegistry {
  constructor() {
    this.games = new Map();
    this.register('whist', WhistMiniGame);
    this.register('parkour', ParkourMiniGame);
    this.register('steamOverdrive', SteamOverdriveMiniGame);
    this.register('elephantRide', ElephantRideMiniGame);
    this.register('stealthRescue', StealthRescueMiniGame);
    this.register('courtBail', CourtBailMiniGame);
    this.register('typhoonSailing', TyphoonSailingMiniGame);
    this.register('circusAcrobat', CircusAcrobatMiniGame);
    this.register('sanFranciscoBrawl', SanFranciscoBrawlMiniGame);
    this.register('trainDefense', TrainDefenseMiniGame);
    this.register('iceSledge', IceSledgeMiniGame);
    this.register('atlanticBurning', AtlanticBurningMiniGame);
    this.register('londonFinale', LondonFinaleMiniGame);
  }

  register(name, GameClass) {
    this.games.set(name, GameClass);
  }

  create(name, params) {
    const GameClass = this.games.get(name);
    if (!GameClass) {
      throw new Error(`[MiniGameRegistry] Unknown mini-game: ${name}`);
    }
    return new GameClass(params);
  }

  has(name) {
    return this.games.has(name);
  }
}

export const miniGameRegistry = new MiniGameRegistry();
