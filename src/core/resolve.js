import { gameState } from './state.js';
import { StorageManager } from './storage.js';
import { events } from './events.js';

export function resolveLeg(legIdOrData, maybeData) {
  let legId = typeof legIdOrData === 'string' ? legIdOrData : (legIdOrData.legId || 'leg0');
  let resultData = typeof legIdOrData === 'string' ? (maybeData || {}) : legIdOrData;

  const {
    title = legId,
    result = 'good', // 'perfect' | 'good' | 'fail' | 'miss'
    baseDays = 0,
    daysDelta = 0,
    moneyDelta = 0,
    stamp = null,
    flags = {},
    comment = ''
  } = resultData;

  const daysSpent = Math.max(0, Math.round((baseDays + daysDelta) * 10) / 10);

  // 1. 更新时间
  if (daysSpent > 0) {
    gameState.addElapsedDays(daysSpent);
  }

  // 2. 更新金钱
  if (moneyDelta !== 0) {
    gameState.modifyMoney(moneyDelta);
  }

  // 3. 记录标记
  if (flags && typeof flags === 'object') {
    Object.keys(flags).forEach(key => {
      gameState.setFlag(key, flags[key]);
    });
  }

  if (result === 'perfect') {
    gameState.setFlag('perfectCount', (gameState.get().flags.perfectCount || 0) + 1);
  }

  // 4. 盖护照章
  if (stamp) {
    gameState.addPassportStamp(stamp);
  }

  // 5. 记录关卡结果
  const record = {
    legId,
    title,
    result,
    baseDays,
    daysDelta,
    daysSpent,
    moneyDelta,
    remainingDays: gameState.getRemainingDays(),
    remainingGBP: gameState.get().money.gbp,
    comment,
    timestamp: Date.now()
  };

  gameState.recordLegResult(legId, record);

  // 6. 持久化存档
  StorageManager.save();

  // 7. 发送事件
  events.emit('leg:resolved', record);

  return record;
}
