// 《Fogg 的赌约》· 关9 亨丽埃塔号大西洋大燃烧 (狂暴爱尔兰海盗摇滚 · 热力节拍天王典藏版)
import { MiniGame } from './_base/MiniGame.js';
import { particles } from '../engine/particles.js';
import { SpriteEngine } from '../engine/sprites.js';
import { Camera2D } from '../engine/camera.js';

export class AtlanticBurningMiniGame extends MiniGame {
  constructor(params) {
    super(params);

    this.camera = new Camera2D(1280, 720);

    // 节拍公路参数 (Rhythm Highway)
    this.highway = {
      x: 60,
      y: 430,
      width: 1160,
      height: 250,
      hitTargetX: 230,
      laneCount: 4,
      scrollSpeed: 420 // px per sec
    };

    // 音乐、到达拍点和画面共用一条时间轴。
    this.beatInterval = 60 / 160;
    this.leadIn = this.beatInterval * 8;
    this.scheduleAhead = 0.12;
    this.clockContext = null;
    this.songStartedAt = 0;
    this.pauseStartedAt = null;
    this.nextMusicStep = 0;
    // ponytail: 本轮先保留设备延迟校准参数；真机确认有偏移后再提供设置界面。
    this.timingOffset = Number.isFinite(this.config.timingOffsetMs)
      ? Math.max(-200, Math.min(200, this.config.timingOffsetMs)) / 1000 : 0;
    this.notes = [];

    // 航海里程与热力物理 (Steamer Thermodynamics)
    this.trip = {
      distance: 0,
      targetDistance: 3000, // 3000 海里直扑英国利物浦
      speedKnots: 8.0,
      timer: 50.0,
      maxTimer: 50.0
    };

    this.boilerPressure = 65;
    this.isFever = false;
    this.combo = 0;
    this.maxCombo = 0;
    this.score = 0;
    this.feverSeconds = 0;

    this.judgements = []; // 浮动判定特效
    this.animTime = 0;
  }

  init() {
    this.notes = [];
    this.pauseStartedAt = null;
    this.nextMusicStep = 0;

    this.trip.distance = 0;
    this.trip.speedKnots = 8.0;
    this.trip.timer = 50.0;

    this.boilerPressure = 65;
    this.isFever = false;
    this.combo = 0;
    this.maxCombo = 0;
    this.score = 0;
    this.feverSeconds = 0;

    this.judgements = [];
    this.animTime = 0;

    this.camera.setWorldBounds(0, 1280, 0, 720);
    this.camera.follow(640, 360, true);

    this.input.configureUI({
      showDpad: false,
      showA: false,
      showB: false,
      showC: false
    });

    this.sound.resume();
    this.clockContext = this.sound.ctx || null;
    this.generateRhythmChart();
    if (this.sound.music) this.sound.music.playTheme('atlanticShanty', { manual: true });
    this.sound.playSteamWhistle();
    this.fx.toast('先听两小节。音符到金线时，按 1 / 2 / 3 / 4，或轻点对应轨道。', 3000);
  }

  getClockTime() {
    return this.clockContext?.currentTime ?? performance.now() / 1000;
  }

  start() {
    super.start();
    this.songStartedAt = this.getClockTime() + this.scheduleAhead;
    this.scheduleMusic();
  }

  pause() {
    if (this.paused) return;
    this.pauseStartedAt = this.getClockTime();
    this.sound.music?.cancelScheduled?.();
    super.pause();
  }

  resume() {
    if (this.paused && this.pauseStartedAt !== null) {
      const elapsed = this.pauseStartedAt - this.songStartedAt;
      this.songStartedAt += this.getClockTime() - this.pauseStartedAt;
      // 已经响过的拍子不重播；被取消的未来拍点从当前位置重新排程。
      this.nextMusicStep = elapsed < 0 ? 0 : Math.floor(elapsed / (this.beatInterval / 2)) + 1;
      this.pauseStartedAt = null;
    }
    super.resume();
    if (this.running) this.scheduleMusic();
  }

