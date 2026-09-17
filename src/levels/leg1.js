import { dialogue } from '../shell/dialogue.js';
import { resolveLeg } from '../core/resolve.js';
import { resultCard } from '../shell/resultCard.js';
import { decisionModal } from '../shell/decisionModal.js';
import { arcadeManager } from '../shell/arcade.js';
import { sceneBackdrop } from '../engine/backdrop.js';

export async function runLeg1({ gameRunner, hud }) {
  hud.setLocation('多佛港 ➔ 苏伊士');
  hud.show();

  // 1. 渲染多佛海港高精背景
  if (sceneBackdrop) sceneBackdrop.setBackdrop('dover');

  // 剧情引入与 Fix 登场
  await dialogue.playSequence([
    {
      speaker: '让·路路通',
      avatar: 'passepartout',
      text: '去加来的渡轮要收跳板了！先生，旅行袋给我——这些货箱，我翻得过去。'
    },
    {
      speaker: '斐利亚·福克',
      avatar: 'fogg',
      text: '我在船边接你。过海后乘火车到布林迪，再换蒙古号去苏伊士。我们先赶上眼前这一班。'
    }
  ]);

  let keepRetrying = true;
  while (keepRetrying) {
    // 2. 运行跑酷小游戏
    const gameResult = await gameRunner.runMiniGame('parkour', {
      difficulty: 1,
      title: '多佛码头·赶船动作跳跃'
    });

    arcadeManager.saveHighScore('parkour', gameResult.score || 0);

    let daysDelta = gameResult.daysDelta;
    let moneyDelta = 0;
    let comment = gameResult.comment;
    let flags = gameResult.flags || {};

    // 3. 处理误船分支决策
    if (gameResult.result === 'miss') {
      if (sceneBackdrop) sceneBackdrop.setBackdrop('dover');

      const choice = await decisionModal.show({
        title: '跳板收起以后',
        desc: '多佛渡轮离港了，后面的火车和轮船不会为我们停下。要用旅费追回时间，还是把余款留给下一程？',
        options: [
          {
            id: 'charter_boat',
            label: '【不惜代价】耗费重金包租私家蒸汽快艇追赶！',
            subText: '支出 -£800 (维持计划时间)',
            costColor: '#8b1e1e',
            moneyDelta: -800,
            daysDelta: 0,
            comment: '福克：「只要能挽回时间，八百英镑在所不惜。立刻包艇出发！」'
          },
          {
            id: 'wait_next',
            label: '留在多佛，等下一班渡轮重新衔接行程',
            subText: '耗时 +1.5 天 (资金无损失)',
            costColor: '#a86d23',
            moneyDelta: 0,
            daysDelta: 1.5,
            comment: '福克：「稍安勿躁。在下一段行程中，我们把这三十六小时补回来。」'
          }
        ]
      });

      daysDelta = choice.daysDelta;
      moneyDelta = choice.moneyDelta;
      comment = choice.comment;
      flags.charteredBoat = choice.id === 'charter_boat';
    }

    // 4. 构造结算预览
    const previewRecord = {
      legId: 'leg1',
      title: '第一关 · 伦敦至苏伊士航段',
      result: gameResult.result,
      baseDays: 7.0,
      daysDelta,
      moneyDelta,
      score: gameResult.score,
      stamp: gameResult.stamp,
      flags,
      comment
    };

    // 5. 显示结算卡
    const action = await resultCard.show(previewRecord);
    if (action === 'next' || action === 'continue') {
      resolveLeg('leg1', previewRecord);
      keepRetrying = false;
    }
  }

  // 6. 过渡剧情背景
  if (sceneBackdrop) sceneBackdrop.setBackdrop('suez');

  await dialogue.playSequence([
    {
      speaker: '斐利亚·福克',
      avatar: 'fogg',
      text: '苏伊士领事馆签证已盖章。接下来穿越红海，直抵印度次大陆！'
    },
    {
      speaker: '侦探菲克斯',
      avatar: 'fix',
      text: '（咬牙切齿）可恶，又让他抢先一步……我的逮捕令还在伦敦发往孟买的路上，休想甩掉我！'
    }
  ]);

  return 'leg2';
}
