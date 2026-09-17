import { gameState } from './state.js';

const STORAGE_KEY = 'foggs_bet_save_v1';

export const StorageManager = {
  save() {
    try {
      const data = gameState.get();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('[StorageManager] Save failed:', e);
      return false;
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      gameState.load(data);
      // 兼容 v84 已结算却仍指向上一关的存档；保留全部已获得资产。
      let leg = gameState.get().currentLeg;
      while (/^leg\d+$/.test(leg) && gameState.get().legResults[leg]) {
        const index = Number(leg.slice(3));
        leg = index >= 10 ? 'completed' : `leg${index + 1}`;
      }
      gameState.setLeg(leg);
      return gameState.get();
    } catch (e) {
      console.error('[StorageManager] Load failed:', e);
      return null;
    }
  },

  hasSave() {
    try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; }
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
    gameState.reset();
  }
};
