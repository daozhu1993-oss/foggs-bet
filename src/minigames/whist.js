// 《Fogg 的赌约》· 关0 伦敦改良俱乐部·7墩惠斯特大师赛 (顶级商业棋牌实景版)
import { MiniGame } from './_base/MiniGame.js';
import { GameImages } from '../assets/images.js';
import { SpriteEngine } from '../engine/sprites.js';
import { particles } from '../engine/particles.js';

export class WhistMiniGame extends MiniGame {
  constructor(params) {
    super(params);

    // 4 位各具风采的维多利亚绅士座次
    this.seats = [
      {
        id: 'fogg',
        name: '斐利亚·福克',
        title: '南家 · 你',
        role: 'South',
        x: 640,
        y: 600,
        tricks: 0,
        color: '#ffd700',
        desc: '冷静自律的赌局发起人'
      },
      {
        id: 'stuart',
        name: '安德鲁·斯图尔特',
        title: '西家 · 对手',
        role: 'West',
        x: 170,
        y: 330,
        tricks: 0,
        color: '#ff6b6b',
        desc: '脾气火爆的银行董事'
      },
      {
        id: 'flanagan',
        name: '托马斯·弗拉纳根',
        title: '北家 · 搭档',
        role: 'North',
        x: 640,
        y: 115,
        tricks: 0,
        color: '#50e3c2',
        desc: '豪爽的大酒商搭档'
      },
      {
        id: 'ralph',
        name: '高捷·拉尔夫',
        title: '东家 · 对手',
        role: 'East',
        x: 1110,
        y: 330,
        tricks: 0,
        color: '#e0b0ff',
        desc: '英格兰银行资深董事'
      }
    ];

    this.trumpSuit = '♥'; // 红桃常驻王牌
    this.totalTricks = 7;
    this.currentTrickIndex = 0;
    this.biddingContract = 5; // 目标赢下 5 墩

    // 初始经典牌库
    this.hands = {
      fogg: [
        { suit: '♠', rank: 'A', value: 14, id: 'f1' },
        { suit: '♠', rank: 'K', value: 13, id: 'f2' },
        { suit: '♠', rank: '10', value: 10, id: 'f3' },
        { suit: '♥', rank: 'A', value: 14, isTrump: true, id: 'f4' },
        { suit: '♥', rank: 'K', value: 13, isTrump: true, id: 'f5' },
        { suit: '♣', rank: 'Q', value: 12, id: 'f6' },
        { suit: '♦', rank: 'A', value: 14, id: 'f7' }
      ],
      stuart: [
        { suit: '♠', rank: 'Q', value: 12, id: 's1' },
        { suit: '♠', rank: '9', value: 9, id: 's2' },
        { suit: '♥', rank: 'Q', value: 12, isTrump: true, id: 's3' },
        { suit: '♣', rank: 'K', value: 13, id: 's4' },
        { suit: '♣', rank: 'J', value: 11, id: 's5' },
        { suit: '♦', rank: 'K', value: 13, id: 's6' },
        { suit: '♦', rank: '9', value: 9, id: 's7' }
      ],
      flanagan: [
        { suit: '♠', rank: 'J', value: 11, id: 'u1' },
        { suit: '♠', rank: '8', value: 8, id: 'u2' },
        { suit: '♥', rank: 'J', value: 11, isTrump: true, id: 'u3' },
        { suit: '♥', rank: '10', value: 10, isTrump: true, id: 'u4' },
        { suit: '♣', rank: 'A', value: 14, id: 'u5' },
        { suit: '♦', rank: 'Q', value: 12, id: 'u6' },
        { suit: '♦', rank: '8', value: 8, id: 'u7' }
      ],
      ralph: [
        { suit: '♠', rank: '7', value: 7, id: 'r1' },
        { suit: '♠', rank: '6', value: 6, id: 'r2' },
        { suit: '♥', rank: '9', value: 9, isTrump: true, id: 'r3' },
        { suit: '♣', rank: '10', value: 10, id: 'r4' },
        { suit: '♣', rank: '8', value: 8, id: 'r5' },
        { suit: '♦', rank: 'J', value: 11, id: 'r6' },
        { suit: '♦', rank: '7', value: 7, id: 'r7' }
      ]
    };

    // 桌面十字槽位 (South, West, North, East)
    this.tableSlots = {
      0: { x: 640, y: 390 }, // South (Fogg)
      1: { x: 490, y: 315 }, // West (Stuart)
      2: { x: 640, y: 240 }, // North (Flanagan)
      3: { x: 790, y: 315 }  // East (Ralph)
    };

    this.currentTrickCards = [];
    this.leadSuit = null;
    this.turnSeatIdx = 1; // 斯图尔特首发

    this.gameState = 'contract_select';
    this.stateTimer = 0;

    this.hoveredCard = null;
    this.draggingCard = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.dragCardX = 0;
    this.dragCardY = 0;
    this.dragVelX = 0;
    this.lastDragX = 0;
    this.cardBounds = [];

    this.dialogueBubble = null;
    this.animTime = 0;
    this.trumpCutscene = null;

    // 预加载绅士真实肖像
    this.portraits = {
      fogg: new Image(),
      stuart: new Image(),
      flanagan: new Image(),
      ralph: new Image()
    };
    if (GameImages.fogg) this.portraits.fogg.src = GameImages.fogg;
    if (GameImages.gentleman_stuart || GameImages.stuart_portrait) {
      this.portraits.stuart.src = GameImages.gentleman_stuart || GameImages.stuart_portrait;
    }
    if (GameImages.fix || GameImages.ralph) {
      this.portraits.ralph.src = GameImages.ralph || GameImages.fix;
    }
    if (GameImages.gentleman_flanagan || GameImages.flanagan_portrait) {
      this.portraits.flanagan.src = GameImages.gentleman_flanagan || GameImages.flanagan_portrait;
    }

    this.bgImg = new Image();
    if (GameImages.reform_club) this.bgImg.src = GameImages.reform_club;
  }

