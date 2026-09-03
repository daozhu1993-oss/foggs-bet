// 《Fogg 的赌约》· 六大洲自适应沉浸环境声景合成器 (Procedural Ambient Soundscape Engine)
// 纯原生 Web Audio API 实时合成，0 外部音频文件依赖，随关卡与地理坐标无缝平滑渐变流转

export class AmbientSoundscape {
  constructor(soundEngine) {
    this.sound = soundEngine;
    this.ctx = null;
    this.currentZone = null;
    this.masterGain = null;
    this.noiseBuffer = null;
    this.activeNodes = [];
    this.intervalId = null;
  }

  ensureContext() {
    if (!this.sound) return false;
    this.sound.resume();
    this.ctx = this.sound.ctx;
    if (!this.ctx) return false;

    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.sound.enabled ? 0.22 : 0.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (!this.noiseBuffer) {
      // 预生成 3 秒高质量粉红/白噪循环缓冲，用于合成风沙、海浪、雨声与柴火噼啪
      const bufferSize = this.ctx.sampleRate * 3;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // 经典 Paul Kellet 算法生成柔和粉噪
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    }
    return true;
  }

  setZone(zoneName) {
    if (!this.sound || !this.sound.enabled) return;
    if (this.currentZone === zoneName) return;

    if (!this.ensureContext()) return;

    // 平滑淡出上一场景声景
    this.stopZone();
    this.currentZone = zoneName;

    const now = this.ctx.currentTime;
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(0, now);
      this.masterGain.gain.linearRampToValueAtTime(0.24, now + 1.2);
    }

