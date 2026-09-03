// 维多利亚探险家行囊与奇珍发明工坊系统 (Victorian Relics & Inventions System)
import { gameState } from './state.js';
import { StorageManager } from './storage.js';
import { fx } from '../engine/fx.js';
import { sound } from '../engine/audio.js';

export const INVENTIONS_CATALOG = [
  {
    id: 'chronometer',
    name: '宝玑高精天文怀表',
    icon: '⏱',
    desc: '福克先生专用。按 [C] 触发 3.5 秒【子弹时间】，全场时间流速降至 30%！',
    cost: 400,
    equipped: true
  },
  {
    id: 'umbrella',
    name: '维多利亚丝绸黑伞',
    icon: '☂',
    desc: '路路通空中长按跳跃展开黑伞，空中缓降滑翔，跨越超宽深渊！',
    cost: 300,
    equipped: true
  },
  {
    id: 'steam_boots',
    name: '吉法尔蒸汽喷气靴',
    icon: '👢',
    desc: '按 [Shift/冲刺] 消耗微量蒸汽进行空中水平瞬移冲刺！',
    cost: 500,
    equipped: false
  },
  {
    id: 'elephant_saddle',
    name: '印度象王金鞍与水炮',
    icon: '🐘',
    desc: '大象奇阿尼解锁【象鼻高压水炮】喷射灭火，冲撞威力翻倍！',
    cost: 600,
    equipped: true
  },
  {
    id: 'silent_boots',
    name: '消音丝绸潜行软底靴',
    icon: '🥷',
    desc: '神庙潜行中脚步声彻底消除，并可背后无声击晕守卫！',
    cost: 450,
    equipped: true
  }
];

export class RelicsManager {
  constructor() {
    this.modal = null;
    this.init();
  }

  init() {
    // 确保 state 中有 relics 记录
    const state = gameState.get();
    if (!state.relics) {
      state.relics = ['chronometer', 'umbrella', 'elephant_saddle', 'silent_boots'];
      gameState.set({ relics: state.relics });
    }
  }

  hasRelic(id) {
    const state = gameState.get();
    return state.relics && state.relics.includes(id);
  }

  buyRelic(id) {
    const relic = INVENTIONS_CATALOG.find(r => r.id === id);
    if (!relic) return false;

    const state = gameState.get();
    if (state.money.gbp < relic.cost) {
      fx.toast('银行本票余额不足！');
      return false;
    }

    if (this.hasRelic(id)) {
      fx.toast('已经拥有该发明！');
      return false;
    }

    gameState.deductMoney(relic.cost);
    state.relics.push(id);
    gameState.set({ relics: state.relics });
    StorageManager.save(state);

    sound.playVictory();
    fx.toast(`成功购得【${relic.name}】！`);
    return true;
  }
}

export const relicsManager = new RelicsManager();
