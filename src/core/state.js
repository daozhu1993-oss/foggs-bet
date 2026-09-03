import { events } from './events.js';

export const INITIAL_STATE = {
  projectVer: "1.0.0",
  currentLeg: "leg0",
  time: {
    totalDays: 80.0,
    elapsed: 0.0,
  },
  money: {
    gbp: 20000,
  },
  actors: {
    passepartout: {
      id: "passepartout",
      name: "路路通",
      role: "灵巧侍从",
      avatar: "🏃",
      stamina: 100,
      active: true
    },
    fogg: {
      id: "fogg",
      name: "福克先生",
      role: "绅士学者",
      avatar: "🎩",
      composure: 100,
      active: true
    },
    aouda: {
      id: "aouda",
      name: "艾娥达",
      role: "旅伴",
      avatar: "🧕",
      joined: false
    }
  },
  activeActor: "passepartout",
  passport: [], // 已盖印章列表: [{ id, city, date, label, color }]
  flags: {
    betAccepted: false,
    boatMissed: false,
    charteredBoat: false,
    boughtElephant: false,
    aoudaRescued: false,
    perfectCount: 0
  },
  legResults: {}, // 各关卡记录: { leg0: {...}, leg1: {...}, ... }
  history: []     // 旅行记事本日志
};

class StateManager {
  constructor() {
    this.state = JSON.parse(JSON.stringify(INITIAL_STATE));
  }

  get() {
    return this.state;
  }

  reset() {
    this.state = JSON.parse(JSON.stringify(INITIAL_STATE));
    events.emit('state:changed', this.state);
    return this.state;
  }

  load(savedData) {
    if (savedData) {
      this.state = Object.assign(JSON.parse(JSON.stringify(INITIAL_STATE)), savedData);
      events.emit('state:changed', this.state);
    }
    return this.state;
  }

  setLeg(legId) {
    this.state.currentLeg = legId;
    events.emit('leg:changed', legId);
    events.emit('state:changed', this.state);
  }

  addElapsedDays(delta) {
    this.state.time.elapsed = Math.max(0, Math.round((this.state.time.elapsed + delta) * 10) / 10);
    events.emit('time:changed', {
      elapsed: this.state.time.elapsed,
      remaining: this.getRemainingDays(),
      delta
    });
    events.emit('state:changed', this.state);
  }

  getRemainingDays() {
    return Math.max(0, Math.round((this.state.time.totalDays - this.state.time.elapsed) * 10) / 10);
  }

  set(partialState) {
    if (partialState && typeof partialState === 'object') {
      Object.assign(this.state, partialState);
      events.emit('state:changed', this.state);
    }
    return this.state;
  }

  addMoney(amount) {
    this.modifyMoney(amount);
  }

  deductMoney(amount) {
    this.modifyMoney(-amount);
  }

  modifyMoney(delta) {
    this.state.money.gbp = Math.max(0, this.state.money.gbp + delta);
    events.emit('money:changed', {
      gbp: this.state.money.gbp,
      delta
    });
    events.emit('state:changed', this.state);
  }

  setFlag(flagName, value = true) {
    this.state.flags[flagName] = value;
    events.emit('flag:changed', { flag: flagName, value });
    events.emit('state:changed', this.state);
  }

  getFlag(flagName) {
    return !!this.state.flags[flagName];
  }

  addPassportStamp(stamp) {
    if (!this.state.passport.some(s => s.id === stamp.id)) {
      this.state.passport.push(stamp);
      events.emit('passport:stamped', stamp);
      events.emit('state:changed', this.state);
    }
  }

  recordLegResult(legId, resultData) {
    this.state.legResults[legId] = resultData;
    this.addLog(`完成 [${resultData.title || legId}] - 评价: ${resultData.result.toUpperCase()}, 耗时: ${resultData.daysSpent}天`);
    events.emit('leg:resolved', { legId, result: resultData });
    events.emit('state:changed', this.state);
  }

  addLog(entry) {
    this.state.history.push({
      time: new Date().toLocaleTimeString(),
      day: Math.floor(this.state.time.elapsed) + 1,
      text: entry
    });
  }

  setActiveActor(actorId) {
    if (this.state.actors[actorId]) {
      this.state.activeActor = actorId;
      events.emit('actor:changed', actorId);
      events.emit('state:changed', this.state);
    }
  }
}

export const gameState = new StateManager();
