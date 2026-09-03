// 《Fogg 的赌约》· 关6 日本横滨长鼻马戏团与主仆重聚 (Leg 6: Yokohama Circus Reunited)
import { dialogue } from '../shell/dialogue.js';
import { resolveLeg } from '../core/resolve.js';
import { resultCard } from '../shell/resultCard.js';
import { arcadeManager } from '../shell/arcade.js';
import { sceneBackdrop } from '../engine/backdrop.js';
import { gameState } from '../core/state.js';

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

  let keepRetrying = true;
  let finalGameResult = null;

  while (keepRetrying) {
    const gameResult = await gameRunner.runMiniGame('circusAcrobat', {
      difficulty: 1,
      title: '横滨长鼻马戏团·叠罗汉物理平衡与重聚'
    });

    finalGameResult = gameResult;
    arcadeManager.saveHighScore('circusAcrobat', gameResult.score || 0);

    let daysDelta = gameResult.daysDelta || 0;
    let moneyDelta = 0;
    let comment = gameResult.comment || '福克：「长鼻天狗轰然倒塌，路路通归队，即刻启程横渡太平洋！」';

    const action = await resultCard.show({
      title: '第六章完成：横滨长鼻杂技团奇迹重聚',
      subtitle: '天狗金字塔轰然倒塌，主仆二人紧紧相拥！',
      result: gameResult.result || 'good',
      baseDays: 1.0,
      daysDelta,
      moneyDelta,
      score: gameResult.score || 0,
      badge: '🎭 扶桑天狗杂技大师',
      comment
    });

    if (action === 'next' || action === 'continue') {
      keepRetrying = false;
    }
  }

  if (finalGameResult) {
    resolveLeg('leg6', {
      title: '第六关 · 横滨长鼻杂技团奇迹重聚',
      result: finalGameResult.result || 'good',
      baseDays: 1.0,
      daysDelta: finalGameResult.daysDelta || 0,
      moneyDelta: 0,
      flags: finalGameResult.flags || { passepartoutReunited: true },
      stamp: {
        id: 'yokohama',
        city: '大日本帝国横滨港',
        date: '第 42 天',
        label: '横滨长鼻团重聚签证',
        color: 'yokohama'
      },
      comment: finalGameResult.comment
    });
  }

  await dialogue.playSequence([
    {
      speaker: '让·路路通',
      avatar: 'passepartout',
      text: '福克先生！艾娥达夫人！我终于找到你们了！'
    },
    {
      speaker: '斐利亚·福克',
      avatar: 'fogg',
      text: '人齐了，立刻登上「格兰特将军号」远洋班轮，全速横渡太平洋，直扑美利坚旧金山！'
    }
  ]);

  return 'leg7';
}
