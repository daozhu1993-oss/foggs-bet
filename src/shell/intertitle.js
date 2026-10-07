// 电影级维多利亚章回幕间题头幕 (Cinematic Chapter Intertitle Cards)
import { sound } from '../engine/audio.js';
import { gameState } from '../core/state.js';
import { getJourneyStatus } from '../core/journey.js';

export const ACT_INTERTITLES = [
  {
    act: 'PROLOGUE',
    title: '改良俱乐部之赌',
    quote: '「一位真正的英国绅士，从不对他的诺言打半点折扣。」',
    route: '伦敦出发 ➔ 环球一周',
    transport: '蒸汽火车与邮轮'
  },
  {
    act: 'ACT I',
    title: '多佛海峡 · 狂奔赶船',
    quote: '「不可预见的事物根本不存在；世界只要经由精准计算，便遵循它的轨道。」',
    route: '伦敦 ➔ 巴黎 ➔ 多佛',
    transport: '港口快运'
  },
  {
    act: 'ACT II',
    title: '蒙古号 · 纵贯红海风暴',
    quote: '「蒸汽活塞的每一次往复冲程，都在把古老的陆地甩在身后。」',
    route: '苏伊士 ➔ 红海 ➔ 孟买',
    transport: 'P&O 皇家邮轮'
  },
  {
    act: 'ACT III',
    title: '印度古雨林 · 圣火与大象',
    quote: '「拯救一个无辜而鲜活的生命，值得赌上八十天的赌约与两万英镑。」',
    route: '柯尔比 ➔ 萨蒂火祭神庙',
    transport: '战象奇阿尼'
  },
  {
    act: 'ACT IV',
    title: '加尔各答 · 孟加拉公堂智斗',
    quote: '「两千英镑可以买下保释自由，但买不回被时光扣留的分秒。」',
    route: '恒河平原 ➔ 加尔各答港',
    transport: '半岛铁路'
  },
  {
    act: 'ACT V',
    title: '坦克德尔号 · 南海搏击惊涛',
    quote: '「顺风是朋友，逆风是砥砺。只要航船不沉，暴风雨就得向我们让路。」',
    route: '香港 ➔ 台湾海峡 ➔ 上海外海',
    transport: '领港双桅帆船'
  },
  {
    act: 'ACT VI',
    title: '横滨 · 长鼻天狗相认',
    quote: '「纵使穿越万里重洋，至诚之友总能在熙攘人潮中彼此相逢。」',
    route: '横滨港 ➔ 江户马戏团',
    transport: '人力马车与步履'
  },
  {
    act: 'ACT VII',
    title: '旧金山 · 淘金狂乱与选战突围',
    quote: '「文明的礼帽偶遇蛮荒的火枪，绅士的坚毅便成了最好的盾甲。」',
    route: '旧金山 ➔ 太平洋铁路',
    transport: '横贯大陆机车'
  },
  {
    act: 'ACT VIII',
    title: '落基雪峡与风帆雪橇',
    quote: '「百迈飞驰断桥，雪橇顺风极行。横贯大陆的狂澜，无人能挡。」',
    route: '落基山断桥 ➔ 内布拉斯加 ➔ 纽约',
    transport: '风帆雪橇与飞车'
  },
  {
    act: 'ACT IX',
    title: '亨丽埃塔号 · 怒海拆船大燃烧',
    quote: '「烧掉木舱！烧掉甲板！只要引擎还在怒吼，大西洋也得臣服脚下！」',
    route: '纽约港 ➔ 大西洋 ➔ 利物浦',
    transport: '超频商船'
  },
  {
    act: 'ACT X',
    title: '终局 · 伦敦最后二十四小时',
    quote: '「向东而行的人，比太阳更快。八十天环球，他赢得了整个世界与挚爱。」',
    route: '利物浦 ➔ 伦敦改良俱乐部',
    transport: '疾速双轮双座马车'
  }
];

export class IntertitleCard {
  static show(actIndex) {
    // 单元测试与无头双倍环境快速放行
    if (typeof window !== 'undefined' && window.constructor && window.constructor.name === 'ElementDouble') {
      return Promise.resolve();
    }
    if (typeof process !== 'undefined' && process.env && process.env.NODE_TEST_CONTEXT) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const data = ACT_INTERTITLES[actIndex] || ACT_INTERTITLES[0];
      const state = gameState.get ? gameState.get() : { money: { gbp: 20000 } };
      const remaining = gameState.getRemainingDays ? gameState.getRemainingDays() : 80;
      const journey = getJourneyStatus ? getJourneyStatus(state) : { pace: '持平' };

      let modal = document.getElementById('intertitle-overlay');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'intertitle-overlay';
        modal.className = 'intertitle-overlay hidden';
        const container = document.getElementById('game-container') || document.body;
        if (container) container.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="intertitle-card">
          <div class="intertitle-corner top-left"></div>
          <div class="intertitle-corner top-right"></div>
          <div class="intertitle-corner bottom-left"></div>
          <div class="intertitle-corner bottom-right"></div>

          <div class="intertitle-ornament-top">✦ ❖ ✦</div>
          <div class="intertitle-act">${data.act}</div>
          <h2 class="intertitle-title">${data.title}</h2>
          <div class="intertitle-line"></div>
          <p class="intertitle-quote">${data.quote}</p>
          <div class="intertitle-stats">
            <div class="stat-pill">📍 航段：${data.route}</div>
            <div class="stat-pill">⏳ 剩余：${remaining.toFixed(1)} 天 (${journey.pace})</div>
            <div class="stat-pill">💰 本票：£${state.money.gbp.toLocaleString()}</div>
          </div>
          <div class="intertitle-ornament-bottom">✦ ❖ ✦</div>
          <button id="btn-intertitle-proceed" class="gold-btn intertitle-btn">启程此程 ➔</button>
          <div class="intertitle-prompt">点击任意处或按空格启程</div>
        </div>
      `;

      modal.classList.remove('hidden');
      if (sound && sound.playBigBen) sound.playBigBen();
      if (sound && sound.playCardFlip) sound.playCardFlip();

      const btn = modal.querySelector('#btn-intertitle-proceed');
      if (btn && btn.focus) btn.focus({ preventScroll: true });

      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        if (sound && sound.playClick) sound.playClick();
        modal.classList.add('fade-out');
        setTimeout(() => {
          modal.classList.add('hidden');
          modal.classList.remove('fade-out');
          resolve();
        }, 320);
      };

      if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); close(); });
      modal.addEventListener('click', close);

      const onKey = (e) => {
        if (['Space', 'Enter'].includes(e.code)) {
          e.preventDefault();
          window.removeEventListener('keydown', onKey);
          close();
        }
      };
      window.addEventListener('keydown', onKey);
    });
  }
}
