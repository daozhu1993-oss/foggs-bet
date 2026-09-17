// 南海航行：借风赶路 → 收帆护船 → 上海外海发信号。航程压缩，不模拟真实海里。
import { MiniGame } from './_base/MiniGame.js';
import { SpriteEngine } from '../engine/sprites.js';
import { GameImages } from '../assets/images.js';

const clampSea = (value, min, max) => Math.max(min, Math.min(max, value));
// 固定天气给玩家可学习的航路；预警先于伤害，不随机生成必中的弹幕。
const SEA_GALES = [
  { start: 15, duration: 6, direction: 1 },
  { start: 30, duration: 7, direction: -1 },
  { start: 46, duration: 6, direction: 1 }
];
const SEA_SAIL_BUTTON = { x: 404, y: 637, w: 242, h: 60 };
const SEA_SIGNAL_BUTTON = { x: 666, y: 637, w: 242, h: 60 };

export class TyphoonSailingMiniGame extends MiniGame {
  constructor(params) {
    super(params);
    this.background = new Image();
    this.background.src = GameImages.south_china_sea_typhoon || GameImages.hongkong || '';
  }

  init() {
    this.boat = { x: 640, y: 524, tilt: 0 };
    this.phase = 'practice';
    this.lesson = 0;
    this.lessonHold = 0;
    this.reefed = false;
    this.hull = 100;
    this.distance = 0;
    this.targetDistance = 2100;
    this.timer = 75;
    this.elapsed = 0;
    this.animTime = 0;
    this.speed = 0;
    this.courseQuality = 1;
    this.targetX = null;
    this.signalSent = false;
    this.endDelay = 0;
    this.damageSoundCooldown = 0;
    this.lastWeather = 'calm';
    this.notice = '';
    this.noticeTime = 0;
    this.input.configureUI({ showDpad: false, showA: true, showB: true, showC: false,
      labelA: '收 / 展帆', labelB: '信号' });
    this.sound.music?.playTheme('steamer');
  }

  courseX(distance = this.distance) {
    if (this.phase === 'practice') return 880;
    if (this.phase === 'signal' || this.phase === 'ending') return 640;
    return 640 + 220 * Math.sin(distance / 245 + Math.PI / 2) + 55 * Math.sin(distance / 103);
  }

  weather() {
    if (this.phase !== 'sailing') return { storm: false, warning: false, direction: 0 };
    for (const gale of SEA_GALES) {
      if (this.elapsed >= gale.start && this.elapsed < gale.start + gale.duration) {
        return { storm: true, warning: false, direction: gale.direction };
      }
      if (this.elapsed >= gale.start - 3 && this.elapsed < gale.start) {
        return { storm: false, warning: true, direction: gale.direction,
          countdown: Math.ceil(gale.start - this.elapsed) };
      }
    }
    return { storm: false, warning: false, direction: Math.sin(this.elapsed / 9) };
  }

  say(text) {
    this.notice = text;
    this.noticeTime = 2.5;
  }

