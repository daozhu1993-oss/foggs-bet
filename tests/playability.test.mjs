import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Logic tests use a deliberately small DOM/audio double, not a browser substitute.
// Actual layout and user interactions are checked separately in the browser.
class ElementDouble {
  constructor() {
    this.listeners = {};
    this.style = {};
    this.width = 1280; this.height = 720;
    this.classList = { add() {}, remove() {}, toggle() {}, contains: () => true };
  }
  addEventListener(type, cb) { (this.listeners[type] ||= []).push(cb); }
  removeEventListener() {}
  dispatch(type, event) { for (const cb of this.listeners[type] || []) cb(event); }
  querySelector() { return new ElementDouble(); }
  querySelectorAll() { return []; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720 }; }
  getContext() { return context; }
  setAttribute() {}
  getAttribute() { return ''; }
  appendChild() {}
  remove() {}
  blur() {}
  focus() {}
}
const noop = () => {};
const context = new Proxy({
  canvas: { width: 1280, height: 720 },
  measureText: text => ({ width: String(text).length * 9 }),
  createLinearGradient: () => ({ addColorStop() {} }),
  createRadialGradient: () => ({ addColorStop() {} })
}, { get: (o, key) => key in o ? o[key] : noop });
globalThis.window = Object.assign(new ElementDouble(), { innerWidth: 1280, innerHeight: 720 });
globalThis.document = Object.assign(new ElementDouble(), {
  getElementById: () => new ElementDouble(),
  querySelector: () => null,
  createElement: () => new ElementDouble()
});
globalThis.Image = class { complete = false; naturalWidth = 0; };
globalThis.requestAnimationFrame = noop;
globalThis.cancelAnimationFrame = noop;
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { maxTouchPoints: 0 } });
const saved = new Map();
globalThis.localStorage = { getItem: k => saved.get(k) || null, setItem: (k, v) => saved.set(k, v), removeItem: k => saved.delete(k) };

const { gameState } = await import('../src/core/state.js');
const { resolveLeg, previewLeg } = await import('../src/core/resolve.js');
const { StorageManager } = await import('../src/core/storage.js');
const { CHALLENGE_GUIDES, getWagerOutcome, getJourneyStatus } = await import('../src/core/journey.js');
const { MiniGame } = await import('../src/minigames/_base/MiniGame.js');
const { miniGameRegistry } = await import('../src/minigames/_base/registry.js');
const { InputManager } = await import('../src/input/InputManager.js');
const { sound } = await import('../src/engine/audio.js');
sound.enabled = false;

const stubSound = () => new Proxy({ ctx: { currentTime: 0 }, music: { stopTheme() {}, playTheme() {}, setIntensity() {} } }, { get: (o, k) => k in o ? o[k] : noop });
const stubFX = new Proxy({}, { get: () => noop });
function createGame(name, config = {}) {
  const canvas = new ElementDouble();
  const input = new InputManager(new ElementDouble(), canvas);
  const audio = stubSound();
  const game = miniGameRegistry.create(name, { container: new ElementDouble(), canvas, input, fx: stubFX, sound: audio, config: { difficulty: 1, ...config } });
  game.init(); game.start(); input.setEnabled(true);
  return { game, input, audio };
}

test('standalone is parseable, has unique IDs and includes the confirmation module', () => {
  const html = fs.readFileSync(new URL('../Fogg赌约_双击直接玩.html', import.meta.url), 'utf8');
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length > 0);
  for (const match of scripts) new vm.Script(match[1]);
  const markup = html.replace(/<script[\s\S]*?<\/script>/g, '');
  const ids = [...markup.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.match(html, /class ConfirmModal/);
  assert.ok(Buffer.byteLength(html) < 4.5 * 1024 * 1024);
});

test('result preview is non-mutating and exactly matches the confirmed ledger', () => {
  gameState.reset();
  gameState.addElapsedDays(7);
  const record = { title: '红海', baseDays: 13, daysDelta: -2, moneyDelta: -200, result: 'perfect' };
  const before = JSON.stringify(gameState.get());
  const preview = previewLeg(record);
  assert.equal(JSON.stringify(gameState.get()), before);
  assert.equal(preview.remainingDays, 62);
  const committed = resolveLeg('leg2', record);
  assert.equal(committed.remainingDays, preview.remainingDays);
  assert.equal(committed.remainingGBP, preview.remainingGBP);
  assert.equal(gameState.get().currentLeg, 'leg3');
  const once = JSON.stringify(gameState.get());
  resolveLeg('leg2', record);
  assert.equal(JSON.stringify(gameState.get()), once, 'duplicate completion must not charge twice');
});

test('legacy save pointing at an already completed chapter resumes at the next chapter', () => {
  gameState.setLeg('leg2');
  StorageManager.save();
  gameState.reset();
  assert.equal(StorageManager.load().currentLeg, 'leg3');
  assert.equal(gameState.get().money.gbp, 19800);
});

test('80-day wager boundary: exactly 80 wins, 80.1 loses, earlier savings can offset a missed cab', () => {
  gameState.reset();
  gameState.get().time.elapsed = 80;
  assert.equal(getWagerOutcome(gameState.get(), { reached: true }).won, true);
  assert.equal(getWagerOutcome(gameState.get(), { reached: false }).won, false);
  gameState.get().time.elapsed = 80.1;
  assert.equal(getWagerOutcome(gameState.get(), { reached: true }).moneyDelta, 0);
  gameState.get().time.elapsed = 79;
  assert.equal(getWagerOutcome(gameState.get(), { reached: false }).won, true);
});

test('destroyed/duplicate callbacks cannot settle, and completion waits while paused', () => {
  const game = new MiniGame({});
  const results = [];
  game.onComplete = result => results.push(result);
  game.start(); game.pause(); game.complete({ score: 5 });
  assert.equal(results.length, 0);
  game.resume(); game.complete({ score: 9 });
  assert.deepEqual(results, [{ score: 5 }]);
  const stale = new MiniGame({});
  stale.onComplete = result => results.push(result);
  stale.destroy(); stale.complete({ score: 99 });
  assert.equal(results.length, 1);
});

test('pause clears held input; disabled/repeated keypresses never produce phantom hits', () => {
  const input = new InputManager(new ElementDouble(), new ElementDouble());
  input.setEnabled(true);
  const key = { code: 'Space', repeat: false, preventDefault() {} };
  window.dispatch('keydown', key);
  assert.equal(input.input.buttons.A, true);
  input.setEnabled(false);
  window.dispatch('keydown', key);
  assert.equal(input.input.buttons.A, false);
  input.setEnabled(true);
  window.dispatch('keydown', { ...key, repeat: true });
  assert.equal(input.input.buttons.justA, false);
});

test('a second touch cannot release or steer the active canvas touch; cancellation clears it', () => {
  const canvas = new ElementDouble();
  const input = new InputManager(new ElementDouble(), canvas);
  const touch = (pointerId, clientX, clientY) => ({ pointerId, clientX, clientY });
  input.setEnabled(true);
  canvas.dispatch('pointerdown', touch(11, 100, 200));
  input.endFrame();
  window.dispatch('pointermove', touch(12, 700, 400));
  window.dispatch('pointerup', touch(12, 700, 400));
  assert.deepEqual([input.input.pointer.x, input.input.pointer.y], [100, 200]);
  assert.equal(input.input.pointer.down, true);
  assert.equal(input.input.pointer.justUp, false);
  canvas.dispatch('pointerdown', touch(12, 700, 400));
  assert.deepEqual([input.input.pointer.x, input.input.pointer.y], [100, 200]);
  window.dispatch('pointermove', touch(11, 160, 200));
  assert.equal(input.input.pointer.x, 160);
  window.dispatch('pointercancel', touch(11, 160, 200));
  assert.equal(input.input.pointer.down, false);
  canvas.dispatch('pointerdown', touch(12, 700, 400));
  assert.equal(input.input.pointer.down, true);
  input.setEnabled(false);
  window.dispatch('pointerup', touch(12, 700, 400));
  assert.equal(input.input.pointer.justUp, false);
});

test('virtual direction and action controls hold and release independently', () => {
  const savedDom = {
    getElementById: document.getElementById,
    querySelector: document.querySelector,
    querySelectorAll: document.querySelectorAll
  };
  const controls = new ElementDouble();
  const up = new ElementDouble(); const down = new ElementDouble();
  const left = new ElementDouble(); const right = new ElementDouble();
  const a = new ElementDouble(); const b = new ElementDouble(); const c = new ElementDouble();
  const byId = { 'touch-controls': controls, 'touch-btn-a': a, 'touch-btn-b': b, 'touch-btn-c': c };
  const bySelector = { '.dpad-up': up, '.dpad-down': down, '.dpad-left': left, '.dpad-right': right };
  document.getElementById = id => byId[id] || null;
  document.querySelector = selector => bySelector[selector] || null;
  document.querySelectorAll = () => [];
  try {
    const input = new InputManager(new ElementDouble(), new ElementDouble());
    const event = pointerId => ({ pointerId, preventDefault() {}, stopPropagation() {} });
    input.setEnabled(true);
    right.dispatch('pointerdown', event(21));
    a.dispatch('pointerdown', event(22));
    assert.equal(input.input.axis.x, 1);
    assert.equal(input.input.buttons.A, true);
    assert.equal(input.input.buttons.justA, true);
    a.dispatch('pointerup', event(22));
    assert.equal(input.input.buttons.A, false);
    assert.equal(input.input.axis.x, 1);
    right.dispatch('pointercancel', event(21));
    assert.equal(input.input.axis.x, 0);
  } finally {
    Object.assign(document, savedDom);
  }
});

test('touch controls stay hidden until an active game configures them', () => {
  const savedGetElementById = document.getElementById;
  const savedQuerySelector = document.querySelector;
  const savedTouchPoints = navigator.maxTouchPoints;
  const controls = new ElementDouble();
  let reveals = 0;
  controls.classList.remove = name => { if (name === 'hidden') reveals++; };
  document.getElementById = id => id === 'touch-controls' ? controls : null;
  document.querySelector = () => null;
  navigator.maxTouchPoints = 1;
  try {
    const input = new InputManager(new ElementDouble(), new ElementDouble());
    assert.equal(reveals, 0);
    input.configureUI({ showDpad: false, showA: false, showB: false });
    assert.equal(reveals, 1);
  } finally {
    document.getElementById = savedGetElementById;
    document.querySelector = savedQuerySelector;
    navigator.maxTouchPoints = savedTouchPoints;
  }
});

