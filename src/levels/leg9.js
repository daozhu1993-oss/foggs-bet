// 《Fogg 的赌约》· 关9 亨丽埃塔号大西洋大燃烧 (Leg 9: SS Henrietta Burning)
import { dialogue } from '../shell/dialogue.js';
import { resolveLeg } from '../core/resolve.js';
import { resultCard } from '../shell/resultCard.js';
import { arcadeManager } from '../shell/arcade.js';
import { sceneBackdrop } from '../engine/backdrop.js';
import { gameState } from '../core/state.js';

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
      text: '斯皮迪船长，我出六万英镑整船买下亨丽埃塔号。现在，这艘船由我处置。水手们，取斧头来！'
    },
    {
      speaker: '让·路路通',
      avatar: 'passepartout',
      text: '拆甲板！拆船楼！砍主桅！把所有能烧的木头全部投进锅炉！开足马力冲向英国！'
    }
  ]);

  let keepRetrying = true;
  let finalGameResult = null;

  while (keepRetrying) {
    const gameResult = await gameRunner.runMiniGame('atlanticBurning', {
      difficulty: 1,
      title: '亨丽埃塔号·大西洋拆船烈火大燃烧'
    });

    finalGameResult = gameResult;
    arcadeManager.saveHighScore('atlanticBurning', gameResult.score || 0);

    let daysDelta = gameResult.daysDelta || 0;
    let moneyDelta = gameResult.moneyDelta || -60000;
    let comment = gameResult.comment || '★ 亨丽埃塔号化作铁骨残骸，伴随爱尔兰海盗狂暴节拍，准时冲滩利物浦！';

    const action = await resultCard.show({
      title: '第九章完成：大西洋烈火冲滩奇迹',
      subtitle: '亨丽埃塔号化作铁骨残骸，按时靠泊利物浦！',
      result: gameResult.result || 'good',
      baseDays: 9.0,
      daysDelta,
      moneyDelta,
      score: gameResult.score || 0,
      badge: '🔥 浴火渡洋铁血船长',
      comment
    });

    if (action === 'next' || action === 'continue') {
      keepRetrying = false;
    }
  }

  if (finalGameResult) {
    resolveLeg('leg9', {
      title: '第九关 · 亨丽埃塔号大西洋大燃烧',
      result: finalGameResult.result || 'good',
      baseDays: 9.0,
      daysDelta: finalGameResult.daysDelta || 0,
      moneyDelta: finalGameResult.moneyDelta || -60000,
      flags: finalGameResult.flags || { atlanticCrossed: true },
      stamp: {
        id: 'liverpool',
        city: '大英帝国利物浦海关',
        date: '第 79 天',
        label: '大西洋烈火冲滩入境印',
        color: 'liverpool'
      },
      comment: finalGameResult.comment
    });
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
      text: '（痛哭流涕）天哪！在这个节骨眼上！我们离伦敦只剩几个小时了啊！'
    }
  ]);

  return 'leg10';
}