  update(rawDt) {
    if (!this.running || this.paused) return;
    // ponytail: 不做完整航海模拟；掉帧上限 50ms，避免一次后台恢复穿过整段强风。
    const dt = clampSea(Number.isFinite(rawDt) ? rawDt : 0, 0, 0.05);
    if (!dt) return;
    this.animTime += dt;
    this.noticeTime = Math.max(0, this.noticeTime - dt);
    this.damageSoundCooldown = Math.max(0, this.damageSoundCooldown - dt);
    if (this.phase === 'ending') {
      this.endDelay -= dt;
      if (this.endDelay <= 0) this.complete(this.finalResult);
      return;
    }

    const input = this.input.input;
    let sailPressed = input.buttons.justA;
    let signalPressed = input.buttons.justB || input.justKeys.KeyQ;
    const pointer = input.pointer;
    const inside = box => pointer.x >= box.x && pointer.x <= box.x + box.w &&
      pointer.y >= box.y && pointer.y <= box.y + box.h;
    const onSail = !this.input.isTouchDevice && inside(SEA_SAIL_BUTTON);
    const onSignal = !this.input.isTouchDevice && inside(SEA_SIGNAL_BUTTON);
    if (pointer.justDown && onSail) sailPressed = true;
    if (pointer.justDown && onSignal) signalPressed = true;
    if ((pointer.justDown || pointer.down) && !onSail && !onSignal && pointer.y > 230 && pointer.y < 620) {
      this.targetX = clampSea(pointer.x, 150, 1130);
    }
    if (sailPressed) {
      this.reefed = !this.reefed;
      this.sound.playClick();
    }

    let steering = input.axis.x;
    if (!steering) steering = Number(!!(input.keys.ArrowRight || input.keys.KeyD)) -
      Number(!!(input.keys.ArrowLeft || input.keys.KeyA));
    // 快速方向轻点也移动一小格；持续按键则平滑掌舵。
    const tap = Number(!!(input.justKeys.ArrowRight || input.justKeys.KeyD)) -
      Number(!!(input.justKeys.ArrowLeft || input.justKeys.KeyA));
    if (steering || tap) this.targetX = null;
    if (tap && !steering) this.boat.x += tap * 32;
    const weather = this.weather();
    const weatherState = weather.storm ? 'storm' : weather.warning ? 'warning' : 'calm';
    if (weatherState !== this.lastWeather) {
      if (weather.warning) this.sound.playSteamWhistle();
      this.lastWeather = weatherState;
    }
    const drift = this.phase === 'sailing' ? weather.direction * (weather.storm ? 42 : 10) * (this.reefed ? 0.35 : 1) : 0;
    const velocity = steering ? steering * 350 : this.targetX === null ? 0 :
      clampSea((this.targetX - this.boat.x) * 5, -350, 350);
    this.boat.x = clampSea(this.boat.x + (velocity + drift) * dt, 150, 1130);
    this.boat.tilt += ((velocity + drift) / 1100 - this.boat.tilt) * Math.min(1, dt * 8);
    this.courseQuality = clampSea(1 - Math.max(0, Math.abs(this.boat.x - this.courseX()) - 90) / 260, 0, 1);

    if (this.phase === 'practice') {
      this.speed = 0;
      if (this.lesson === 0) {
        this.lessonHold = Math.abs(this.boat.x - 880) < 100 ? this.lessonHold + dt : 0;
        if (this.lessonHold >= 0.5) this.lesson = 1;
      }
      // 先试过收帆再掌舵也算学会，不要求按固定顺序重复两次切换。
      if (this.lesson === 1 && this.reefed) {
        this.phase = 'sailing';
        this.targetX = this.boat.x;
        this.say('试航完成。现在展开帆，借风赶路！');
      }
      return;
    }

    this.timer = Math.max(0, this.timer - dt);
    this.elapsed += dt;
    if (this.phase === 'signal') {
      this.speed = 0;
      if (signalPressed) {
        if (Math.abs(this.boat.x - 640) <= 210) {
          this.signalSent = true;
          this.sound.playThunder();
          this.finish(true);
          return;
        }
        this.say('先驶入邮船下方的金色灯光带，再发信号。');
      }
      if (this.timer <= 0) this.finish(false, 'signal');
      return;
    }

    this.speed = (this.reefed ? 27 : 42) * (0.36 + 0.64 * this.courseQuality);
    this.distance = Math.min(this.targetDistance, this.distance + this.speed * dt);
    if (weather.storm && !this.reefed) {
      this.hull = Math.max(0, this.hull - 9 * dt);
      if (this.damageSoundCooldown <= 0) {
        this.sound.playCrash();
        this.fx.triggerHaptic(15);
        this.damageSoundCooldown = 2;
      }
    }
    if (signalPressed) this.say('信号炮留到上海外海；现在先照看船帆。');
    if (this.hull <= 0) { this.finish(false, 'hull'); return; }
    if (this.timer <= 0) { this.finish(false, 'time'); return; }
    if (this.distance >= this.targetDistance) {
      this.phase = 'signal';
      // 航程时间和拦船窗口分别显示；保留航行余裕用于评级。
      this.arrivalReserve = this.timer;
      this.timer = 12;
      this.say('邮船正在离港！驶入灯光带，发信号请它停船。');
    }
  }