test('phone landscape controls suppress browser gestures and retain finger-sized targets', () => {
  const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  assert.match(css, /#game-canvas\s*\{[\s\S]*?touch-action:\s*none/);
  assert.match(css, /\.dpad-btn\s*\{[\s\S]*?touch-action:\s*none/);
  assert.match(css, /\.action-btn\s*\{[\s\S]*?touch-action:\s*none/);
  assert.match(css, /@media \(max-height:\s*500px\)[\s\S]*?\.dpad-btn\s*\{\s*width:\s*88px;\s*height:\s*88px/);
  assert.match(css, /@media \(max-height:\s*500px\)[\s\S]*?\.action-btn\s*\{\s*width:\s*88px;\s*height:\s*88px/);
});

test('Orientation: a narrow desktop preview stays playable; only portrait touch devices need rotation', async () => {
  const { OrientationAdapter } = await import('../src/shell/orientation.js');
  const adapter = Object.create(OrientationAdapter.prototype);
  adapter.baseWidth = 1280; adapter.baseHeight = 720;
  adapter.container = { style: {} };
  let guarded = false;
  adapter.guard = { classList: { add() { guarded = false; }, remove() { guarded = true; } } };
  try {
    window.innerWidth = 350; window.innerHeight = 542;
    navigator.maxTouchPoints = 0;
    adapter.handleResize();
    assert.equal(guarded, false);
    assert.equal(adapter.container.style.transform, 'scale(' + 350 / 1280 + ')');
    navigator.maxTouchPoints = 1;
    adapter.handleResize();
    assert.equal(guarded, true);
    window.innerWidth = 844; window.innerHeight = 390;
    adapter.handleResize();
    assert.equal(guarded, false);
  } finally {
    window.innerWidth = 1280; window.innerHeight = 720;
    navigator.maxTouchPoints = 0;
  }
});

test('scaled viewport cannot be displaced when a briefing button receives focus', () => {
  const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  const gameAppRule = css.match(/#game-app\s*\{([\s\S]*?)\}/)?.[1] || '';
  const briefing = fs.readFileSync(new URL('../src/shell/briefing.js', import.meta.url), 'utf8');
  assert.match(gameAppRule, /overflow:\s*clip/);
  assert.match(briefing, /focus\(\{\s*preventScroll:\s*true\s*\}\)/);
});

for (const name of Object.keys(CHALLENGE_GUIDES)) {
  test(`${name}: creates, updates/renders 120 frames, pauses, destroys without changing campaign`, () => {
    const before = JSON.stringify(gameState.get());
    const { game, input, audio } = createGame(name);
    for (let i = 0; i < 120; i++) {
      audio.ctx.currentTime += 1 / 60;
      game.update(1 / 60);
      game.render(context);
      input.endFrame();
    }
    game.pause(); assert.equal(game.paused, true);
    game.resume(); assert.equal(game.paused, false);
    game.destroy(); assert.equal(game.destroyed, true);
    assert.equal(JSON.stringify(gameState.get()), before);
  });
}

test('London finale: rotating east is required; idle cab loses but sustained acceleration can arrive', () => {
  for (const accelerate of [false, true]) {
    const { game, input } = createGame('londonFinale');
    game.update(1);
    assert.equal(game.phase, 1);
    input.input.keys.ArrowRight = true;
    for (let i = 0; i < 200; i++) game.update(1 / 60);
    assert.equal(game.phase, 2);
    input.reset(); game.spawnTimer = Infinity; game.obstacles = [];
    input.input.keys.Space = accelerate;
    let result;
    game.onComplete = value => { result = value; };
    for (let i = 0; i < 2500 && game.running; i++) game.update(1 / 60);
    assert.equal(result.reached, accelerate);
    assert.equal(result.rank === 'S', accelerate);
    game.destroy();
  }
});

test('Atlantic Space key hits only track three; elephant touch jump does not also charge', () => {
  const { game, input } = createGame('atlanticBurning');
  const lanes = [];
  game.checkLaneHit = lane => lanes.push(lane);
  input.input.keys.Space = true;
  input.input.justKeys.Space = true;
  input.input.buttons.justA = true;
  game.update(1 / 60);
  assert.deepEqual(lanes, [2]);
  game.destroy();
  const elephant = createGame('elephantRide');
  elephant.input.input.buttons.A = true;
  elephant.input.input.buttons.justA = true;
  elephant.game.update(1 / 60);
  assert.equal(elephant.game.elephant.isCharging, false);
  elephant.game.destroy();
});

test('rhythm clock resumes at the same song position, including a pause at time zero', () => {
  const { game, audio } = createGame('steamOverdrive');
  game.pause();
  audio.ctx.currentTime = 30;
  game.resume();
  game.update(1 / 60);
  assert.equal(game.animTime, 0);
  audio.ctx.currentTime = 31;
  game.update(1 / 60);
  assert.equal(game.animTime, 1);
  game.destroy();
});

test('muting preserves the current music theme and permits a new theme to be selected silently', async () => {
  const { DynamicMusicEngine } = await import('../src/engine/dynamicAudio.js');
  const audio = { enabled: false, paused: false, resume() {}, ctx: {
    currentTime: 0, destination: {}, createGain: () => ({ gain: { setValueAtTime() {} }, connect() {} })
  } };
  const music = new DynamicMusicEngine(audio);
  music.playTheme('dover');
  assert.equal(music.currentTheme, 'dover');
  assert.equal(music.isPlaying, true);
  music.stopTheme();
  sound.enabled = true; sound.music.currentTheme = 'jungle'; sound.music.isPlaying = true;
  sound.toggle();
  assert.equal(sound.music.currentTheme, 'jungle');
  assert.equal(sound.music.isPlaying, true);
  sound.music.stopTheme(); sound.enabled = false;
});

test('red-sea repair choice charges its price and really restores scheduled arrival', async () => {
  const { dialogue } = await import('../src/shell/dialogue.js');
  const { decisionModal } = await import('../src/shell/decisionModal.js');
  const { resultCard } = await import('../src/shell/resultCard.js');
  const { runLeg2 } = await import('../src/levels/leg2.js');
  dialogue.playSequence = async () => {};
  const choose = [0, 1];
  for (const selection of choose) {
    gameState.reset(); gameState.addElapsedDays(7);
    decisionModal.show = async ({ options }) => options[selection];
    resultCard.show = async record => {
      assert.equal(record.daysDelta, selection === 0 ? 0 : 0.5);
      assert.equal(record.moneyDelta, selection === 0 ? -800 : -500);
      return 'next';
    };
    await runLeg2({ hud: { show() {}, setLocation() {} }, gameRunner: {
      runMiniGame: async () => ({ rank: 'B', result: 'pass', daysDelta: 0.5, score: 0 })
    } });
    assert.equal(gameState.get().time.elapsed, selection === 0 ? 20 : 20.5);
  }
});

test('all 11 actual chapter scripts preview, commit, save, and reach the finale for win/loss profiles', async () => {
  const { dialogue } = await import('../src/shell/dialogue.js');
  const { decisionModal } = await import('../src/shell/decisionModal.js');
  const { resultCard } = await import('../src/shell/resultCard.js');
  const { sharePoster } = await import('../src/shell/shareCard.js');
  dialogue.playSequence = async () => {};
  decisionModal.show = async ({ options }) => options[0];
  sharePoster.show = () => {};
  for (const won of [true, false]) {
    gameState.reset();
    let previews = 0;
    resultCard.show = async record => {
      const before = JSON.stringify(gameState.get());
      const preview = previewLeg(record);
      assert.ok(Number.isFinite(preview.remainingDays));
      assert.equal(JSON.stringify(gameState.get()), before);
      previews++;
      return 'next';
    };
    const gameRunner = { runMiniGame: async () => ({
      result: won ? 'perfect' : 'pass', rank: won ? 'S' : 'B', score: won ? 9000 : 0,
      daysDelta: won ? -0.5 : 1.5, moneyDelta: 0, reached: won, reunited: won,
      flags: { aoudaRescued: true }, comment: 'Test play profile'
    }) };
    const hud = { show() {}, setLocation() {} };
    for (let i = 0; i < 11; i++) {
      const mod = await import(`../src/levels/leg${i}.js`);
      assert.equal(await mod[`runLeg${i}`]({ gameRunner, hud }), i === 10 ? 'completed' : `leg${i + 1}`);
      const record = gameState.get().legResults[`leg${i}`];
      assert.ok(record);
      assert.equal(StorageManager.load().currentLeg, i === 10 ? 'completed' : `leg${i + 1}`);
    }
    assert.equal(previews, 10, 'the optional whist skip leaves ten confirmed chapter bills');
    assert.equal(gameState.getFlag('betWon'), won);
    assert.equal(getJourneyStatus(gameState.get()).completed, 11);
  }
});

test('Dover: lessons wait without time loss; learned jump/slide completes the real course at 30/60/120 fps', () => {
  for (const fps of [30, 60, 120]) {
    const { game, input } = createGame('parkour');
    for (let i = 0; i < fps * 60; i++) { game.update(1 / fps); input.endFrame(); }
    assert.equal(game.lesson, 0);
    assert.equal(game.lessonWaiting, true);
    assert.equal(game.timeRemaining, 24);
    let result;
    const collisions = [];
    game.onComplete = value => { result = value; };
    for (let i = 0; i < fps * 50 && game.running; i++) {
      input.reset();
      const obstacle = game.obstacles.find(o => !o.passed);
      if (obstacle) {
        const distance = obstacle.x - (game.player.x + game.player.w);
        if (obstacle.type === 'beam' && distance < 200) input.input.buttons.B = true;
        if (obstacle.type === 'box' && distance < 75 && distance > -80 && game.player.isGrounded) {
          input.input.buttons.justA = true;
        }
      }
      const previousHits = game.hits;
      game.update(1 / fps);
      if (game.hits > previousHits) collisions.push({ x: game.player.x, y: game.player.y, slide: game.player.isSliding, obstacle: obstacle?.x });
    }
    assert.equal(result?.result, 'perfect', 'course at ' + fps + ' fps: ' + JSON.stringify({ x: game.player.x, lesson: game.lesson, hits: game.hits, collisions }));
    assert.equal(game.hits, 0);
    assert.equal(game.lesson, 2);
    game.destroy();
  }
});

test('Dover: idle after learning cannot run through cargo and win; arrival resolves only once', () => {
  const { game, input } = createGame('parkour');
  game.lesson = 2;
  game.player.x = 1500;
  game.obstacles[0].passed = game.obstacles[1].passed = true;
  let calls = 0;
  game.onComplete = result => { calls++; assert.equal(result.result, 'miss'); };
  for (let i = 0; i < 4000; i++) { game.update(1 / 60); input.endFrame(); }
  assert.equal(calls, 1);
  assert.ok(game.player.x < 2010);
  game.destroy();
});

test('Steam practice: missed notes repeat freely, all three inputs teach, formal score starts from zero', () => {
  const { game, audio } = createGame('steamOverdrive');
  audio.ctx.currentTime = 20; game.update();
  assert.equal(game.notes[0].time, 22);
  assert.equal(game.stats.miss, 0);
  for (const type of ['left', 'right', 'both']) {
    game.animTime = game.notes[0].time;
    game.handleHitInput(type);
  }
  assert.equal(game.practiceIndex, 3);
  assert.equal(game.stats.score, 0);
  assert.equal(game.stats.combo, 0);
  assert.equal(game.totalNotesCount, 0);
  game.beginSong();
  assert.equal(game.practising, false);
  assert.equal(game.animTime, 0);
  assert.equal(game.totalNotesCount, 147);
  assert.ok(game.notes.every(note => Number.isInteger(note.time * 4)), 'all formal notes align to the eighth-note music clock');
  for (const note of game.notes) {
    game.animTime = note.time;
    game.handleHitInput(note.type);
  }
  assert.equal(game.stats.perfect, 147);
  assert.equal(game.stats.maxCombo, 147);
  game.destroy();
});

test('Steam: practice retries stay on the beat grid and can be skipped without a hidden score penalty', () => {
  const { game, input, audio } = createGame('steamOverdrive');
  audio.ctx.currentTime = 2.173; game.update();
  assert.equal(game.notes[0].time % 0.5, 0);
  input.input.keys.Enter = true;
  game.update();
  assert.equal(game.practising, false);
  assert.equal(game.stats.miss, 0);
  assert.equal(game.stats.score, 0);
  assert.equal(game.animTime, 0);
  game.destroy();
});

test('Steam: keydown and keyup between frames still skip practice and hit each note exactly once', () => {
  const { game, input, audio } = createGame('steamOverdrive');
  const tap = code => {
    const event = { code, repeat: false, preventDefault() {} };
    window.dispatch('keydown', event);
    window.dispatch('keyup', event);
  };
  tap('Enter'); game.update(); input.endFrame();
  assert.equal(game.practising, false);
  const notes = [
    { time: 1, type: 'left', code: 'KeyD' },
    { time: 1.1, type: 'left', code: 'KeyD' },
    { time: 2, type: 'right', code: 'KeyK' },
    { time: 3, type: 'both', code: 'Space' }
  ];
  game.notes = notes.map(note => ({ ...note, hit: false, judged: false }));
  for (const note of notes) {
    audio.ctx.currentTime = game.songStartedAt + note.time;
    tap(note.code); game.update(); input.endFrame();
  }
  assert.equal(game.stats.perfect, 4);
  game.update(); input.endFrame();
  assert.equal(game.stats.perfect, 4);
  input.setEnabled(false); tap('Enter'); input.setEnabled(true);
  assert.deepEqual(input.input.justKeys, {});
  game.destroy();
});

test('Stealth: selected plans alter actual darkness, lock timing and Fogg support; pause blocks support', () => {
  const observe = createGame('stealthRescue', { rescuePlan: 'observe' });
  const divert = createGame('stealthRescue', { rescuePlan: 'divert' });
  assert.ok(observe.game.torches.every(t => !t.lit));
  assert.ok(divert.game.torches.every(t => t.lit));
  assert.ok(observe.game.lockWindow > divert.game.lockWindow);
  assert.ok(divert.game.foggCooldownMax < observe.game.foggCooldownMax);
  divert.game.triggerFoggDistract();
  assert.equal(divert.game.guards[0].distractedTimer, 7);
  const time = divert.game.foggCooldown;
  divert.game.pause(); divert.game.triggerFoggDistract();
  assert.equal(divert.game.foggCooldown, time);
  divert.game.destroy(); observe.game.destroy();
});

test('Stealth: a pillar occludes the segment, extinguished torch creates a real hiding zone', () => {
  const { game } = createGame('stealthRescue');
  game.pillars = [{ x: 300, y: 200, w: 70, h: 180 }];
  assert.equal(game.checkLineOfSightBlocked(200, 300, 450, 300), true);
  assert.equal(game.checkLineOfSightBlocked(200, 100, 450, 100), false);
  assert.equal(game.checkLineOfSightBlocked(200, 100, 200, 400), false);
  game.bushes = []; game.pillars = [];
  assert.equal(game.checkInStealthZone(760, 360), false);
  game.torches[1].lit = false;
  assert.equal(game.checkInStealthZone(760, 360), true);
  game.destroy();
});

test('Stealth: tap-only locks, lock timeout cannot softlock, and failed infiltration never claims a rescue', () => {
  const { game, input } = createGame('stealthRescue');
  let result;
  game.onComplete = value => { result = value; };
  game.isLockpicking = true;
  input.input.keys.Space = input.input.buttons.A = true;
  for (let i = 0; i < 120; i++) game.update(1 / 60);
  assert.equal(game.aouda.locksRemaining, 3, 'holding Space must not automatically open all locks');
  input.reset();
  game.lockDialAngle = game.lockTargetStart;
  input.input.buttons.justA = true;
  game.update(1 / 60); input.endFrame();
  assert.equal(game.aouda.locksRemaining, 2);
  game.timer = 0.01;
  game.update(1 / 60);
  assert.equal(result.rescued, false);
  assert.equal(result.result, 'miss');
  assert.equal(result.flags.aoudaRescued, false);
  game.destroy();
});

test('Stealth: a glance warns first; sustained exposure triggers a pause-safe failure', () => {
  const { game, input } = createGame('stealthRescue');
  game.guards = [{ x: 400, y: 360, facingAngle: 0, speedY: 0, startY: 0, endY: 720,
    visionRange: 220, visionAngle: Math.PI / 2, distractedTimer: 0, exposure: 0 }];
  game.dog.hearRadius = 0;
  game.bushes = []; game.pillars = [];
  game.player.x = 500; game.player.y = 360;
  game.update(0.1);
  assert.equal(game.detected, false);
  assert.ok(game.guards[0].exposure > 0);
  for (let i = 0; i < 60; i++) game.update(1 / 60);
  assert.equal(game.detected, true);
  const before = game.alertTimer;
  game.pause(); game.update(4);
  assert.equal(game.alertTimer, before);
  game.resume();
  let result;
  game.onComplete = value => { result = value; };
  for (let i = 0; i < 100; i++) { game.update(1 / 60); input.endFrame(); }
  assert.equal(result.rescued, false);
  game.destroy();
});

test('Elephant approach ends at camp and never rescues Aouda before the actual rescue chapter', () => {
  const { game, input } = createGame('elephantRide');
  let result;
  game.onComplete = value => { result = value; };
  for (let i = 0; i < 1500 && game.running; i++) { game.update(1 / 60); input.endFrame(); }
  assert.ok(result);
  assert.notEqual(result.flags.aoudaRescued, true);
  assert.equal(game.elephant.hasRescuedAouda, false);
  game.destroy();
});

test('Stealth: both plans can complete infiltration, three locks and return using only ordinary inputs', () => {
  for (const rescuePlan of ['observe', 'divert']) {
    const { game, input } = createGame('stealthRescue', { rescuePlan });
    let result;
    game.onComplete = value => { result = value; };
    let returning = false, waypoint = 0;
    let route = [[120, 630], [1040, 630], [1040, 360]];
    for (let i = 0; i < 60 * 80 && game.running; i++) {
      input.reset();
      if (game.foggCooldown <= 0 && !game.isLockpicking) input.input.buttons.justC = true;
      if (game.player.hasRescued && !returning) {
        returning = true; waypoint = 0; route = [[1040, 630], [120, 630], [120, 360]];
      }
      if (game.isLockpicking) {
        const nextAngle = (game.lockDialAngle + game.lockSpeed / 60) % (Math.PI * 2);
        input.input.buttons.justA = nextAngle >= game.lockTargetStart && nextAngle <= game.lockTargetEnd;
      } else if (waypoint < route.length) {
        const [x, y] = route[waypoint];
        const dx = x - game.player.x, dy = y - game.player.y, distance = Math.hypot(dx, dy);
        if (distance < 5) waypoint++;
        else { input.input.axis.x = dx / distance; input.input.axis.y = dy / distance; }
      }
      game.update(1 / 60);
    }
    assert.equal(result?.rescued, true, rescuePlan + ': ' + JSON.stringify({ x: game.player.x, y: game.player.y, locks: game.aouda.locksRemaining, detected: game.detected }));
    assert.equal(game.aouda.locksRemaining, 0);
    game.destroy();
  }
});

test('India: both plans and recovery have exact costs; a rescue retry does not replay the elephant or pre-charge', async () => {
  const { dialogue } = await import('../src/shell/dialogue.js');
  const { decisionModal } = await import('../src/shell/decisionModal.js');
  const { resultCard } = await import('../src/shell/resultCard.js');
  const { runLeg3 } = await import('../src/levels/leg3.js');
  dialogue.playSequence = async () => {};
  for (const plan of ['observe', 'divert']) {
    for (const recovery of ['clean', 'guide', 'retry']) {
      gameState.reset(); gameState.addElapsedDays(20);
      let rides = 0, rescues = 0, previews = 0;
      decisionModal.show = async ({ options }) => options.find(o => o.id === plan || o.id === recovery) || options[0];
      resultCard.show = async record => {
        assert.equal(gameState.get().money.gbp, 20000);
        assert.equal(gameState.get().time.elapsed, 20);
        assert.equal(record.moneyDelta, plan === 'observe' ? -2000 : -2300);
        assert.equal(record.daysDelta, (plan === 'observe' ? 0 : -0.5) + (recovery === 'guide' ? 0.5 : 0));
        previews++;
        return previews === 1 ? 'retry' : 'next';
      };
      await runLeg3({ hud: { show() {}, setLocation() {} }, gameRunner: {
        runMiniGame: async (name, config) => {
          if (name === 'elephantRide') { rides++; return { result: 'perfect', score: 800 }; }
          assert.equal(config.rescuePlan, plan);
          rescues++;
          const failed = recovery !== 'clean' && (recovery !== 'retry' || rescues % 2 === 1);
          return { result: failed ? 'miss' : 'perfect', rescued: !failed, score: 100 };
        }
      } });
      assert.equal(rides, 2, 'only the whole-chapter result retry replays the ride');
      assert.equal(rescues, recovery === 'retry' ? 4 : 2);
      assert.equal(gameState.get().money.gbp, plan === 'observe' ? 18000 : 17700);
      assert.equal(gameState.getFlag('rescueFallback'), recovery === 'guide');
      assert.equal(gameState.get().passport[0].date, '行程第 ' + gameState.get().time.elapsed.toFixed(1) + ' 天');
    }
  }
});

test('South China Sea: doing nothing waits in a free lesson, never auto-boards a steamer', () => {
  const { game, input } = createGame('typhoonSailing');
  let result;
  game.onComplete = value => { result = value; };
  for (let i = 0; i < 60 * 120 && game.running; i++) {
    game.update(1 / 60); input.endFrame();
  }
  assert.notEqual(result?.flags.steamerBoarded, true);
  assert.notEqual(result?.result, 'perfect');
  assert.equal(game.phase, 'practice');
  assert.equal(game.timer, 75);
  assert.equal(game.hull, 100);
  assert.equal(game.distance, 0);
  game.destroy();
});

// Test pilot uses the same pointer/keyboard/touch inputs as the player; no position,
// health, weather or completion-state edits. This is logic coverage, not human QA.
function sailWithInputs({ game, input }, { fps = 60, sails = 'respond', signal = true, keyboard = false } = {}) {
  let result;
  game.onComplete = value => { result = value; };
  for (let frame = 0; frame < fps * 110 && game.running; frame++) {
    input.reset();
    const targetX = game.courseX();
    if (keyboard) input.input.axis.x = Math.abs(targetX - game.boat.x) > 15 ? Math.sign(targetX - game.boat.x) : 0;
    else Object.assign(input.input.pointer, { x: targetX, y: 500, justDown: true });
    if (game.phase === 'practice') {
      if (game.lesson === 1) input.input.buttons.justA = true;
    } else if (game.phase === 'sailing') {
      const weather = game.weather();
      const desired = sails === 'reef' || (sails === 'respond' && (weather.warning || weather.storm));
      if (game.reefed !== desired) input.input.buttons.justA = true;
    } else if (game.phase === 'signal' && signal) {
      input.input.buttons.justB = true;
    }
    game.update(1 / fps);
    if (frame % fps === 0) game.render(context);
    input.endFrame();
  }
  return result;
}

test('South China Sea: ordinary steering, reefing and signal inputs finish at 30/60/120 fps', () => {
  const scores = [];
  for (const fps of [30, 60, 120]) {
    const setup = createGame('typhoonSailing');
    const before = JSON.stringify(gameState.get());
    const result = sailWithInputs(setup, { fps, keyboard: fps === 60 });
    assert.equal(result?.result, 'perfect', JSON.stringify({ fps, result, phase: setup.game.phase }));
    assert.equal(result?.flags.shanghaiSignalSent, true);
    assert.equal(result?.hull, 100);
    assert.equal(result?.daysDelta, -0.5);
    assert.equal(JSON.stringify(gameState.get()), before);
    scores.push(result.score);
    setup.game.destroy();
  }
  assert.ok(Math.max(...scores) - Math.min(...scores) < 30, 'frame rate must not materially alter scoring');
});

test('South China Sea: all weather changes run against the actual music API', async () => {
  const { DynamicMusicEngine } = await import('../src/engine/dynamicAudio.js');
  const setup = createGame('typhoonSailing');
  // The permissive audio double used by older games used to invent setIntensity,
  // masking a browser-only error on the first weather warning.
  setup.game.sound.music = Object.create(DynamicMusicEngine.prototype);
  const result = sailWithInputs(setup);
  assert.equal(result.reached, true);
  setup.game.destroy();
});

test('South China Sea: full sails are damaged; permanent reefing misses the deadline; no signal cannot win', () => {
  for (const [sails, signal, reason] of [['full', true, 'hull'], ['reef', true, 'time'], ['respond', false, 'signal']]) {
    const setup = createGame('typhoonSailing');
    const result = sailWithInputs(setup, { sails, signal });
    assert.equal(result?.reason, reason);
    assert.equal(result?.reached, false);
    assert.equal(result?.result, 'pass');
    assert.equal(result?.daysDelta, 1);
    assert.deepEqual(result?.flags, { typhoonConquered: false, steamerBoarded: false, shanghaiSignalSent: false });
    setup.game.destroy();
  }
});

test('South China Sea: tap-only sail toggle, early signal and pause are safe', () => {
  const { game, input } = createGame('typhoonSailing');
  input.input.pointer = { x: 880, y: 500, justDown: true };
  for (let i = 0; i < 120; i++) { game.update(1 / 60); input.endFrame(); }
  assert.equal(game.lesson, 1);
  const tap = { code: 'Space', repeat: false, preventDefault() {} };
  window.dispatch('keydown', tap); window.dispatch('keyup', tap);
  game.update(1 / 60); input.endFrame();
  assert.equal(game.phase, 'sailing'); assert.equal(game.reefed, true);
  for (let i = 0; i < 10; i++) { game.update(1 / 60); input.endFrame(); }
  assert.equal(game.reefed, true, 'one press must not toggle every frame');
  const before = JSON.stringify({ timer: game.timer, hull: game.hull, distance: game.distance, reefed: game.reefed });
  game.pause(); input.input.buttons.justA = true; input.input.justKeys.KeyQ = true;
  for (let i = 0; i < 120; i++) game.update(1 / 60);
  assert.equal(JSON.stringify({ timer: game.timer, hull: game.hull, distance: game.distance, reefed: game.reefed }), before);
  input.reset(); game.resume(); input.input.justKeys.KeyQ = true;
  game.update(1 / 60); input.endFrame();
  assert.equal(game.signalSent, false);
  assert.equal(game.phase, 'sailing');
  assert.match(game.notice, /上海外海/);
  game.destroy();
});

test('South China Sea: a signal needs the visible rendezvous zone; its ending pauses and settles once', () => {
  const setup = createGame('typhoonSailing');
  const { game, input } = setup;
  // Drive until the real approach, then take over manually.
  for (let frame = 0; frame < 6000 && game.phase !== 'signal'; frame++) {
    input.reset();
    Object.assign(input.input.pointer, { x: game.courseX(), y: 500, justDown: true });
    if (game.phase === 'practice' && game.lesson === 1) input.input.buttons.justA = true;
    if (game.phase === 'sailing') {
      const desired = game.weather().warning || game.weather().storm;
      if (game.reefed !== desired) input.input.buttons.justA = true;
    }
    game.update(1 / 60); input.endFrame();
  }
  assert.equal(game.phase, 'signal');
  input.input.pointer = { x: 1100, y: 500, justDown: true };
  for (let i = 0; i < 120; i++) { game.update(1 / 60); input.endFrame(); }
  input.input.justKeys.KeyQ = true; game.update(1 / 60); input.endFrame();
  assert.equal(game.signalSent, false);
  const results = [];
  game.onComplete = result => results.push(result);
  input.input.pointer = { x: 640, y: 500, justDown: true };
  for (let i = 0; i < 120; i++) { game.update(1 / 60); input.endFrame(); }
  input.input.justKeys.KeyQ = true; game.update(1 / 60); input.endFrame();
  assert.equal(game.signalSent, true); assert.equal(results.length, 0);
  game.pause();
  for (let i = 0; i < 240; i++) game.update(1 / 60);
  assert.equal(results.length, 0);
  game.resume();
  for (let i = 0; i < 240; i++) game.update(1 / 60);
  assert.equal(results.length, 1); assert.equal(results[0].reached, true);
  game.destroy();
});

test('South China Sea: retry and fallback preview exactly one bill; neither rewinds earlier chapters', async () => {
  const { runLeg5 } = await import('../src/levels/leg5.js');
  const { dialogue } = await import('../src/shell/dialogue.js');
  const { decisionModal } = await import('../src/shell/decisionModal.js');
  const { resultCard } = await import('../src/shell/resultCard.js');
  dialogue.playSequence = async () => {};
  for (const fallback of [true, false]) {
    gameState.reset(); gameState.setLeg('leg5'); gameState.addElapsedDays(29);
    const before = JSON.stringify(gameState.get());
    let attempts = 0, bills = 0, preview;
    decisionModal.show = async ({ options }) => options.find(o => o.id === (fallback ? 'shelter' : 'retry'));
    resultCard.show = async record => {
      assert.equal(JSON.stringify(gameState.get()), before, 'all attempts and previews must be free');
      preview = previewLeg(record); bills++;
      return bills === 1 ? 'retry' : 'next';
    };
    await runLeg5({ hud: { show() {}, setLocation() {} }, gameRunner: { runMiniGame: async name => {
      assert.equal(name, 'typhoonSailing'); attempts++;
      const reached = !fallback && attempts % 2 === 0;
      return { reached, result: reached ? 'perfect' : 'pass', daysDelta: reached ? -0.5 : 1,
        flags: { shanghaiSignalSent: reached }, score: 10, comment: '航行实绩' };
    } } });
    assert.equal(attempts, fallback ? 2 : 4);
    assert.equal(gameState.get().money.gbp, 19500);
    assert.equal(gameState.get().time.elapsed, fallback ? 36 : 34.5);
    assert.equal(gameState.get().money.gbp, preview.remainingGBP);
    assert.equal(gameState.get().time.elapsed, preview.elapsedAfter);
    assert.equal(gameState.getFlag('steamerBoarded'), !fallback);
    assert.equal(gameState.getFlag('southChinaSeaFallback'), fallback);
    assert.equal(StorageManager.load().currentLeg, 'leg6');
  }
});

test('South China Sea: new-rule scores do not erase or compete against the legacy shooter record', async () => {
  const { ArcadeManager } = await import('../src/shell/arcade.js');
  const arcade = Object.create(ArcadeManager.prototype);
  arcade.highScores = { typhoonSailing: 12320, parkour: 500 };
  arcade.cards = [];
  assert.equal(arcade.getHighScore('typhoonSailing'), 0);
  arcade.saveHighScore('typhoonSailing', 3300);
  assert.equal(arcade.getHighScore('typhoonSailing'), 3300);
  assert.equal(arcade.highScores.typhoonSailing, 12320);
  assert.equal(arcade.getHighScore('parkour'), 500);
  arcade.saveHighScore('typhoonSailing', 1000);
  assert.equal(arcade.getHighScore('typhoonSailing'), 3300);
});

test('Circus: idle never counts as a successful performance or a reunion', { timeout: 3500 }, async () => {
  const before = JSON.stringify(gameState.get());
  const { game, input } = createGame('circusAcrobat');
  const completion = new Promise(resolve => { game.onComplete = resolve; });
  for (let i = 0; i < 60 * 45 && game.running; i++) {
    game.update(1 / 60); input.endFrame();
  }
  const result = await completion;
  assert.equal(result.result, 'miss');
  assert.equal(result.reunited, false);
  assert.equal(result.flags.circusReunited, false);
  assert.equal(result.flags.passedYokohamaCircus, false);
  assert.equal(JSON.stringify(gameState.get()), before);
  game.destroy();
});

test('Circus: holding an action cannot auto-pose or carry a leap into the next act', () => {
  const { game, input } = createGame('circusAcrobat');
  let result;
  game.onComplete = value => { result = value; };
  input.input.keys.Space = input.input.buttons.A = true;
  input.input.buttons.justA = true;
  for (let i = 0; i < 60 * 43 && game.running; i++) {
    game.update(1 / 60); input.endFrame();
  }
  assert.equal(game.poseSuccessCount, 0);
  assert.equal(result.reunited, false);
  assert.equal(result.result, 'miss');
  game.destroy();
});

test('Circus: ordinary inputs can perform and reunite at 30/60/120 fps', () => {
  const originalRandom = Math.random;
  try {
    for (const fps of [30, 60, 120]) {
      let seed = 481;
      Math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
      const before = JSON.stringify(gameState.get());
      const { game, input } = createGame('circusAcrobat');
      let result;
      game.onComplete = value => { result = value; };
      for (let i = 0; i < fps * 45 && game.running; i++) {
        input.reset();
        if (game.act === 1) {
          const prop = game.props.filter(p => p.alive && p.type !== 'banana' && p.type !== 'firecracker' && p.y < 550)
            .sort((a, b) => b.y - a.y)[0];
          if (prop) input.input.pointer = { x: prop.x, y: 550, down: true };
        } else if (game.act === 2) {
          input.input.axis.x = Math.abs(game.balance) > 15 ? -Math.sign(game.balance) : 0;
          if (game.player.poseTimer <= 0 && Math.abs(game.balance) < 55) input.input.buttons.justA = true;
        } else if (game.act === 3 && !game.pyramidCollapsed) {
          input.input.buttons.justA = true;
        }
        game.update(1 / fps); input.endFrame();
      }
      assert.equal(result?.reunited, true, `${fps} fps must complete with normal inputs`);
      assert.equal(result.result, 'perfect', JSON.stringify({ fps, caught: game.caughtProps, poses: game.poseSuccessCount }));
      assert.equal(result.flags.passedYokohamaCircus, true);
      assert.equal(result.daysDelta, -0.5);
      assert.equal(JSON.stringify(gameState.get()), before);
      game.destroy();
    }
  } finally { Math.random = originalRandom; }
});

test('Circus: a last-moment tap may land safely; pause freezes the ending and it settles once', () => {
  const { game, input } = createGame('circusAcrobat');
  for (let i = 0; i < 60 * 29; i++) { game.update(1 / 60); input.endFrame(); }
  assert.equal(game.act, 3);
  game.timer = 0.025;
  const results = [];
  game.onComplete = value => results.push(value);
  const event = { code: 'Space', repeat: false, preventDefault() {} };
  window.dispatch('keydown', event); window.dispatch('keyup', event);
  game.update(1 / 60); input.endFrame();
  assert.equal(game.pyramidCollapsed, true);
  for (let i = 0; i < 58; i++) { game.update(1 / 60); input.endFrame(); }
  assert.equal(game.act, 4);
  assert.equal(results.length, 0);
  const remaining = game.endTimer;
  game.pause();
  for (let i = 0; i < 200; i++) game.update(1 / 60);
  assert.equal(game.endTimer, remaining);
  assert.equal(results.length, 0);
  game.resume();
  for (let i = 0; i < 200; i++) game.update(1 / 60);
  game.finishGame();
  assert.equal(results.length, 1);
  assert.equal(results[0].reunited, true);
  assert.equal(results[0].result, 'good', 'reunion alone is not a perfect performance');
  assert.equal(results[0].flags.passedYokohamaCircus, false);
  game.destroy();
});

test('Circus: phase guidance stays beside the controls without toasts covering the balance meter', () => {
  const { game, input } = createGame('circusAcrobat');
  const toasts = [], labels = [];
  game.fx = Object.assign(Object.create(stubFX), { toast(text) { toasts.push(text); } });
  const probe = Object.assign(Object.create(context), { fillText(text) { labels.push(text); } });
  for (let i = 0; i < 20 * 20; i++) { game.update(0.05); input.endFrame(); }
  assert.equal(game.act, 2);
  game.drawCircusHUD(probe);
  assert.equal(toasts.length, 0, 'transition/repeating toasts must not hide the balance meter');
  assert.ok(labels.some(text => /绿区/.test(text)), 'green-zone guidance remains on screen');
  for (let i = 0; i < 20 * 9; i++) { game.update(0.05); input.endFrame(); }
  assert.equal(game.act, 3);
  labels.length = 0;
  game.drawCircusHUD(probe);
  assert.ok(labels.some(text => /向福克飞扑/.test(text)));
  assert.equal(toasts.length, 0);
  game.destroy();
});

test('Yokohama: retries stay free; backstage recovery reunites without faking the performance', async () => {
  const { runLeg6 } = await import('../src/levels/leg6.js');
  const { dialogue } = await import('../src/shell/dialogue.js');
  const { decisionModal } = await import('../src/shell/decisionModal.js');
  const { resultCard } = await import('../src/shell/resultCard.js');
  const { ArcadeManager } = await import('../src/shell/arcade.js');
  dialogue.playSequence = async () => {};
  for (const backstage of [true, false]) {
    gameState.reset(); gameState.setLeg('leg6'); gameState.addElapsedDays(35);
    const before = JSON.stringify(gameState.get());
    let attempts = 0, bills = 0, preview;
    decisionModal.show = async ({ options }) => options.find(o => o.id === (backstage ? 'backstage' : 'retry'));
    resultCard.show = async record => {
      assert.equal(JSON.stringify(gameState.get()), before);
      preview = previewLeg(record); bills++;
      return bills === 1 ? 'retry' : 'next';
    };
    assert.equal(await runLeg6({ hud: { show() {}, setLocation() {} }, gameRunner: { runMiniGame: async name => {
      assert.equal(name, 'circusAcrobat'); attempts++;
      const reunited = !backstage && attempts % 2 === 0;
      return { reunited, result: reunited ? 'perfect' : 'miss', daysDelta: reunited ? -0.5 : 0.5,
        flags: { circusReunited: reunited, passedYokohamaCircus: reunited }, score: 100, comment: '演出实绩' };
    } } }), 'leg7');
    assert.equal(attempts, backstage ? 2 : 4);
    assert.equal(gameState.get().money.gbp, 20000);
    assert.equal(gameState.get().time.elapsed, backstage ? 36.5 : 35.5);
    assert.equal(gameState.get().time.elapsed, preview.elapsedAfter);
    assert.equal(gameState.getFlag('passepartoutReunited'), true);
    assert.equal(gameState.getFlag('circusReunited'), !backstage);
    assert.equal(gameState.getFlag('passedYokohamaCircus'), !backstage);
    assert.equal(gameState.getFlag('circusBackstageSearch'), backstage);
    assert.equal(StorageManager.load().currentLeg, 'leg7');
  }
  const arcade = Object.create(ArcadeManager.prototype);
  arcade.highScores = { circusAcrobat: 19900, typhoonSailing_v87: 3366 }; arcade.cards = [];
  arcade.saveHighScore('circusAcrobat', 3600);
  assert.equal(arcade.highScores.circusAcrobat, 19900);
  assert.equal(arcade.getHighScore('circusAcrobat'), 3600);
  assert.equal(arcade.getHighScore('typhoonSailing'), 3366);
});

test('Train and sledge: failed challenges never set successful crossing flags', { timeout: 3500 }, async () => {
  for (const name of ['trainDefense', 'iceSledge']) {
    const { game, input } = createGame(name);
    const completion = new Promise(resolve => { game.onComplete = resolve; });
    if (name === 'trainDefense') game.trainHealth = 0;
    else { game.timer = 0.001; game.player.distance = 200; }
    for (let i = 0; i < 120 && game.running; i++) { game.update(1 / 60); input.endFrame(); }
    const result = await completion;
    assert.equal(result.flags[name === 'trainDefense' ? 'trainBridgeCleared' : 'iceSledgeWon'], false);
    assert.equal(result.reached, false);
    assert.equal(result.result, 'miss');
    assert.equal(result.daysDelta, 1);
    assert.ok(result.score >= 0);
    game.destroy();
  }
});

test('Train: a quick click aims before firing; focus toggles once; pause blocks gun and reload', () => {
  const { game, input } = createGame('trainDefense');
  game.spawnTimer = Infinity;
  game.enemies = [{ type: 'bandit_rider', x: 420, y: 260, vx: 0, health: 1, alive: true, shootCooldown: 2 }];
  input.input.pointer = { x: 420, y: 260, down: false, justDown: true };
  input.input.justKeys.KeyE = true; input.input.keys.KeyE = true;
  game.update(1 / 60); input.endFrame();
  assert.equal(game.enemies.length, 0);
  assert.equal(game.revolver.ammo, 5);
  assert.equal(game.bulletTime.active, true);
  game.update(1 / 60); input.endFrame();
  assert.equal(game.bulletTime.active, true);
  game.pause();
  game.fireRevolver(); game.startReload(); game.update(1);
  assert.equal(game.revolver.ammo, 5);
  assert.equal(game.revolver.isReloading, false);
  game.resume();
  input.input.justKeys.KeyR = true;
  game.update(1 / 60); input.endFrame();
  assert.equal(game.revolver.isReloading, true);
  game.destroy();
});

test('Sledge: idle misses the connection; steering, sail and drift can arrive at 30/60/120 fps', () => {
  for (const fps of [30, 60, 120]) {
    for (const drive of [false, true]) {
      const before = JSON.stringify(gameState.get());
      const { game, input } = createGame('iceSledge');
      let result;
      game.onComplete = value => { result = value; };
      for (let i = 0; i < fps * 40 && game.running; i++) {
        input.reset();
        if (drive) {
          const curve = game.getCurvatureAt(game.player.distance);
          input.input.buttons.A = true;
          input.input.buttons.B = Math.abs(curve) > 0.2;
          const correction = curve * 0.75 - game.player.x * 2;
          input.input.axis.x = Math.abs(correction) > 0.06 ? Math.sign(correction) : 0;
        }
        game.update(1 / fps); input.endFrame();
      }
      assert.equal(result?.reached, drive, JSON.stringify({ fps, drive, distance: game.player.distance, rank: result?.rank }));
      assert.equal(result.flags.iceSledgeWon, drive);
      assert.equal(result.flags.rank1st, drive && game.rankPosition === 1);
      assert.equal(JSON.stringify(gameState.get()), before);
      game.destroy();
    }
  }
  // 此控制器每帧按实时偏移纠偏，道具命中可略有不同；纯里程与超车得分另测。
});

test('Sledge: track props meet the sled at the collision plane', async () => {
  const { SpriteEngine } = await import('../src/engine/sprites.js');
  const { game } = createGame('iceSledge');
  const original = SpriteEngine.drawSnowLog;
  let rendered;
  game.player.x = 0.5;
  game.player.distance = 199;
  game.rivals = [];
  game.trackProps = [{ distance: 200, x: 0.5, type: 'pine' }];
  SpriteEngine.drawSnowLog = (_ctx, x, y, size) => { rendered = { x, y, size }; };
  try {
    game.render(context);
    const sled = { x: 640 + game.player.x * 380, y: 560 - game.player.airY };
    assert.ok(rendered, 'nearby obstacle should be rendered');
    assert.ok(Math.abs(rendered.x - sled.x) < 3, JSON.stringify({ rendered, sled }));
    assert.ok(Math.abs(rendered.y - sled.y) < 3, JSON.stringify({ rendered, sled }));
  } finally {
    SpriteEngine.drawSnowLog = original;
    game.destroy();
  }
});

test('Sledge: a rival in the same lane meets the sled on a curved track', async () => {
  const { SpriteEngine } = await import('../src/engine/sprites.js');
  const { game } = createGame('iceSledge');
  const original = SpriteEngine.drawIceSledge;
  const positions = [];
  const probe = Object.assign(Object.create(context), {
    translate(x, y) { this.origin = { x, y }; }
  });
  game.player.distance = 450;
  game.player.x = 0.35;
  game.rivals = [{ name: '检查用雪橇', x: 0.35, distance: 450.1, speed: 50, color: '#e53935' }];
  game.trackProps = [];
  SpriteEngine.drawIceSledge = ctx => { positions.push({ ...ctx.origin }); };
  try {
    game.render(probe);
    assert.equal(positions.length, 2, 'rival and player sled should both render');
    const [rival, player] = positions;
    assert.ok(Math.abs(rival.x - player.x) < 3, JSON.stringify({ rival, player }));
    assert.ok(Math.abs(rival.y - player.y) < 3, JSON.stringify({ rival, player }));
  } finally {
    SpriteEngine.drawIceSledge = original;
    game.destroy();
  }
});

test('Sledge: each rival awards one overtake bonus and progress points do not depend on frame rate', () => {
  for (const fps of [30, 60, 120]) {
    const { game, input } = createGame('iceSledge');
    game.player.distance = 100;
    game.trackProps = [];
    game.rivals = [{ name: '检查用雪橇', x: 0, distance: 99, speed: 0, overtaken: false }];
    for (let i = 0; i < fps; i++) { game.update(1 / fps); input.endFrame(); }
    assert.ok(Math.abs(game.score - 480) < 0.01, `${fps} fps: ${game.score}`);
    assert.equal(game.rivals[0].overtaken, true);
    game.destroy();
  }
});

test('Train: ordinary aiming and automatic reload can defend the complete run at 30/60/120 fps', () => {
  const originalRandom = Math.random;
  try {
    for (const fps of [30, 60, 120]) {
      let seed = 923;
      Math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
      const before = JSON.stringify(gameState.get());
      const { game, input } = createGame('trainDefense');
      let result;
      game.onComplete = value => { result = value; };
      for (let i = 0; i < fps * 50 && game.running; i++) {
        input.reset();
        const target = game.enemies.filter(e => e.alive && e.x > 100 && e.x < 1180 && e.y > 170 && e.y < 510)
          .sort((a, b) => (b.type !== 'bandit_rider') - (a.type !== 'bandit_rider') || b.y - a.y)[0];
        if (target) input.input.pointer = { x: target.x, y: target.y, justDown: true };
        game.update(1 / fps); input.endFrame();
      }
      assert.equal(result?.reached, true, `${fps} fps: ${JSON.stringify(result)}`);
      assert.equal(result.flags.trainBridgeCleared, true);
      assert.equal(JSON.stringify(gameState.get()), before);
      game.destroy();
    }
  } finally { Math.random = originalRandom; }
});

test('America: only the requested segment retries; both time results are billed once', async () => {
  const { runLeg8 } = await import('../src/levels/leg8.js');
  const { dialogue } = await import('../src/shell/dialogue.js');
  const { decisionModal } = await import('../src/shell/decisionModal.js');
  const { resultCard } = await import('../src/shell/resultCard.js');
  dialogue.playSequence = async () => {};
  for (const trainReached of [true, false]) {
    for (const sledgeReached of [true, false]) {
      gameState.reset(); gameState.setLeg('leg8'); gameState.addElapsedDays(58);
      const before = JSON.stringify(gameState.get());
      const calls = []; let trainChoices = 0, bills = 0, preview;
      decisionModal.show = async ({ options }) => {
        assert.equal(JSON.stringify(gameState.get()), before);
        trainChoices++;
        return options.find(o => o.id === (trainChoices === 1 ? 'retry' : 'keep'));
      };
      resultCard.show = async record => {
        assert.equal(JSON.stringify(gameState.get()), before);
        preview = previewLeg(record); bills++;
        assert.equal(record.daysDelta, (trainReached ? -0.5 : 1) + (sledgeReached ? -0.5 : 1));
        return bills === 1 ? 'retry' : 'next';
      };
      assert.equal(await runLeg8({ hud: { show() {}, setLocation() {} }, gameRunner: { runMiniGame: async name => {
        calls.push(name);
        const reached = name === 'trainDefense' ? trainReached : sledgeReached;
        return { reached, result: reached ? 'perfect' : 'miss', daysDelta: reached ? -0.5 : 1, score: 10,
          flags: { trainBridgeCleared: reached, iceSledgeWon: reached }, comment: `${name} 实绩` };
      } } }), 'leg9');
      assert.deepEqual(calls, ['trainDefense', 'trainDefense', 'iceSledge', 'iceSledge']);
      assert.equal(gameState.get().money.gbp, 19000);
      assert.equal(gameState.get().time.elapsed, preview.elapsedAfter);
      assert.equal(gameState.get().legResults.leg8.daysSpent, 7 + (trainReached ? -0.5 : 1) + (sledgeReached ? -0.5 : 1));
      assert.equal(gameState.getFlag('trainBridgeCleared'), trainReached);
      assert.equal(gameState.getFlag('iceSledgeWon'), sledgeReached);
      assert.equal(gameState.getFlag('trainRepairTransfer'), !trainReached);
      assert.equal(gameState.getFlag('sledgeRecoveryTransfer'), !sledgeReached);
      const committed = JSON.stringify(gameState.get());
      resolveLeg('leg8', { baseDays: 7, moneyDelta: -1000 });
      assert.equal(JSON.stringify(gameState.get()), committed);
      assert.equal(StorageManager.load().currentLeg, 'leg9');
    }
  }
});

test('San Francisco: timeout preserves the opponent health rather than manufacturing a knockout', () => {
  const { game, input } = createGame('sanFranciscoBrawl');
  game.gameState = 'fight'; game.timer = 0.001;
  game.playerParticipated = true;
  game.p2.action = 'guard'; game.p2.aiTimer = game.p2.attackCooldown = 100;
  game.update(1 / 60); input.endFrame();
  assert.equal(game.p2.health, 1000);
  assert.equal(game.p1.health, 100);
  assert.equal(game.outcome, 'escape');
  game.destroy();
});

test('San Francisco: doing nothing never counts as guarding the escape', () => {
  const originalRandom = Math.random;
  try {
    for (let seed = 1; seed <= 8; seed++) {
      let state = seed;
      Math.random = () => ((state = (1664525 * state + 1013904223) >>> 0) / 4294967296);
      const { game, input } = createGame('sanFranciscoBrawl');
      let result;
      game.onComplete = value => { result = value; };
      for (let i = 0; i < 60 * 110 && game.running; i++) { game.update(1 / 60); input.endFrame(); }
      assert.equal(result?.outcome, 'defeat', JSON.stringify({ seed, result, health: game.p1.health }));
      assert.ok(game.p1.health <= 0, `boss must reach and defeat an idle fighter, seed ${seed}: ${game.p1.health}`);
      game.destroy();
    }
  } finally { Math.random = originalRandom; }
});

test('Atlantic: idle cannot cross at base speed or claim a completed voyage', { timeout: 2500 }, async () => {
  const { game, input, audio } = createGame('atlanticBurning');
  const completion = new Promise(resolve => { game.onComplete = resolve; });
  for (let i = 0; i < 60 * 55 && game.running; i++) { audio.ctx.currentTime += 1 / 60; game.update(1 / 60); input.endFrame(); }
  const result = await completion;
  assert.equal(result.flags.atlanticCrossed, false);
  assert.equal(result.reached, false);
  assert.equal(result.result, 'miss');
  assert.equal(result.daysDelta, 1);
  game.destroy();
});

test('San Francisco: keyboard, canvas and touch-C super taps survive hit-stop', () => {
  for (const control of ['keyboard', 'canvas', 'touch-C']) {
    const { game, input } = createGame('sanFranciscoBrawl');
    game.gameState = 'fight'; game.hitStopTimer = 0.05;
    if (control === 'canvas') input.input.pointer = { x: 260, y: 660, down: false, justDown: true };
    else if (control === 'touch-C') input.input.buttons.justC = true;
    else {
      const event = { code: 'KeyQ', repeat: false, preventDefault() {} };
      window.dispatch('keydown', event); window.dispatch('keyup', event);
    }
    game.update(1 / 60); input.endFrame();
    assert.equal(game.inputBuffer.length, 1);
    for (let i = 0; i < 6; i++) { game.update(1 / 60); input.endFrame(); }
    assert.equal(game.p1.action, 'super');
    assert.ok(game.p1.exGauge < 75);
    game.destroy();
  }
});

test('San Francisco: ordinary movement, kicks and super taps can defeat the boss at 30/60/120 fps', () => {
  const originalRandom = Math.random;
  try {
    for (const fps of [30, 60, 120]) {
      let seed = 618;
      Math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
      const before = JSON.stringify(gameState.get());
      const { game, input } = createGame('sanFranciscoBrawl');
      let result;
      game.onComplete = value => { result = value; };
      let attackTimer = 0;
      for (let i = 0; i < fps * 150 && game.running; i++) {
        input.reset();
        if (game.gameState === 'fight') {
          if (Math.abs(game.p2.x - game.p1.x) > 105) input.input.axis.x = Math.sign(game.p2.x - game.p1.x);
          attackTimer -= 1 / fps;
          if (attackTimer <= 0) {
            input.input.justKeys[game.p1.exGauge >= 50 ? 'KeyQ' : 'KeyK'] = true;
            attackTimer = 0.3;
          }
        }
        game.update(1 / fps); input.endFrame();
      }
      assert.equal(result?.outcome, 'knockout', JSON.stringify({ fps, result, health: game.p1.health, boss: game.p2.health }));
      assert.equal(result.reached, true);
      assert.equal(JSON.stringify(gameState.get()), before);
      game.destroy();
    }
  } finally { Math.random = originalRandom; }
});

test('San Francisco: delayed punches and shots freeze with pause and cannot run after exit', () => {
  const originalRandom = Math.random;
  try {
    for (const shooting of [false, true]) {
      const { game, input } = createGame('sanFranciscoBrawl');
      game.gameState = 'fight'; game.p1.x = 400; game.p2.x = shooting ? 900 : 480;
      game.p2.aiTimer = 100; game.p2.attackCooldown = 0;
      Math.random = () => shooting ? 0.6 : 0.1;
      game.update(1 / 60); input.endFrame();
      assert.equal(game.pendingAttacks.length, shooting ? 3 : 1);
      const delays = game.pendingAttacks.map(attack => attack.delay);
      game.pause();
      for (let i = 0; i < 90; i++) game.update(1 / 60);
      assert.deepEqual(game.pendingAttacks.map(attack => attack.delay), delays);
      assert.equal(game.p1.health, 100);
      assert.equal(game.projectiles.length, 0);
      game.resume();
      for (let i = 0; i < 8; i++) { game.update(1 / 60); input.endFrame(); }
      if (shooting) assert.equal(game.projectiles.length, 2);
      else assert.equal(game.p1.health, 76);
      game.destroy();
      const state = JSON.stringify({ health: game.p1.health, projectiles: game.projectiles, delays: game.pendingAttacks });
      for (let i = 0; i < 90; i++) game.update(1 / 60);
      assert.equal(JSON.stringify({ health: game.p1.health, projectiles: game.projectiles, delays: game.pendingAttacks }), state);
    }
  } finally { Math.random = originalRandom; }
});

test('San Francisco: knockout, escape and defeat have distinct pause-safe endings and settle once', () => {
  for (const outcome of ['knockout', 'escape', 'defeat']) {
    const before = JSON.stringify(gameState.get());
    const { game, input } = createGame('sanFranciscoBrawl');
    const results = [];
    game.onComplete = value => results.push(value);
    game.gameState = 'fight';
    if (outcome === 'escape') {
      game.timer = 0.001; game.playerParticipated = true; game.p2.aiTimer = game.p2.attackCooldown = 100;
      game.update(1 / 60); input.endFrame();
    } else game.triggerKO(outcome === 'knockout' ? 'p1' : 'p2');
    game.pause();
    for (let i = 0; i < 60; i++) game.update(1 / 60);
    assert.equal(game.koTimer, 0);
    assert.equal(results.length, 0);
    game.resume();
    for (let i = 0; i < 60 * 7 && game.running; i++) { game.update(1 / 60); input.endFrame(); }
    game.finishGame();
    assert.equal(results.length, 1);
    assert.equal(results[0].outcome, outcome);
    assert.equal(results[0].flags.sfBrawlWon, outcome === 'knockout');
    assert.equal(results[0].flags.sfEscaped, outcome === 'escape');
    assert.equal(results[0].result, outcome === 'knockout' ? 'perfect' : outcome === 'escape' ? 'good' : 'miss');
    assert.equal(results[0].daysDelta, outcome === 'knockout' ? -0.5 : outcome === 'escape' ? 0 : 0.5);
    if (outcome !== 'knockout') assert.equal(game.p2.health, 1000);
    assert.equal(JSON.stringify(gameState.get()), before);
    game.destroy();
  }
});

test('Atlantic: quick taps hit each lane once; held keys and paused input cannot farm notes', () => {
  const { game, input, audio } = createGame('atlanticBurning');
  for (let lane = 0; lane < 4; lane++) {
    audio.ctx.currentTime = game.songStartedAt + 3 + lane * 0.375;
    game.notes = [0, 1].map(id => ({ id, lane, time: 3 + lane * 0.375, hit: false, missed: false }));
    const event = { code: `Digit${lane + 1}`, repeat: false, preventDefault() {} };
    window.dispatch('keydown', event); window.dispatch('keyup', event);
    game.update(1 / 60); input.endFrame();
    assert.equal(game.notes.filter(n => n.hit).length, 1);
    input.input.keys[event.code] = true;
    audio.ctx.currentTime += 1 / 60;
    game.update(1 / 60); input.endFrame();
    assert.equal(game.notes.filter(n => n.hit).length, 1);
    input.reset();
  }
  const before = { score: game.score, distance: game.trip.distance, timer: game.trip.timer };
  game.pause(); game.checkLaneHit(3); game.finishGame(); game.update(1 / 60);
  assert.deepEqual({ score: game.score, distance: game.trip.distance, timer: game.trip.timer }, before);
  assert.equal(game.completed, false);
  game.destroy();
});

test('Atlantic: ordinary timed inputs can cross at 30/60/120 fps without changing the campaign', () => {
  for (const fps of [30, 60, 120]) {
    const before = JSON.stringify(gameState.get());
    const { game, input, audio } = createGame('atlanticBurning');
    const results = [];
    game.onComplete = value => results.push(value);
    for (let i = 0; i < fps * 55 && game.running; i++) {
      input.reset();
      audio.ctx.currentTime += 1 / fps;
      const nextTime = Math.max(0, audio.ctx.currentTime - game.songStartedAt);
      for (const note of game.notes) {
        if (!note.hit && !note.missed && Math.abs(note.time - nextTime) <= 1 / fps / 2 + 0.002) {
          input.input.justKeys[`Digit${note.lane + 1}`] = true;
        }
      }
      game.update(1 / fps); input.endFrame();
    }
    game.finishGame();
    assert.equal(results.length, 1);
    assert.equal(results[0].reached, true, JSON.stringify({ fps, distance: game.trip.distance, combo: game.maxCombo }));
    assert.equal(results[0].result, 'perfect');
    assert.equal(results[0].daysDelta, -1);
    assert.equal(results[0].flags.atlanticCrossed, true);
    assert.equal(JSON.stringify(gameState.get()), before);
    game.destroy();
  }
});

test('Atlantic: sustained full-speed points are independent of frame rate', () => {
  for (const fps of [30, 60, 120]) {
    const { game, input, audio } = createGame('atlanticBurning');
    game.combo = 20;
    audio.ctx.currentTime = game.songStartedAt;
    for (let i = 0; i < fps; i++) { audio.ctx.currentTime += 1 / fps; game.update(1 / fps); input.endFrame(); }
    assert.ok(Math.abs(game.score - 220) < 0.01, `${fps} fps: ${game.score}`);
    assert.ok(Math.abs(game.trip.distance - 114.4) < 0.01);
    game.destroy();
  }
});

test('San Francisco and Atlantic: retry previews and final ledgers agree on outcome, time and one fee', async () => {
  const { runLeg7 } = await import('../src/levels/leg7.js');
  const { runLeg9 } = await import('../src/levels/leg9.js');
  const { dialogue } = await import('../src/shell/dialogue.js');
  const { resultCard } = await import('../src/shell/resultCard.js');
  dialogue.playSequence = async () => {};
  for (const [id, name, chapter, fee, baseDays] of [
    ['leg7', 'sanFranciscoBrawl', runLeg7, -200, 21], ['leg9', 'atlanticBurning', runLeg9, -12000, 9]
  ]) {
    for (const outcome of (id === 'leg7' ? ['knockout', 'escape', 'defeat'] : ['arrival', 'defeat'])) {
      gameState.reset(); gameState.setLeg(id); gameState.addElapsedDays(25);
      const before = JSON.stringify(gameState.get());
      const reached = outcome !== 'defeat';
      const delta = id === 'leg7' ? (outcome === 'knockout' ? -0.5 : reached ? 0 : 0.5) : reached ? -1 : 1;
      let attempts = 0, record, preview;
      resultCard.show = async value => {
        assert.equal(JSON.stringify(gameState.get()), before);
        record = value; preview = previewLeg(record);
        assert.equal(record.moneyDelta, fee);
        assert.equal(record.daysDelta, delta);
        return attempts === 1 ? 'retry' : 'next';
      };
      await chapter({ hud: { show() {}, setLocation() {} }, gameRunner: { runMiniGame: async gameName => {
        assert.equal(gameName, name); attempts++;
        return { reached, outcome, result: reached ? 'good' : 'miss', score: 300, daysDelta: delta, moneyDelta: fee, comment: '本局实绩' };
      } } });
      assert.equal(attempts, 2);
      assert.equal(gameState.get().money.gbp, 20000 + fee);
      assert.equal(gameState.get().time.elapsed, 25 + baseDays + delta);
      assert.equal(gameState.get().time.elapsed, preview.elapsedAfter);
      assert.equal(gameState.get().legResults[id].comment, record.comment);
      assert.equal(gameState.get().legResults[id].title, record.title);
      assert.equal(gameState.get().legResults[id].result, record.result);
      for (const [key, value] of Object.entries(record.flags)) assert.equal(gameState.getFlag(key), value);
      assert.equal(gameState.getFlag(id === 'leg7' ? 'sfRestRecovery' : 'atlanticAssistedArrival'), !reached);
      const committed = JSON.stringify(gameState.get());
      resolveLeg(id, record);
      assert.equal(JSON.stringify(gameState.get()), committed);
      assert.equal(StorageManager.load().currentLeg, id === 'leg7' ? 'leg8' : 'leg10');
    }
  }
});

test('Rear-half score changes preserve legacy records while starting separate versioned bests', async () => {
  const { ArcadeManager } = await import('../src/shell/arcade.js');
  const arcade = Object.create(ArcadeManager.prototype);
  const games = ['circusAcrobat', 'sanFranciscoBrawl', 'trainDefense', 'iceSledge', 'atlanticBurning'];
  arcade.highScores = Object.fromEntries(games.map(name => [name, 99999])); arcade.cards = [];
  arcade.highScores.atlanticBurning_v88 = 88000;
  for (const name of games) {
    assert.equal(arcade.getHighScore(name), 0);
    arcade.saveHighScore(name, 4500);
    assert.equal(arcade.highScores[name], 99999);
    assert.equal(arcade.getHighScore(name), 4500);
  }
  assert.equal(arcade.highScores.atlanticBurning_v88, 88000);
  assert.equal(arcade.highScores.atlanticBurning_v89, 4500);
});

test('Atlantic sync: every hit time lies on the same 160 BPM half-beat grid as the music', () => {
  const { game } = createGame('atlanticBurning');
  assert.ok(game.notes.length > 100, 'the complete timed chart must exist before play');
  assert.equal(game.beatInterval, 0.375);
  assert.equal(game.notes[0].time, 3);
  for (const note of game.notes) {
    assert.equal(note.time / (game.beatInterval / 2) % 1, 0, `off-grid note ${note.id}`);
    assert.ok(note.time < game.trip.maxTimer);
  }
  game.destroy();
});

test('Atlantic sync: audio time, not frame delta, controls notes and the voyage timer', () => {
  const { game, input, audio } = createGame('atlanticBurning');
  audio.ctx.currentTime = (game.songStartedAt || 0) + 2.25;
  game.update(0.001); input.endFrame();
  assert.equal(game.animTime, 2.25);
  assert.equal(game.trip.timer, 47.75);
  const note = game.notes[0];
  assert.equal(note.x, game.highway.hitTargetX + (note.time - 2.25) * game.highway.scrollSpeed);
  game.destroy();
});

test('Atlantic sync: visible targets, lane labels and pulses match the actual hit coordinates and beat', async () => {
  const { SpriteEngine } = await import('../src/engine/sprites.js');
  const { game, audio } = createGame('atlanticBurning');
  const original = SpriteEngine.drawRhythmHighway;
  const targets = [], labels = [], pulses = [];
  // Record the real rail renderer's translated geometry, not a screenshot or layout verdict.
  const probe = Object.assign(Object.create(context), {
    translate(x, y) { this.origin = { x, y }; },
    arc(x, y, radius) {
      if (radius === 26) targets.push({ x: x + this.origin.x, y: y + this.origin.y });
      if (radius === 21) pulses.push(this.lineWidth);
    },
    fillText(label) { labels.push(label); }
  });
  SpriteEngine.drawRhythmHighway = (_ctx, ...args) => original.call(SpriteEngine, probe, ...args);
  try {
    audio.ctx.currentTime = game.songStartedAt + game.leadIn;
    game.update(); game.render(context);
    assert.equal(targets.length, 4);
    for (let lane = 0; lane < 4; lane++) {
      assert.deepEqual(targets[lane], { x: game.highway.hitTargetX, y: game.getLaneY(lane) });
    }
    assert.equal(game.notes[0].x, targets[0].x);
    assert.deepEqual(labels, ['1', '2', '3', '4']);
    assert.ok(pulses.every(width => Math.abs(width - 2.5) < 1e-8));
    game.checkLaneHit(0);
    assert.match(game.judgements.at(-1).rating, /PERFECT/);
    pulses.length = 0;
    audio.ctx.currentTime += game.beatInterval / 2;
    game.update(); game.render(context);
    assert.ok(pulses.every(width => Math.abs(width - 1.5) < 1e-8));
    const lanes = [];
    game.checkLaneHit = lane => lanes.push(lane);
    const laneHeight = (game.highway.height - 20) / 4;
    for (let lane = 0; lane < 4; lane++) {
      for (const inset of [1, laneHeight - 1]) {
        Object.assign(game.input.input.pointer, { justDown: true, x: game.highway.hitTargetX,
          y: game.highway.y + 10 + lane * laneHeight + inset });
        game.update();
      }
    }
    assert.deepEqual(lanes, [0, 0, 1, 1, 2, 2, 3, 3]);
  } finally {
    SpriteEngine.drawRhythmHighway = original;
    game.destroy();
  }
});

// Native-node double records scheduling/cancellation, not audible output quality.
async function createAtlanticAudioCheck() {
  const { DynamicMusicEngine } = await import('../src/engine/dynamicAudio.js');
  const setup = createGame('atlanticBurning');
  const sources = [];
  const param = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
  const node = () => ({ gain: param(), frequency: param(), Q: param(), connect() {}, disconnect() { this.disconnected = true; } });
  const makeSource = () => {
    const source = Object.assign(node(), { stops: [], start(at) { this.at = at; }, stop(at) {
      this.stops.push(at); this.endAt = at ?? setup.audio.ctx.currentTime;
    } });
    sources.push(source);
    return source;
  };
  Object.assign(setup.audio, { enabled: true, paused: false, ctx: {
    currentTime: 0, sampleRate: 8000, destination: {}, createGain: node, createBiquadFilter: node,
    createOscillator: makeSource, createBufferSource: makeSource,
    createBuffer: (_channels, size) => ({ getChannelData: () => new Float32Array(size) })
  } });
  const music = setup.audio.music = new DynamicMusicEngine(setup.audio);
  setup.game.init(); setup.game.start();
  return { ...setup, music, sources, advance(time) {
    setup.audio.ctx.currentTime = time;
    for (const source of sources) {
      const endAt = source.endAt ?? (source.at + (source.buffer ? source.buffer.getChannelData(0).length / 8000 : 1));
      if (!source.ended && endAt <= time) { source.ended = true; source.onended?.(); }
    }
    setup.game.update(); setup.input.endFrame();
  } };
}

test('Atlantic sync: the real music API schedules every onset on the chart clock without an interval', async () => {
  for (const fps of [30, 60, 120]) {
    const { game, music, sources, advance } = await createAtlanticAudioCheck();
    assert.equal(music.loopTimer, null);
    assert.equal(music.manual, true);
    assert.ok(sources.length > 0);
    assert.equal(sources[0].at, game.songStartedAt);
    for (let i = 1; i <= fps * 6; i++) advance(i / fps);
    const onsets = [...new Set(sources.map(s => s.at))];
    for (const at of onsets) {
      const step = (at - game.songStartedAt) / (game.beatInterval / 2);
      assert.ok(Math.abs(step - Math.round(step)) < 1e-8, `${fps} fps onset ${at}`);
    }
    for (const note of game.notes.filter(n => n.time <= game.animTime + game.scheduleAhead)) {
      assert.ok(onsets.some(at => Math.abs(at - game.songStartedAt - note.time) < 1e-8));
    }
    assert.ok(music.scheduledSources.size < 20, 'finished sources leave the cancellation set');
    game.destroy();
    assert.equal(music.scheduledSources.size, 0);
  }
});

test('Atlantic sync: pauses at zero and mid-beat cancel future audio and resume without repeated beats', async () => {
  for (const frozenClock of [false, true]) {
    const { game, audio, music, sources, advance } = await createAtlanticAudioCheck();
    const first = sources[0];
    game.pause(); audio.paused = true;
    assert.equal(music.scheduledSources.size, 0);
    assert.ok(first.stops.includes(undefined));
    if (!frozenClock) audio.ctx.currentTime += 20;
    game.update();
    assert.equal(game.animTime, 0);
    audio.paused = false; game.resume();
    assert.equal(sources.at(-1).at, game.songStartedAt);
    advance(game.songStartedAt + 3.1);
    const songTime = game.animTime;
    const futureBeat = sources.at(-1).at;
    assert.ok(futureBeat > audio.ctx.currentTime);
    const queued = [...music.scheduledSources];
    game.pause(); audio.paused = true;
    if (!frozenClock) audio.ctx.currentTime += 20;
    const count = sources.length;
    game.update();
    assert.equal(sources.length, count);
    assert.equal(game.animTime, songTime);
    assert.ok(queued.every(source => source.stops.includes(undefined)));
    audio.paused = false; game.resume();
    game.update();
    assert.ok(Math.abs(game.animTime - songTime) < 1e-8);
    assert.ok(Math.abs(sources.at(-1).at - futureBeat - (frozenClock ? 0 : 20)) < 1e-8);
    assert.ok(sources.slice(count).every(source => source.at > audio.ctx.currentTime));
    const once = sources.length;
    game.resume(); game.update();
    assert.equal(sources.length, once);
    game.destroy();
  }
});

test('Atlantic sync: mute, lag, completion and retry cannot leak audio or replay a backlog', async () => {
  const { game, input, audio, music, sources, advance } = await createAtlanticAudioCheck();
  audio.enabled = false;
  const mutedAt = sources.length;
  for (let i = 1; i < 60; i++) advance(i / 60);
  assert.equal(sources.length, mutedAt);
  assert.ok(game.nextMusicStep > 4);
  audio.enabled = true;
  advance(1.04);
  assert.ok(sources.length > mutedAt);
  assert.ok(sources.slice(mutedAt).every(source => source.at >= 1));
  const beforeLag = sources.length;
  let crashes = 0;
  audio.playCrash = () => crashes++;
  advance(game.songStartedAt + 20);
  assert.ok(sources.length - beforeLag <= 16, 'no rapid replay of old beats');
  assert.equal(crashes, 1, 'missed notes also share one feedback sound after a stall');
  const queued = [...music.scheduledSources];
  game.finishGame();
  assert.equal(music.scheduledSources.size, 0);
  assert.ok(queued.every(source => source.stops.includes(undefined)));
  const finishedAt = sources.length;
  advance(audio.ctx.currentTime + 1);
  assert.equal(sources.length, finishedAt);
  game.destroy();
  const retry = miniGameRegistry.create('atlanticBurning', {
    container: game.container, canvas: game.canvas, input, fx: stubFX, sound: audio
  });
  retry.init(); retry.start();
  assert.equal(retry.score, 0);
  assert.equal(retry.animTime, 0);
  assert.equal(retry.notes[0].time, 3);
  assert.equal(sources.at(-1).at, retry.songStartedAt);
  assert.equal(music.loopTimer, null);
  retry.destroy();
  assert.equal(music.scheduledSources.size, 0);
});

test('Atlantic sync: silent fallback keeps its clock; device offset stays bounded and consistent', () => {
  const originalPerformance = globalThis.performance;
  try {
    let now = 100;
    globalThis.performance = { now: () => now * 1000 };
    const { game, audio } = createGame('atlanticBurning');
    audio.ctx = null;
    game.init(); game.start();
    now = game.songStartedAt + 2;
    game.update(0.001);
    assert.ok(Math.abs(game.animTime - 2) < 1e-8);
    audio.ctx = { currentTime: 5000 };
    now += 1;
    game.update(0.001);
    assert.ok(Math.abs(game.animTime - 3) < 1e-8, 'late audio context must not replace the active silent clock');
    game.destroy();
  } finally { globalThis.performance = originalPerformance; }
  for (const offset of [120, -80, Infinity, 999]) {
    const { game, audio } = createGame('atlanticBurning', { timingOffsetMs: offset });
    const expected = Number.isFinite(offset) ? Math.max(-200, Math.min(200, offset)) / 1000 : 0;
    assert.equal(game.timingOffset, expected);
    audio.ctx.currentTime = game.songStartedAt + 3 + expected;
    game.update();
    assert.ok(Math.abs(game.notes[0].x - game.highway.hitTargetX) < 1e-8);
    game.destroy();
  }
});
