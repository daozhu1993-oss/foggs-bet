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
      return data;
    } catch (e) {
      console.error('[StorageManager] Load failed:', e);
      return null;
    }
  },

  hasSave() {
    return !!localStorage.getItem(STORAGE_KEY);
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
    gameState.reset();
  }
};