  finish(reached, reason = '') {
    if (this.phase === 'ending' || this.completed) return;
    const perfect = reached && this.hull >= 80 && this.arrivalReserve >= 10;
    const comment = reached
      ? `信号炮响，上海外海的邮船停了下来。船体完好度 ${Math.round(this.hull)}%，${perfect ? '还为旅程省下半天。' : '终于接上了去横滨的航线。'}`
      : reason === 'hull'
        ? '强风扯坏了帆索。船长把坦克德尔号驶入避风锚地，人都平安，但没能拦住这一班邮船。'
        : reason === 'signal'
          ? '没有及时发出有效信号，邮船驶出了视线。船长决定入港，另找去横滨的船。'
          : '帆船没能在离港前赶到上海外海。船长决定先靠岸，等下一班去横滨的船。';
    this.finalResult = {
      result: reached ? (perfect ? 'perfect' : 'good') : 'pass',
      rank: reached ? (perfect ? 'S' : 'A') : 'B', reached,
      score: Math.round(this.distance * 0.5 + (reached ? this.hull * 8 + this.arrivalReserve * 20 + 1500 : 0)),
      daysDelta: reached ? (perfect ? -0.5 : 0) : 1,
      moneyDelta: 0, hull: Math.round(this.hull), reason, comment,
      flags: { typhoonConquered: reached, steamerBoarded: reached, shanghaiSignalSent: reached && this.signalSent }
    };
    this.phase = 'ending';
    this.endDelay = reached ? 1.6 : 1;
    this.speed = 0;
  }

