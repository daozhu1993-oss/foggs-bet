import { gameState } from './state.js';

export const MoneyManager = {
  formatGBP(amount) {
    return `£${amount.toLocaleString('en-US')}`;
  },

  canAfford(amount) {
    return gameState.get().money.gbp >= amount;
  },

  spend(amount, reason = '') {
    if (!this.canAfford(amount)) return false;
    gameState.modifyMoney(-amount);
    if (reason) {
      gameState.addLog(`支出: £${amount} (${reason})`);
    }
    return true;
  },

  earn(amount, reason = '') {
    gameState.modifyMoney(amount);
    if (reason) {
      gameState.addLog(`收入: £${amount} (${reason})`);
    }
  }
};
