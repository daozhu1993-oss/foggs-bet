// 原生 Web Audio API 多轨自适应程序化配乐引擎 (零音频文件依赖，纯代码实时合成完整 BGM 旋律)
export class DynamicMusicEngine {
  constructor(soundEngine) {
    this.sound = soundEngine;
    this.ctx = soundEngine ? soundEngine.ctx : null;
    this.currentTheme = null;
    this.loopTimer = null;
    this.stepIndex = 0;
    this.isPlaying = false;
    this.tempo = 120;
    this.masterGain = null;
  }

  ensureContext() {
    this.sound.resume();
    this.ctx = this.sound.ctx;
    if (this.ctx && !this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
  }

  // 播放指定场景主题曲
  playTheme(themeName) {
    if (!this.sound.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    if (this.currentTheme === themeName && this.isPlaying) return;

    this.stopTheme();
    this.currentTheme = themeName;
    this.isPlaying = true;
    this.stepIndex = 0;

    const intervalMs = themeName === 'iceRacer' ? 115 : (themeName === 'dover' ? 140 : (themeName === 'jungle' ? 160 : 220));

    this.loopTimer = setInterval(() => {
      if (!this.isPlaying || !this.sound.enabled) return;
      this.tickThemeNote();
    }, intervalMs);
  }

  stopTheme() {
    if (this.loopTimer) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
    this.isPlaying = false;
    this.currentTheme = null;
  }

  tickThemeNote() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (this.currentTheme === 'atlanticShanty') {
      // 160 BPM 狂暴爱尔兰海盗摇滚与风暴海浪节拍 (Celtic Sea Shanty Punk Rock Beat)
      // D 小调重金属驱动贝斯线 (D minor Celtic Driving Bass)
      const celticBass = [146.83, 146.83, 174.61, 196.00, 220.00, 196.00, 174.61, 130.81, 146.83, 146.83, 174.61, 220.00, 261.63, 220.00, 196.00, 164.81];
      const bass = celticBass[this.stepIndex % celticBass.length];
      this.playSynthPluck(bass * 0.5, 0.32, 0.12, 'sawtooth', now, 1200);
      this.playSynthPluck(bass, 0.18, 0.1, 'square', now, 800);

      // 重低音战鼓与清脆军鼓打点
      if (this.stepIndex % 4 === 0) {
        this.playTaikoBassDrum(0.42, now);
      } else if (this.stepIndex % 4 === 2) {
        this.playTaikoRimShot(0.35, now);
        this.playNoiseHit(0.12, 0.04, now, 5500); // 镲片炸响
      } else {
        this.playNoiseHit(0.06, 0.025, now, 4800); // 16分音符闭镲
      }

      // 高亢爱尔兰风笛/小提琴旋律线 (16步 Celtic Jig Melody)
      const shantyMelody = [
        587.33, 587.33, 659.25, 698.46, 783.99, 698.46, 659.25, 587.33,
        880.00, 783.99, 698.46, 880.00, 1046.50, 880.00, 783.99, 659.25
      ];
      const mel = shantyMelody[this.stepIndex % shantyMelody.length];
      this.playSynthPluck(mel, 0.22, 0.14, 'sawtooth', now, 3200);
      this.playSynthPluck(mel * 0.5, 0.15, 0.14, 'triangle', now, 1800);

    } else if (this.currentTheme === 'iceRacer') {
      // 关8b 专用：155 BPM 极速赛车风暴热血狂飙旋律 (OutRun / F-Zero 风格狂野低音电贝斯与极速琶音)
      const bassNotes = [110.00, 110.00, 130.81, 146.83, 110.00, 130.81, 164.81, 146.83]; // A 小调狂暴贝斯
      const bass = bassNotes[this.stepIndex % bassNotes.length];
      this.playSynthPluck(bass * 0.5, 0.28, 0.12, 'sawtooth', now, 900);

      // 踩镲与军鼓高速打点 (16分音符赛车节奏)
      if (this.stepIndex % 4 === 2) {
        this.playTaikoRimShot(0.24, now);
      } else {
        this.playNoiseHit(0.08, 0.035, now, 4200);
      }

      // 重低音底鼓
      if (this.stepIndex % 4 === 0) {
        this.playTaikoBassDrum(0.38, now);
      }

      // 极速赛车高亢电音旋律 (16步循环副歌)
      const raceMelody = [
        440.00, 523.25, 659.25, 880.00, 783.99, 659.25, 587.33, 659.25,
        880.00, 1046.50, 987.77, 880.00, 783.99, 659.25, 587.33, 523.25
      ];
      const mNote = raceMelody[this.stepIndex % raceMelody.length];
      this.playSynthPluck(mNote, 0.18, 0.15, 'sawtooth', now, 2800);
      this.playSynthPluck(mNote * 0.5, 0.12, 0.15, 'square', now, 1600);

    } else     if (this.currentTheme === 'london') {
      // 维多利亚古典风情 (C大调慢板大本钟和弦)
      const bassNotes = [261.63, 329.63, 392.00, 523.25]; // C - E - G - C
      const melodyNotes = [523.25, 659.25, 587.33, 783.99, 659.25, 523.25, 440.0, 493.88];

      const bass = bassNotes[this.stepIndex % bassNotes.length];
      const mel = melodyNotes[this.stepIndex % melodyNotes.length];

      this.playSynthPluck(bass * 0.5, 0.12, 0.4, 'triangle', now);
      if (this.stepIndex % 2 === 0) {
        this.playSynthPluck(mel, 0.08, 0.35, 'sine', now);
      }
    } else if (this.currentTheme === 'dover') {
      // 多佛港快节奏蒸汽机车进行曲 (140 BPM 快板推进)
      const bassPattern = [110, 110, 146.83, 164.81, 110, 130.81, 146.83, 164.81]; // A小调
      const bass = bassPattern[this.stepIndex % bassPattern.length];

      this.playSynthPluck(bass, 0.15, 0.12, 'sawtooth', now, 600);

      // 节奏蒸汽打点
      if (this.stepIndex % 4 === 2) {
        this.playNoiseHit(0.08, 0.06, now);
      }
      if (this.stepIndex % 8 === 0) {
        this.playSynthPluck(440, 0.09, 0.25, 'triangle', now);
      }
    } else if (this.currentTheme === 'jungle') {
      // 印度丛林热带重低音战鼓与笛音
      const drumPitches = [90, 65, 90, 110, 65, 90, 130, 65];
      const drum = drumPitches[this.stepIndex % drumPitches.length];

      this.playSynthPluck(drum, 0.22, 0.18, 'sine', now);

      if (this.stepIndex % 4 === 0) {
        this.playSynthPluck(392.0, 0.12, 0.3, 'sine', now); // G音
      }
      if (this.stepIndex % 8 === 4) {
        this.playSynthPluck(466.16, 0.14, 0.3, 'triangle', now); // Bb音 (印度风半音)
      }
    } else if (this.currentTheme === 'temple') {
      // 火祭神庙午夜心跳低音潜行 (低沉紧绷)
      const stealthBass = [65.41, 65.41, 77.78, 65.41, 87.31, 65.41, 73.42, 65.41]; // C - Eb - F - D
      const bass = stealthBass[this.stepIndex % stealthBass.length];

      this.playSynthPluck(bass, 0.25, 0.25, 'sine', now);

      if (this.stepIndex % 8 === 0) {
        this.playSynthPluck(523.25, 0.06, 0.6, 'sine', now); // 远方微弱金属颤音
      }
    }

    this.stepIndex++;
  }

  ensureContext() {
    this.sound.resume();
    this.ctx = this.sound.ctx;
    if (this.ctx && !this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
  }

  // 关2专用：纯正《太鼓达人》风格 120 BPM 四段式剧烈起伏鼓点与交响配乐 (零外部音频依赖)
  playSteamStep(stepIndex, isFever = false) {
    if (!this.sound.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const step32 = stepIndex % 32; // 4小节循环 (32个八分音符)
    const step16 = stepIndex % 16;
    const step8 = stepIndex % 8;

    // 四阶段剧烈动态变化 (Section 1: 蓄力 ➔ Section 2: 跳跃 ➔ Section 3: 狂飙 ➔ Section 4: 终章大狂欢)
    if (stepIndex < 40) {
      // =========================================================================
      // 第一阶段 (0.0s ~ 10.0s):【起 · 稳健蓄力】咚 - 咔 - 咚 咚 咔 -
      // =========================================================================
      // 低音大鼓每 2 拍一次稳健推进
      if (step8 === 0 || step8 === 4) {
        this.playTaikoBassDrum(0.48, now); // 重低音咚
      }
      if (step8 === 2 || step8 === 6) {
        this.playTaikoRimShot(0.26, now);  // 脆边咔
      }
      if (step8 === 5) {
        this.playTaikoBassDrum(0.38, now); // 附点咚
      }

      // 低音风琴长音铺底
      if (step8 === 0) {
        this.playSynthPluck(73.42, 0.28, 0.85, 'sawtooth', now, 480);
      }

      // 简洁清透的前奏动机
      const introMel = [293.66, 0, 349.23, 0, 440.00, 392.00, 349.23, 293.66];
      const mNote = introMel[stepIndex % introMel.length];
      if (mNote > 0) {
        this.playSynthPluck(mNote, 0.22, 0.24, 'triangle', now, 1200);
      }

    } else if (stepIndex < 88) {
      // =========================================================================
      // 第二阶段 (10.0s ~ 22.0s):【承 · 切分跳跃】咚 咔 咚 咚 咔 | 咚咔 咚 咔 咚大咚！
      // =========================================================================
      // 欢快的切分音太鼓鼓点
      if ([0, 3, 4, 8, 10, 11, 14].includes(step16)) {
        this.playTaikoBassDrum(0.44, now); // 咚
      }
      if ([2, 6, 9, 12, 15].includes(step16)) {
        this.playTaikoRimShot(0.32, now);  // 咔
      }
      if (step16 === 7) {
        this.playTaikoBigDon(0.46, now);   // 段落大咚！
      }

      // 活泼的 8th-note 踩镲律动
      this.playNoiseHit(stepIndex % 2 === 0 ? 0.08 : 0.14, 0.035, now, 3800);

      // 跳跃感的维多利亚和弦短音
      if (step8 % 2 === 0) {
        const bassNotes = [73.42, 87.31, 65.41, 110.00];
        const b = bassNotes[Math.floor(step32 / 8)];
        this.playSynthPluck(b, 0.26, 0.18, 'sawtooth', now, 620);
      }

      // 活泼的主歌旋律
      const verseMel = [
        293.66, 349.23, 440.00, 523.25, 587.33, 523.25, 440.00, 392.00,
        349.23, 440.00, 523.25, 587.33, 659.25, 587.33, 523.25, 440.00
      ];
      const mNote = verseMel[stepIndex % verseMel.length];
      this.playSynthPluck(mNote, 0.24, 0.22, 'sawtooth', now, 2000);
      this.playSynthPluck(mNote * 0.5, 0.14, 0.22, 'triangle', now, 1000);

    } else if (stepIndex < 144) {
      // =========================================================================
      // 第三阶段 (22.0s ~ 36.0s):【转 · 黄金副歌狂飙】密鼓连打！管乐齐鸣！
      // =========================================================================
      // 极具太鼓达人标志性的密鼓连击 (八分音符连打 + 连音滚奏)
      if ([0, 1, 4, 5, 8, 9, 12, 13, 14].includes(step16)) {
        this.playTaikoBassDrum(0.48, now); // 咚咚 咚咚
      }
      if ([2, 3, 6, 7, 10, 11, 15].includes(step16)) {
        this.playTaikoRimShot(0.36, now);  // 咔咔 咔咔
      }
      if (step16 === 0 || step16 === 8) {
        this.playTaikoBigDon(0.50, now);   // 强拍大咚！
      }

      // 重金属扫镲与高音蒸汽喷涌
      this.playNoiseHit(0.18, 0.06, now, 4500);

      // 宏伟管风琴与黄铜全和弦齐奏
      if (stepIndex % 4 === 0) {
        const chordNotes = [293.66, 349.23, 440.00, 587.33]; // Dm 扩展和弦
        for (const freq of chordNotes) {
          this.playSynthPluck(freq, 0.18, 0.45, 'sawtooth', now, 1600);
        }
      }

      // 激昂高亢的副歌主旋律
      const chorusMel = [
        587.33, 587.33, 659.25, 587.33, 523.25, 440.00, 523.25, 587.33,
        698.46, 659.25, 587.33, 523.25, 440.00, 392.00, 440.00, 523.25
      ];
      const mNote = chorusMel[stepIndex % chorusMel.length];
      this.playSynthPluck(mNote, isFever ? 0.32 : 0.26, 0.25, 'sawtooth', now, 2500);
      this.playSynthPluck(mNote * 0.5, 0.16, 0.25, 'triangle', now, 1400);

      // FEVER 狂暴超频琶音
      if (isFever) {
        const arpNotes = [587.33, 739.99, 880.00, 1174.66];
        this.playSynthPluck(arpNotes[stepIndex % arpNotes.length], 0.20, 0.12, 'square', now, 3200);
      }

    } else {
      // =========================================================================
      // 第四阶段 (36.0s ~ 45.0s):【合 · 孟买冲刺终极大狂欢】十六分音符急速滚奏！
      // =========================================================================
      // 终极连打阵！
      if (stepIndex % 2 === 0) {
        this.playTaikoBassDrum(0.52, now); // 咚！
      } else {
        this.playTaikoRimShot(0.38, now);  // 咔！
      }
      if (step8 === 0 || step8 === 4) {
        this.playTaikoBigDon(0.55, now);   // 连续大咚轰鸣！
      }

      // 全屏金光音阶急速攀升
      const climaxMel = [
        587.33, 659.25, 698.46, 783.99, 880.00, 783.99, 698.46, 659.25,
        587.33, 659.25, 783.99, 880.00, 987.77, 1046.50, 1174.66, 1318.51
      ];
      const mNote = climaxMel[stepIndex % climaxMel.length];
      this.playSynthPluck(mNote, 0.30, 0.18, 'sawtooth', now, 3000);
    }
  }

  playTaikoBassDrum(vol, now) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    const gain2 = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(140, now);
    osc1.frequency.exponentialRampToValueAtTime(42, now + 0.14);
    gain1.gain.setValueAtTime(vol, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(280, now);
    osc2.frequency.exponentialRampToValueAtTime(80, now + 0.08);
    gain2.gain.setValueAtTime(vol * 0.5, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(this.masterGain || this.ctx.destination);
    gain2.connect(this.masterGain || this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.18);
    osc2.stop(now + 0.1);
  }

  playTaikoRimShot(vol, now) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.05);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.Q.setValueAtTime(2.2, now);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  playTaikoBigDon(vol, now) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(110, now);
    osc1.frequency.exponentialRampToValueAtTime(32, now + 0.26);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(587.33, now);
    osc2.frequency.exponentialRampToValueAtTime(880, now + 0.2);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }

  playSynthPluck(freq, vol, duration, type, now, filterFreq = 1800) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, now);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  playNoiseHit(vol, duration, now, filterFreq = 2400) {
    const bufferSize = Math.max(256, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.Q.setValueAtTime(1.2, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    noise.start(now);
  }
}