  destroy() {
    this.sound.music?.stopTheme();
    super.destroy();
  }

  scheduleMusic() {
    if (!this.running || this.paused || !this.clockContext || !this.sound.music?.tickThemeNote) return;
    const now = this.getClockTime();
    const halfBeat = this.beatInterval / 2;
    // 长帧只略过来不及播放的旧拍，不把积压声音挤在一帧补播。
    this.nextMusicStep = Math.max(this.nextMusicStep, Math.ceil((now - this.songStartedAt - 0.04) / halfBeat));
    if (this.sound.enabled === false) {
      // 静音只跳过已过去的拍点，尚未到来的拍不能在预排窗口里提前丢掉。
      this.nextMusicStep = Math.max(this.nextMusicStep, Math.floor((now - this.songStartedAt) / halfBeat) + 1);
      return;
    }
    while (this.nextMusicStep * halfBeat < this.trip.maxTimer) {
      const at = this.songStartedAt + this.nextMusicStep * halfBeat;
      if (at > now + this.scheduleAhead) break;
      this.sound.music.tickThemeNote(at, this.nextMusicStep++);
    }
  }

  generateRhythmChart() {
    this.notes = [];
    for (let beat = 0; this.leadIn + beat * this.beatInterval < this.trip.maxTimer; beat++) {
      const time = this.leadIn + beat * this.beatInterval;
      // 4 条音轨节拍花样
      // 0: J (斩木), 1: K (投炉), 2: Space (爆气), 3: W (抗浪)
      let lane = 0;
      const mod16 = (beat + 1) % 16;

      if (mod16 === 0 || mod16 === 8) {
        lane = 2; // 爆气强拍
      } else if (mod16 === 4 || mod16 === 12) {
        lane = 3; // 巨浪抗抓
      } else if (mod16 % 2 === 0) {
        lane = 1; // 投炉
      } else {
        lane = 0; // 斩木
      }

      this.notes.push({
        id: beat,
        time,
        x: this.highway.hitTargetX + time * this.highway.scrollSpeed,
        lane: lane,
        type: lane === 0 ? 'chop' : (lane === 1 ? 'shovel' : (lane === 2 ? 'vent' : 'wave')),
        hit: false,
        missed: false
      });

      // 偶发连打音符 (Jig Syncopation)
      if ((mod16 === 2 || mod16 === 10) && time + this.beatInterval / 2 < this.trip.maxTimer) {
        const extraTime = time + this.beatInterval / 2;
        this.notes.push({
          id: beat + 1000,
          time: extraTime,
          x: this.highway.hitTargetX + extraTime * this.highway.scrollSpeed,
          lane: (lane + 1) % 2,
          type: lane === 0 ? 'shovel' : 'chop',
          hit: false,
          missed: false
        });
      }
    }
  }

