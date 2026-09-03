import { dialogue } from '../shell/dialogue.js';
import { resolveLeg } from '../core/resolve.js';
import { resultCard } from '../shell/resultCard.js';
import { decisionModal } from '../shell/decisionModal.js';
import { sharePoster } from '../shell/shareCard.js';
import { arcadeManager } from '../shell/arcade.js';
import { sceneBackdrop } from '../engine/backdrop.js';

export async function runLeg3({ gameRunner, hud }) {
  hud.setLocation('印度 · 柯尔比断轨 ➔ 加尔各答');
  hud.show();

  // 1. 渲染印度雨林背景
  if (sceneBackdrop) sceneBackdrop.setBackdrop('elephant');

  // 剧情引入：铁路断轨
  await dialogue.playSequence([
    {
      speaker: '列车长',
      avatar: 'fix',
      text: '诸位乘客，大英帝国大印度半岛铁路目前只修到了柯尔比！前往阿拉哈巴德还有五十英里茂密丛林，没有轨道了！'
    },
    {
      speaker: '让·路路通',
      avatar: 'passepartout',
      text: '什么？！《每日电讯报》明明写着全线贯通！前面的旅客把所有马车都抢空了，这可如何是好？'
    }
  ]);

  // 2. Fogg 决策：重金购象
  if (sceneBackdrop) sceneBackdrop.setBackdrop('elephant');

  await decisionModal.show({
    title: '福克的绅士抉择：丛林代步坐骑',
    desc: '当地象主拥有印度最雄壮的战象奇阿尼。开价两千英镑！福克先生是否要买下大象？',
    options: [
      {
        id: 'buy_elephant',
        label: '【坚决买下】支付 £2,000 买下战象奇阿尼！',
        subText: '支出 -£2,000 (忠于原著)',
        costColor: '#8b1e1e',
        moneyDelta: -2000,
        comment: '福克：「两千英镑。路路通，带上象鞍，我们骑象穿林！」'
      }
    ]
  });

  let keepRetrying = true;
  while (keepRetrying) {
    // 3. 运行第一阶段：战象破壁狂飙穿越古印度雨林 (Leg 3A)
    const rideResult = await gameRunner.runMiniGame('elephantRide', {
      difficulty: 1,
      title: '印度古雨林 · 战象奇阿尼破壁突进'
    });

    arcadeManager.saveHighScore('elephantRide', rideResult.score || 0);

    // 剧情过渡：神庙火祭与大营救决策 (Mid-Level Story Bridge)
    if (sceneBackdrop) sceneBackdrop.setBackdrop('temple');

    await dialogue.playSequence([
      {
        speaker: '让·路路通',
        avatar: 'passepartout',
        text: '福克先生！前面古神庙传来锣鼓与喧嚣！是萨蒂火祭！一位美丽的年轻夫人被锁在柴堆上即将被迫殉葬！'
      },
      {
        speaker: '斐利亚·福克',
        avatar: 'fogg',
        text: '我们还有十二小时富余时间。绅士绝不能对暴行坐视不理。路路通，借助夜色与暗影潜入神庙，解救这位夫人！'
      }
    ]);

    // 4. 运行第二阶段：萨蒂神庙暗夜战术潜行与王体复活大营救 (Leg 3B)
    const rescueResult = await gameRunner.runMiniGame('stealthRescue', {
      difficulty: 1,
      title: '萨蒂火祭神庙 · 暗夜战术潜行与王体复活大营救'
    });

    arcadeManager.saveHighScore('stealthRescue', rescueResult.score || 0);

    // 5. 构造关卡3合并结算预览 (不直接修改全局 gameState，避免重试重复扣费与盖章)
    const isPerfect = (rideResult.result === 'perfect') && (rescueResult.result === 'perfect');
    const totalScore = (rideResult.score || 0) + (rescueResult.score || 0);

    const previewRecord = {
      legId: 'leg3',
      title: '第三关 · 战象破壁与萨蒂神庙大营救',
      result: isPerfect ? 'perfect' : 'good',
      baseDays: 3.0,
      daysDelta: isPerfect ? -2.0 : -1.0,
      moneyDelta: -2000,
      stamp: {
        id: 'calcutta_aouda',
        city: '加尔各答 & 萨蒂古神庙',
        date: '第 23 天',
        label: '萨蒂神庙大营救 (英雄勋章)',
        color: 'calcutta'
      },
      flags: {
        boughtElephant: true,
        aoudaRescued: true,
        jungleRampageMaster: rideResult.result === 'perfect',
        rajahDisguiseMaster: rescueResult.result === 'perfect'
      },
      comment: isPerfect
        ? '福克：「奇阿尼勇猛破壁，路路通假扮土邦王显灵神乎其技！我们救下了艾娥达夫人并提前抵达成加尔各答码头！」'
        : '福克：「战象勇猛过人，艾娥达夫人已随我们安全抵达成加尔各答。」'
    };

    // 6. 显示结算卡，由玩家决定「继续」或「重新挑战」
    const action = await resultCard.show(previewRecord);
    if (action === 'next' || action === 'continue') {
      // 玩家确认后才正式提交全局结算
      resolveLeg('leg3', previewRecord);
      keepRetrying = false;
    }
  }

  // 8. 艾娥达入队对白与结算
  if (sceneBackdrop) sceneBackdrop.setBackdrop('temple');

  await dialogue.playSequence([
    {
      speaker: '艾娥达夫人',
      avatar: 'aouda',
      text: '福克先生、路路通先生……若非二位舍命相救，我已葬身火海。请允许我随二位一同前往加尔各答与英国！'
    },
    {
      speaker: '斐利亚·福克',
      avatar: 'fogg',
      text: '不胜荣幸，艾娥达夫人。加尔各答的「仰光号」班轮即将启程，环球之旅已然过半，胜利就在前方！'
    },
    {
      speaker: '让·路路通',
      avatar: 'passepartout',
      text: '太棒了！我们不仅分秒未差，还救下了美丽的旅伴！快来看看我们的环球探险家档案吧！'
    }
  ]);

  return 'leg4';
}