  init() {
    this.currentTrickIndex = 0;
    this.seats.forEach(s => s.tricks = 0);
    this.currentTrickCards = [];
    this.turnSeatIdx = 1;
    this.leadSuit = null;
    this.gameState = 'contract_select';
    this.dialogueBubble = { text: '斯图尔特：「福克，7 墩大牌局！八十天立赌前，你敢立几墩合约？」', seatIdx: 1, timer: 3.5 };
    this.trumpCutscene = null;
    this.animTime = 0;

    this.input.configureUI({ showDpad: false, showA: false, showB: false });
    this.sound.playBigBen();
    if (this.sound.music) this.sound.music.playTheme('london');
  }

  update(dt) {
    this.animTime += dt;

    if (this.dialogueBubble) {
      this.dialogueBubble.timer -= dt;
      if (this.dialogueBubble.timer <= 0) {
        this.dialogueBubble = null;
      }
    }

    if (this.trumpCutscene) {
      this.trumpCutscene.timer -= dt;
      if (this.trumpCutscene.timer <= 0) {
        this.trumpCutscene = null;
      }
    }

    if (this.gameState === 'contract_select') {
      this.handleContractSelection();
      return;
    }

    if (this.stateTimer > 0) {
      this.stateTimer -= dt;
      return;
    }

    if (this.gameState === 'turn_ai') {
      this.playAiCard(this.turnSeatIdx);
    } else if (this.gameState === 'turn_player') {
      this.handlePlayerInput(dt);
    } else if (this.gameState === 'evaluating_trick') {
      this.resolveTrick();
    }
  }

  handleContractSelection() {
    const pointer = this.input.input.pointer;
    if (pointer.justDown) {
      const { x, y } = pointer;
      const btnW = 240;
      const btnH = 75;
      const startX = (1280 - (btnW * 3 + 40)) / 2;
      const btnY = 320;

      for (let i = 0; i < 3; i++) {
        const bx = startX + i * (btnW + 20);
        if (x >= bx && x <= bx + btnW && y >= btnY && y <= btnY + btnH) {
          const targetTricks = 4 + i;
          this.biddingContract = targetTricks;
          this.gameState = 'turn_ai';
          this.stateTimer = 0.35;
          this.sound.playStampThud();
          this.fx.shake(140, 3);
          this.dialogueBubble = { text: `福克：「我以绅士名誉立约赢下 ${targetTricks} 墩。请斯图尔特先生先出牌。」`, seatIdx: 0, timer: 2.5 };
          this.fx.addFloatText(640, 260, `★ 确立立约：${targetTricks} 墩`, '#ffe87c');
          particles.emitSparkles(640, 350, 16);
          break;
        }
      }
    }
  }

