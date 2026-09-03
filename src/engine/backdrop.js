import { GameImages } from '../assets/images.js';

// 全局场景画卷管理器 (保证任何对白、过场与转场绝无黑屏)
export class SceneBackdropManager {
  constructor(canvas) {
    this.canvas = canvas || document.getElementById('game-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.currentBackdropKey = 'reform_club';
    this.images = {};
    this.preload();
  }

  preload() {
    const keys = [
      'reform_club', 'dover', 'dover_harbor',
      'suez', 'suez_red_sea_storm',
      'elephant', 'india_jungle', 'india_jungle_wide', 'temple',
      'calcutta', 'calcutta_high_court',
      'hongkong', 'south_china_sea_typhoon',
      'yokohama', 'yokohama_kabuki_circus',
      'sanfrancisco', 'san_francisco_saloon',
      'rocky_train', 'rocky_mountains_canyon_train',
      'nebraska_sledge', 'nebraska_blizzard_sledge',
      'atlantic', 'ss_henrietta_atlantic_burning',
      'london_finale', 'london_pall_mall_fog_night',
      'cover', 'map'
    ];
    keys.forEach(k => {
      const src = GameImages[k] ||
        (k === 'dover' ? GameImages.dover_harbor : null) ||
        (k === 'suez' ? GameImages.suez_red_sea_storm : null) ||
        (k === 'elephant' || k === 'india_jungle' ? GameImages.india_jungle_wide : null) ||
        (k === 'calcutta' ? GameImages.calcutta_high_court : null) ||
        (k === 'hongkong' ? GameImages.south_china_sea_typhoon : null) ||
        (k === 'yokohama' ? GameImages.yokohama_kabuki_circus : null) ||
        (k === 'sanfrancisco' ? GameImages.san_francisco_saloon : null) ||
        (k === 'rocky_train' ? GameImages.rocky_mountains_canyon_train : null) ||
        (k === 'nebraska_sledge' ? GameImages.nebraska_blizzard_sledge : null) ||
        (k === 'atlantic' ? GameImages.ss_henrietta_atlantic_burning : null) ||
        (k === 'london_finale' ? GameImages.london_pall_mall_fog_night : null);

      if (src && !this.images[k]) {
        const img = new Image();
        img.onload = () => {
          if (this.currentBackdropKey === k) {
            this.render();
          }
        };
        img.src = src;
        this.images[k] = img;
      }
    });
  }

  setBackdrop(key) {
    this.currentBackdropKey = key;
    if (!this.images[key]) {
      const src = GameImages[key] ||
        (key === 'dover' ? GameImages.dover_harbor : null) ||
        (key === 'suez' ? GameImages.suez_red_sea_storm : null) ||
        (key === 'elephant' || key === 'india_jungle' ? GameImages.india_jungle_wide : null) ||
        (key === 'calcutta' ? GameImages.calcutta_high_court : null) ||
        (key === 'hongkong' ? GameImages.south_china_sea_typhoon : null) ||
        (key === 'yokohama' ? GameImages.yokohama_kabuki_circus : null) ||
        (key === 'sanfrancisco' ? GameImages.san_francisco_saloon : null) ||
        (key === 'rocky_train' ? GameImages.rocky_mountains_canyon_train : null) ||
        (key === 'nebraska_sledge' ? GameImages.nebraska_blizzard_sledge : null) ||
        (key === 'atlantic' ? GameImages.ss_henrietta_atlantic_burning : null) ||
        (key === 'london_finale' ? GameImages.london_pall_mall_fog_night : null);

      if (src) {
        const img = new Image();
        img.onload = () => {
          if (this.currentBackdropKey === key) {
            this.render();
          }
        };
        img.src = src;
        this.images[key] = img;
      }
    }
    this.render();
  }

  render() {
    if (!this.canvas) this.canvas = document.getElementById('game-canvas');
    if (!this.ctx && this.canvas) this.ctx = this.canvas.getContext('2d');
    if (!this.ctx || !this.canvas) return;

    const w = this.canvas.width || 1280;
    const h = this.canvas.height || 720;
    const img = this.images[this.currentBackdropKey];

    if (img && img.naturalWidth > 0) {
      this.ctx.drawImage(img, 0, 0, w, h);
      // 电影级复古暗角与光晕
      const grad = this.ctx.createRadialGradient(w / 2, h / 2, 100, w / 2, h / 2, w * 0.7);
      grad.addColorStop(0, 'rgba(20, 16, 12, 0.35)');
      grad.addColorStop(1, 'rgba(8, 6, 4, 0.75)');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, w, h);
    } else {
      // 复古典雅底色
      this.ctx.fillStyle = '#1c1611';
      this.ctx.fillRect(0, 0, w, h);
    }
  }
}

export let sceneBackdrop = null;
export function initBackdrop(canvas) {
  sceneBackdrop = new SceneBackdropManager(canvas);
  return sceneBackdrop;
}
