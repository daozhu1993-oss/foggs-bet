import { gameState } from './state.js';
import { StorageManager } from './storage.js';
import { events } from './events.js';

export function previewLeg(resultData, state = gameState.get()) {
  const daysSpent = Math.max(0, Math.round(((resultData.baseDays ?? 0) + (resultData.daysDelta ?? 0)) * 10) / 10);
  const elapsedAfter = Math.round((state.time.elapsed + daysSpent) * 10) / 10;
  return {
    ...resultData, daysSpent, elapsedAfter,
    remainingDays: Math.max(0, Math.round((state.time.totalDays - elapsedAfter) * 10) / 10),
    remainingGBP: Math.max(0, state.money.gbp + (resultData.moneyDelta ?? 0))
  };
}

export function resolveLeg(legIdOrData, maybeData) {
  let legId = typeof legIdOrData === 'string' ? legIdOrData : (legIdOrData.legId || 'leg0');
  let resultData = typeof legIdOrData === 'string' ? (maybeData || {}) : legIdOrData;
  // 已盖章的航段不能因读档、重复回调再次收费。
  if (gameState.get().legResults[legId]) return gameState.get().legResults[legId];

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
    gameState.addPassportStamp({ ...stamp, date: '行程第 ' + gameState.get().time.elapsed.toFixed(1) + ' 天' });
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

  // 完成航段与下一章指针一起落盘，刷新后直接接着走。
  const legNumber = Number(legId.replace('leg', ''));
  gameState.setLeg(legNumber >= 10 ? 'completed' : `leg${legNumber + 1}`);

  // 6. 持久化存档
  StorageManager.save();

  // 7. 发送事件
  events.emit('leg:resolved', record);

  return record;
}
