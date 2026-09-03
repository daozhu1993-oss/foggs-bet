// 《Fogg 的赌约》· 关2 蒙古号·红海蒸汽轮机节奏音游 (经典双轨节奏打击音游版)
import { MiniGame } from './_base/MiniGame.js';
import { particles } from '../engine/particles.js';
import { GameImages } from '../assets/images.js';

export class SteamOverdriveMiniGame extends MiniGame {
  constructor(params) {
    super(params);

    // 经典节奏音游核心参数 (BPM 120, 4/4 拍)
    this.bpm = 120;
    this.beatInterval = 60 / this.bpm; // 0.5 秒一拍
    this.songDuration = 45.0;          // 45 秒完整曲目
    this.trackY = 370;                 // 判定线中心 Y
    this.hitZoneX = 230;               // 判定圈 X 坐标
    this.noteSpeed = 520;              // 像素 / 秒
    this.perfectWindow = 0.07;         // 休闲向 PERFECT 判定 ±70ms
    this.greatWindow = 0.16;           // GREAT 判定 ±160ms

    this.animTime = 0;                 // 由 WebAudio 单调时钟驱动的曲目时间 (秒)
    this.songStartedAt = 0;
    this.pauseStartedAt = 0;
    this.notes = [];
    this.totalNotesCount = 0;

    // 打击与连击数据
    this.stats = {
      perfect: 0,
      great: 0,
      miss: 0,
      combo: 0,
      maxCombo: 0,
      score: 0,
      steamPressure: 50, // 0 ~ 100 PSI (超频蓄力槽)
      isFever: false,
      feverTimer: 0
    };

    this.currentJudgment = null; // { text: 'PERFECT', color: '#ffd700', timer: 0.4 }
    this.keyPressAnim = { left: 0, right: 0, space: 0 };
    this.lastMusicStep = -1;

    this.shipAnim = { speedKnots: 14.0 };

    this.stormBgImg = new Image();
    const stormSrc = GameImages.suez_red_sea_storm || GameImages.suez || GameImages.suez_red_sea_storm_art;
    if (stormSrc) this.stormBgImg.src = stormSrc;
  }

  init() {
    this.animTime = 0;
    this.stats = {
      perfect: 0,
      great: 0,
      miss: 0,
      combo: 0,
      maxCombo: 0,
      score: 0,
      steamPressure: 50,
      isFever: false,
      feverTimer: 0
    };

    this.currentJudgment = null;
    this.keyPressAnim = { left: 0, right: 0, space: 0 };
    this.lastPressLeft = false;
    this.lastPressRight = false;
    this.lastPressSpace = false;
    this.lastMusicStep = -1;
    this.shipAnim = { speedKnots: 14.0 };

    // 生成专业 45 秒蒸汽节奏谱面
    this.generateRhythmChart();

    this.input.configureUI({
      showDpad: true,
      showA: true,
      showB: true,
      labelA: '司炉重铲 [D/←]',
      labelB: '活塞调压 [K/→]'
    });

    this.sound.playSteamWhistle();
    if (this.sound.music) this.sound.music.stopTheme();
    this.fx.toast('【经典节奏音游】跟随节拍按下 [D/←] 红键 或 [K/→] 蓝键！双音按 [空格]！', 4500);
  }

  getClockTime() {
    return this.sound?.ctx?.currentTime ?? performance.now() / 1000;
  }

  start() {
    super.start();
    this.songStartedAt = this.getClockTime();
  }

  pause() {
    if (!this.paused) this.pauseStartedAt = this.getClockTime();
    super.pause();
  }

  resume() {
    if (this.paused && this.pauseStartedAt) {
      this.songStartedAt += this.getClockTime() - this.pauseStartedAt;
      this.pauseStartedAt = 0;
    }
    super.resume();
  }

