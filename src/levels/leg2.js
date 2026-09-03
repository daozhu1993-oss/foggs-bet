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

  // 剧情段落一：苏伊士领事馆签证智斗与菲克斯密谋
  await dialogue.playSequence([
    {
      speaker: '侦探菲克斯',
      avatar: 'fix',
      text: '（向领事急切密报）领事先生！这个人就是伦敦英格兰银行五万五千英镑大劫案的凶犯！请您务必拒绝给他的护照签证，就地扣押！'
    },
    {
      speaker: '英国驻苏伊士领事',
      avatar: 'reform_club',
      text: '菲克斯先生，大英帝国的法律是神圣的。这位斐利亚·福克先生持有完全合法的通行护照，我无权无故扣留一位遵纪守法的绅士。（啪！盖下苏伊士过境印章）祝您旅途愉快，福克先生！'
    },
    {
      speaker: '斐利亚·福克',
      avatar: 'fogg',
      text: '多谢领事先生。时间分秒必争，路路通，我们立刻登上「蒙古号」，穿过红海驶向印度孟买！'
    }
  ]);

  // 剧情段落二：红海遭遇狂暴季风风暴，福克重金超频
  await dialogue.playSequence([
    {
      speaker: '蒙古号船长',
      avatar: 'reform_club',
      text: '报告福克先生！前方进入红海峡湾，遭遇印度洋凶猛西南季风！逆风逆浪，船体颠簸严重，预计至少要延误 2 到 3 天才能抵达孟买！'
    },
    {
      speaker: '斐利亚·福克',
      avatar: 'fogg',
      text: '八十天之约容不得半天延误！轮机长，立即开启蒸汽轮机超频运转！听好节奏，底层机舱的蒸汽冲程就是你的节拍器！'
    },
    {
      speaker: '蒙古号轮机长',
      avatar: 'reform_club',
      text: '只要跟随 120 BPM 蒸汽轰鸣节拍，踩准每一次红键投煤与蓝键活塞冲程，航速就能飙升至 28 节破浪狂飙！'
    },
    {
      speaker: '让·路路通',
      avatar: 'passepartout',
      text: '遵命，福克先生！踩着蒸汽节拍打出 PERFECT 连击，看我让这头钢铁巨兽全速超频！'
    }
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
            label: '【紧急抢修】追加 £300 奖金让工程师带压焊接补漏！',
            subText: '支出 -£300 (维持准点)',
            costColor: '#8b1e1e',
            moneyDelta: -300,
            daysDelta: 0,
            comment: '福克：「重赏之下必有勇夫，务必在航行中完成抢修！」'
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
      daysDelta += choice.daysDelta || 0;
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
      stamp: {
        id: 'bombay',
        city: '印度孟买总督府',
        date: '第 20 天',
        label: '印度殖民地准入特别许可',
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
      text: '孟买已到。我们比原定计划节省了宝贵的时间。路路通，立刻转乘大印度半岛铁路火车，横穿印度大陆前往加尔各答！'
    },
    {
      speaker: '侦探菲克斯',
      avatar: 'fix',
      text: '（气喘吁吁追下舷梯）可恶！孟买警方说伦敦发出的逮捕令还在海上漂着！我必须一路紧盯他们，直到加尔各答英国法庭！'
    }
  ]);

  return 'leg3';
}
