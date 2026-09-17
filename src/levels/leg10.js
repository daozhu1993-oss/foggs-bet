import { dialogue } from '../shell/dialogue.js';
import { resolveLeg } from '../core/resolve.js';
import { resultCard } from '../shell/resultCard.js';
import { sharePoster } from '../shell/shareCard.js';
import { arcadeManager } from '../shell/arcade.js';
import { sceneBackdrop } from '../engine/backdrop.js';
import { gameState } from '../core/state.js';
import { getWagerOutcome } from '../core/journey.js';

export async function runLeg10({ gameRunner, hud }) {
  hud.setLocation('伦敦 · 回到改良俱乐部');
  hud.show();
  if (sceneBackdrop) sceneBackdrop.setBackdrop('london_finale');
  await dialogue.playSequence([
    { speaker: '侦探菲克斯', avatar: 'fix', text: '福克先生……真正的银行大盗已经落网。您是清白的。我耽误的这些时间，实在无法补偿。' },
    { speaker: '斐利亚·福克', avatar: 'fogg', text: `我们已经走了 ${gameState.get().time.elapsed.toFixed(1)} 天。先回伦敦，再核对账本。路路通，叫一辆马车。` },
    { speaker: '艾娥达', avatar: 'aouda', text: '无论牌桌那边怎样算，这趟旅程对我都不只是一场赌约。' },
    { speaker: '让·路路通', avatar: 'passepartout', text: '等等，先生！我们一直向东走，每过一个时区就把表拨快一点。转完一圈，日历该往回拨整整一天！' }
  ]);
  let outcome;
  while (true) {
    const result = await gameRunner.runMiniGame('londonFinale', { difficulty: 1 });
    arcadeManager.saveHighScore('londonFinale', result.score || 0);
    outcome = getWagerOutcome(gameState.get(), result);
    const record = {
      legId: 'leg10', title: outcome.title,
      result: outcome.won ? (result.reached === false ? 'good' : result.result) : 'miss',
      baseDays: 1, daysDelta: outcome.daysDelta, moneyDelta: outcome.moneyDelta,
      score: result.score, comment: outcome.comment,
      flags: { betWon: outcome.won, globalConquered: true, aoudaMarried: gameState.getFlag('aoudaRescued') },
      stamp: { id: 'london_final', city: '伦敦 · 改良俱乐部', date: `全程 ${outcome.elapsed.toFixed(1)} 天`,
        label: outcome.won ? '八十天之约 · 如约归来' : '环球行纪 · 归来', color: 'london' }
    };
    if (await resultCard.show(record) === 'retry') continue;
    resolveLeg('leg10', record);
    break;
  }
  await dialogue.playSequence([
    { speaker: '安德鲁·斯图尔特', avatar: 'fix', text: outcome.won
      ? '怀表、账本和你的护照都在这里。先生，我们愿赌服输。'
      : '您迟到了，福克先生。依照约定，我们不能把赌金交给您。但请坐下，讲讲外面的世界。' },
    { speaker: '斐利亚·福克', avatar: 'fogg', text: outcome.won
      ? '诸位先生，我回来了。而且，并非一个人。'
      : '是的，我输了这场赌约。但路路通，明天的日程不必排得那么满。' }
  ]);
  sharePoster.show();
  return 'completed';
}