  generateRhythmChart() {
    this.notes = [];
    const b = this.beatInterval; // 0.5s (一拍)

    // =========================================================================
    // 1. 第一阶段 (2.0s ~ 10.0s):【起 · 稳健蓄力】经典咚咔交替与附点
    // =========================================================================
    for (let t = 2.0; t < 9.5; t += b * 2) {
      this.notes.push({ time: t, type: 'left', hit: false, judged: false });         // 咚
      this.notes.push({ time: t + b, type: 'right', hit: false, judged: false });      // 咔
      if (t === 4.0 || t === 8.0) {
        this.notes.push({ time: t + b * 0.5, type: 'left', hit: false, judged: false }); // 附点咚
      }
    }
    this.notes.push({ time: 9.5, type: 'both', hit: false, judged: false }); // 蓄力大咚！

    // =========================================================================
    // 2. 第二阶段 (10.0s ~ 22.0s):【承 · 切分跳跃】弹性质感切分音太鼓
    // =========================================================================
    for (let t = 10.0; t < 22.0; t += b * 2) {
      this.notes.push({ time: t, type: 'left', hit: false, judged: false });               // 咚
      this.notes.push({ time: t + b * 0.5, type: 'right', hit: false, judged: false });     // 咔
      this.notes.push({ time: t + b, type: 'left', hit: false, judged: false });            // 咚
      if (t % (b * 4) === 0) {
        this.notes.push({ time: t + b * 1.5, type: 'both', hit: false, judged: false });   // 段落大咚！
      } else {
        this.notes.push({ time: t + b * 1.5, type: 'right', hit: false, judged: false });  // 咔
      }
    }

    // =========================================================================
    // 3. 第三阶段 (22.0s ~ 36.0s):【转 · 黄金副歌狂飙】密鼓连打 咚咚咔咔 与连音大咚
    // =========================================================================
    let chorusStep = 0;
    for (let t = 22.0; t < 36.0; t += b, chorusStep++) {
      if (chorusStep % 8 === 0 || chorusStep % 8 === 4) {
        this.notes.push({ time: t, type: 'both', hit: false, judged: false }); // 强拍大咚
      } else if (chorusStep % 4 === 1 || chorusStep % 4 === 2) {
        this.notes.push({ time: t, type: 'left', hit: false, judged: false });  // 咚
        this.notes.push({ time: t + b * 0.5, type: 'left', hit: false, judged: false }); // 咚咚连打
      } else {
        this.notes.push({ time: t, type: 'right', hit: false, judged: false }); // 咔
        this.notes.push({ time: t + b * 0.5, type: 'right', hit: false, judged: false }); // 咔咔连打
      }
    }

    // =========================================================================
    // 4. 第四阶段 (36.0s ~ 44.0s):【合 · 终章连打大爆发】十六分音符急速滚奏冲刺！
    // =========================================================================
    let sprintStep = 0;
    for (let t = 36.0; t < 43.5; t += b * 0.5, sprintStep++) {
      const type = sprintStep % 8 === 0 ? 'both' : (sprintStep % 2 === 0 ? 'left' : 'right');
      this.notes.push({ time: t, type, hit: false, judged: false });
    }
    this.notes.push({ time: 43.8, type: 'both', hit: false, judged: false }); // 终极压轴大咚！

    this.notes.sort((a, b) => a.time - b.time);
    this.totalNotesCount = this.notes.length;
  }