  update() {
    if (!this.running || this.paused) return;
    this.scheduleMusic();
    const songTime = Math.min(this.trip.maxTimer, Math.max(0, this.getClockTime() - this.songStartedAt - this.timingOffset));
    const dt = Math.max(0, songTime - this.animTime);
    this.animTime = songTime;
    this.trip.timer = this.trip.maxTimer - songTime;

    // 2. 推进音符滑动
    const noteSpeed = this.highway.scrollSpeed;
    const targetX = this.highway.hitTargetX;
    let missedLane = null;

    for (let i = this.notes.length - 1; i >= 0; i--) {
      const note = this.notes[i];
      note.x = targetX + (note.time - songTime) * noteSpeed;

      // 错过判定 (Miss)
      if (!note.hit && !note.missed && note.x < targetX - 60) {
        note.missed = true;
        this.combo = 0;
        this.isFever = false;
        missedLane = note.lane;
      }

      // 移除出屏幕的音符
      if (note.x < this.highway.x - 40) {
        this.notes.splice(i, 1);
      }
    }
    if (missedLane !== null) {
      this.addJudgement(targetX, this.getLaneY(missedLane), 'MISS', '#90a4ae');
      this.sound.playCrash();
    }

    // 3. 处理浮动判定动画
    for (let i = this.judgements.length - 1; i >= 0; i--) {
      const j = this.judgements[i];
      j.timer -= dt;
      j.y -= 35 * dt;
      j.scale = Math.min(1.4, j.scale + dt * 2.0);
      if (j.timer <= 0) this.judgements.splice(i, 1);
    }

    // 4. 处理玩家按键输入与节拍打击判定
    const inp = this.input ? this.input.input : null;
    const pressed = inp ? (inp.justKeys || {}) : {};
    const btns = inp ? (inp.buttons || {}) : {};
    const pointer = inp ? (inp.pointer || {}) : {};

    // 4 轨按键映射
    const hitLane0 = pressed.KeyJ || pressed.Digit1 || pressed.ArrowLeft;
    const hitLane1 = pressed.KeyK || pressed.Digit2 || pressed.ArrowRight || btns.justB;
    const hitLane2 = pressed.Space || pressed.Digit3 || pressed.ArrowDown;
    const hitLane3 = pressed.KeyW || pressed.Digit4 || pressed.ArrowUp;

    if (hitLane0) this.checkLaneHit(0);
    if (hitLane1) this.checkLaneHit(1);
    if (hitLane2) this.checkLaneHit(2);
    if (hitLane3) this.checkLaneHit(3);

    // 触屏点击 4 个轨道区域
    if (pointer.justDown) {
      if (pointer.x >= this.highway.x && pointer.x <= this.highway.x + this.highway.width &&
          pointer.y >= this.highway.y && pointer.y <= this.highway.y + this.highway.height) {
        const laneH = (this.highway.height - 20) / 4;
        const clickedLane = Math.floor((pointer.y - this.highway.y - 10) / laneH);
        this.checkLaneHit(Math.max(0, Math.min(3, clickedLane)));
      }
    }

    // 5. FEVER 狂暴状态与航速热力学计算 (FEVER & Speed Mechanics)
    if (this.combo >= 20) {
      this.isFever = true;
      this.trip.speedKnots = 26.0;
      this.feverSeconds += dt;
      this.score += 220 * dt;

      if (Math.random() < 0.4) {
        particles.emitSparks(640 + (Math.random() - 0.5) * 400, 220, 4);
      }
    } else {
      this.isFever = false;
      this.trip.speedKnots = 8.0 + (this.combo * 0.6);
    }

    // 推进大西洋航程
    this.trip.distance += this.trip.speedKnots * 4.4 * dt;

    // 冲滩利物浦结算
    if (this.trip.distance >= this.trip.targetDistance || this.trip.timer <= 0) {
      this.finishGame();
    }
  }

  getLaneY(lane) {
    const laneH = (this.highway.height - 20) / 4;
    return this.highway.y + 10 + lane * laneH + laneH / 2;
  }

  checkLaneHit(targetLane) {
    if (!this.running || this.paused || !Number.isInteger(targetLane) || targetLane < 0 || targetLane > 3) return;
    const targetX = this.highway.hitTargetX;
    let closestNote = null;
    let minDiff = 99999;

    for (const note of this.notes) {
      if (!note.hit && !note.missed && note.lane === targetLane) {
        const diff = Math.abs(note.x - targetX);
        if (diff < minDiff && diff < 110) {
          minDiff = diff;
          closestNote = note;
        }
      }
    }

    if (closestNote) {
      closestNote.hit = true;
      const laneY = this.getLaneY(targetLane);

      if (minDiff < 32) {
        // ★ PERFECT!!
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        const pts = 300 * (1 + this.combo * 0.1);
        this.score += Math.floor(pts);
        this.addJudgement(targetX, laneY, '★ PERFECT!! ★', '#ffd700');
        if (this.sound.playCoin) this.sound.playCoin();
        if (this.camera) this.camera.addTrauma(0.25);
        particles.emitSparkles(targetX, laneY, 18);

      } else if (minDiff < 65) {
        // GREAT!
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        const pts = 180 * (1 + this.combo * 0.1);
        this.score += Math.floor(pts);
        this.addJudgement(targetX, laneY, 'GREAT!', '#00e5ff');
        if (this.sound.playWhoosh) this.sound.playWhoosh();
        particles.emitSparkles(targetX, laneY, 10);

      } else {
        // GOOD
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        this.score += 80;
        this.addJudgement(targetX, laneY, 'GOOD', '#ff9800');
        if (this.sound.playAxeChop) this.sound.playAxeChop();
      }

      // 音效反馈
      if (closestNote.type === 'chop' && this.sound.playAxeChop) this.sound.playAxeChop();
      else if (closestNote.type === 'shovel' && this.sound.playFurnaceRoar) this.sound.playFurnaceRoar();
      else if (closestNote.type === 'vent' && this.sound.playSteamVent) this.sound.playSteamVent();
      else if (this.sound.playWhoosh) this.sound.playWhoosh();

    } else {
      // 空挥惩罚
      if (this.sound.playWhoosh) this.sound.playWhoosh();
    }
  }