  render(ctx) {
    ctx.save();
    const weather = this.weather();
    const sea = ctx.createLinearGradient(0, 0, 0, 720);
    sea.addColorStop(0, '#101d29'); sea.addColorStop(0.5, '#1e414a'); sea.addColorStop(1, '#14343b');
    ctx.fillStyle = sea; ctx.fillRect(0, 0, 1280, 720);
    if (this.background.complete && this.background.naturalWidth) {
      ctx.globalAlpha = weather.storm ? 0.16 : 0.08;
      ctx.drawImage(this.background, 0, 0, 1280, 720);
      ctx.globalAlpha = 1;
    }
    this.drawSea(ctx, weather);
    this.drawCourse(ctx);
    if (this.phase === 'signal' || this.signalSent) {
      SpriteEngine.drawSSColoradoSteamer(ctx, 640, 335, 330, 160, this.animTime);
      ctx.fillStyle = '#f1ddb1'; ctx.font = '22px Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText(this.signalSent ? '邮船减速，接你们上船' : '上海外海 · 即将离港的邮船', 640, 255);
      if (this.signalSent) {
        ctx.strokeStyle = '#e7c774'; ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          ctx.globalAlpha = (3 - i) / 4;
          ctx.beginPath(); ctx.arc(this.boat.x, this.boat.y - 50, 25 + i * 30 + this.animTime % 1 * 25, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }
    // 沿用木船与人物资产，收帆直接改变可见帆面，不再出现武器或海怪血条。
    SpriteEngine.drawTankadereSchooner(ctx, this.boat.x, this.boat.y + Math.sin(this.animTime * 2.6) * 3,
      this.boat.tilt, this.reefed ? 0.25 : 0.85, false, this.animTime);
    if (this.hull < 40) {
      ctx.strokeStyle = '#d49d75'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(this.boat.x - 15, this.boat.y + 12);
      ctx.lineTo(this.boat.x + 6, this.boat.y + 26); ctx.stroke();
    }
    this.drawInstruments(ctx, weather);
    ctx.restore();
  }

  drawSea(ctx, weather) {
    // 可预读的整排白浪，强风前先出现；不闪白屏、不做随机全屏震动。
    const flow = this.animTime * (weather.storm ? 80 : 26);
    ctx.lineWidth = weather.storm ? 3 : 1.5;
    for (let row = 0; row < 10; row++) {
      const y = 230 + (row * 52 + flow) % 395;
      ctx.strokeStyle = weather.storm ? 'rgba(212,232,220,.32)' : 'rgba(186,207,196,.14)';
      ctx.beginPath();
      for (let x = -40; x <= 1320; x += 20) {
        const waveY = y + Math.sin(x / 45 + row + this.animTime) * (weather.storm ? 9 : 4);
        if (x === -40) ctx.moveTo(x, waveY); else ctx.lineTo(x, waveY);
      }
      ctx.stroke();
    }
    if (weather.storm || weather.warning) {
      ctx.strokeStyle = 'rgba(222,232,227,.20)'; ctx.lineWidth = 1;
      for (let i = 0; i < 42; i++) {
        const x = (i * 137 + this.animTime * 65 * weather.direction + 100000) % 1280;
        const y = 235 + (i * 79 + this.animTime * 350) % 375;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + weather.direction * 9, y + 22); ctx.stroke();
      }
    }
  }

  drawCourse(ctx) {
    const points = [];
    for (let y = 260; y <= 614; y += 18) {
      const ahead = Math.max(0, this.boat.y - y) * 0.8;
      points.push({ x: this.courseX(this.distance + ahead), y, width: 100 + (y - 260) * 0.20 });
    }
    ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p.x - p.width, p.y) : ctx.moveTo(p.x - p.width, p.y));
    [...points].reverse().forEach(p => ctx.lineTo(p.x + p.width, p.y));
    ctx.closePath(); ctx.fillStyle = 'rgba(222,195,129,.10)'; ctx.fill();
    ctx.strokeStyle = 'rgba(231,204,142,.58)'; ctx.lineWidth = 2;
    ctx.setLineDash([9, 15]); ctx.stroke(); ctx.setLineDash([]);
    const target = this.courseX();
    ctx.strokeStyle = '#d6ba75'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(target - 14, 433); ctx.lineTo(target, 420); ctx.lineTo(target + 14, 433); ctx.stroke();
    ctx.fillStyle = '#f1ddb1'; ctx.textAlign = 'center'; ctx.font = '21px Georgia, serif';
    ctx.fillText(this.phase === 'signal' ? '驶入灯光带' : '跟随金色航道', target, 407);
  }

  panel(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(12,28,34,.93)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(209,180,116,.56)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
  }

  drawInstruments(ctx, weather) {
    // 世界 HUD 占据顶部；本关仪表从 y=86 开始，给手机底部动作键留白。
    this.panel(ctx, 32, 86, 1216, 64);
    ctx.textAlign = 'left'; ctx.fillStyle = '#f0dfb7'; ctx.font = '23px Georgia, serif';
    ctx.fillText(this.phase === 'practice' ? '试航 · 不计时' :
      `${this.phase === 'signal' ? '拦船窗口' : '船期余裕'}  ${Math.ceil(this.timer)} 秒`, 54, 124);
    ctx.fillText(`航程  ${Math.floor(this.distance / this.targetDistance * 100)}%`, 388, 124);
    ctx.fillStyle = '#334b50'; ctx.fillRect(538, 107, 280, 12);
    ctx.fillStyle = '#d2b46e'; ctx.fillRect(538, 107, 280 * this.distance / this.targetDistance, 12);
    ctx.fillStyle = this.hull < 40 ? '#f6af8c' : '#f0dfb7';
    ctx.fillText(`船体  ${Math.ceil(this.hull)}%`, 920, 124);
    ctx.fillStyle = '#334b50'; ctx.fillRect(1084, 107, 135, 12);
    ctx.fillStyle = this.hull < 40 ? '#d78463' : '#94b6a1'; ctx.fillRect(1084, 107, 135 * this.hull / 100, 12);

    let title, detail;
    if (this.phase === 'practice') {
      title = this.lesson === 0 ? '试航 1 / 2 · 把船驶入右侧金色航道' : '试航 2 / 2 · 收一次帆，学会护船';
      detail = this.lesson === 0 ? '点击右侧海面，或用 ← → / A D 掌舵。这里不扣时间，也不会受损。' :
        '按空格 / 触屏 A，或点下方「收帆」。收帆能护船，但会减慢航速。';
    } else if (this.phase === 'ending') {
      title = this.signalSent ? '邮船回应了 · 坦克德尔号追上了船期' : '先让所有人平安靠岸';
      detail = this.signalSent ? '福克收起怀表：下一站，横滨。' : '可以重试本关；主线也可多花一天，另船续航。';
    } else if (this.phase === 'signal') {
      title = '03 · 上海外海：发信号，拦住邮船';
      detail = '驶到邮船下方的灯光带，按 Q / 触屏 B，或点「发信号」。';
    } else if (weather.storm) {
      title = this.reefed ? '02 · 强风正过境：小帆稳住了船' : '02 · 帆索吃紧！现在收帆';
      detail = this.reefed ? '船体受到保护。继续掌舵，等白浪退去再展帆。' : '按空格 / 触屏 A 收帆。全帆正在受损，每秒损失 9% 船体。';
    } else if (weather.warning) {
      title = `强风将至 · ${weather.countdown} 秒后抵达`;
      detail = this.reefed ? '帆已收妥。跟随金色航道，准备穿过这阵风。' : '提前按空格 / 触屏 A 收帆。收帆后仍可掌舵。';
    } else {
      title = this.elapsed > 52 ? '03 · 风停了，展开帆追赶邮船' :
        this.elapsed >= 15 ? '02 · 风势暂缓，展开帆赶路' : '01 · 借风赶路';
      detail = this.reefed ? '现在适合展帆：再按一次空格 / 触屏 A，恢复航速。' :
        '跟随金色航道航速更快。看见强风预告时再收帆。';
    }
    this.panel(ctx, 32, 164, 1216, 67);
    if (weather.warning) {
      ctx.fillStyle = '#d9b561'; ctx.fillRect(32, 164, 8, 67);
    }
    ctx.textAlign = 'center'; ctx.font = 'bold 26px Georgia, serif';
    ctx.fillStyle = weather.storm && !this.reefed ? '#ffc2a5' : weather.warning ? '#f0cc78' : '#f5e7c9';
    ctx.fillText(title, 640, 191, 1160);
    ctx.font = '20px Georgia, serif'; ctx.fillStyle = '#d7ddd2'; ctx.fillText(detail, 640, 219, 1160);

    this.panel(ctx, 32, 557, 300, 58);
    ctx.textAlign = 'left'; ctx.font = '22px Georgia, serif'; ctx.fillStyle = '#f0dfb7';
    ctx.fillText(`${this.reefed ? '小帆护船' : '全帆赶路'} · 航速 ${Math.round(this.speed / 42 * 100)}%`, 48, 583);
    ctx.font = '17px Georgia, serif'; ctx.fillStyle = '#bdcfc5';
    ctx.fillText(this.courseQuality > 0.85 ? '航向合适 · 正在借风' : '向金色航道靠拢，可提高航速', 48, 605);
    if (this.noticeTime > 0) {
      this.panel(ctx, 362, 580, 865, 37); ctx.textAlign = 'center';
      ctx.fillStyle = '#f7e4b6'; ctx.font = '20px Georgia, serif'; ctx.fillText(this.notice, 794, 605, 827);
    }
    if (this.input.isTouchDevice) {
      ctx.textAlign = 'left'; ctx.font = '21px Georgia, serif'; ctx.fillStyle = '#ead9b2';
      ctx.fillText('点海面掌舵 · A 收 / 展帆 · B 信号', 48, 670);
    } else {
      this.drawButton(ctx, SEA_SAIL_BUTTON, this.reefed ? '空格 · 展帆赶路' : '空格 · 收帆护船', true);
      this.drawButton(ctx, SEA_SIGNAL_BUTTON, 'Q · 发信号', this.phase === 'signal');
      ctx.textAlign = 'left'; ctx.fillStyle = '#b9cdc6'; ctx.font = '19px Georgia, serif';
      ctx.fillText('点击海面 / ← → 掌舵', 48, 668);
    }
  }

  drawButton(ctx, box, label, active) {
    ctx.fillStyle = active ? '#dec58e' : '#263d42'; ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.strokeStyle = active ? '#efdcb0' : '#62736c'; ctx.lineWidth = 1; ctx.strokeRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = active ? '#172f35' : '#aabbad'; ctx.font = 'bold 22px Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(label, box.x + box.w / 2, box.y + 38);
  }
}
