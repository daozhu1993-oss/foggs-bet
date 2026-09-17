import { dialogue } from '../shell/dialogue.js';
import { resolveLeg } from '../core/resolve.js';
import { resultCard } from '../shell/resultCard.js';
import { arcadeManager } from '../shell/arcade.js';
import { sceneBackdrop } from '../engine/backdrop.js';
import { decisionModal } from '../shell/decisionModal.js';

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
      text: '赌约已定。我们可以打完手里这局牌，也可以即刻动身。去收拾旅行袋吧，路路通。'
    }
  ]);

  const opening = await decisionModal.show({
    title: '第一班火车就要开了',
    desc: '牌桌是福克的日常，但不是冒险的门槛。两种选择都能开启完整主线。',
    options: [
      { id: 'depart', label: '即刻出发', subText: '直接进入赶船关 · 带上 £20,000 旅费' },
      { id: 'whist', label: '陪绅士们打完一局惠斯特', subText: '7 轮牌局 · 有机会赢取额外旅费' }
    ]
  });
  if (opening.id === 'depart') {
    resolveLeg('leg0', { title: '序章 · 立下赌约', result: 'good', baseDays: 0,
      flags: { betAccepted: true, whistSkipped: true },
      stamp: { id: 'london', city: '伦敦', date: '02 OCT 1872', label: '改良俱乐部 · 启程', color: 'london' },
      comment: '放下手里的牌，把未知交给世界。' });
  }
  let keepRetrying = opening.id !== 'depart';
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
      score: gameResult.score,
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
      text: '先生，我才刚找到一份安稳工作……旅行袋好了。我们从哪边走？'
    }
  ]);

  return 'leg1';
}