  addJudgement(x, y, rating, color) {
    this.judgements.push({
      x,
      y,
      rating,
      color,
      timer: 0.65,
      scale: 0.8
    });
  }

  finishGame() {
    if (!this.running || this.paused || this.completed) return;
    this.sound.music?.stopTheme();
    const reached = this.trip.distance >= this.trip.targetDistance;
    const rank = reached && this.maxCombo >= 35 ? 'S' : (reached ? 'A' : 'B');
    if (reached) {
      this.sound.playVictory();
      this.sound.playSteamWhistle();
    }
    this.complete({
      result: rank === 'S' ? 'perfect' : reached ? 'good' : 'miss',
      rank, reached,
      score: Math.round(this.score) + this.maxCombo * 80 + Math.floor(this.feverSeconds * 120) + (reached ? 1800 : 0),
      daysDelta: rank === 'S' ? -1 : reached ? 0 : 1,
      moneyDelta: -12000, // 本作统一英镑账本的改编折算，不是原著的六万英镑。
      comment: reached
        ? `亨丽埃塔号驶抵利物浦，最高 ${this.maxCombo} 连击。${rank === 'S' ? '连续添火抢回了一天航程。' : '众人合力守住了航期。'}`
        : `木料耗尽时只走完 ${Math.floor(this.trip.distance / this.trip.targetDistance * 100)}% 航程。若继续旅程，需靠余帆和接应船再航行一天。`,
      flags: { atlanticCrossed: reached }
    });
  }

  render(ctx) {
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // =========================================================================
    // 1. 上半屏 (0 ~ 420px)：电影级侧视 大西洋怒涛狂飙亨丽埃塔号 (Cinematic Steamer)
    // =========================================================================
    SpriteEngine.drawAtlanticCinematicScene(
      ctx,
      w,
      h,
      this.trip.speedKnots,
      this.isFever,
      this.animTime
    );

    // =========================================================================
    // 2. 下半屏 (420 ~ 720px)：维多利亚黄铜蒸汽节拍公路 (Rhythm Highway)
    // =========================================================================
    SpriteEngine.drawRhythmHighway(
      ctx,
      this.highway.x,
      this.highway.y,
      this.highway.width,
      this.highway.height,
      this.highway.hitTargetX,
      this.animTime,
      this.beatInterval
    );

    // 3. 绘制滑行音符 (Active Rhythm Notes)
    for (const note of this.notes) {
      if (!note.hit && !note.missed && note.x <= this.highway.x + this.highway.width + 35) {
        const ny = this.getLaneY(note.lane);
        SpriteEngine.drawRhythmNote(ctx, note.x, ny, note.lane, note.type, this.animTime);
      }
    }

    // 4. 绘制打击判定文字特效 (Judgements)
    for (const j of this.judgements) {
      ctx.save();
      ctx.translate(j.x, j.y);
      ctx.scale(j.scale, j.scale);
      ctx.fillStyle = j.color;
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 16;
      ctx.font = '900 24px "Baskerville", serif';
      ctx.textAlign = 'center';
      ctx.fillText(j.rating, 0, 0);
      ctx.restore();
    }

    // =========================================================================
    // 3. 顶部维多利亚 HUD 仪表盘与连击展示
    // =========================================================================
    this.drawRhythmHUD(ctx);
  }

