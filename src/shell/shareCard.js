import { gameState } from '../core/state.js';
import { TimeManager } from '../core/time.js';
import { MoneyManager } from '../core/money.js';
import { sound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { StorageManager } from '../core/storage.js';
import { GameImages } from '../assets/images.js';
import { arcadeManager } from './arcade.js';

import { ConfirmModal } from './confirmModal.js';

export class SharePosterGenerator {
  constructor() {
    this.modal = document.getElementById('share-modal');
    this.canvas = document.getElementById('share-poster-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.imgMobile = document.getElementById('share-poster-img');
    this.btnDownload = document.getElementById('btn-download-poster');
    this.btnCopy = document.getElementById('btn-copy-share-text');
    this.btnRestart = document.getElementById('btn-restart-game');
    this.btnClose = document.getElementById('btn-close-share');
    this.btnArcade = document.getElementById('btn-open-arcade-final');

    this.coverImg = new Image();
    if (GameImages.cover) this.coverImg.src = GameImages.cover;
    this.mapImg = new Image();
    if (GameImages.map) this.mapImg.src = GameImages.map;

    this.init();
  }

  init() {
    if (this.btnDownload) {
      this.btnDownload.addEventListener('click', () => this.downloadImage());
    }
    if (this.btnCopy) {
      this.btnCopy.addEventListener('click', () => this.copyShareText());
    }
    if (this.btnArcade) {
      this.btnArcade.addEventListener('click', () => {
        this.hide();
        arcadeManager.show();
      });
    }
    if (this.btnRestart) {
      this.btnRestart.addEventListener('click', async () => {
        const confirmed = await ConfirmModal.show({
          title: '🔄 重新开启八十天环球探险',
          desc: '此操作将清空当前探险存档与护照钢印记录，确定要重新启程吗？',
          confirmText: '确定重开',
          cancelText: '保留进度'
        });
        if (confirmed) {
          StorageManager.clear();
          window.location.reload();
        }
      });
    }
    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => this.hide());
    }
  }

  show() {
    this.generatePoster();
    if (this.modal) this.modal.classList.remove('hidden');
    sound.playVictory();
  }

  hide() {
    if (this.modal) this.modal.classList.add('hidden');
  }

  generatePoster() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const state = gameState.get();
    const remainingDays = gameState.getRemainingDays();

    // 1. 维多利亚做旧牛皮纸/报纸背景
    ctx.fillStyle = '#f5edd8';
    ctx.fillRect(0, 0, w, h);

    // 绘制古典雕花金箔外框
    ctx.strokeStyle = '#8c6d23';
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, w - 36, h - 36);

    ctx.strokeStyle = '#3a2818';
    ctx.lineWidth = 2;
    ctx.strokeRect(26, 26, w - 52, h - 52);

    // 2. 报头古典电报排版
    ctx.fillStyle = '#7a5a3a';
    ctx.font = '13px "Helvetica Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE DAILY TELEGRAPH · LONDON · 1872 SPECIAL EXPEDITION DISPATCH', w / 2, 56);

    // 3. 主标题
    ctx.fillStyle = '#1c140e';
    ctx.font = 'bold 36px "Baskerville", serif';
    ctx.fillText('环球八十天 · 探险家行纪档案', w / 2, 102);

    ctx.strokeStyle = '#8c6d23';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(80, 120);
    ctx.lineTo(w - 80, 120);
    ctx.stroke();

    // 4. 探险家身份
    ctx.font = '16px "Baskerville", serif';
    ctx.fillStyle = '#4a3828';
    ctx.fillText('领航绅士：斐利亚·福克 (Phileas Fogg)  |  随行侍从：让·路路通 (Passepartout)', w / 2, 148);

    // 5. 核心数据徽章栏
    const boxY = 175;
    const boxW = 220;
    const boxH = 90;
    const gap = 16;
    const startX = (w - (boxW * 3 + gap * 2)) / 2;

    this.drawStatCard(ctx, startX, boxY, boxW, boxH, '剩余倒计时', `${TimeManager.formatDays(remainingDays)}`, '#8b1e1e');
    this.drawStatCard(ctx, startX + boxW + gap, boxY, boxW, boxH, '探险银行本票', `${MoneyManager.formatGBP(state.money.gbp)}`, '#1a4329');
    this.drawStatCard(ctx, startX + (boxW + gap) * 2, boxY, boxW, boxH, '随行旅伴', state.flags.aoudaRescued ? '艾娥达夫人已随行' : '独自前行', '#5a3d28');

    // 6. 原画海报主视觉插图
    if (this.coverImg.complete && this.coverImg.naturalWidth > 0) {
      ctx.save();
      ctx.drawImage(this.coverImg, 50, 290, w - 100, 240);
      ctx.strokeStyle = '#8c6d23';
      ctx.lineWidth = 3;
      ctx.strokeRect(50, 290, w - 100, 240);
      ctx.restore();
    }

    // 7. 皇家雕花签证印章
    ctx.fillStyle = '#2b1f17';
    ctx.font = 'bold 18px "Baskerville", serif';
    ctx.textAlign = 'left';
    ctx.fillText('◆ 已征服航段皇家签证火漆钢印 (Imperial Official Visas)', 50, 575);

    this.drawRoyalStampSeal(ctx, 160, 675, 'LONDON', '02 OCT 1872', 'REFORM CLUB', '#8b1e1e', -0.08);
    this.drawRoyalStampSeal(ctx, 400, 675, 'SUEZ', '09 OCT 1872', 'CONSULATE', '#1a4329', 0.06);
    this.drawRoyalStampSeal(ctx, 640, 675, 'CALCUTTA', '25 OCT 1872', 'EAST INDIA', '#7a3a0e', -0.05);

    // 8. 探险大事记
    ctx.fillStyle = '#2b1f17';
    ctx.font = 'bold 18px "Baskerville", serif';
    ctx.fillText('◆ 探险大事记摘选 (Expedition Highlights)', 50, 790);

    ctx.font = '15px "Baskerville", serif';
    ctx.fillStyle = '#3a2b1f';
    const logs = [
      '• 伦敦改良俱乐部：两万英镑立赌，八十天环游地球正式启程。',
      '• 苏伊士码头：突破菲克斯侦探盘查与跳板拥堵，分秒不差准时赶船。',
      state.flags.boughtElephant ? '• 印度断轨丛林：豪掷 £2,000 购得大象奇阿尼，劈荆斩棘跨越火障。' : '• 印度丛林：乘象狂奔突破热带雨林。',
      state.flags.aoudaRescued ? '• 火祭营地夜潜：福克声东击西，路路通奇袭斩断铁锁解救艾娥达夫人！' : '• 顺利通过印度次大陆。'
    ];

    logs.forEach((logText, idx) => {
      ctx.fillText(logText, 60, 830 + idx * 34);
    });

    // 9. 凡尔纳文学金句
    ctx.strokeStyle = '#b89972';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, 980);
    ctx.lineTo(w - 80, 980);
    ctx.stroke();

    ctx.font = 'italic 17px "Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#5c4028';
    ctx.fillText('“凡人所能想象之事，必有人能将其实现。” —— 儒勒·凡尔纳', w / 2, 1020);
    ctx.fillText('“精确是绅士的第一美德，而时间是永不回头的舵手。”', w / 2, 1055);

    // 10. 底部标签
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#8c6d23';
    ctx.fillText('《Fogg 的赌约》· 维多利亚环球互动游戏', w / 2, 1145);

    // 11. 同步导出海报 DataURL 给移动端 <img> 标签，支持长按保存相册
    try {
      const dataUrl = this.canvas.toDataURL('image/png');
      if (this.imgMobile) {
        this.imgMobile.src = dataUrl;
      }
    } catch (e) {
      console.warn('[SharePoster] DataURL export notice:', e);
    }
  }

  drawStatCard(ctx, x, y, w, h, title, val, valColor) {
    ctx.save();
    ctx.fillStyle = '#ebdcc3';
    ctx.strokeStyle = '#8c6d23';
    ctx.lineWidth = 1.5;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#6e5743';
    ctx.font = '13px "Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, x + w / 2, y + 26);

    ctx.fillStyle = valColor;
    ctx.font = 'bold 20px "Helvetica Neue", sans-serif';
    ctx.fillText(val, x + w / 2, y + 64);
    ctx.restore();
  }

  // 绘制华丽双环雕花皇家火漆钢印
  drawRoyalStampSeal(ctx, x, y, city, date, auth, color, angle = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // 模拟墨水渗透效果
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3.5;

    // 外齿纹双环
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.setLineDash([5, 4]);
    ctx.arc(0, 0, 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.stroke();

    // 皇冠/花纹
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👑', 0, -22);

    ctx.font = 'bold 15px "Baskerville", serif';
    ctx.fillText(city, 0, -2);

    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(auth, 0, 12);
    ctx.fillText(date, 0, 24);

    ctx.font = 'bold 8px sans-serif';
    ctx.fillText('★ OFFICIAL VISA ★', 0, 34);

    ctx.restore();
  }

  downloadImage() {
    if (!this.canvas) return;
    const link = document.createElement('a');
    link.download = `Fogg_Bet_Explorer_Log_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
    fx.toast('已开始下载《环球探险家档案》高清海报！');
  }

  copyShareText() {
    const state = gameState.get();
    const isCompleted = state.currentLeg === 'completed' || (state.flags && (state.flags.betWon || state.flags.globalConquered));
    const elapsedDays = state.time.elapsed !== undefined ? state.time.elapsed : (state.time.spentDays !== undefined ? state.time.spentDays : 0);
    const remDays = gameState.getRemainingDays();
    const moneyStr = MoneyManager.formatGBP(state.money.gbp);
    const aoudaStr = (state.flags && state.flags.aoudaRescued) ? '成功营救并共谐连理 ❤️' : '未解救';

    const text = `【🎩 Fogg 的赌约 · 八十天环游地球】\n${isCompleted ? '🎉 我已带领斐利亚·福克先生在 80 天内征服环球三大洋六大洲！' : '🌍 我正在带领福克先生与路路通进行八十天环球大探险！'}\n⏱️ 探险用时：${TimeManager.formatDays(elapsedDays)} / 80.0 天 (剩余: ${TimeManager.formatDays(remDays)})\n💰 最终资信：${moneyStr}\n🧕 艾娥达夫人：${aoudaStr}\n👑 探险终评：★ 1872 维多利亚世界传奇探险宗师 ★\n“凡人所能想象之事，必有人能将其实现！”`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        fx.toast('已复制环球探险总战绩至剪贴板，快去发圈分享吧！', 3000);
      }).catch(() => {
        fx.toast('战绩文案已就绪！', 2000);
      });
    } else {
      fx.toast('战绩文案已就绪！', 2000);
    }
  }
}

export const sharePoster = new SharePosterGenerator();