  update() {
    if (!this.running || this.paused) return;

    const inp = this.input ? this.input.input : null;
    const keys = inp ? (inp.keys || {}) : {};
    const btns = inp ? (inp.buttons || {}) : {};
    const pointer = inp ? (inp.pointer || {}) : {};

    const songTime = Math.max(0, this.getClockTime() - this.songStartedAt);
    const dt = Math.max(0, songTime - this.animTime);
    this.animTime = songTime;

    // 八分音符配乐与谱面共用同一时钟，避免独立定时器造成漂拍。
    const musicStep = Math.floor(this.animTime / (this.beatInterval / 2));
    if (musicStep !== this.lastMusicStep) {
      this.lastMusicStep = musicStep;
      if (this.sound?.music?.playSteamStep) this.sound.music.playSteamStep(musicStep, this.stats.isFever);
      else if (this.sound?.playBeatTick) this.sound.playBeatTick(musicStep % 8 === 0);
    }

    // 判定显示衰减
    if (this.currentJudgment) {
      this.currentJudgment.timer -= dt;
      if (this.currentJudgment.timer <= 0) this.currentJudgment = null;
    }

    // 按键高亮衰减
    this.keyPressAnim.left = Math.max(0, this.keyPressAnim.left - dt * 5.0);
    this.keyPressAnim.right = Math.max(0, this.keyPressAnim.right - dt * 5.0);
    this.keyPressAnim.space = Math.max(0, this.keyPressAnim.space - dt * 5.0);

    // FEVER 超频模式计时
    if (this.stats.isFever) {
      this.stats.feverTimer -= dt;
      if (this.stats.feverTimer <= 0) {
        this.stats.isFever = false;
        this.fx.toast('超频结束，平稳巡航', 1000);
      }
    }

    // 自然压力平缓衰减
    if (!this.stats.isFever) {
      this.stats.steamPressure = Math.max(10, this.stats.steamPressure - 3.5 * dt);
    }

    // 航速反馈
    this.shipAnim.speedKnots = this.stats.isFever ? 28.0 : (12.0 + (this.stats.steamPressure / 100) * 8.0);

    // 1. 监听玩家按键触发打击
    const pressLeft = keys['KeyD'] || keys['ArrowLeft'] || keys['KeyA'] || btns.left || btns.A || btns.actionA;
    const pressRight = keys['KeyK'] || keys['ArrowRight'] || keys['KeyL'] || (btns.right && !keys['KeyD']) || btns.B || btns.actionB;
    const pressSpace = keys['Space'] || keys['KeyJ'] || (pressLeft && pressRight);

    // 触摸屏幕左右按键区
    let touchLeft = false;
    let touchRight = false;
    let touchSpace = false;
    if (pointer.justDown) {
      if (pointer.y > 540) {
        if (pointer.x < 480) touchLeft = true;
        else if (pointer.x > 800) touchRight = true;
        else touchSpace = true;
      } else {
        if (pointer.x < 640) touchLeft = true;
        else touchRight = true;
      }
    }

    if ((pressSpace || touchSpace) && !this.lastPressSpace) {
      this.handleHitInput('both');
      this.keyPressAnim.space = 1.0;
    } else {
      if ((pressLeft || touchLeft) && !this.lastPressLeft) {
        this.handleHitInput('left');
        this.keyPressAnim.left = 1.0;
      }
      if ((pressRight || touchRight) && !this.lastPressRight) {
        this.handleHitInput('right');
        this.keyPressAnim.right = 1.0;
      }
    }

    this.lastPressLeft = pressLeft || touchLeft;
    this.lastPressRight = pressRight || touchRight;
    this.lastPressSpace = pressSpace || touchSpace;

    // 2. 检查漏拍 MISS
    const currentTime = this.animTime;
    for (const note of this.notes) {
      if (!note.judged && !note.hit) {
        const timeDiff = currentTime - note.time;
        if (timeDiff > this.greatWindow) {
          note.judged = true;
          this.registerJudgment('MISS', '#888888', 0);
          this.stats.miss++;
          this.stats.combo = 0;
          this.stats.steamPressure = Math.max(0, this.stats.steamPressure - 10);
        }
      }
    }

    // 3. 歌曲结束判定
    if (this.animTime >= this.songDuration) {
      this.finishRhythmGame();
    }
  }

