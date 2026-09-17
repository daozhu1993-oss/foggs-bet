// 《Fogg 的赌约》· 关2 苏伊士 ➔ 红海风暴 ➔ 孟买 (Leg 2: Suez, Red Sea Overdrive & Bombay)
import { dialogue } from '../shell/dialogue.js';
import { resolveLeg } from '../core/resolve.js';
import { resultCard } from '../shell/resultCard.js';
import { decisionModal } from '../shell/decisionModal.js';
import { arcadeManager } from '../shell/arcade.js';
import { sceneBackdrop } from '../engine/backdrop.js';
import { gameState } from '../core/state.js';

export async function runLeg2({ gameRunner, hud }) {
  hud.setLocation('苏伊士 ➔ 红海 ➔ 孟买');
  hud.show();

  // 1. 渲染苏伊士运河/红海高精背景
  if (sceneBackdrop) sceneBackdrop.setBackdrop('suez');

  await dialogue.playSequence([
    { speaker: '侦探菲克斯', avatar: 'fix', text: '证件齐全，逮捕令却还没到。我只能看着他登船……然后跟上去。' },
    { speaker: '蒙古号轮机长', avatar: 'reform_club', text: '红海起风了。想少耽搁，就得让投煤与活塞咬住同一个节拍。先跟我练三拍。' },
    { speaker: '斐利亚·福克', avatar: 'fogg', text: '给轮机组记五百英镑奖金。路路通，你听轮机长的；时间与开销，我来负责。' },
    { speaker: '让·路路通', avatar: 'passepartout', text: '明白。先听，再动手。' }
  ]);

  let keepRetrying = true;
  while (keepRetrying) {
    // 2. 运行轮机舱节奏超频音游
    const gameResult = await gameRunner.runMiniGame('steamOverdrive', {
      difficulty: 1,
      title: '蒙古号·红海蒸汽轮机节奏音游'
    });

    arcadeManager.saveHighScore('steamOverdrive', gameResult.score || 0);

    let daysDelta = gameResult.daysDelta;
    let moneyDelta = -500; // 支付给司炉组的超频奖金
    let comment = gameResult.comment;
    let flags = gameResult.flags || {};

    // 3. 处理故障延误决策分支
    if (gameResult.rank === 'B') {
      const choice = await decisionModal.show({
        title: '蒙古号轮机舱告警：锅炉轻微漏气',
        desc: '由于风暴剧烈且连续高负荷运转，三号蒸汽管发生微小泄漏！福克先生，接下来的应对方案是？',
        options: [
          {
            id: 'bonus_repair',
            label: '追加 £300，安排轮机组分段抢修',
            subText: '支出 -£300 (维持准点)',
            costColor: '#8b1e1e',
            moneyDelta: -300,
            daysDelta: 0,
            comment: '福克把抢修费用记下。轮机组轮流检修，船仍按原定时刻抵达。'
          },
          {
            id: 'accept_delay',
            label: '【降低负荷】关闭副阀降速航行，安全第一。',
            subText: '延误 +0.5 天',
            costColor: '#d4af37',
            moneyDelta: 0,
            daysDelta: 0.5,
            comment: '福克：「平稳航行，到达孟买后再全面检修。」'
          }
        ]
      });

      moneyDelta += choice.moneyDelta || 0;
      daysDelta = choice.daysDelta || 0;
      comment = choice.comment;
    } else if (gameResult.rank === 'S') {
      moneyDelta += 300; // 船长赞赏福克高超领航术，减免部分燃油附加费
    }

    // 4. 先展示结算预览；确认继续后才写入存档，重试不会重复扣钱或耗时
    const baseDays = 13.0;
    const previewRecord = {
      legId: 'leg2',
      title: '第二关 · 苏伊士至红海航段',
      result: gameResult.result || 'good',
      baseDays,
      daysDelta,
      moneyDelta,
      score: gameResult.score,
      stamp: {
        id: 'bombay',
        city: '印度 · 孟买',
        date: '第 20 天',
        label: '蒙古号靠港 · 接续铁路',
        color: 'bombay'
      },
      flags,
      comment
    };

    // 5. 显示关卡结算卡
    const action = await resultCard.show(previewRecord);

    if (action === 'next' || action === 'continue') {
      resolveLeg('leg2', previewRecord);
      keepRetrying = false;
    }
  }

  // 6. 启程前往印度内陆（衔接关3）
  await dialogue.playSequence([
    {
      speaker: '斐利亚·福克',
      avatar: 'fogg',
      text: '孟买已到。省下或耽误的时间，都已记在账本上。路路通，带好护照，我们转乘火车去加尔各答。'
    },
    {
      speaker: '侦探菲克斯',
      avatar: 'fix',
      text: '（气喘吁吁追下舷梯）可恶！孟买警方说伦敦发出的逮捕令还在海上漂着！我必须一路紧盯他们，直到加尔各答英国法庭！'
    }
  ]);

  return 'leg3';
}