  handlePlayerInput(dt) {
    const pointer = this.input.input.pointer;
    const foggHand = this.hands.fogg;

    // 1. 悬停卡牌检测
    this.hoveredCard = null;
    for (let i = this.cardBounds.length - 1; i >= 0; i--) {
      const cb = this.cardBounds[i];
      if (pointer.x >= cb.x && pointer.x <= cb.x + cb.w && pointer.y >= cb.y && pointer.y <= cb.y + cb.h) {
        this.hoveredCard = cb.card;
        break;
      }
    }

    // 2. 点击或拖拽出牌
    if (pointer.justDown && this.hoveredCard) {
      const hasLeadSuit = this.leadSuit && foggHand.some(c => c.suit === this.leadSuit);
      if (hasLeadSuit && this.hoveredCard.suit !== this.leadSuit) {
        this.sound.playCrash();
        this.fx.toast(`⚠ 必须跟出【${this.leadSuit}】花色！手中无此花色时才可出王牌或其他牌`, 2200);
        return;
      }

      this.draggingCard = this.hoveredCard;
      const cb = this.cardBounds.find(b => b.card === this.draggingCard);
      this.dragOffsetX = pointer.x - cb.x;
      this.dragOffsetY = pointer.y - cb.y;
      this.dragCardX = cb.x;
      this.dragCardY = cb.y;
      this.lastDragX = pointer.x;
      this.sound.playCardFlip();
    }

    if (this.draggingCard && pointer.down) {
      this.dragVelX = (pointer.x - this.lastDragX) / (dt || 0.016);
      this.lastDragX = pointer.x;
      this.dragCardX = pointer.x - this.dragOffsetX;
      this.dragCardY = pointer.y - this.dragOffsetY;
    }

    // 释放卡牌（单次点击或上拖直接出牌）
    if (this.draggingCard && !pointer.down) {
      this.commitPlayerCard(this.draggingCard);
      this.draggingCard = null;
    }
  }

  commitPlayerCard(card) {
    const foggHand = this.hands.fogg;
    const idx = foggHand.indexOf(card);
    if (idx !== -1) foggHand.splice(idx, 1);

    if (this.currentTrickCards.length === 0) {
      this.leadSuit = card.suit;
    }

    const isTrumpSlay = card.suit === this.trumpSuit && this.leadSuit !== this.trumpSuit;
    if (isTrumpSlay) {
      this.triggerTrumpSlayCutscene('斐利亚·福克', card);
    }

    const slot = this.tableSlots[0];
    this.currentTrickCards.push({
      seatIdx: 0,
      card,
      x: slot.x,
      y: slot.y,
      rot: 0
    });

    this.sound.playCardSlam();
    this.fx.shake(140, 3.5);
    particles.emitSparkles(slot.x, slot.y, 12);
    this.advanceTurn();
  }

