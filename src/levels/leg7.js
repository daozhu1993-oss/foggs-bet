// 《Fogg 的赌约》· 关7 旧金山选战大乱斗与大铁路起航 (Leg 7: San Francisco Brawl)
import { dialogue } from '../shell/dialogue.js';
import { resolveLeg } from '../core/resolve.js';
import { resultCard } from '../shell/resultCard.js';
import { arcadeManager } from '../shell/arcade.js';
import { sceneBackdrop } from '../engine/backdrop.js';

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

  while (true) {
    const gameResult = await gameRunner.runMiniGame('sanFranciscoBrawl', {
      difficulty: 1,
      title: '旧金山选战·淘金酒馆与街头格斗'
    });

    arcadeManager.saveHighScore('sanFranciscoBrawl', gameResult.score || 0);
    const reached = gameResult.reached === true;
    const knockedOut = gameResult.outcome === 'knockout';
    const record = {
      title: knockedOut ? '第七关 · 击退阻拦' : reached ? '第七关 · 掩护同伴脱身' : '第七关 · 休整后继续旅行',
      subtitle: reached ? '离开混乱街区，前往横贯大陆列车。' : '本次街斗失手；可重试，或接受半天休整后乘车。',
      result: reached ? gameResult.result : 'pass',
      baseDays: 21.0,
      daysDelta: gameResult.daysDelta ?? (reached ? 0 : 0.5),
      moneyDelta: -200, // 购买新礼帽与替换衣物；仅接受最终账单时扣除。
      score: gameResult.score || 0,
      badge: knockedOut ? '🥊 击退上校' : reached ? '🛡️ 同伴的守护者' : '🚂 休整后上路',
      flags: { sfBrawlWon: knockedOut, proctorKnockedOut: knockedOut,
        sfEscaped: gameResult.outcome === 'escape', sfRestRecovery: !reached },
      stamp: {
        id: 'sanfrancisco',
        city: '旧金山海关与市政厅',
        label: reached ? '太平洋大铁路登车印' : '休整换乘记录',
        color: 'sanfrancisco'
      },
      comment: `${gameResult.comment || '路路通与同伴在车站会合。'} 衣物更换 £200，重试不重复收费。`
    };
    const action = await resultCard.show(record);
    if (action === 'next' || action === 'continue') {
      resolveLeg('leg7', record);
      break;
    }
  }

  await dialogue.playSequence([
    {
      speaker: '列车长',
      avatar: 'reform_club',
      text: '鸣笛——！列车启程！穿过内华达山脉、盐湖城与洛矶山脉，再转车去芝加哥与纽约！'
    }
  ]);

  return 'leg8';
}