  handleHitInput(inputType) {
    const currentTime = this.animTime;
    let closestNote = null;
    let minDiff = 999;

    for (const note of this.notes) {
      if (!note.hit && !note.judged) {
        const diff = Math.abs(currentTime - note.time);
        if (diff <= this.greatWindow && diff < minDiff) {
          if (note.type === inputType) {
            minDiff = diff;
            closestNote = note;
          }
        }
      }
    }

    if (closestNote) {
      closestNote.hit = true;
      closestNote.judged = true;

      const isBoth = closestNote.type === 'both';
      if (minDiff <= this.perfectWindow) {
        // PERFECT! (±70ms)
        const baseScore = isBoth ? 600 : 300;
        this.registerJudgment(isBoth ? '★ 大咚 PERFECT!' : 'PERFECT!', '#ffd700', baseScore);
        this.stats.perfect++;
        this.stats.combo++;
        this.stats.steamPressure = Math.min(100, this.stats.steamPressure + (isBoth ? 15 : 8));
        this.playBeatSound(inputType);
        if (this.sound?.playRewardChime) this.sound.playRewardChime(true, isBoth);

        const floatY = closestNote.type === 'left' ? this.trackY - 42 : (closestNote.type === 'right' ? this.trackY + 42 : this.trackY);
        this.fx.addFloatText(this.hitZoneX + 80, floatY, isBoth ? '⭐ 大咚 +600' : '+300 良', '#ffd700');
        particles.emitSparkles(this.hitZoneX, this.trackY, isBoth ? 24 : 16);
      } else {
        // GREAT! (±160ms)
        this.registerJudgment('GREAT!', '#50e3c2', 150);
        this.stats.great++;
        this.stats.combo++;
        this.stats.steamPressure = Math.min(100, this.stats.steamPressure + 4);
        this.playBeatSound(inputType);
        if (this.sound?.playRewardChime) this.sound.playRewardChime(false, false);

        const floatY = closestNote.type === 'left' ? this.trackY - 42 : this.trackY + 42;
        this.fx.addFloatText(this.hitZoneX + 80, floatY, '+150 可', '#50e3c2');
        particles.emitSparkles(this.hitZoneX, this.trackY, 8);
      }

      this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.combo);

      // 连击里程碑大赏 (Combo Milestones: 10, 25, 50, 75, 100)
      const currentCombo = this.stats.combo;
      if (currentCombo === 10 || currentCombo === 25 || currentCombo === 50 || currentCombo === 75 || currentCombo === 100) {
        if (this.sound?.playComboMilestone) this.sound.playComboMilestone(currentCombo);
        this.fx.flash('#ffd700', 160);
        this.fx.addFloatText(640, 270, `🔥 ${currentCombo} COMBO 连击大赏！`, '#ffd700');
        this.fx.triggerHaptic(45);
        particles.emitSparkles(640, 370, 28);
      }

      // 触发 FEVER 黄金超频 (Combo >= 15 或 压力 100%)
      if ((this.stats.combo >= 15 || this.stats.steamPressure >= 100) && !this.stats.isFever) {
        this.stats.isFever = true;
        this.stats.feverTimer = 5.0;
        this.sound.playSteamWhistle();
        this.fx.flash('#ffd700', 200);
        this.fx.addFloatText(640, 240, '⚡ FEVER 黄金轮机超频！', '#ffd700');
        this.cameraShake(0.35);
      }
    }
  }

  playBeatSound(type) {
    if (this.sound && this.sound.playRhythmHit) {
      this.sound.playRhythmHit(type);
    } else {
      if (type === 'left') this.sound.playWhoosh();
      else if (type === 'right') this.sound.playCardSlam();
      else this.sound.playSteam();
    }
  }

  registerJudgment(text, color, baseScore) {
    this.currentJudgment = { text, color, timer: 0.35 };
    const comboBonus = Math.min(5, 1 + Math.floor(this.stats.combo / 10));
    this.stats.score += baseScore * comboBonus;
  }

  cameraShake(intensity) {
    this.fx.triggerHaptic(35);
  }

  finishRhythmGame() {
    this.running = false;
    this.sound.playVictory();

    const totalHits = this.stats.perfect + this.stats.great;
    const accuracy = this.totalNotesCount > 0 ? (totalHits / this.totalNotesCount) : 0;
    const isPerfect = accuracy >= 0.85 && this.stats.maxCombo >= 20;
    const rank = isPerfect ? 'S' : (accuracy >= 0.65 ? 'A' : 'B');
    const daysDelta = rank === 'S' ? -2.0 : (rank === 'A' ? -0.5 : 0.5);

    setTimeout(() => {
      this.complete({
        result: rank === 'S' ? 'perfect' : (rank === 'A' ? 'good' : 'pass'),
        rank,
        score: this.stats.score,
        daysDelta,
        flags: { redSeaConquered: true, rhythmMaster: rank === 'S' },
        comment: isPerfect
          ? `福克：「蒸汽轮机节奏打击完美无瑕！准确率 ${(accuracy * 100).toFixed(0)}%，最大连击 ${this.stats.maxCombo} Combo，提前整整两天抵达孟买港！」`
          : `福克：「轮机运转良好，准确率 ${(accuracy * 100).toFixed(0)}%，蒙古号准点靠泊孟买码头！」`
      });
    }, 1200);
  }

  render(ctx) {
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // =========================================================================
    // 1. 上半部：远景红海风暴视窗 (0 ~ 240px)
    // =========================================================================
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, 240);
    ctx.clip();

    if (this.stormBgImg && this.stormBgImg.complete && this.stormBgImg.naturalWidth > 0) {
      const sourceH = this.stormBgImg.naturalWidth * 240 / w;
      const sourceY = Math.min(this.stormBgImg.naturalHeight - sourceH, this.stormBgImg.naturalHeight * 0.35);
      ctx.drawImage(this.stormBgImg, 0, sourceY, this.stormBgImg.naturalWidth, sourceH, 0, 0, w, 240);
      const stormTint = this.stats.isFever ? 'rgba(176, 112, 35, 0.18)' : 'rgba(9, 14, 19, 0.24)';
      ctx.fillStyle = stormTint;
      ctx.fillRect(0, 0, w, 240);

      const vignette = ctx.createLinearGradient(0, 0, 0, 240);
      vignette.addColorStop(0, 'rgba(8, 10, 12, 0.08)');
      vignette.addColorStop(0.62, 'rgba(8, 10, 12, 0)');
      vignette.addColorStop(1, 'rgba(8, 7, 5, 0.78)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, 240);
    } else {
      ctx.fillStyle = '#0a1d2e';
      ctx.fillRect(0, 0, w, 240);
    }

    // 顶部航程状态栏
    this.drawTopVoyageBar(ctx, w);

    ctx.restore();

    // =========================================================================
    // 2. 中部分割黄铜铆钉横梁 (238 ~ 248px)
    // =========================================================================
    ctx.fillStyle = '#22150c';
    ctx.fillRect(0, 238, w, 10);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 238, w, 10);

    // =========================================================================
    // 3. 下半部：维多利亚双轨节奏打击台 (Rhythm Highway: 248 ~ 720px)
    // =========================================================================
    ctx.save();
    const bgGrad = ctx.createLinearGradient(0, 248, 0, h);
    bgGrad.addColorStop(0, '#1c130d');
    bgGrad.addColorStop(0.5, '#2b1910');
    bgGrad.addColorStop(1, '#0e0804');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 248, w, h - 248);

    // 3.1 绘制双轨节奏音符轨道 (Steam Highway)
    this.drawRhythmHighway(ctx, w);

    // 3.2 绘制滑行音符 (Scrolling Beat Notes)
    this.drawScrollingNotes(ctx);

    // 3.3 绘制左侧判定核心圆环 (Judgment Target Zone)
    this.drawHitTargetZone(ctx);

    // 3.4 绘制打击判定文字特效 (PERFECT! / GREAT! / MISS)
    if (this.currentJudgment) {
      this.drawJudgmentEffect(ctx);
    }

    // 3.5 绘制底部实体交互按键台 (Tactile Steam Pressure Deck)
    this.drawTactileButtons(ctx, w, h);

    // 3.6 绘制底部控制台、Combo 与能量条 (Bottom Console & Combo)
    this.drawBottomConsole(ctx, w, h);

    ctx.restore();
  }

  // 绘制顶部航程进度栏
  drawTopVoyageBar(ctx, w) {
    ctx.fillStyle = 'rgba(17, 13, 9, 0.9)';
    ctx.strokeStyle = '#b88b45';
    ctx.lineWidth = 1.5;
    ctx.fillRect(36, 80, w - 72, 44);
    ctx.strokeRect(36, 80, w - 72, 44);
    ctx.strokeStyle = 'rgba(232, 205, 147, 0.32)';
    ctx.strokeRect(41, 85, w - 82, 34);

    const progress = Math.min(1.0, this.animTime / this.songDuration);
    ctx.fillStyle = '#ead8ad';
    ctx.font = '600 14px "Baskerville", Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(`S.S. MONGOLIA  ·  红海轮机令  ·  ${this.shipAnim.speedKnots.toFixed(1)} 节`, 56, 107);

    const meterX = w - 378;
    ctx.fillStyle = '#0d0a07';
    ctx.fillRect(meterX, 94, 250, 14);
    ctx.strokeStyle = '#8c6d3d';
    ctx.strokeRect(meterX, 94, 250, 14);
    ctx.fillStyle = this.stats.isFever ? '#d8aa4b' : '#9c7440';
    ctx.fillRect(meterX + 2, 96, 246 * progress, 10);
    ctx.fillStyle = '#ead8ad';
    ctx.font = '600 12px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.max(0, Math.ceil(this.songDuration - this.animTime))} SEC`, w - 54, 106);
  }

  // 绘制双轨节奏音符轨道
  drawRhythmHighway(ctx, w) {
    ctx.save();
    const trackH = 170;
    const topY = this.trackY - trackH / 2;

    const trackGradient = ctx.createLinearGradient(0, topY, 0, topY + trackH);
    trackGradient.addColorStop(0, 'rgba(23, 16, 11, 0.96)');
    trackGradient.addColorStop(0.5, 'rgba(48, 30, 19, 0.94)');
    trackGradient.addColorStop(1, 'rgba(18, 12, 8, 0.98)');
    ctx.fillStyle = trackGradient;
    ctx.fillRect(0, topY, w, trackH);
    ctx.strokeStyle = '#9d7640';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, topY, w, trackH);

    ctx.fillStyle = 'rgba(211, 177, 112, 0.5)';
    for (let x = 30; x < w; x += 80) {
      ctx.beginPath();
      ctx.arc(x, topY + 9, 2.5, 0, Math.PI * 2);
      ctx.arc(x, topY + trackH - 9, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 中间黄铜双轨分隔线
    ctx.strokeStyle = 'rgba(184, 139, 69, 0.52)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(0, this.trackY);
    ctx.lineTo(w, this.trackY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 动态滚动太鼓小节线与节拍辅助线 (Measure & Beat Bar Lines)
    const currentTime = this.animTime;
    const startMeasure = Math.floor((currentTime - 0.5) / 1.0) * 1.0;
    const endMeasure = currentTime + (w - this.hitZoneX) / this.noteSpeed + 0.5;

    for (let barTime = Math.max(0, startMeasure); barTime <= Math.min(this.songDuration, endMeasure); barTime += 0.5) {
      const barX = this.hitZoneX + (barTime - currentTime) * this.noteSpeed;
      if (barX < 0 || barX > w) continue;

      const isFullMeasure = Math.abs(barTime % (this.beatInterval * 4)) < 0.01;
      const isHalfMeasure = Math.abs(barTime % (this.beatInterval * 2)) < 0.01;

      if (isFullMeasure) {
        // 主小节实线 (4拍大线)
        ctx.strokeStyle = 'rgba(235, 205, 140, 0.65)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(barX, topY);
        ctx.lineTo(barX, topY + trackH);
        ctx.stroke();

        ctx.fillStyle = 'rgba(235, 205, 140, 0.8)';
        ctx.font = '600 10px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`M${Math.round(barTime / 2)}`, barX, topY + 12);
      } else if (isHalfMeasure) {
        // 半小节虚线 (2拍中线)
        ctx.strokeStyle = 'rgba(184, 139, 69, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(barX, topY + 10);
        ctx.lineTo(barX, topY + trackH - 10);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 轨道指示文字
    ctx.font = '600 13px "Baskerville", Georgia, serif';
    ctx.fillStyle = '#d49a87';
    ctx.fillText('🔴 咚 · D / A / ←', 24, this.trackY - 38);
    ctx.fillStyle = '#91b9b3';
    ctx.fillText('🔵 咔 · K / L / →', 24, this.trackY + 50);

    ctx.restore();
  }

  // 绘制从右向左滑行的音符
  drawScrollingNotes(ctx) {
    const currentTime = this.animTime;
    ctx.save();

    for (const note of this.notes) {
      if (note.hit || note.judged) continue;

      // 计算当前 X 坐标
      const noteX = this.hitZoneX + (note.time - currentTime) * this.noteSpeed;
      if (noteX < -50 || noteX > 1320) continue;

      if (note.type === 'left') {
        this.drawSingleNote(ctx, noteX, this.trackY - 42, '#8f3e32', '#d58b70', '咚');
      } else if (note.type === 'right') {
        this.drawSingleNote(ctx, noteX, this.trackY + 42, '#2f6f78', '#8bb7b0', '咔');
      } else {
        this.drawSingleNote(ctx, noteX, this.trackY - 42, '#a97e36', '#d9bd78', '大');
        this.drawSingleNote(ctx, noteX, this.trackY + 42, '#a97e36', '#d9bd78', '咚');
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(noteX, this.trackY - 42);
        ctx.lineTo(noteX, this.trackY + 42);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 绘制单个节奏音符
  drawSingleNote(ctx, x, y, mainColor, glowColor, label) {
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;

    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.moveTo(-20, -26);
    ctx.lineTo(20, -26);
    ctx.lineTo(28, -18);
    ctx.lineTo(28, 18);
    ctx.lineTo(20, 26);
    ctx.lineTo(-20, 26);
    ctx.lineTo(-28, 18);
    ctx.lineTo(-28, -18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff0ca';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(20, 13, 8, 0.45)';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(246, 226, 181, 0.65)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, 5);
    ctx.restore();
  }

  // 绘制左侧判定核心圆环 (带 120 BPM 呼吸心跳动效)
  drawHitTargetZone(ctx) {
    ctx.save();
    const hx = this.hitZoneX;

    // 120 BPM 节拍心跳呼吸脉冲
    const beatPhase = (this.animTime % this.beatInterval) / this.beatInterval;
    const beatPulse = Math.pow(Math.max(0, 1 - beatPhase * 3.5), 2);
    const pulseRadius = 35 + beatPulse * 5;

    this.drawTargetRing(ctx, hx, this.trackY - 42, this.keyPressAnim.left > 0, '#9d493c', pulseRadius, beatPulse);
    this.drawTargetRing(ctx, hx, this.trackY + 42, this.keyPressAnim.right > 0, '#3e7d82', pulseRadius, beatPulse);

    // 垂直判定金线 (随节拍微光律动)
    ctx.strokeStyle = beatPulse > 0.3 ? '#ffe87c' : '#c39a52';
    ctx.lineWidth = 3.5 + beatPulse * 2;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = beatPulse * 16;
    ctx.beginPath();
    ctx.moveTo(hx, this.trackY - 80);
    ctx.lineTo(hx, this.trackY + 80);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  drawTargetRing(ctx, x, y, isPressed, themeColor, pulseRadius = 35, beatPulse = 0) {
    ctx.save();
    ctx.fillStyle = '#17100b';
    ctx.beginPath();
    ctx.arc(x, y, isPressed ? pulseRadius + 4 : pulseRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isPressed ? '#ffffff' : (beatPulse > 0.4 ? '#d4af37' : '#6f502d');
    ctx.lineWidth = isPressed ? 8 : (6 + beatPulse * 2);
    ctx.stroke();

    ctx.fillStyle = isPressed ? themeColor : (beatPulse > 0.4 ? 'rgba(255, 215, 0, 0.25)' : 'rgba(225, 205, 161, 0.12)');
    ctx.beginPath();
    ctx.arc(x, y, isPressed ? 28 : 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isPressed ? '#ffffff' : '#b88b45';
    ctx.lineWidth = isPressed ? 4 : 2;
    ctx.stroke();
    ctx.restore();
  }

  // 绘制判定反馈 (PERFECT / GREAT / MISS)
  drawJudgmentEffect(ctx) {
    ctx.save();
    const j = this.currentJudgment;
    ctx.fillStyle = j.color;
    ctx.shadowColor = j.color;
    ctx.shadowBlur = 24;
    ctx.font = 'bold 42px "Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.fillText(j.text, this.hitZoneX + 130, this.trackY + 14);
    ctx.restore();
  }

  // 绘制底部实体交互按键台 (Tactile Steam Pressure Deck)
  drawTactileButtons(ctx, w, h) {
    ctx.save();
    const btnY = h - 145;

    // 1. 左大按键: [D / ←] 司炉重铲
    const isLeftPressed = this.keyPressAnim.left > 0;
    ctx.fillStyle = isLeftPressed ? '#9d493c' : '#3a1c18';
    ctx.fillRect(80, btnY, 320, 56);
    ctx.strokeStyle = isLeftPressed ? '#f1ddbd' : '#9d7640';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(80, btnY, 320, 56);
    ctx.strokeStyle = 'rgba(239, 214, 165, 0.28)';
    ctx.strokeRect(86, btnY + 6, 308, 44);

    ctx.fillStyle = '#f2dfbd';
    ctx.font = '600 16px "Baskerville", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('司炉重铲  ·  D / A / ← / 触左', 240, btnY + 34);

    // 2. 中大按键: [空格] 黄金双击超频
    const isSpacePressed = this.keyPressAnim.space > 0;
    ctx.fillStyle = isSpacePressed ? '#c69a43' : '#443418';
    ctx.fillRect(440, btnY, 400, 56);
    ctx.strokeStyle = isSpacePressed ? '#fff0c7' : '#b88b45';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(440, btnY, 400, 56);
    ctx.strokeStyle = 'rgba(239, 214, 165, 0.28)';
    ctx.strokeRect(446, btnY + 6, 388, 44);

    ctx.fillStyle = isSpacePressed ? '#1c130d' : '#f0d89d';
    ctx.fillText('黄金飞轮同步  ·  空格 / J / 双键', 640, btnY + 34);

    // 3. 右大按键: [K / →] 活塞调压
    const isRightPressed = this.keyPressAnim.right > 0;
    ctx.fillStyle = isRightPressed ? '#3e7d82' : '#173237';
    ctx.fillRect(880, btnY, 320, 56);
    ctx.strokeStyle = isRightPressed ? '#e7e1cc' : '#9d7640';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(880, btnY, 320, 56);
    ctx.strokeStyle = 'rgba(239, 214, 165, 0.28)';
    ctx.strokeRect(886, btnY + 6, 308, 44);

    ctx.fillStyle = '#e7e1cc';
    ctx.fillText('活塞调压  ·  K / L / → / 触右', 1040, btnY + 34);

    ctx.restore();
  }

  // 绘制底部控制台、Combo 与能量条
  drawBottomConsole(ctx, w, h) {
    ctx.save();
    const barY = h - 75;

    // 1. 连击数 (COMBO METER)
    ctx.fillStyle = '#e4c783';
    ctx.font = 'bold 32px "Baskerville", serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${this.stats.combo}`, 80, barY + 30);
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#dcd3c0';
    ctx.fillText('COMBO · 连击', 80, barY + 48);

    // 2. 得分与准确统计
    ctx.font = 'bold 18px "Baskerville", serif';
    ctx.fillStyle = '#d7b568';
    ctx.fillText(`SCORE  ${this.stats.score}`, 220, barY + 28);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`PERFECT: ${this.stats.perfect}  |  GREAT: ${this.stats.great}  |  MISS: ${this.stats.miss}`, 220, barY + 48);

    // 3. 蒸汽压力超频蓄力条
    const progW = 420;
    const progX = w - 500;
    ctx.fillStyle = '#f5eedb';
    ctx.font = 'bold 14px "Baskerville", serif';
    ctx.textAlign = 'left';
    ctx.fillText(`BOILER PRESSURE  ${this.stats.steamPressure.toFixed(0)} PSI ${this.stats.isFever ? '· FEVER 超频' : ''}`, progX, barY + 24);

    ctx.fillStyle = '#1c130d';
    ctx.fillRect(progX, barY + 32, progW, 18);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(progX, barY + 32, progW, 18);

    ctx.fillStyle = this.stats.isFever ? '#d8aa4b' : '#93453a';
    ctx.fillRect(progX + 1, barY + 33, (progW - 2) * (this.stats.steamPressure / 100), 16);

    ctx.restore();
  }
}
