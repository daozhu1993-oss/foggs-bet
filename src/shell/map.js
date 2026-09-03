import { sound } from '../engine/audio.js';
import { gameState } from '../core/state.js';
import { events } from '../core/events.js';
import { GameImages } from '../assets/images.js';

export class WorldMap {
  constructor() {
    this.modal = document.getElementById('map-modal');
    this.canvas = document.getElementById('map-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.btnClose = document.getElementById('btn-close-map');

    this.mapBgImg = new Image();
    if (GameImages.map) this.mapBgImg.src = GameImages.map;

    this.waypoints = [
      { id: 'london', name: '伦敦 (出发地)', x: 180, y: 160, reached: true },
      { id: 'paris', name: '巴黎', x: 220, y: 190, reached: true },
      { id: 'suez', name: '苏伊士', x: 340, y: 280, reached: false },
      { id: 'bombay', name: '孟买', x: 500, y: 320, reached: false },
      { id: 'calcutta', name: '加尔各答', x: 600, y: 310, reached: false },
      { id: 'hongkong', name: '香港', x: 700, y: 320, reached: false },
      { id: 'yokohama', name: '横滨', x: 790, y: 240, reached: false },
      { id: 'sanfrancisco', name: '旧金山', x: 860, y: 220, reached: false },
      { id: 'newyork', name: '纽约', x: 920, y: 200, reached: false },
      { id: 'london_end', name: '伦敦 (终点)', x: 970, y: 160, reached: false }
    ];

    this.animOffset = 0;
    this.animReq = null;

    this.init();
  }

  init() {
    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => this.hide());
    }
    events.on('ui:open_map', () => this.show());
  }

  show() {
    if (this.modal) this.modal.classList.remove('hidden');
    this.updateReachedStatus();
    this.startAnimation();
    sound.playCardFlip();
  }

  hide() {
    if (this.modal) this.modal.classList.add('hidden');
    if (this.animReq) cancelAnimationFrame(this.animReq);
  }

  updateReachedStatus() {
    const leg = gameState.get().currentLeg;
    const legOrder = ['leg0', 'leg1', 'leg2', 'leg3', 'leg4', 'leg5', 'leg6', 'leg7', 'leg8', 'leg9', 'leg10', 'completed'];
    const curIdx = legOrder.indexOf(leg) !== -1 ? legOrder.indexOf(leg) : 0;

    this.waypoints.forEach(wp => {
      if (wp.id === 'london' || wp.id === 'paris') wp.reached = true;
      if (wp.id === 'suez' && curIdx >= 2) wp.reached = true;
      if (wp.id === 'bombay' && curIdx >= 3) wp.reached = true;
      if (wp.id === 'calcutta' && curIdx >= 4) wp.reached = true;
      if (wp.id === 'hongkong' && curIdx >= 5) wp.reached = true;
      if (wp.id === 'yokohama' && curIdx >= 6) wp.reached = true;
      if (wp.id === 'sanfrancisco' && curIdx >= 7) wp.reached = true;
      if (wp.id === 'newyork' && curIdx >= 8) wp.reached = true;
      if (wp.id === 'london_end' && curIdx >= 10) wp.reached = true;
    });
  }

  startAnimation() {
    const loop = () => {
      this.animOffset = (this.animOffset + 0.5) % 30;
      this.drawMap();
      this.animReq = requestAnimationFrame(loop);
    };
    loop();
  }

  drawMap() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. 绘制高精 1872 维多利亚世界海图背景
    if (this.mapBgImg.complete && this.mapBgImg.naturalWidth > 0) {
      ctx.drawImage(this.mapBgImg, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#eddac2';
      ctx.fillRect(0, 0, w, h);
    }

    // 半透明复古遮罩增强路线对比度
    ctx.fillStyle = 'rgba(237, 218, 194, 0.25)';
    ctx.fillRect(0, 0, w, h);

    // 2. 绘制全航线（虚线与动态游走光标）
    ctx.beginPath();
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -this.animOffset;
    ctx.strokeStyle = '#8b1e1e';
    ctx.lineWidth = 3.5;

    this.waypoints.forEach((wp, idx) => {
      if (idx === 0) ctx.moveTo(wp.x, wp.y);
      else ctx.lineTo(wp.x, wp.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. 绘制航点
    this.waypoints.forEach((wp) => {
      ctx.save();
      if (wp.reached) {
        ctx.fillStyle = '#8b1e1e';
        ctx.strokeStyle = '#ffe87c';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 14px "Baskerville", serif';
        ctx.fillStyle = '#1a140e';
        ctx.strokeStyle = '#fff8e7';
        ctx.lineWidth = 3;
        ctx.strokeText(wp.name, wp.x, wp.y - 14);
        ctx.fillText(wp.name, wp.x, wp.y - 14);
      } else {
        ctx.fillStyle = '#5a4d3b';
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '12px "Baskerville", serif';
        ctx.fillStyle = '#3a2d1f';
        ctx.textAlign = 'center';
        ctx.fillText(wp.name, wp.x, wp.y - 12);
      }
      ctx.restore();
    });

    // 4. 绘制当前载具（船/火车）
    let currentWP = this.waypoints[0];
    for (let i = this.waypoints.length - 1; i >= 0; i--) {
      if (this.waypoints[i].reached) {
        currentWP = this.waypoints[i];
        break;
      }
    }
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚢', currentWP.x, currentWP.y + 22);
  }
}