  drawRhythmHUD(ctx) {
    const w = this.canvas.width;
    ctx.save();
    ctx.translate(0, 66);

    // 1. 左侧：航行航速与利物浦距离
    ctx.fillStyle = 'rgba(15, 25, 35, 0.94)';
    ctx.fillRect(40, 20, 280, 68);
    ctx.strokeStyle = this.isFever ? '#ffd700' : '#00e5ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 20, 280, 68);

    ctx.fillStyle = this.isFever ? '#ffd700' : '#ffffff';
    ctx.font = 'bold 22px "Baskerville", serif';
    ctx.textAlign = 'left';
    ctx.fillText('🚢 ' + this.trip.speedKnots.toFixed(1) + ' 节 (Knots)', 55, 48);

    ctx.fillStyle = this.isFever ? '#ffcc00' : '#00e5ff';
    ctx.font = '16px sans-serif';
    ctx.fillText(this.isFever ? '连续添火 · 全速航行' : '20 连击可全速航行', 55, 74);

    // 2. 中间：大西洋冲滩进度条
    const barW = 340;
    ctx.fillStyle = 'rgba(15, 25, 35, 0.94)';
    ctx.fillRect(w / 2 - barW / 2, 20, barW, 48);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(w / 2 - barW / 2, 20, barW, 48);

    const distProg = Math.min(1.0, this.trip.distance / this.trip.targetDistance);
    const distGrad = ctx.createLinearGradient(w / 2 - barW / 2, 20, w / 2 + barW / 2, 20);
    distGrad.addColorStop(0, '#00e5ff');
    distGrad.addColorStop(1, '#ffd700');
    ctx.fillStyle = distGrad;
    ctx.fillRect(w / 2 - barW / 2 + 3, 23, (barW - 6) * distProg, 18);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`到港进度 ${Math.floor(distProg * 100)}% · 剩余 ${Math.max(0, Math.ceil(this.trip.timer))} 秒`, w / 2, 60);

    // 3. 右侧：得分与连击数
    ctx.fillStyle = 'rgba(15, 25, 35, 0.94)';
    ctx.fillRect(w - 300, 20, 260, 68);
    ctx.strokeStyle = this.isFever ? '#ffd700' : '#00e5ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(w - 300, 20, 260, 68);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px "Baskerville", serif';
    ctx.textAlign = 'left';
    ctx.fillText('★ 得分: ' + Math.round(this.score), w - 285, 46);

    ctx.fillStyle = '#50e3c2';
    ctx.font = '16px sans-serif';
    ctx.fillText('⚡ MAX COMBO: ' + this.maxCombo + ' 连击', w - 285, 72);

    // 数拍提示与判定音符同源，不另起闪烁定时器。
    if (this.animTime < this.leadIn) {
      ctx.fillStyle = '#eadabb';
      ctx.font = 'bold 24px "Baskerville", serif';
      ctx.textAlign = 'center';
      ctx.fillText(`先听两小节 · ${Math.floor(this.animTime / this.beatInterval) % 4 + 1}`, w / 2, 140);
    } else if (this.combo >= 5) {
      ctx.fillStyle = this.isFever ? '#ffd700' : '#ffffff';
      ctx.shadowColor = this.isFever ? '#ff3300' : '#00ffff';
      ctx.shadowBlur = 22;
      ctx.font = '900 42px "Baskerville", serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.combo + ' COMBO!!', w / 2, 130);

      if (this.isFever) {
        ctx.fillStyle = '#ff6600';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('🔥 FEVER 26 KNOTS OVERDRIVE! 🔥', w / 2, 160);
      }
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}
