// 《Fogg 的赌约》· 关9 亨丽埃塔号大西洋大燃烧 (狂暴爱尔兰海盗摇滚 · 热力节拍天王典藏版)
import { MiniGame } from './_base/MiniGame.js';
import { particles } from '../engine/particles.js';
import { physicsDebris } from '../engine/physics.js';
import { SpriteEngine } from '../engine/sprites.js';
import { GameImages } from '../assets/images.js';
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

    // 活跃音符列表 (Active Notes)
    this.notes = [];
    this.spawnTimer = 0;
    this.beatIndex = 0;

    // 航海里程与热力物理 (Steamer Thermodynamics)
    this.trip = {
      distance: 0,
      targetDistance: 3000, // 3000 海里直扑英国利物浦
      speedKnots: 16.0,
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
    this.spawnTimer = 0;
    this.beatIndex = 0;

    this.trip.distance = 0;
    this.trip.speedKnots = 16.0;
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
      showDpad: true,
      showA: true,
      showB: true,
      labelA: '🪓 斩木 [J/左]',
      labelB: '🔥 投炉 [K/右]'
    });

    // 启动 160 BPM 狂暴爱尔兰海盗朋克摇滚 (Celtic Sea Shanty Punk Rock Beat)
    if (this.sound.music) this.sound.music.playTheme('atlanticShanty');
    this.sound.playSteamWhistle();
    this.fx.toast('🎵 【大西洋热力节拍天王】[J/左 斩木] [K/右 投炉] [空格 爆气] [W 抗浪] 踩准节拍！', 6000);
  }

  // 160 BPM 节奏节拍谱面生成器 (Celtic Sea Shanty Beat Chart)
  generateBeats(dt) {
    // 160 BPM = 每 0.375 秒一拍 (8分音符 = 0.1875 秒)
    const beatInterval = 0.375;
    this.spawnTimer += dt;

    if (this.spawnTimer >= beatInterval) {
      this.spawnTimer -= beatInterval;
      this.beatIndex++;

      // 4 条音轨节拍花样
      // 0: J (斩木), 1: K (投炉), 2: Space (爆气), 3: W (抗浪)
      let lane = 0;
      const mod16 = this.beatIndex % 16;

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
        id: this.beatIndex,
        x: this.highway.x + this.highway.width + 30,
        lane: lane,
        type: lane === 0 ? 'chop' : (lane === 1 ? 'shovel' : (lane === 2 ? 'vent' : 'wave')),
        hit: false,
        missed: false
      });

      // 偶发连打音符 (Jig Syncopation)
      if (mod16 === 2 || mod16 === 10) {
        this.notes.push({
          id: this.beatIndex + 1000,
          x: this.highway.x + this.highway.width + 120,
          lane: (lane + 1) % 2,
          type: lane === 0 ? 'shovel' : 'chop',
          hit: false,
          missed: false
        });
      }
    }
  }

  update(rawDt) {
    if (!this.running || this.paused) return;
    const dt = Math.max(0.0001, rawDt || 0.016);

    this.trip.timer -= dt;
    this.animTime += dt;

    // 1. 生成节奏音符
    this.generateBeats(dt);

    // 2. 推进音符滑动
    const noteSpeed = this.highway.scrollSpeed;
    const targetX = this.highway.hitTargetX;

    for (let i = this.notes.length - 1; i >= 0; i--) {
      const note = this.notes[i];
      note.x -= noteSpeed * dt;

      // 错过判定 (Miss)
      if (!note.hit && !note.missed && note.x < targetX - 60) {
        note.missed = true;
        this.combo = 0;
        this.isFever = false;
        this.addJudgement(targetX, this.getLaneY(note.lane), 'MISS', '#90a4ae');
        if (this.sound.playCrash) this.sound.playCrash();
      }

      // 移除出屏幕的音符
      if (note.x < this.highway.x - 40) {
        this.notes.splice(i, 1);
      }
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
    const keys = inp ? (inp.keys || {}) : {};
    const btns = inp ? (inp.buttons || {}) : {};
    const pointer = inp ? (inp.pointer || {}) : {};

    // 4 轨按键映射
    const hitLane0 = keys['KeyJ'] || keys['Digit1'] || keys['ArrowLeft'] || btns.justA;
    const hitLane1 = keys['KeyK'] || keys['Digit2'] || keys['ArrowRight'] || btns.justB;
    const hitLane2 = keys['Space'] || keys['Digit3'] || keys['ArrowDown'];
    const hitLane3 = keys['KeyW'] || keys['Digit4'] || keys['ArrowUp'] || btns.justUp;

    if (hitLane0) { keys['KeyJ'] = false; keys['Digit1'] = false; keys['ArrowLeft'] = false; if (btns.justA) btns.justA = false; this.checkLaneHit(0); }
    if (hitLane1) { keys['KeyK'] = false; keys['Digit2'] = false; keys['ArrowRight'] = false; if (btns.justB) btns.justB = false; this.checkLaneHit(1); }
    if (hitLane2) { keys['Space'] = false; keys['Digit3'] = false; keys['ArrowDown'] = false; this.checkLaneHit(2); }
    if (hitLane3) { keys['KeyW'] = false; keys['Digit4'] = false; keys['ArrowUp'] = false; this.checkLaneHit(3); }

    // 触屏点击 4 个轨道区域
    if (pointer.justDown) {
      pointer.justDown = false;
      if (pointer.y >= this.highway.y && pointer.y <= this.highway.y + this.highway.height) {
        const laneH = this.highway.height / 4;
        const clickedLane = Math.floor((pointer.y - this.highway.y) / laneH);
        this.checkLaneHit(Math.max(0, Math.min(3, clickedLane)));
      }
    }

    // 5. FEVER 狂暴状态与航速热力学计算 (FEVER & Speed Mechanics)
    if (this.combo >= 20) {
      this.isFever = true;
      this.trip.speedKnots = 26.0;
      this.feverSeconds += dt;
      this.score += Math.floor(220 * dt);

      if (Math.random() < 0.4) {
        particles.emitSparks(640 + (Math.random() - 0.5) * 400, 220, 4);
      }
    } else {
      this.isFever = false;
      this.trip.speedKnots = 16.0 + (this.combo * 0.35);
    }

    // 推进大西洋航程
    this.trip.distance += this.trip.speedKnots * 4.4 * dt;

    // 冲滩利物浦结算
    if (this.trip.distance >= this.trip.targetDistance || this.trip.timer <= 0) {
      this.finishGame();
    }
  }

  getLaneY(lane) {
    const laneH = (this.highway.height - 16) / 4;
    return this.highway.y + 8 + lane * laneH + laneH / 2;
  }

  checkLaneHit(targetLane) {
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
    this.running = false;
    const isSuccess = this.trip.distance >= this.trip.targetDistance;
    const rank = isSuccess && this.maxCombo >= 35 ? 'S' : (isSuccess ? 'A' : 'B');

    this.sound.playVictory();
    this.sound.playSteamWhistle();

    setTimeout(() => {
      this.complete({
        result: isSuccess ? 'perfect' : 'pass',
        rank,
        score: this.score + this.maxCombo * 80 + Math.floor(this.feverSeconds * 120) + (isSuccess ? 1800 : 500),
        daysDelta: rank === 'S' ? -1.0 : 0,
        moneyDelta: -60000,
        comment: isSuccess
          ? '★ 伴随狂暴爱尔兰节拍，亨丽埃塔号推满 26 节极速 FEVER 创造奇迹冲滩英国利物浦港！'
          : '全船木料燃尽，亨丽埃塔号破浪靠泊英国利物浦！',
        flags: { atlanticCrossed: true }
      });
    }, 1000);
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
      this.animTime
    );

    // 3. 绘制滑行音符 (Active Rhythm Notes)
    for (const note of this.notes) {
      if (!note.hit && !note.missed) {
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
    ctx.font = '11px sans-serif';
    ctx.fillText(this.isFever ? '🔥 FEVER OVERDRIVE 极速狂飙!' : '目标: 利物浦港 (保持节奏连击!)', 55, 74);

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
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📍 大西洋航程: ' + Math.floor(this.trip.distance) + ' / ' + this.trip.targetDistance + ' 海里 | 倒计时: ' + Math.ceil(this.trip.timer) + 's', w / 2, 57);

    // 3. 右侧：得分与连击数
    ctx.fillStyle = 'rgba(15, 25, 35, 0.94)';
    ctx.fillRect(w - 300, 20, 260, 68);
    ctx.strokeStyle = this.isFever ? '#ffd700' : '#00e5ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(w - 300, 20, 260, 68);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px "Baskerville", serif';
    ctx.textAlign = 'left';
    ctx.fillText('★ 得分: ' + this.score, w - 285, 46);

    ctx.fillStyle = '#50e3c2';
    ctx.font = '12px sans-serif';
    ctx.fillText('⚡ MAX COMBO: ' + this.maxCombo + ' 连击', w - 285, 72);

    // 4. 屏幕中央巨大连击展示 (Huge Combo Display)
    if (this.combo >= 5) {
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