    switch (zoneName) {
      case 'london':
        this.buildLondonSoundscape();
        break;
      case 'sea':
      case 'suez':
      case 'hongkong':
        this.buildOceanSteamSoundscape();
        break;
      case 'jungle':
      case 'india':
        this.buildIndiaJungleSoundscape();
        break;
      case 'west':
      case 'rocky':
      case 'nebraska':
        this.buildWildWestSoundscape();
        break;
      case 'fire':
      case 'atlantic':
        this.buildAtlanticFurnaceSoundscape();
        break;
      default:
        this.buildLondonSoundscape();
    }
  }

  // 1. 英国伦敦 · 改良俱乐部壁炉温热木炭噼啪与大本钟古典远鸣
  buildLondonSoundscape() {
    // A. 伦敦细雨微风环境底噪 (Rain & Wind Lowpass)
    const rainSource = this.ctx.createBufferSource();
    rainSource.buffer = this.noiseBuffer;
    rainSource.loop = true;

    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.setValueAtTime(650, this.ctx.currentTime);

    const rainGain = this.ctx.createGain();
    rainGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    rainSource.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(this.masterGain);
    rainSource.start();
    this.activeNodes.push(rainSource, rainGain);

    // B. 大本钟定点深沉钟鸣 (E3 / G#3 / B3 维多利亚经典和弦回响)
    let chimeStep = 0;
    const chimePitches = [164.81, 207.65, 246.94, 164.81]; // E-G#-B-E
    this.intervalId = setInterval(() => {
      if (!this.sound.enabled || this.currentZone !== 'london') return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const bellGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(chimePitches[chimeStep % chimePitches.length], t);
      bellGain.gain.setValueAtTime(0.20, t);
      bellGain.gain.exponentialRampToValueAtTime(0.0005, t + 3.2);

      osc.connect(bellGain);
      bellGain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 3.4);
      chimeStep++;
    }, 4800);
  }

  // 2. 红海 / 苏伊士 · 海洋深邃波涛与轮机气阀呼啸
  buildOceanSteamSoundscape() {
    // A. 深海波涛起伏 (LFO 调制海浪白噪，约 5.5 秒一次浪涌)
    const waveSource = this.ctx.createBufferSource();
    waveSource.buffer = this.noiseBuffer;
    waveSource.loop = true;

    const waveFilter = this.ctx.createBiquadFilter();
    waveFilter.type = 'bandpass';
    waveFilter.frequency.setValueAtTime(420, this.ctx.currentTime);
    waveFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    const waveGain = this.ctx.createGain();
    waveGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    // 浪涌 LFO
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.18, this.ctx.currentTime); // 5.5s 一周期
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(waveGain.gain);

    waveSource.connect(waveFilter);
    waveFilter.connect(waveGain);
    waveGain.connect(this.masterGain);

    waveSource.start();
    lfo.start();
    this.activeNodes.push(waveSource, lfo, waveGain, lfoGain);

    // B. 蒸汽机活塞深沉低频呼哧律动 (Low Engine Piston Chug)
    this.intervalId = setInterval(() => {
      if (!this.sound.enabled || (this.currentZone !== 'sea' && this.currentZone !== 'suez' && this.currentZone !== 'hongkong')) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(55, t);
      osc.frequency.exponentialRampToValueAtTime(32, t + 0.18);
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.24);
    }, 650);
  }

  // 3. 印度雨林与加尔各答 · 湿润林海夏蝉夜鸟与神殿火祭铜铃
  buildIndiaJungleSoundscape() {
    // A. 丛林树海热带微风 (High Shelf Filter)
    const windSource = this.ctx.createBufferSource();
    windSource.buffer = this.noiseBuffer;
    windSource.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    windFilter.Q.setValueAtTime(0.8, this.ctx.currentTime);

    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.07, this.ctx.currentTime);

    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.masterGain);
    windSource.start();
    this.activeNodes.push(windSource, windGain);

    // B. 神庙火祭铜铃与林中清脆鸟语 (Chime & Bell)
    const bells = [1760.00, 2093.00, 2637.02, 3135.96]; // A6-C7-E7-G7
    this.intervalId = setInterval(() => {
      if (!this.sound.enabled || (this.currentZone !== 'jungle' && this.currentZone !== 'india')) return;
      const t = this.ctx.currentTime;
      const pitch = bells[Math.floor(Math.random() * bells.length)];

      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, t);
      g.gain.setValueAtTime(0.09, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 1.7);
    }, 2800);
  }

  // 4. 美国西部荒原与洛矶山 · 苍凉大漠风沙与横贯大陆铁路铁轨撞击
  buildWildWestSoundscape() {
    // A. 荒原风沙呼啸 (Swept Bandpass Noise)
    const sandSource = this.ctx.createBufferSource();
    sandSource.buffer = this.noiseBuffer;
    sandSource.loop = true;

    const sandFilter = this.ctx.createBiquadFilter();
    sandFilter.type = 'bandpass';
    sandFilter.frequency.setValueAtTime(580, this.ctx.currentTime);
    sandFilter.Q.setValueAtTime(2.2, this.ctx.currentTime);

    const sandGain = this.ctx.createGain();
    sandGain.gain.setValueAtTime(0.14, this.ctx.currentTime);

    sandSource.connect(sandFilter);
    sandFilter.connect(sandGain);
    sandGain.connect(this.masterGain);
    sandSource.start();
    this.activeNodes.push(sandSource, sandGain);

    // B. 列车铁轨律动撞击声 (Click-Clack)
    let railBeat = 0;
    this.intervalId = setInterval(() => {
      if (!this.sound.enabled || (this.currentZone !== 'west' && this.currentZone !== 'rocky' && this.currentZone !== 'nebraska')) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(railBeat % 2 === 0 ? 110 : 85, t);
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.09);
      railBeat++;
    }, 380);
  }

  // 5. 大西洋大燃烧 · 怒涛雷暴与巨型锅炉烈火噼啪大燃烧
  buildAtlanticFurnaceSoundscape() {
    // A. 巨浪海暴
    const stormSource = this.ctx.createBufferSource();
    stormSource.buffer = this.noiseBuffer;
    stormSource.loop = true;

    const stormFilter = this.ctx.createBiquadFilter();
    stormFilter.type = 'lowpass';
    stormFilter.frequency.setValueAtTime(800, this.ctx.currentTime);

    const stormGain = this.ctx.createGain();
    stormGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    stormSource.connect(stormFilter);
    stormFilter.connect(stormGain);
    stormGain.connect(this.masterGain);
    stormSource.start();
    this.activeNodes.push(stormSource, stormGain);

    // B. 锅炉内木材柴火爆烈噼啪 (Fire Crackles)
    this.intervalId = setInterval(() => {
      if (!this.sound.enabled || (this.currentZone !== 'fire' && this.currentZone !== 'atlantic')) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1400 + Math.random() * 800, t);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.05);
    }, 180);
  }

  stopZone() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.activeNodes.length > 0) {
      for (const node of this.activeNodes) {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch (e) {}
      }
      this.activeNodes = [];
    }
  }

  updateMuteState() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    if (this.sound && this.sound.enabled) {
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(0.22, now + 0.3);
    } else {
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(0.0, now + 0.2);
    }
  }
}