  playAiCard(seatIdx) {
    const seat = this.seats[seatIdx];
    const hand = this.hands[seat.id];
    if (!hand || hand.length === 0) return;

    let chosenCard = null;

    if (this.currentTrickCards.length === 0) {
      // 首发引牌：出手中最大牌
      hand.sort((a, b) => b.value - a.value);
      chosenCard = hand[0];
      this.leadSuit = chosenCard.suit;
    } else {
      // 跟牌阶段
      const matchingCards = hand.filter(c => c.suit === this.leadSuit);
      if (matchingCards.length > 0) {
        matchingCards.sort((a, b) => b.value - a.value);
        chosenCard = matchingCards[0];
      } else {
        // 无同花色：考虑王牌绝杀
        const trumps = hand.filter(c => c.suit === this.trumpSuit);
        if (trumps.length > 0 && (seatIdx !== 2 || Math.random() > 0.25)) {
          chosenCard = trumps[0];
          this.triggerTrumpSlayCutscene(seat.name, chosenCard);
          this.dialogueBubble = { text: `${seat.name}：「红桃王牌绝杀！」`, seatIdx, timer: 1.8 };
        } else {
          hand.sort((a, b) => a.value - b.value);
          chosenCard = hand[0];
        }
      }
    }

    const idx = hand.indexOf(chosenCard);
    hand.splice(idx, 1);

    const slot = this.tableSlots[seatIdx];
    this.currentTrickCards.push({
      seatIdx,
      card: chosenCard,
      x: slot.x,
      y: slot.y,
      rot: (Math.random() * 0.12 - 0.06)
    });

    this.sound.playCardFlip();
    this.advanceTurn();
  }

  triggerTrumpSlayCutscene(playerName, card) {
    this.trumpCutscene = { playerName, card, timer: 0.6 };
    this.sound.playCoin();
    this.fx.addFloatText(640, 310, `💥 ${playerName} · 王牌绝杀！`, '#ffd700');
    particles.emitSparkles(640, 310, 16);
  }

  advanceTurn() {
    if (this.currentTrickCards.length === 4) {
      this.gameState = 'evaluating_trick';
      this.stateTimer = 0.9;
    } else {
      this.turnSeatIdx = (this.turnSeatIdx + 1) % 4;
      if (this.turnSeatIdx === 0) {
        this.gameState = 'turn_player';
      } else {
        this.gameState = 'turn_ai';
        this.stateTimer = 0.35; // 350ms 流畅出牌
      }
    }
  }

  resolveTrick() {
    const trumps = this.currentTrickCards.filter(tc => tc.card.suit === this.trumpSuit);
    let winnerTrickCard = null;

    if (trumps.length > 0) {
      trumps.sort((a, b) => b.card.value - a.card.value);
      winnerTrickCard = trumps[0];
    } else {
      const leads = this.currentTrickCards.filter(tc => tc.card.suit === this.leadSuit);
      leads.sort((a, b) => b.card.value - a.card.value);
      winnerTrickCard = leads[0];
    }

    const winnerSeat = this.seats[winnerTrickCard.seatIdx];
    winnerSeat.tricks++;

    if (winnerTrickCard.seatIdx === 0 || winnerTrickCard.seatIdx === 2) {
      this.sound.playCoinClink();
      this.fx.addFloatText(640, 300, `★ ${winnerSeat.name} 赢下第 ${this.currentTrickIndex + 1} 墩！`, '#ffde59');
      particles.emitSparkles(winnerSeat.x, winnerSeat.y, 14);
    } else {
      this.sound.playCardFlip();
      this.fx.addFloatText(640, 300, `${winnerSeat.name} 赢下本墩`, '#cfd8dc');
    }

    this.currentTrickIndex++;
    this.currentTrickCards = [];
    this.leadSuit = null;

    if (this.currentTrickIndex >= this.totalTricks) {
      this.finishGame();
    } else {
      this.turnSeatIdx = winnerTrickCard.seatIdx;
      if (this.turnSeatIdx === 0) {
        this.gameState = 'turn_player';
      } else {
        this.gameState = 'turn_ai';
        this.stateTimer = 0.45;
      }
    }
  }

  finishGame() {
    this.gameState = 'game_over';
    const foggTeamTricks = this.seats[0].tricks + this.seats[2].tricks;
    const contractMet = foggTeamTricks >= this.biddingContract;
    const isPerfect = foggTeamTricks >= 5;
    const bonusMoney = contractMet ? (this.biddingContract >= 6 ? 1000 : (this.biddingContract >= 5 ? 500 : 0)) : 0;

    setTimeout(() => {
      this.complete({
        result: isPerfect ? 'perfect' : 'good',
        score: foggTeamTricks * 150,
        baseDays: 0,
        daysDelta: isPerfect ? -0.5 : 0,
        moneyDelta: bonusMoney,
        stamp: {
          id: 'london',
          city: 'LONDON',
          date: '02 OCT 1872',
          label: '伦敦·改良俱乐部',
          color: 'london'
        },
        flags: { betAccepted: true, contractMet },
        comment: isPerfect
          ? `福克：「正如我精确计算，我们阵营合力赢下 ${foggTeamTricks} 墩达成 ${this.biddingContract} 墩立约。两万英镑立赌，八十天后见。」`
          : `福克：「牌局已定，赢下 ${foggTeamTricks} 墩。路路通，带上两万英镑现钞，直奔多佛海峡！」`
      });
    }, 1000);
  }

