// 香港失船 → 坦克德尔号赶赴上海 → 接邮船往横滨。
import { dialogue } from '../shell/dialogue.js';
import { resolveLeg } from '../core/resolve.js';
import { resultCard } from '../shell/resultCard.js';
import { decisionModal } from '../shell/decisionModal.js';
import { arcadeManager } from '../shell/arcade.js';
import { sceneBackdrop } from '../engine/backdrop.js';

export async function runLeg5({ gameRunner, hud }) {
  hud.setLocation('香港 → 上海外海 → 横滨');
  hud.show();
  sceneBackdrop?.setBackdrop('hongkong');
  await dialogue.playSequence([
    { speaker: '艾娥达', avatar: 'aouda', text: '轮船提前走了，路路通也没回来。他会不会已经在船上？' },
    { speaker: '约翰船长', avatar: 'reform_club', text: '坦克德尔号直去横滨，赶不及。但若能先到上海外海，我们有机会拦住那里的邮船。' },
    { speaker: '斐利亚·福克', avatar: 'fogg', text: '就走这条路。这一程约定五百英镑，抵达后一起记账。路路通若搭上了先前的船，我们会在横滨找到他。' },
    { speaker: '约翰船长', avatar: 'reform_club', text: '三位上船。顺风时尽量赶路；白浪起来之前，记得收帆。小船不能跟台风硬拼。' }
  ]);

  let finalRecord;
  while (!finalRecord) {
    let voyage;
    let fallback = false;
    while (true) {
      voyage = await gameRunner.runMiniGame('typhoonSailing', {
        difficulty: 1, title: '坦克德尔号 · 追上上海邮船'
      });
      arcadeManager.saveHighScore('typhoonSailing', voyage.score || 0);
      if (voyage.reached) break;
      const recovery = await decisionModal.show({
        title: '没能赶上这班邮船',
        desc: voyage.comment || '船长让所有人平安靠岸。接下来，可以重新试航，也可以接受改签。',
        options: [
          { id: 'shelter', label: '避风靠岸，另船续航',
            subText: '额外耗时 +1 天 · 本航段仍共 £500 · 抵达横滨，但不记拦船成功' },
          { id: 'retry', label: '只重试南海航行',
            subText: '不重跑前面的关卡 · 本次失败不扣天数或旅费' }
        ]
      });
      if (recovery.id === 'shelter') { fallback = true; break; }
    }

    const record = {
      legId: 'leg5', title: fallback ? '第五关 · 避风之后，另船续航' : '第五关 · 上海外海的信号炮',
      result: fallback ? 'pass' : voyage.result,
      baseDays: 6, daysDelta: fallback ? 1 : (voyage.daysDelta || 0),
      moneyDelta: -500, score: voyage.score || 0,
      flags: { typhoonConquered: !fallback, steamerBoarded: !fallback,
        shanghaiSignalSent: !fallback && !!voyage.flags?.shanghaiSignalSent,
        southChinaSeaFallback: fallback },
      stamp: { id: 'hongkong_typhoon', city: '香港 · 上海 · 横滨', color: 'hongkong',
        label: fallback ? '避风后续航 · 多用一天' : '上海外海 · 信号获应' },
      comment: fallback ? `${voyage.comment || '错过了上海外海的邮船。'} 另船续航多用一天，旅费共五百英镑。` : voyage.comment
    };
    const action = await resultCard.show(record);
    if (action === 'next' || action === 'continue') {
      resolveLeg('leg5', record);
      finalRecord = record;
    }
  }

  await dialogue.playSequence([
    { speaker: '约翰船长', avatar: 'reform_club', text: finalRecord.flags.southChinaSeaFallback
      ? '风过去了，另一班船也安排妥了。晚了一天，但大家都平安。去横滨找你们那位朋友吧。'
      : '邮船听见了信号，正在减速。接下来的航线去横滨——你们要找的人，说不定就在那儿。' },
    { speaker: '艾娥达', avatar: 'aouda', text: '路路通若在横滨，一定也在想办法找我们。先从码头问起。' }
  ]);
  return 'leg6';
}
