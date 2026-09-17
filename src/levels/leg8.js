// 《Fogg 的赌约》· 关8 洛矶山断桥飞跃与风帆雪橇狂飙 (Leg 8: Rocky Mountain Train & Ice Sledge)
import { dialogue } from '../shell/dialogue.js';
import { resolveLeg } from '../core/resolve.js';
import { resultCard } from '../shell/resultCard.js';
import { decisionModal } from '../shell/decisionModal.js';
import { arcadeManager } from '../shell/arcade.js';
import { sceneBackdrop } from '../engine/backdrop.js';

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

  // 本次旅程内保留已接受的列车实绩；整段账单确认后才持久化。
  let acceptedTrain;
  while (!acceptedTrain) {
    const trainResult = await gameRunner.runMiniGame('trainDefense', {
      difficulty: 1,
      title: '洛矶山·列车车顶防守与断桥飞跃'
    });
    arcadeManager.saveHighScore('trainDefense', trainResult.score || 0);
    const next = await decisionModal.show({
      title: trainResult.reached ? '列车实绩 · 已穿过峡谷' : '列车实绩 · 需要维修换乘',
      desc: trainResult.comment,
      options: [
        { id: 'keep', label: trainResult.reached ? '保留列车结果，前往雪原' : '接受维修换乘，前往雪原',
          subText: `列车时间调整 ${trainResult.daysDelta > 0 ? '+' : ''}${trainResult.daysDelta || 0} 天 · 本次游玩内保留，整段确认后保存；未扣费` },
        { id: 'retry', label: '只重试列车防守', subText: '不扣天数或旅费 · 暂不进入雪橇' }
      ]
    });
    if (next.id === 'keep') acceptedTrain = trainResult;
  }
  const trainResult = acceptedTrain;

  if (sceneBackdrop) sceneBackdrop.setBackdrop('nebraska_sledge');
  await dialogue.playSequence([
    { speaker: '发明家马奇', avatar: 'reform_club', text: trainResult.reached
      ? '列车安全过来了，可前方线路又被大雪封住。换我的风帆雪橇，去奥马哈赶接驳。'
      : '维修换乘耽搁了一天。前方线路又被大雪封住；我的风帆雪橇还能带你们去奥马哈。' },
    { speaker: '斐利亚·福克', avatar: 'fogg', text: '这一段车船费用共一千英镑，最后一起记账。艾娥达，裹紧毛毯。我们还有机会追回时间。' }
  ]);

  while (true) {
    const sledgeResult = await gameRunner.runMiniGame('iceSledge', {
      difficulty: 1,
      title: '内布拉斯加·风帆雪橇极速狂飙'
    });
    arcadeManager.saveHighScore('iceSledge', sledgeResult.score || 0);
    const bothReached = !!trainResult.reached && !!sledgeResult.reached;
    const perfect = bothReached && trainResult.result === 'perfect' && sledgeResult.result === 'perfect';
    const record = {
      legId: 'leg8', title: bothReached ? '第八关 · 穿过美洲，抵达纽约' : '第八关 · 波折之后，换乘续行',
      result: perfect ? 'perfect' : bothReached ? 'good' : 'pass',
      baseDays: 7, daysDelta: (trainResult.daysDelta || 0) + (sledgeResult.daysDelta || 0), moneyDelta: -1000,
      score: (trainResult.score || 0) + (sledgeResult.score || 0),
      flags: { trainBridgeCleared: !!trainResult.reached, iceSledgeWon: !!sledgeResult.reached,
        trainRepairTransfer: !trainResult.reached, sledgeRecoveryTransfer: !sledgeResult.reached },
      stamp: { id: 'newyork', city: '纽约', color: 'newyork', label: bothReached ? '横贯美洲 · 车船接驳' : '维修换乘 · 抵达纽约' },
      comment: `${trainResult.comment || ''} ${sledgeResult.comment || ''}${sledgeResult.reached ? '' : ' 接受本账单，将多用一天换乘，随后抵达纽约。'} 两段时间得失合并，旅费共一千英镑。重试只重玩雪橇，列车结果保留。`
    };
    const action = await resultCard.show(record);
    if (action === 'next' || action === 'continue') {
      resolveLeg('leg8', record);
      break;
    }
  }

  return 'leg9';
}