  destroy() {
    super.destroy();
    if (this.sound.music) this.sound.music.stopTheme();
  }

  render(ctx) {
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. 改良俱乐部维多利亚红木手绘油画背景
    if (this.bgImg.complete && this.bgImg.naturalWidth > 0) {
      ctx.drawImage(this.bgImg, 0, 0, w, h);
      ctx.fillStyle = 'rgba(8, 20, 12, 0.72)';
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = '#0f2618';
      ctx.fillRect(0, 0, w, h);
    }

    // 2. 维多利亚豪华红木与绿呢高精牌桌
    this.drawMahoganyTable(ctx, w, h);

    // 3. 顶部豪华信息栏
    this.drawHeaderBanner(ctx, w);

    // 4. 绘制 4 位绅士真实手绘肖像与座次
    this.seats.forEach((seat, idx) => {
      this.drawGentlemanSeat(ctx, seat, idx, this.turnSeatIdx === idx && this.gameState !== 'contract_select');
    });

    // 5. 桌面中央十字落牌槽位
    this.drawTableSlots(ctx);

    // 6. 玩家 7 张手牌
    if (this.gameState !== 'contract_select') {
      this.drawPlayerHand(ctx, w);
    }

    // 7. 合约选择界面
    if (this.gameState === 'contract_select') {
      this.drawContractModal(ctx, w, h);
    }

    // 8. 实时对局对白气泡
    if (this.dialogueBubble) {
      this.drawDialogueBubble(ctx, w);
    }

    // 9. 王牌绝杀瞬间金光特写
    if (this.trumpCutscene) {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  // 绘制维多利亚豪华红木与绿呢牌桌
  drawMahoganyTable(ctx, w, h) {
    ctx.save();
    const cx = w / 2;
    const cy = 315;

    // 外圈红木边缘
    ctx.fillStyle = '#2b170c';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 470, 205, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 内圈绿呢桌面 (Green Baize)
    const baizeGrad = ctx.createRadialGradient(cx, cy, 60, cx, cy, 440);
    baizeGrad.addColorStop(0, '#1d5233');
    baizeGrad.addColorStop(0.7, '#133a23');
    baizeGrad.addColorStop(1, '#0c2416');
    ctx.fillStyle = baizeGrad;
    ctx.strokeStyle = '#c59b27';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 445, 185, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 牌桌中央金印罗盘勋标
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 85, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 222, 89, 0.3)';
    ctx.font = 'bold 13px "Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.fillText('REFORM CLUB · LONDON 1872', cx, cy - 5);
    ctx.font = '11px sans-serif';
    ctx.fillText('WHIST 7-TRICK TOURNAMENT', cx, cy + 15);

    // 桌面 £20,000 赌注金币堆
    ctx.fillStyle = '#d4af37';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(380 + i * 4, 180 - i * 3, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8c6d23';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.fillStyle = '#ffe87c';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('💰 £20,000 立赌注金', 390, 202);

    ctx.restore();
  }

  // 绘制顶部状态栏
  drawHeaderBanner(ctx, w) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 10, 6, 0.92)';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2.5;
    ctx.fillRect(w / 2 - 320, 12, 640, 42);
    ctx.strokeRect(w / 2 - 320, 12, 640, 42);

    ctx.fillStyle = '#ffe87c';
    ctx.font = 'bold 16px "Baskerville", serif';
    ctx.textAlign = 'center';

    const teamTricks = this.seats[0].tricks + this.seats[2].tricks;
    ctx.fillText(
      `♠ 惠斯特决胜局 | 王牌: ${this.trumpSuit} 红桃 | 第 ${Math.min(this.currentTrickIndex + 1, 7)} / 7 墩 | 阵营胜墩: ${teamTricks} / ${this.biddingContract} 墩`,
      w / 2,
      38
    );
    ctx.restore();
  }

