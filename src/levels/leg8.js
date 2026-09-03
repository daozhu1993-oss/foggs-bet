// 《Fogg 的赌约》· 关8 洛矶山断桥飞跃与风帆雪橇狂飙 (Leg 8: Rocky Mountain Train & Ice Sledge)
import { dialogue } from '../shell/dialogue.js';
import { resolveLeg } from '../core/resolve.js';
import { resultCard } from '../shell/resultCard.js';
import { arcadeManager } from '../shell/arcade.js';
import { sceneBackdrop } from '../engine/backdrop.js';
import { gameState } from '../core/state.js';

export async function runLeg8({ gameRunner, hud }) {
  hud.setLocation('洛矶山脉 ➔ 内布拉斯加雪原 ➔ 纽约');
  hud.show();

  if (sceneBackdrop) sceneBackdrop.setBackdrop('rocky_train');

  // 剧情段落一：断桥与袭击
  await dialogue.playSequence([
    {
      speaker: '列车司机',
      avatar: 'reform_club',
      text: '警报！前方梅迪辛博危桥桥墩断裂！无法减速，唯有以最大马力全速飞跃过去！'
    },
    {
      speaker: '斐利亚·福克',
      avatar: 'fogg',
      text: '推满油门！路路通，取我的两支左轮手枪，防备车顶！'
    }
  ]);

  let keepRetrying = true;
  let finalTrainResult = null;
  let finalSledgeResult = null;

  while (keepRetrying) {
    // 8a. 运行列车车顶防守与断桥飞跃
    const trainResult = await gameRunner.runMiniGame('trainDefense', {
      difficulty: 1,
      title: '洛矶山·列车车顶防守与断桥飞跃'
    });
    finalTrainResult = trainResult;
    arcadeManager.saveHighScore('trainDefense', trainResult.score || 0);

    if (sceneBackdrop) sceneBackdrop.setBackdrop('nebraska_sledge');

    // 剧情过渡：列车雪原阻断，换乘风帆雪橇
    await dialogue.playSequence([
      {
        speaker: '发明家马奇',
        avatar: 'reform_club',
        text: '铁轨被大雪封死，但平原已经结成厚冰！我这架风帆雪橇带风帆，顺风能跑 50 英里时速！'
      },
      {
        speaker: '斐利亚·福克',
        avatar: 'fogg',
        text: '重金包下雪橇！艾娥达夫人裹紧毛毯，我们滑雪直奔奥马哈转快车去纽约！'
      }
    ]);

    // 8b. 运行风帆雪橇狂飙
    const sledgeResult = await gameRunner.runMiniGame('iceSledge', {
      difficulty: 1,
      title: '内布拉斯加·风帆雪橇极速狂飙'
    });
    finalSledgeResult = sledgeResult;
    arcadeManager.saveHighScore('iceSledge', sledgeResult.score || 0);

    let daysDelta = sledgeResult.daysDelta || 0;
    let moneyDelta = -1000;
    let comment = '★ 蒸汽机车飞跃断桥，风帆雪橇冰原狂飙，准时抵达纽约港！';

    const action = await resultCard.show({
      title: '第八章完成：横贯美洲大陆极速传说',
      subtitle: '断桥飞跃与风帆雪橇连环奇迹，抵达纽约！',
      result: sledgeResult.result || 'good',
      baseDays: 7.0,
      daysDelta,
      moneyDelta,
      score: (trainResult.score || 0) + (sledgeResult.score || 0),
      badge: '🎿 冰原风帆飞车党',
      comment
    });

    if (action === 'next' || action === 'continue') {
      keepRetrying = false;
    }
  }

  if (finalSledgeResult) {
    resolveLeg('leg8', {
      title: '第八关 · 洛矶山断桥与风帆雪橇',
      result: finalSledgeResult.result || 'good',
      baseDays: 7.0,
      daysDelta: finalSledgeResult.daysDelta || 0,
      moneyDelta: -1000,
      flags: { trainBridgeCleared: true, iceSledgeWon: true },
      stamp: {
        id: 'newyork',
        city: '美利坚合众国纽约港',
        date: '第 68 天',
        label: '大西洋班轮登船特别签证',
        color: 'newyork'
      },
      comment: '★ 蒸汽机车飞跃断桥，风帆雪橇冰原狂飙，准时抵达纽约港！'
    });
  }

  return 'leg9';
}
