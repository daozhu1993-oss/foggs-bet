// 《Fogg 的赌约》· 关5 香港迷局与坦克德尔号台风搏击 (Leg 5: Hong Kong & Tankadere Storm)
import { dialogue } from '../shell/dialogue.js';
import { resolveLeg } from '../core/resolve.js';
import { resultCard } from '../shell/resultCard.js';
import { arcadeManager } from '../shell/arcade.js';
import { sceneBackdrop } from '../engine/backdrop.js';
import { gameState } from '../core/state.js';

export async function runLeg5({ gameRunner, hud }) {
  hud.setLocation('香港维多利亚港 ➔ 南中国海台风');
  hud.show();

  if (sceneBackdrop) sceneBackdrop.setBackdrop('hongkong');

  // 剧情段落：香港失散与包租小帆船
  await dialogue.playSequence([
    {
      speaker: '侦探菲克斯',
      avatar: 'fix',
      text: '（暗笑）路路通已经被我灌醉在烟馆了，前往横滨的「卡尔纳蒂克号」提前起航，福克你绝对赶不上了！'
    },
    {
      speaker: '斐利亚·福克',
      avatar: 'fogg',
      text: '路路通失踪，大轮船开走……但只要有风有海，就没有过不去的洋面。约翰船长，这艘 20 吨「坦克德尔号」小帆船，我出 £100 包租，直插上海或横滨！'
    },
    {
      speaker: '艾娥达夫人',
      avatar: 'aouda',
      text: '福克先生，南中国海台风咆哮，我们愿与您生死与共！'
    }
  ]);

  let keepRetrying = true;
  let finalGameResult = null;

  while (keepRetrying) {
    const gameResult = await gameRunner.runMiniGame('typhoonSailing', {
      difficulty: 1,
      title: '坦克德尔号 · 搏击南中国海狂暴台风'
    });

    finalGameResult = gameResult;
    arcadeManager.saveHighScore('typhoonSailing', gameResult.score || 0);

    let daysDelta = gameResult.daysDelta || 0;
    let moneyDelta = -500;
    let comment = gameResult.comment || '福克：「坦克德尔号斩浪破风，锁定横滨信标！」';

    const action = await resultCard.show({
      title: '第五章完成：南中国海狂暴台风大脱困',
      subtitle: '坦克德尔号斩浪破风，锁定横滨信标！',
      result: gameResult.result || 'good',
      baseDays: 6.0,
      daysDelta,
      moneyDelta,
      score: gameResult.score || 0,
      badge: '⛵ 惊涛骇浪操舵手',
      comment
    });

    if (action === 'next' || action === 'continue') {
      keepRetrying = false;
    }
  }

  if (finalGameResult) {
    resolveLeg('leg5', {
      title: '第五关 · 南中国海台风搏击',
      result: finalGameResult.result || 'good',
      baseDays: 6.0,
      daysDelta: finalGameResult.daysDelta || 0,
      moneyDelta: -500,
      flags: finalGameResult.flags || { typhoonConquered: true },
      stamp: {
        id: 'hongkong_typhoon',
        city: '香港 & 横滨外海',
        date: '第 35 天',
        label: '南中国海搏浪勋章 (准予入境)',
        color: 'hongkong'
      },
      comment: finalGameResult.comment
    });
  }

  await dialogue.playSequence([
    {
      speaker: '约翰船长',
      avatar: 'reform_club',
      text: '信号弹发射成功！横滨港引水船回应了！我们成功赶上了前往美利坚的巨轮！'
    }
  ]);

  return 'leg6';
}
