// 《Fogg 的赌约》· 关10 终局·伦敦日界线绝杀大团圆 (Leg 10: London Finale & 80-Day Triumph)
import { dialogue } from '../shell/dialogue.js';
import { resolveLeg } from '../core/resolve.js';
import { resultCard } from '../shell/resultCard.js';
import { sharePoster } from '../shell/shareCard.js';
import { arcadeManager } from '../shell/arcade.js';
import { sceneBackdrop } from '../engine/backdrop.js';
import { gameState } from '../core/state.js';
import { sound } from '../engine/audio.js';

export async function runLeg10({ gameRunner, hud }) {
  hud.setLocation('伦敦萨维尔街 ➔ 改良俱乐部');
  hud.show();

  if (sceneBackdrop) sceneBackdrop.setBackdrop('london_finale');

  // 剧情段落一：利物浦释放与伦敦“迟到”绝望
  await dialogue.playSequence([
    {
      speaker: '侦探菲克斯',
      avatar: 'fix',
      text: '（面色惨白跌跌撞撞跑来）福克先生……真正的银行大盗三天前在爱丁堡落网了……您是清白的，我……我有罪！'
    },
    {
      speaker: '斐利亚·福克',
      avatar: 'fogg',
      text: '（一记沉稳重拳击倒菲克斯）路路通，包租特快专列，全速回伦敦！'
    },
    {
      speaker: '斐利亚·福克',
      avatar: 'fogg',
      text: '（抵达伦敦萨维尔街家中，指针指向 8点50分）八十天赌约已过 5 分钟。我们输了。我只剩微薄家产，艾娥达夫人，我不能拖累您……'
    },
    {
      speaker: '艾娥达夫人',
      avatar: 'aouda',
      text: '福克先生！即使您一贫如洗，我依然愿意成为您的妻子，陪伴您度过余生！'
    },
    {
      speaker: '让·路路通',
      avatar: 'passepartout',
      text: '（去牧师家登记婚礼，突然狂奔破门而入大叫）福克先生！不是星期天！今天是星期六！我们一路向东，夺回了整整一天！还有最后十分钟！'
    }
  ]);

  let keepRetrying = true;
  let finalGameResult = null;

  while (keepRetrying) {
    const gameResult = await gameRunner.runMiniGame('londonFinale', {
      difficulty: 1,
      title: '终局·国际日期变更线顿悟与 80 秒马车破门绝杀'
    });

    finalGameResult = gameResult;
    arcadeManager.saveHighScore('londonFinale', gameResult.score || 0);

    let daysDelta = -1.0;
    let moneyDelta = 20000; // 赢取两万英镑赌金
    let comment = '★ 历史性绝杀！福克先生在第 80 天 20 点 45 分跨入改良俱乐部大门！';

    sound.playVictory();
    sound.playBigBen();

    const action = await resultCard.show({
      title: '🏆 终局大捷：八十天环游地球大获全胜！',
      subtitle: '「诸位先生，我回来了！」—— 斐利亚·福克',
      result: gameResult.result || 'perfect',
      baseDays: 1.0,
      daysDelta,
      moneyDelta,
      score: gameResult.score || 0,
      badge: '👑 1872 维多利亚世界传奇探险宗师',
      comment
    });

    if (action === 'next' || action === 'continue') {
      keepRetrying = false;
    }
  }

  if (finalGameResult) {
    resolveLeg('leg10', {
      title: '第十关 · 伦敦日界线绝杀大团圆',
      result: finalGameResult.result || 'perfect',
      baseDays: 1.0,
      daysDelta: -1.0,
      moneyDelta: 20000,
      flags: { betWon: true, globalConquered: true, aoudaMarried: true },
      stamp: {
        id: 'london_final',
        city: '伦敦改良俱乐部殿堂',
        date: '第 80 天 20:45',
        label: '★ 八十天环游地球凯旋总督印 (赌约大获全胜) ★',
        color: 'london'
      },
      comment: '★ 历史性绝杀！福克先生在第 80 天 20 点 45 分跨入改良俱乐部大门！'
    });
  }

  // 终局对白
  await dialogue.playSequence([
    {
      speaker: '改良俱乐部众绅士',
      avatar: 'reform_club',
      text: '（大本钟敲响第 80 天 20 点 45 分最后一声）天哪！大门开了！真的是他！斐利亚·福克！'
    },
    {
      speaker: '斐利亚·福克',
      avatar: 'fogg',
      text: '诸位先生，我回来了。'
    }
  ]);

  // 弹出终局分享长图海报
  sharePoster.show();

  return 'completed';
}