  // 绘制绅士真实肖像与座次
  drawGentlemanSeat(ctx, seat, idx, isTurn) {
    ctx.save();
    const x = seat.x;
    const y = seat.y;

    // 行动指示光圈
    if (isTurn) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ffde59';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(x, y, 42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 头像金框底座
    ctx.fillStyle = '#1c130c';
    ctx.beginPath();
    ctx.arc(x, y, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = seat.color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // 绘制真实油画肖像
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 33, 0, Math.PI * 2);
    ctx.clip();

    const img = this.portraits[seat.id];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, x - 33, y - 33, 66, 66);
    } else {
      // 备用肖像绘制
      ctx.fillStyle = '#221810';
      ctx.fillRect(x - 33, y - 33, 66, 66);
    }
    ctx.restore();

    // 姓名与头衔徽标
    ctx.fillStyle = seat.color;
    ctx.font = 'bold 13px "Baskerville", serif';
    ctx.textAlign = 'center';
    const labelY = y + (seat.id === 'fogg' ? -46 : 50);
    ctx.fillText(`${seat.name}`, x, labelY);

    ctx.fillStyle = '#ffffff';
    ctx.font = '11px sans-serif';
    ctx.fillText(`[胜 ${seat.tricks} 墩 · ${seat.title}]`, x, labelY + 16);

    ctx.restore();
  }

  // 绘制中央十字槽位
  drawTableSlots(ctx) {
    ctx.save();

    [0, 1, 2, 3].forEach(seatIdx => {
      const slot = this.tableSlots[seatIdx];
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(slot.x - 38, slot.y - 52, 76, 104);
    });

    for (const tc of this.currentTrickCards) {
      ctx.save();
      ctx.translate(tc.x, tc.y);
      ctx.rotate(tc.rot || 0);
      this.drawSingleCard(ctx, -38, -52, 76, 104, tc.card, false, false);
      ctx.restore();
    }

    ctx.restore();
  }

  // 绘制福克手牌
  drawPlayerHand(ctx, w) {
    this.cardBounds = [];
    const foggHand = this.hands.fogg;
    if (!foggHand || foggHand.length === 0) return;

    const cardW = 90;
    const cardH = 132;
    const gap = 14;
    const totalW = foggHand.length * cardW + (foggHand.length - 1) * gap;
    const startX = (w - totalW) / 2;

    foggHand.forEach((card, idx) => {
      if (card === this.draggingCard) return;

      const isHovered = card === this.hoveredCard;
      const x = startX + idx * (cardW + gap);
      const y = 515 - (isHovered ? 26 : 0);

      const hasLead = this.leadSuit && foggHand.some(c => c.suit === this.leadSuit);
      const isValid = !this.leadSuit || !hasLead || card.suit === this.leadSuit;

      this.drawSingleCard(ctx, x, y, cardW, cardH, card, isValid, isHovered);
      this.cardBounds.push({ x, y, w: cardW, h: cardH, card });
    });

    // 正在拖拽的卡牌
    if (this.draggingCard) {
      ctx.save();
      const tilt = Math.max(-0.25, Math.min(0.25, this.dragVelX * 0.0003));
      ctx.translate(this.dragCardX + 45, this.dragCardY + 66);
      ctx.rotate(tilt);
      this.drawSingleCard(ctx, -45, -66, 90, 132, this.draggingCard, true, true);
      ctx.restore();
    }

    // 底部操作提示
    ctx.fillStyle = 'rgba(12, 8, 4, 0.95)';
    ctx.fillRect(200, 660, w - 400, 48);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(200, 660, w - 400, 48);

    ctx.fillStyle = '#ffe87c';
    ctx.font = 'bold 14px "Baskerville", serif';
    ctx.textAlign = 'center';

    if (this.gameState === 'turn_player') {
      ctx.fillText(
        this.leadSuit
          ? `【轮到您出牌】请跟出【${this.leadSuit}】花色牌 | 点击或向上拖拽出牌`
          : '【由您首发引牌】请点击任意一张手牌引领本墩！',
        w / 2,
        690
      );
    } else {
      ctx.fillText('🎩 其他绅士正在思考与出牌中……', w / 2, 690);
    }
  }

  // 绘制复古卡牌
  drawSingleCard(ctx, x, y, w, h, card, isValid = true, isHovered = false) {
    ctx.save();
    ctx.shadowColor = isHovered ? 'rgba(255, 215, 0, 0.7)' : 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = isHovered ? 18 : 10;
    ctx.shadowOffsetY = isHovered ? 10 : 4;

    ctx.fillStyle = isValid ? '#ffffff' : '#d8d2c4';
    ctx.strokeStyle = card.suit === this.trumpSuit ? '#d4af37' : (isHovered ? '#ffd700' : '#8c6d23');
    ctx.lineWidth = card.suit === this.trumpSuit ? 3 : (isHovered ? 2.5 : 1.5);
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.shadowColor = 'transparent';

    const isRed = card.suit === '♥' || card.suit === '♦';
    ctx.fillStyle = isRed ? '#b82b2b' : '#141414';

    ctx.font = 'bold 16px "Helvetica Neue", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(card.rank, x + 7, y + 20);
    ctx.font = '14px sans-serif';
    ctx.fillText(card.suit, x + 7, y + 36);

    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(card.suit, x + w / 2, y + h / 2 + 10);

    if (card.suit === this.trumpSuit) {
      ctx.fillStyle = '#b8860b';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('★ TRUMP ★', x + w / 2, y + h - 6);
    }
    ctx.restore();
  }

  // 绘制开局立赌合约模态
  drawContractModal(ctx, w, h) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#f5eedb';
    ctx.strokeStyle = '#8c6d23';
    ctx.lineWidth = 3.5;
    ctx.fillRect(w / 2 - 420, 180, 840, 310);
    ctx.strokeRect(w / 2 - 420, 180, 840, 310);

    ctx.fillStyle = '#2b1f17';
    ctx.font = 'bold 24px "Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.fillText('【斐利亚·福克 · 惠斯特立赌合约】', w / 2, 230);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#5c3a21';
    ctx.fillText('请预测本局你与搭档（弗拉纳根）将合力赢下的吃墩数，直接点击立约启程：', w / 2, 265);

    const contracts = [
      { label: '稳健立约 (4 墩)', sub: '基础通关 · 准点启程' },
      { label: '绅士加注 (5 墩)', sub: '完美评价 · 额外奖 £500' },
      { label: '大满贯豪赌 (6 墩)', sub: '绝杀封神 · 额外奖 £1,000' }
    ];

    const btnW = 240;
    const btnH = 75;
    const startX = (w - (btnW * 3 + 40)) / 2;
    const btnY = 320;

    contracts.forEach((c, idx) => {
      const bx = startX + idx * (btnW + 20);
      ctx.fillStyle = '#8b1e1e';
      ctx.fillRect(bx, btnY, btnW, btnH);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(bx, btnY, btnW, btnH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "Baskerville", serif';
      ctx.fillText(c.label, bx + btnW / 2, btnY + 32);
      ctx.fillStyle = '#ffde59';
      ctx.font = '12px sans-serif';
      ctx.fillText(c.sub, bx + btnW / 2, btnY + 56);
    });
  }

  // 绘制对话气泡
  drawDialogueBubble(ctx, w) {
    const seat = this.seats[this.dialogueBubble.seatIdx];
    ctx.save();
    ctx.fillStyle = 'rgba(250, 245, 235, 0.96)';
    ctx.strokeStyle = '#8c6d23';
    ctx.lineWidth = 2;
    const bw = 380;
    const bh = 54;
    const bx = Math.max(30, Math.min(w - bw - 30, seat.x - bw / 2));
    const by = seat.y - 110;
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeRect(bx, by, bw, bh);

    ctx.fillStyle = '#2b1f17';
    ctx.font = '13px "Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.dialogueBubble.text, bx + bw / 2, by + 32);
    ctx.restore();
  }
}
