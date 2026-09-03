import { gameState } from './state.js';

export const TimeManager = {
  formatDays(days) {
    const d = Math.floor(days);
    const fraction = Math.round((days - d) * 10);
    return `${d}.${fraction} 天`;
  },

  getPressureLevel() {
    const remaining = gameState.getRemainingDays();
    if (remaining < 15) return 'critical';
    if (remaining < 40) return 'high';
    if (remaining < 60) return 'medium';
    return 'normal';
  },

  calculateCurrentDate() {
    // 1872年10月2日出发
    const startDate = new Date(1872, 9, 2); // Month is 0-indexed (9 = Oct)
    const elapsedDays = gameState.get().time.elapsed;
    const currentDate = new Date(startDate.getTime() + elapsedDays * 24 * 60 * 60 * 1000);
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const day = currentDate.getDate();
    return `${year}年${month}月${day}日`;
  }
};
