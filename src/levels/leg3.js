import { dialogue } from '../shell/dialogue.js';
import { resolveLeg } from '../core/resolve.js';
import { resultCard } from '../shell/resultCard.js';
import { decisionModal } from '../shell/decisionModal.js';
import { arcadeManager } from '../shell/arcade.js';
import { sceneBackdrop } from '../engine/backdrop.js';
import { gameState } from '../core/state.js';
import { RESCUE_PLANS, getJourneyStatus } from '../core/journey.js';

export async function runLeg3({ gameRunner, hud }) {
  hud.setLocation('印度 · 断轨之后');
  hud.show();
  sceneBackdrop?.setBackdrop('elephant');
  await dialogue.playSequence([
    { speaker: '列车长', avatar: 'reform_club', text: '铁路只修到这里。去阿拉哈巴德，还得穿过五十英里的丛林。' },
    { speaker: '让·路路通', avatar: 'passepartout', text: '报纸上那条笔直的铁路线，原来还没铺到地上。' },
    { speaker: '斐利亚·福克', avatar: 'fogg', text: '向导有办法。我们买下奇阿尼，骑象穿林。两千英镑，记在这一程的账上。' }
  ]);

  let accepted = false;
  while (!accepted) {
    const ride = await gameRunner.runMiniGame('elephantRide', {
      difficulty: 1, title: '奇阿尼 · 穿林抵达营地'
    });
    arcadeManager.saveHighScore('elephantRide', ride.score || 0);
    sceneBackdrop?.setBackdrop('temple');
    await dialogue.playSequence([
      { speaker: '当地向导', avatar: 'reform_club', text: '先停下。前面有位夫人被强迫参加殉葬仪式。她叫艾娥达，我知道一条绕到后门的路。' },
      { speaker: '让·路路通', avatar: 'passepartout', text: '先生，我们的船期……' },
      { speaker: '斐利亚·福克', avatar: 'fogg', text: '赌约是我自己的事。先把她带出来，再算时间。' }
    ]);
    const plan = await decisionModal.show({
      title: '救人这件事，怎样办？',
      desc: getJourneyStatus(gameState.get()).pace + '。两条路都会救人；区别在于准备时间、旅费与关内支援。以下金额已包含购象费用，确认航段账单后才扣。',
      options: RESCUE_PLANS.map(option => ({
        ...option, disabled: option.id === 'divert' && gameState.get().money.gbp < 2300,
        subText: option.subText + (option.id === 'divert' && gameState.get().money.gbp < 2300 ? '（余款不足）' : '')
      }))
    });
    let rescue;
    let fallback = false;
    while (true) {
      rescue = await gameRunner.runMiniGame('stealthRescue', {
        difficulty: 1, rescuePlan: plan.id, title: '神庙 · 路路通潜入，福克接应'
      });
      arcadeManager.saveHighScore('stealthRescue', rescue.score || 0);
      if (rescue.rescued ?? rescue.result === 'perfect') break;
      const recovery = await decisionModal.show({
        title: '这次没能把她带出来',
        desc: '向导把路路通拉回了树影里。福克仍守在接应处，营救不会就此放弃。',
        options: [
          { id: 'guide', label: '和向导改道，再找一次机会',
            subText: '额外耗时 +0.5 天 · 不再加钱 · 艾娥达获救', daysDelta: 0.5 },
          { id: 'retry', label: '重新尝试潜入',
            subText: '不重跑骑象关 · 不扣旅费，不计这次失败的时间' }
        ]
      });
      if (recovery.id === 'guide') { fallback = true; break; }
    }

    const rideSaving = ride.result === 'perfect' ? -0.5 : 0;
    const perfect = ride.result === 'perfect' && !fallback;
    const choiceMemory = plan.id === 'observe'
      ? '我们花了半天摸清暗路，带着余款继续上路。'
      : '福克另付三百英镑请向导安排接应，换来了不必等候的窗口。';
    const comment = choiceMemory + (fallback ? '潜入失手后，又用半天改道救人。' : '路路通解开锁链，艾娥达认出了通往西门的路。') +
      '此后，行程表上不再只有两个人。';
    const record = {
      legId: 'leg3', title: '第三关 · 为一个人停下脚步',
      result: perfect ? 'perfect' : 'good', baseDays: 3,
      daysDelta: rideSaving + plan.daysDelta + (fallback ? 0.5 : 0),
      moneyDelta: plan.moneyDelta, score: (ride.score || 0) + (rescue.score || 0),
      stamp: { id: 'calcutta_aouda', city: '印度 · 共同出发', label: '艾娥达同行 · ' +
        (plan.id === 'observe' ? '走过暗路' : '北门接应'), color: 'calcutta' },
      flags: { boughtElephant: true, aoudaRescued: true, rescuePlan: plan.id, rescueFallback: fallback,
        jungleRampageMaster: ride.result === 'perfect', rajahDisguiseMaster: !fallback },
      comment
    };
    const action = await resultCard.show(record);
    if (action === 'next' || action === 'continue') {
      resolveLeg('leg3', record);
      accepted = true;
    }
  }

  sceneBackdrop?.setBackdrop('elephant');
  await dialogue.playSequence([
    { speaker: '艾娥达', avatar: 'aouda', text: '过了河，东边有条路能接上火车。我认得。若你们不介意，接下来让我带一段路。' },
    { speaker: '斐利亚·福克', avatar: 'fogg', text: '请。我们要去加尔各答。' },
    { speaker: '让·路路通', avatar: 'passepartout', text: '先生，您的时刻表得添一行了——同行三人。' }
  ]);
  return 'leg4';
}
