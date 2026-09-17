// 《Fogg 的赌约》· 关9 亨丽埃塔号大西洋大燃烧 (Leg 9: SS Henrietta Burning)
import { dialogue } from '../shell/dialogue.js';
import { resolveLeg } from '../core/resolve.js';
import { resultCard } from '../shell/resultCard.js';
import { arcadeManager } from '../shell/arcade.js';
import { sceneBackdrop } from '../engine/backdrop.js';

export async function runLeg9({ gameRunner, hud }) {
  hud.setLocation('大西洋 ➔ 英国利物浦港');
  hud.show();

  if (sceneBackdrop) sceneBackdrop.setBackdrop('atlantic');

  // 剧情段落：买下货船与燃尽煤炭
  await dialogue.playSequence([
    {
      speaker: '斯皮迪船长',
      avatar: 'reform_club',
      text: '（咆哮）福克！我的亨丽埃塔号煤炭全烧光了！在茫茫大西洋中心，我们要随波逐流漂死了！'
    },
    {
      speaker: '斐利亚·福克',
      avatar: 'fogg',
      text: '六万美元。我要烧掉船上的木构件，船壳和机器仍归你。斯皮迪船长，我们成交吗？'
    },
    {
      speaker: '让·路路通',
      avatar: 'passepartout',
      text: '拆甲板！拆船楼！砍主桅！把所有能烧的木头全部投进锅炉！开足马力冲向英国！'
    }
  ]);

  while (true) {
    const gameResult = await gameRunner.runMiniGame('atlanticBurning', {
      difficulty: 1,
      title: '亨丽埃塔号·大西洋拆船烈火大燃烧'
    });

    arcadeManager.saveHighScore('atlanticBurning', gameResult.score || 0);
    const reached = gameResult.reached === true;
    const record = {
      title: reached ? '第九关 · 最后一炉火送我们到港' : '第九关 · 接应船带来转机',
      subtitle: reached ? '亨丽埃塔号驶抵利物浦。' : '本次未赶上航期；可重试，或接受余帆与接应船多用一天到港。',
      result: reached ? gameResult.result : 'pass',
      baseDays: 9.0,
      daysDelta: gameResult.daysDelta ?? (reached ? 0 : 1),
      moneyDelta: gameResult.moneyDelta ?? -12000,
      score: gameResult.score || 0,
      badge: reached ? '🔥 最后一炉火' : '⛵ 迟到的靠港',
      flags: { atlanticCrossed: reached, atlanticAssistedArrival: !reached },
      stamp: {
        id: 'liverpool',
        city: '大英帝国利物浦海关',
        label: reached ? '大西洋入境印' : '接应抵港入境印',
        color: 'liverpool'
      },
      comment: `${gameResult.comment || '最后的航程，将记入这趟旅行的账本。'} 拆船购料统一折算 £12,000，仅接受这张账单后结算。`
    };
    const action = await resultCard.show(record);
    if (action === 'next' || action === 'continue') {
      resolveLeg('leg9', record);
      break;
    }
  }

  await dialogue.playSequence([
    {
      speaker: '侦探菲克斯',
      avatar: 'fix',
      text: '（跳上栈桥拿出逮捕令）以女王陛下的名义，斐利亚·福克先生，你因涉嫌英格兰银行五万五千镑巨案被正式逮捕！'
    },
    {
      speaker: '让·路路通',
      avatar: 'passepartout',
      text: '眼看就要到伦敦了……菲克斯先生，您究竟还要耽搁我们多少时间？'
    }
  ]);

  return 'leg10';
}
