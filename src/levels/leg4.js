// 《Fogg 的赌约》· 关4 加尔各答公堂智斗与仰光号起航 (Leg 4: Calcutta Court & Rangoon Steamer)
import { dialogue } from '../shell/dialogue.js';
import { resolveLeg } from '../core/resolve.js';
import { resultCard } from '../shell/resultCard.js';
import { arcadeManager } from '../shell/arcade.js';
import { sceneBackdrop } from '../engine/backdrop.js';
import { gameState } from '../core/state.js';

export async function runLeg4({ gameRunner, hud }) {
  hud.setLocation('印度加尔各答 ➔ 马六甲海峡');
  hud.show();

  if (sceneBackdrop) sceneBackdrop.setBackdrop('calcutta');

  // 剧情段落：加尔各答公堂
  await dialogue.playSequence([
    {
      speaker: '法庭传令官',
      avatar: 'reform_club',
      text: '肃静！大英帝国加尔各答最高法院开庭！审理孟买帕戈达神庙违法侵入案！'
    },
    {
      speaker: '侦探菲克斯',
      avatar: 'fix',
      text: '（暗喜）哈哈，福克！这下你插翅难飞了！只要把你扣留在加尔各答监狱八天，逮捕令就能赶到！'
    },
    {
      speaker: '斐利亚·福克',
      avatar: 'fogg',
      text: '法官大人，我的随从路路通初来乍到无意触犯礼仪。我愿意当庭认缴两千英镑最高保释金，即刻登船！'
    }
  ]);

  let keepRetrying = true;
  let finalGameResult = null;

  while (keepRetrying) {
    const gameResult = await gameRunner.runMiniGame('courtBail', {
      difficulty: 1,
      title: '加尔各答最高法院 · 逆转舌战与两千英镑保释'
    });

    finalGameResult = gameResult;
    arcadeManager.saveHighScore('courtBail', gameResult.score || 0);

    let daysDelta = gameResult.daysDelta || 0;
    let moneyDelta = gameResult.moneyDelta || -2000;
    let comment = gameResult.comment || '福克：「两千英镑保释金已认缴，路路通，立刻登船！」';

    const action = await resultCard.show({
      title: '第四章完成：加尔各答公堂大获全胜',
      subtitle: '两千英镑从容保释，仰光号破浪起航！',
      result: gameResult.result || 'good',
      baseDays: 13.0,
      daysDelta,
      moneyDelta,
      score: gameResult.score || 0,
      badge: '⚖️ 维多利亚法理大师',
      comment
    });

    if (action === 'next' || action === 'continue') {
      keepRetrying = false;
    }
  }

  if (finalGameResult) {
    resolveLeg('leg4', {
      title: '第四关 · 加尔各答公堂智斗与仰光号起锚',
      result: finalGameResult.result || 'good',
      baseDays: 13.0,
      daysDelta: finalGameResult.daysDelta || 0,
      moneyDelta: finalGameResult.moneyDelta || -2000,
      flags: finalGameResult.flags || { courtWon: true },
      stamp: {
        id: 'calcutta_court',
        city: '加尔各答最高法院',
        date: '第 25 天',
        label: '东印度公堂保释令 (准予出境)',
        color: 'calcutta'
      },
      comment: finalGameResult.comment
    });
  }

  await dialogue.playSequence([
    {
      speaker: '让·路路通',
      avatar: 'passepartout',
      text: '福克先生！两千英镑……都是因为我的靴子给您添了这么大的损失！'
    },
    {
      speaker: '斐利亚·福克',
      avatar: 'fogg',
      text: '只要能按时环游地球，两千英镑物有所值。走吧，艾娥达夫人已在「仰光号」甲板等候，下一站：香港！'
    }
  ]);

  return 'leg5';
}
