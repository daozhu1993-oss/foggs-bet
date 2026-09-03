// 《Fogg 的赌约》· 关7 旧金山选战大乱斗与大铁路起航 (Leg 7: San Francisco Brawl)
import { dialogue } from '../shell/dialogue.js';
import { resolveLeg } from '../core/resolve.js';
import { resultCard } from '../shell/resultCard.js';
import { arcadeManager } from '../shell/arcade.js';
import { sceneBackdrop } from '../engine/backdrop.js';
import { gameState } from '../core/state.js';

export async function runLeg7({ gameRunner, hud }) {
  hud.setLocation('美利坚旧金山 ➔ 太平洋大铁路');
  hud.show();

  if (sceneBackdrop) sceneBackdrop.setBackdrop('sanfrancisco');

  // 剧情段落：旧金山选战暴动
  await dialogue.playSequence([
    {
      speaker: '斐利亚·福克',
      avatar: 'fogg',
      text: '踏上美利坚合众国土地。今日旧金山正举行卡默菲尔德与曼迪博伊两党候选人火爆集会，街头局势混乱。'
    },
    {
      speaker: '美国暴徒领袖',
      avatar: 'fix',
      text: '（酒馆桌椅乱飞）外来佬！给老子站住！今天谁也别想走出蒙哥马利街！'
    },
    {
      speaker: '让·路路通',
      avatar: 'passepartout',
      text: '福克先生小心！我来用拐杖开路！'
    }
  ]);

  let keepRetrying = true;
  let finalGameResult = null;

  while (keepRetrying) {
    const gameResult = await gameRunner.runMiniGame('sanFranciscoBrawl', {
      difficulty: 1,
      title: '旧金山选战·淘金酒馆与街头格斗'
    });

    finalGameResult = gameResult;
    arcadeManager.saveHighScore('sanFranciscoBrawl', gameResult.score || 0);

    let daysDelta = 0;
    let moneyDelta = -200; // 购买新礼帽与替换衣物
    let comment = gameResult.comment || '福克：「击退暴徒，准时登上横贯北美大陆列车！」';

    const action = await resultCard.show({
      title: '第七章完成：旧金山大暴动从容突围',
      subtitle: '横渡太平洋抵美，击退暴徒登上横贯大陆列车！',
      result: gameResult.result || 'good',
      baseDays: 21.0,
      daysDelta,
      moneyDelta,
      score: gameResult.score || 0,
      badge: '🥊 蒙哥马利街突围英雄',
      comment
    });

    if (action === 'next' || action === 'continue') {
      keepRetrying = false;
    }
  }

  if (finalGameResult) {
    resolveLeg('leg7', {
      title: '第七关 · 太平洋横渡与旧金山选战突围',
      result: finalGameResult.result || 'good',
      baseDays: 21.0,
      daysDelta: finalGameResult.daysDelta || 0,
      moneyDelta: -200,
      flags: finalGameResult.flags || { brawlWon: true },
      stamp: {
        id: 'sanfrancisco',
        city: '旧金山海关与市政厅',
        date: '第 55 天',
        label: '太平洋大铁路登车印',
        color: 'sanfrancisco'
      },
      comment: finalGameResult.comment
    });
  }

  await dialogue.playSequence([
    {
      speaker: '列车列车长',
      avatar: 'reform_club',
      text: '鸣笛——！太平洋联合大铁路列车起锚！横穿内华达山脉、盐湖城与洛矶山脉，终点站：芝加哥与纽约！'
    }
  ]);

  return 'leg8';
}
