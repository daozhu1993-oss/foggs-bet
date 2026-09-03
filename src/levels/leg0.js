import { dialogue } from '../shell/dialogue.js';
import { resolveLeg } from '../core/resolve.js';
import { resultCard } from '../shell/resultCard.js';
import { arcadeManager } from '../shell/arcade.js';
import { sceneBackdrop } from '../engine/backdrop.js';

export async function runLeg0({ gameRunner, hud }) {
  hud.setLocation('伦敦 · 改良俱乐部');
  hud.show();

  // 1. 渲染伦敦改良俱乐部高精油画背景
  if (sceneBackdrop) sceneBackdrop.setBackdrop('reform_club');

  // 剧情引入
  await dialogue.playSequence([
    {
      speaker: '斐利亚·福克',
      avatar: 'fogg',
      text: '诸位先生，我以两万英镑为注——八十天，环游地球一周，于十二月二十一日晚八点四十五分，准时回到这张牌桌前。'
    },
    {
      speaker: '安德鲁·斯图尔特',
      avatar: 'fix',
      text: '简直是天方夜谭！算上风浪、铁路延误和意外，八十天绝对不可能绕地球一周！'
    },
    {
      speaker: '让·路路通',
      avatar: 'passepartout',
      text: '（先生今早才辞退了上个仆人，因为洗澡水差了两度……这样的主人，真的要带我环游地球？）'
    },
    {
      speaker: '斐利亚·福克',
      avatar: 'fogg',
      text: '时间，是这局唯一输不起的东西。路路通，先来陪几位先生打完这局惠斯特牌。'
    }
  ]);

  let keepRetrying = true;
  while (keepRetrying) {
    // 2. 运行惠斯特小游戏
    const gameResult = await gameRunner.runMiniGame('whist', {
      difficulty: 1,
      title: '改良俱乐部·惠斯特牌局'
    });

    arcadeManager.saveHighScore('whist', gameResult.score || 0);

    // 3. 构造结算预览
    const previewRecord = {
      legId: 'leg0',
      title: '序章 · 伦敦改良俱乐部之赌',
      result: gameResult.result,
      baseDays: 0,
      daysDelta: gameResult.daysDelta || 0,
      moneyDelta: gameResult.moneyDelta || 0,
      stamp: gameResult.stamp,
      flags: gameResult.flags,
      comment: gameResult.comment
    };

    // 4. 显示结算卡
    const action = await resultCard.show(previewRecord);
    if (action === 'next' || action === 'continue') {
      resolveLeg('leg0', previewRecord);
      keepRetrying = false;
    }
  }

  // 5. 过渡剧情背景
  if (sceneBackdrop) sceneBackdrop.setBackdrop('reform_club');

  await dialogue.playSequence([
    {
      speaker: '斐利亚·福克',
      avatar: 'fogg',
      text: '契约已定。路路通，带上两万英镑现钞与旅行袋，立即启程前往多佛海峡赶船！'
    },
    {
      speaker: '让·路路通',
      avatar: 'passepartout',
      text: '遵命，福克先生！一场横跨八十天的惊天狂澜，这就开始了！'
    }
  ]);

  return 'leg1';
}
