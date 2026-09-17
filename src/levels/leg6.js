// 横滨：台上主动相认，或接受后台寻找的半天代价；确认前不写入旅程。
import { dialogue } from '../shell/dialogue.js';
import { resolveLeg } from '../core/resolve.js';
import { resultCard } from '../shell/resultCard.js';
import { decisionModal } from '../shell/decisionModal.js';
import { arcadeManager } from '../shell/arcade.js';
import { sceneBackdrop } from '../engine/backdrop.js';

export async function runLeg6({ gameRunner, hud }) {
  hud.setLocation('日本横滨 ➔ 太平洋');
  hud.show();

  if (sceneBackdrop) sceneBackdrop.setBackdrop('yokohama');

  // 剧情段落：路路通流落横滨与长鼻马戏团
  await dialogue.playSequence([
    {
      speaker: '让·路路通',
      avatar: 'passepartout',
      text: '（摸着咕咕叫的肚子）在香港被菲克斯算计，身无分文流落横滨……好在巴图尔卡杂技团收留我扮长鼻天狗！'
    },
    {
      speaker: '杂技团班主',
      avatar: 'reform_club',
      text: '法兰西小子！戴上这只三尺长的天狗木鼻，站上人梯顶端，千万稳住别晃！'
    }
  ]);

  let finalRecord;
  while (!finalRecord) {
    const performance = await gameRunner.runMiniGame('circusAcrobat', {
      difficulty: 1, title: '横滨 · 再演最后一场'
    });
    arcadeManager.saveHighScore('circusAcrobat', performance.score || 0);
    const backstage = !performance.reunited;
    if (backstage) {
      const recovery = await decisionModal.show({
        title: '幕布落下了，还没有相认',
        desc: performance.comment || '福克正在询问班主，路路通还在后台。可以重试演出，也可以接受寻找的时间。',
        options: [
          { id: 'backstage', label: '到后台寻找路路通', subText: '额外耗时 +0.5 天 · 不增加旅费 · 同伴归队，但不记演出成功' },
          { id: 'retry', label: '只重试横滨演出', subText: '本次失手不扣天数或旅费 · 不重跑南海' }
        ]
      });
      if (recovery.id === 'retry') continue;
    }
    const record = {
      legId: 'leg6', title: backstage ? '第六关 · 后台找回同伴' : '第六关 · 台下熟悉的身影',
      result: backstage ? 'pass' : performance.result,
      baseDays: 1, daysDelta: backstage ? 0.5 : (performance.daysDelta || 0),
      moneyDelta: 0, score: performance.score || 0,
      flags: { passepartoutReunited: true, circusReunited: !backstage,
        passedYokohamaCircus: !backstage && !!performance.flags?.passedYokohamaCircus,
        circusBackstageSearch: backstage },
      stamp: { id: 'yokohama', city: '横滨', color: 'yokohama',
        label: backstage ? '后台寻人 · 同伴归队' : '马戏团 · 主仆重聚' },
      comment: backstage
        ? '没能在台上相认。福克询问班主，终于在后台找到了路路通；多用了半天，没有增加旅费。演出的失手仍如实保留。'
        : performance.comment
    };
    const action = await resultCard.show(record);
    if (action === 'next' || action === 'continue') {
      resolveLeg('leg6', record);
      finalRecord = record;
    }
  }

  await dialogue.playSequence([
    {
      speaker: '让·路路通',
      avatar: 'passepartout',
      text: finalRecord.flags.circusBackstageSearch
        ? '我还以为再也找不到你们了。原来您一直在找我。'
        : '我在人梯上看见您，哪里还顾得上继续演出。福克先生，我回来了！'
    },
    {
      speaker: '斐利亚·福克',
      avatar: 'fogg',
      text: '人齐了，立刻登上「格兰特将军号」远洋班轮，全速横渡太平洋，直扑美利坚旧金山！'
    }
  ]);

  return 'leg7';
}
