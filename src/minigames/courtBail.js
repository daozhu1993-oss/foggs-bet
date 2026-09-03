// 《Fogg 的赌约》· 关4 加尔各答最高法院涉外公堂法理舌战 (文字解谜 & 逆转多轮辩护推理典藏版)
import { MiniGame } from './_base/MiniGame.js';
import { particles } from '../engine/particles.js';
import { GameImages } from '../assets/images.js';
import { SpriteEngine } from '../engine/sprites.js';

export class CourtBailMiniGame extends MiniGame {
  constructor(params) {
    super(params);

    this.timer = 60.0;
    this.persuasionScore = 0;
    this.targetScore = 100;
    this.currentRound = 0;
    this.currentStatementIndex = 0;
    this.selectedCard = -1;
    this.scalesTilt = -0.25; // -1 (偏向控方菲克斯) ~ 1 (偏向福克)

    // 状态机：'testimony' (浏览证言), 'press_dialogue' (追问对话), 'objection_anim' (异议特写), 'verdict_eval' (裁决陈述)
    this.state = 'testimony';
    this.animTimer = 0;
    this.pressDialogueStep = 0;
    this.typewriterIndex = 0;
    this.typewriterTimer = 0;

    this.courtBgImg = new Image();
    const courtSrc = GameImages.calcutta_high_court || GameImages.calcutta || GameImages.calcutta_high_court_art;
    if (courtSrc) this.courtBgImg.src = courtSrc;

    this.judgeImg = new Image();
    if (GameImages.judge_obadiah) this.judgeImg.src = GameImages.judge_obadiah;

    this.fixImg = new Image();
    if (GameImages.fix_prosecutor) this.fixImg.src = GameImages.fix_prosecutor;

    this.foggImg = new Image();
    if (GameImages.fogg) this.foggImg.src = GameImages.fogg;

    this.aoudaImg = new Image();
    if (GameImages.aouda) this.aoudaImg.src = GameImages.aouda;

    this.passepartoutImg = new Image();
    if (GameImages.passepartout) this.passepartoutImg.src = GameImages.passepartout;

    // 3 组深度多陈述句多轮案情推理
    this.rounds = [
      {
        id: 1,
        title: '第一案：孟买帕戈达神庙“鞋履侵入”与伪证破绽',
        targetHint: '仔细追问每一句证词，找出僧侣证词中与过境旅客客观事实的致命矛盾！',
        statements: [
          {
            speaker: '控方证人·孟买僧侣',
            text: '「路路通在孟买帕戈达神庙大门紧闭时，气势汹汹地穿着皮靴强行破门闯入！」',
            pressResponse: {
              fogg: '「证人！据孟买当地市政记录，事发当天乃印度教迎神圣节，庙门四开，何来“破门强闯”之说？」',
              witness: '「呃……就算门没关，他也确实穿了靴子踩在神圣的大理石地板上！」'
            },
            contradictCardIndex: -1
          },
          {
            speaker: '控方证人·孟买僧侣',
            text: '「神殿入口有巨大的梵文禁履石碑，任何长眼睛的人都绝不可能看不见，此乃蓄意亵渎！」',
            pressResponse: {
              fogg: '「路路通先生乃刚从英国抵达印度的法国仆人，他目不识梵文，如何能读懂古碑？」',
              witness: '「不知不知！按当地法律，踏入圣殿就必须扣押八日！」'
            },
            contradictCardIndex: 0 // 出示《过境旅客豁免条例第47条》
          },
          {
            speaker: '控方菲克斯',
            text: '「法官大人！随从犯案，主人同罪！路路通蓄意犯禁，福克为主犯，二人均不得保释！」',
            pressResponse: {
              fogg: '「菲克斯先生，大英普通法何时规定过从犯过失可连坐主人为不可保释之重罪？」',
              witness: '「哼！在加尔各答，任何涉案嫌疑人都休想轻易脱身！」'
            },
            contradictCardIndex: -1
          }
        ],
        cards: [
          {
            title: '📜 《1872 帝国过境旅客豁免条例》第47条',
            desc: '过境旅客因语言不通、不知当地禁忌之轻微违规，免除羁押，准予申诫。',
            quote: '「法官大人！《第47条》明文规定：过境旅客因不知当地风俗之无心过失享有法定豁免！」',
            isCorrect: true,
            score: 35
          },
          {
            title: '🎫 《仰光号头等舱船票》',
            desc: '标明今日正午起航前往香港的豪华客票。',
            quote: '「我们订了头等舱，不能耽误班轮！」',
            isCorrect: false,
            score: -10
          },
          {
            title: '🥾 《路路通被扣留的破旧皮靴》',
            desc: '普通皮靴，鞋底磨损严重。',
            quote: '「这只是一双破旧皮靴，毫无侵占圣物企图！」',
            isCorrect: false,
            score: -15
          },
          {
            title: '🎩 《伦敦改良俱乐部绅士保证书》',
            desc: '斐利亚·福克先生的尊崇社会信誉背书。',
            quote: '「以我斐利亚·福克的绅士信誉担保绝无渎神恶意！」',
            isCorrect: false,
            score: 5
          }
        ],
        successVerdict: '首席大法官奥巴迪亚：「异议成立！《第47条》明文保障过境旅客无故意过失，驳回刑事收押请求！」',
        failVerdict: '首席大法官奥巴迪亚：「异议驳回！出示证据与当前陈述无直接法理冲突！」'
      },
      {
        id: 2,
        title: '第二案：伦敦银行五万五千镑巨劫案的“无证构陷”',
        targetHint: '追问菲克斯的执法权限，揭露其未持有效通缉令逮捕大英公民的违法程序！',
        statements: [
          {
            speaker: '控方菲克斯',
            text: '「本人乃伦敦苏格兰场特派刑警菲克斯，奉大英警务总署最高密令跨国缉凶！」',
            pressResponse: {
              fogg: '「菲克斯先生，苏格兰场刑警在东印度殖民地并无直接执法权，需持总监正式令状方可办案！」',
              witness: '「我有总署加急电报！这就代表女王陛下的最高意志！」'
            },
            contradictCardIndex: -1
          },
          {
            speaker: '控方菲克斯',
            text: '「被告福克随身携带两万英镑巨款，外貌特征与伦敦银行五万五千镑大盗分毫不差！」',
            pressResponse: {
              fogg: '「请问全伦敦有多少位头戴黑色高礼帽的绅士？仅凭外貌相似便可定罪么？」',
              witness: '「哼！巨款与路线吻合，不是他还能是谁？！」'
            },
            contradictCardIndex: -1
          },
          {
            speaker: '控方菲克斯',
            text: '「依据紧急警务特例，只要本人提出合理怀疑，法庭就有权将嫌犯扣押八天等待引渡！」',
            pressResponse: {
              fogg: '「没有正式逮捕令原件，任何扣押皆属非法私禁！」',
              witness: '「逮捕令已经在路上！从伦敦寄往加尔各答只需数日！」'
            },
            contradictCardIndex: 1 // 出示《正式逮捕令缺席证明》
          }
        ],
        cards: [
          {
            title: '⚖️ 《大英帝国人身保护法》',
            desc: '未经法定裁决与令状，任何官员不得私自拘押帝国公民。',
            quote: '「公民人身自由受宪法保护，不容无凭扣押！」',
            isCorrect: false,
            score: 10
          },
          {
            title: '📑 《伦敦警察总署正式逮捕令缺席证明》',
            desc: '当庭指出菲克斯手中根本没有总署正式签发并加盖印信之逮捕令原件！',
            quote: '「菲克斯先生！请当庭出示伦敦总署正式逮捕令原件！若拿不出，便是公然滥用职权、非法构陷！」',
            isCorrect: true,
            score: 40
          },
          {
            title: '💰 《巴灵兄弟银行两万英镑正当支票本》',
            desc: '福克先生合法提领正当财产的银行资信证明。',
            quote: '「我随身携带正当资金，资金来源清白无暇！」',
            isCorrect: false,
            score: 5
          },
          {
            title: '⏱️ 《宝玑精密怀表环球日程表》',
            desc: '福克先生分秒不差的环球旅行规划。',
            quote: '「我的行程严密无间，没有任何作案间隙！」',
            isCorrect: false,
            score: -10
          }
        ],
        successVerdict: '首席大法官奥巴迪亚：「异议成立！控方拿不出正式逮捕令，法庭绝不支持无证非法扣押！」',
        failVerdict: '首席大法官奥巴迪亚：「抗辩无力！未能直击控方程序违法之要害！」'
      },
      {
        id: 3,
        title: '第三案：仰光号起锚危机下的终极两千英镑保释决胜',
        targetHint: '面对审理未结与起锚紧迫，使用最高法理保释本票从容破局！',
        statements: [
          {
            speaker: '控方菲克斯',
            text: '「即使没有逮捕令，神庙涉外侵入案已当庭立案，法庭审理程序未完，绝不允许离开加尔各答！」',
            pressResponse: {
              fogg: '「涉外轻微案件依加尔各答司法特例享有随时提请保释之权利！」',
              witness: '「但是你们犯的是渎神重案，法庭不会轻易放行！」'
            },
            contradictCardIndex: -1
          },
          {
            speaker: '首席大法官奥巴迪亚',
            text: '「本案案情复杂，双方各执一词，法庭决定暂缓裁决，休庭至下周一继续审理候传！」',
            pressResponse: {
              fogg: '「法官大人！下周一开庭将使我们错过仰光号班轮，导致不可挽回之重大损失！」',
              witness: '「按法庭通例，除非辩方能当庭提供无法拒绝之法定足额担保……」'
            },
            contradictCardIndex: 2 // 出示《两千英镑保释本票》
          },
          {
            speaker: '控方菲克斯',
            text: '「仰光号汽笛已响，码头引水员已登船，你们今日休想离开这间审判庭！」',
            pressResponse: {
              fogg: '「只要保释金存入国库，我们便拥有自由通行的权利！」',
              witness: '「你们上哪找那么多保释金？！」'
            },
            contradictCardIndex: -1
          }
        ],
        cards: [
          {
            title: '✉️ 《延期开庭审理申请书》',
            desc: '请求法庭延后一周再次审理此案。',
            quote: '「请求法庭休庭择日再审！」',
            isCorrect: false,
            score: -25
          },
          {
            title: '🚢 《仰光号起锚最后通告电文》',
            desc: '仰光号船长发来的最后登船通告。',
            quote: '「班轮即将起锚，请法官体谅放行！」',
            isCorrect: false,
            score: 5
          },
          {
            title: '👑 《英格兰银行 £2,000 黄金保释本票》',
            desc: '福克 £1,000 + 路路通 £1,000 当庭现银存入加尔各答国库！',
            quote: '「法官大人！我当庭呈递英格兰银行两千英镑最高保释本票，存入国库，依法即刻办结出境保释手续！」',
            isCorrect: true,
            score: 45
          },
          {
            title: '📜 《致东印度总督抗议公文》',
            desc: '向总督府草拟的一封外交抗议公函。',
            quote: '「我要向东印度总督阁下提出正式外交抗议！」',
            isCorrect: false,
            score: -10
          }
        ],
        successVerdict: '首席大法官奥巴迪亚：「【当庭裁决：准予保释！】两千英镑足额充入国库，被告即刻获释准予登船！」',
        failVerdict: '首席大法官奥巴迪亚：「抗辩无效！未能满足法定保释程序要件！」'
      }
    ];
  }

  init() {
    this.timer = 60.0;
    this.persuasionScore = 0;
    this.currentRound = 0;
    this.currentStatementIndex = 0;
    this.selectedCard = -1;
    this.scalesTilt = -0.3;
    this.state = 'testimony';
    this.animTimer = 0;
    this.pressDialogueStep = 0;
    this.typewriterIndex = 0;
    this.typewriterTimer = 0;

    this.sound.playCourtGavel();
    this.fx.toast('【加尔各答公堂解谜】[◀/▶] 翻阅证言 | [空格/P] 追问细节 | [1/2/3/4] 出示证据反驳！', 5000);
  }

  update(rawDt) {
    if (!this.running || this.paused) return;
    const dt = Math.max(0.0001, rawDt || 0.016);
    this.timer -= dt;
    this.animTimer += dt;

    // 打字机字幕推进
    this.typewriterTimer += dt;
    if (this.typewriterTimer > 0.025) {
      this.typewriterTimer = 0;
      this.typewriterIndex++;
    }

    // 状态机处理
    if (this.state === 'objection_anim') {
      if (this.animTimer > 1.2) {
        this.state = 'verdict_eval';
        this.evaluateRoundResult();
      }
    } else if (this.state === 'verdict_eval') {
      if (this.animTimer > 2.6) {
        if (this.currentRound < this.rounds.length - 1) {
          this.currentRound++;
          this.currentStatementIndex = 0;
          this.state = 'testimony';
          this.animTimer = 0;
          this.typewriterIndex = 0;
          this.selectedCard = -1;
        } else {
          this.finishGame();
        }
      }
    } else if (this.state === 'press_dialogue') {
      // 追问对话自动或按键推进
      if (this.animTimer > 3.2) {
        this.state = 'testimony';
        this.animTimer = 0;
      }
    }

    // 正义天平物理逼近
    const targetTilt = (this.persuasionScore / 100) * 0.85 - 0.35;
    this.scalesTilt += (targetTilt - this.scalesTilt) * 4 * dt;

    // 玩家按键与点击输入
    if (this.state === 'testimony') {
      const inp = this.input ? this.input.input : null;
      const keys = inp ? (inp.keys || {}) : {};
      const pointer = inp ? (inp.pointer || {}) : {};

      // 1. 翻阅证言 [Left / Right / A / D]
      if (keys['ArrowLeft'] || keys['KeyA']) {
        this.changeStatement(-1);
        keys['ArrowLeft'] = false;
        keys['KeyA'] = false;
      } else if (keys['ArrowRight'] || keys['KeyD']) {
        this.changeStatement(1);
        keys['ArrowRight'] = false;
        keys['KeyD'] = false;
      }

      // 2. 追问威慑 [Space / KeyP / Button P]
      if (keys['Space'] || keys['KeyP']) {
        this.pressCurrentStatement();
        keys['Space'] = false;
        keys['KeyP'] = false;
      }

      // 3. 出示证据卡 [1 / 2 / 3 / 4]
      if (keys['Digit1']) this.presentCard(0);
      else if (keys['Digit2']) this.presentCard(1);
      else if (keys['Digit3']) this.presentCard(2);
      else if (keys['Digit4']) this.presentCard(3);

      // 4. 点击判定
      if (pointer.justDown) {
        const curRound = this.rounds[this.currentRound];
        if (curRound) {
          // 点击【上一句】
          if (pointer.x >= 140 && pointer.x <= 240 && pointer.y >= 290 && pointer.y <= 330) {
            this.changeStatement(-1);
          }
          // 点击【下一句】
          else if (pointer.x >= 1040 && pointer.x <= 1140 && pointer.y >= 290 && pointer.y <= 330) {
            this.changeStatement(1);
          }
          // 点击【💬 追问此句】
          else if (pointer.x >= 540 && pointer.x <= 740 && pointer.y >= 405 && pointer.y <= 445) {
            this.pressCurrentStatement();
          }
          // 点击下方 4 张证据卡
          else {
            for (let i = 0; i < 4; i++) {
              const row = Math.floor(i / 2);
              const col = i % 2;
              const cardX = 140 + col * 510;
              const cardY = 465 + row * 115;
              const cardW = 490;
              const cardH = 100;

              if (pointer.x >= cardX && pointer.x <= cardX + cardW && pointer.y >= cardY && pointer.y <= cardY + cardH) {
                this.presentCard(i);
                break;
              }
            }
          }
        }
      }
    }

    if (this.timer <= 0) {
      this.finishGame();
    }
  }

  changeStatement(delta) {
    const curRound = this.rounds[this.currentRound];
    if (!curRound) return;
    const maxStatements = curRound.statements.length;
    this.currentStatementIndex = (this.currentStatementIndex + delta + maxStatements) % maxStatements;
    this.typewriterIndex = 0;
    this.sound.playCardFlip();
  }

  pressCurrentStatement() {
    const curRound = this.rounds[this.currentRound];
    if (!curRound || !curRound.statements[this.currentStatementIndex]) return;

    this.state = 'press_dialogue';
    this.animTimer = 0;
    this.sound.playCourtGavel();
    if (this.fx && this.fx.shake) this.fx.shake(6, 0.2);
  }

  presentCard(idx) {
    if (this.state !== 'testimony') return;
    const curRound = this.rounds[this.currentRound];
    if (!curRound || !curRound.cards[idx]) return;

    this.selectedCard = idx;
    const card = curRound.cards[idx];
    const curStmt = curRound.statements[this.currentStatementIndex];

    // 判断是否在正确的陈述句上出示了对应的致命证据！
    const isHitContradiction = (curStmt && curStmt.contradictCardIndex === idx);

    this.state = 'objection_anim';
    this.animTimer = 0;
    this.isLastObjectionSuccess = isHitContradiction;

    if (isHitContradiction) {
      this.sound.playCourtObjection();
      if (this.camera) this.camera.addTrauma(0.4);
      if (this.fx) {
        this.fx.triggerHaptic(40);
        if (this.fx.shake) this.fx.shake(12, 0.35);
      }
      particles.emitSparkles(640, 360, 32);
      this.persuasionScore += card.score;
    } else {
      this.sound.playCrash();
      if (this.fx) this.fx.flashRed(180);
      this.persuasionScore = Math.max(0, this.persuasionScore + (card.score < 0 ? card.score : -15));
    }
  }

  evaluateRoundResult() {
    const curRound = this.rounds[this.currentRound];
    const card = curRound.cards[this.selectedCard];

    this.sound.playCourtGavel();
    if (this.camera) this.camera.addTrauma(0.25);
    if (this.fx && this.fx.shake) this.fx.shake(8, 0.2);

    if (this.isLastObjectionSuccess) {
      this.fx.addFloatText(640, 240, '★ 异议成立！破解破绽 +' + card.score + ' 分！', '#50e3c2');
      particles.emitSparkles(640, 260, 16);
    } else {
      this.fx.addFloatText(640, 240, '⚠️ 异议驳回！此处证言无此矛盾！', '#ff4d4d');
    }
  }

  finishGame() {
    this.running = false;
    const isSuccess = this.persuasionScore >= 75;
    const rank = this.persuasionScore >= 110 ? 'S' : (isSuccess ? 'A' : 'B');
    const daysDelta = rank === 'S' ? -0.5 : 0;

    this.sound.playVictory();

    setTimeout(() => {
      this.complete({
        result: isSuccess ? 'perfect' : 'good',
        rank,
        score: Math.max(100, this.persuasionScore * 18 + Math.floor(this.timer * 15)),
        daysDelta,
        moneyDelta: -2000,
        flags: {
          courtWon: true,
          aceAttorneyRank: rank === 'S'
        },
        comment: isSuccess
          ? '福克：「两千英镑已存入加尔各答国库。走吧，艾娥达夫人与路路通，仰光号已经拉响汽笛！」'
          : '虽历经一番公堂舌战，但两千英镑保释金终使全员如期登上仰光号。'
      });
    }, 1200);
  }

  render(ctx) {
    if (!ctx) return;
    const w = this.canvas ? this.canvas.width : 1280;
    const h = this.canvas ? this.canvas.height : 720;

    // 1. 实景加尔各答最高法院 16:9 维多利亚手绘油画大厅
    ctx.save();
    if (this.courtBgImg && this.courtBgImg.complete && this.courtBgImg.naturalWidth > 0) {
      ctx.drawImage(this.courtBgImg, 0, 0, w, h);
      ctx.fillStyle = 'rgba(18, 12, 8, 0.42)';
      ctx.fillRect(0, 0, w, h);
    } else {
      const courtGrad = ctx.createLinearGradient(0, 0, 0, h);
      courtGrad.addColorStop(0, '#1c140e');
      courtGrad.addColorStop(0.5, '#2e1f15');
      courtGrad.addColorStop(1, '#170f0a');
      ctx.fillStyle = courtGrad;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();

    // 2. 顶部法庭 HUD 仪表盘与仰光号起锚倒计时
    this.drawCourtHUD(ctx);

    // 3. 绘制中央【首席大法官奥巴迪亚席位】(Chief Justice Obadiah's Bench)
    this.drawJudgeBench(ctx);

    // 4. 绘制左侧【控方席·侦探菲克斯】(Prosecutor Detective Fix)
    this.drawProsecutorFix(ctx);

    // 5. 绘制右侧【辩方席·斐利亚·福克先生】(Defense Counsel Phileas Fogg)
    this.drawDefenseFogg(ctx);

    // 6. 绘制中央【3D 黄金正义天平】(Scales of Justice)
    this.drawScalesOfJustice(ctx);

    // 7. 绘制公堂多轮证言翻阅与法理证据对决卡片
    this.drawMultiStatementAndCards(ctx);

    // 8. 绘制【💬 追问威慑对话气泡】
    if (this.state === 'press_dialogue') {
      this.drawPressDialogue(ctx);
    }

    // 9. 绘制【⚡ 异议！/ OBJECTION!】全屏高能特写动画
    if (this.state === 'objection_anim') {
      this.drawObjectionCutIn(ctx);
    }
  }

  drawCourtHUD(ctx) {
    const w = this.canvas.width;
    ctx.save();
    // 顶部黑金古典条
    ctx.fillStyle = 'rgba(15, 10, 6, 0.92)';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.fillRect(100, 15, w - 200, 42);
    ctx.strokeRect(100, 15, w - 200, 42);

    ctx.font = 'bold 15px "Baskerville", serif';
    ctx.fillStyle = '#ffe87c';
    ctx.textAlign = 'left';
    ctx.fillText('⚖️ 加尔各答最高法院 · 第 ' + (this.currentRound + 1) + ' / ' + this.rounds.length + ' 案公堂智斗', 125, 42);

    ctx.textAlign = 'right';
    ctx.fillStyle = this.timer < 15 ? '#ff4d4d' : '#50e3c2';
    ctx.fillText('🚢 「仰光号」起锚倒计时: ' + Math.ceil(this.timer) + ' 秒  |  法理得分: ' + this.persuasionScore, w - 125, 42);
    ctx.restore();
  }

  drawJudgeBench(ctx) {
    const w = this.canvas.width;
    const jx = w / 2 - 130;
    const jy = 68;
    const jw = 260;
    const jh = 175;

    ctx.save();
    // 红木法官席高台
    const benchGrad = ctx.createLinearGradient(jx, jy, jx, jy + jh);
    benchGrad.addColorStop(0, '#54361e');
    benchGrad.addColorStop(0.5, '#784d2b');
    benchGrad.addColorStop(1, '#331e0f');
    ctx.fillStyle = benchGrad;
    ctx.fillRect(jx, jy + 60, jw, jh - 60);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.strokeRect(jx, jy + 60, jw, jh - 60);

    // 首席大法官奥巴迪亚立绘原画
    if (this.judgeImg && this.judgeImg.complete && this.judgeImg.naturalWidth > 0) {
      ctx.drawImage(this.judgeImg, jx + 30, jy - 10, jw - 60, jh - 10);
    }

    // 法官铭牌
    ctx.fillStyle = '#1c2321';
    ctx.fillRect(jx + 20, jy + jh - 32, jw - 40, 24);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(jx + 20, jy + jh - 32, jw - 40, 24);

    ctx.fillStyle = '#ffe87c';
    ctx.font = 'bold 12px "Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.fillText('👨‍⚖️ 首席大法官 · 奥巴迪亚勋爵', w / 2, jy + jh - 16);

    ctx.restore();
  }

  drawProsecutorFix(ctx) {
    const fx = 40;
    const fy = 95;
    const fw = 220;
    const fh = 240;

    ctx.save();
    // 控方席木质讲台
    const standGrad = ctx.createLinearGradient(fx, fy, fx + fw, fy);
    standGrad.addColorStop(0, '#362417');
    standGrad.addColorStop(1, '#54361e');
    ctx.fillStyle = standGrad;
    ctx.fillRect(fx, fy + 120, fw, fh - 120);
    ctx.strokeStyle = '#8b1e1e';
    ctx.lineWidth = 3;
    ctx.strokeRect(fx, fy + 120, fw, fh - 120);

    // 菲克斯立绘原画
    if (this.fixImg && this.fixImg.complete && this.fixImg.naturalWidth > 0) {
      ctx.drawImage(this.fixImg, fx + 10, fy - 15, fw - 20, fh - 40);
    }

    // 控方标牌
    ctx.fillStyle = '#8b1e1e';
    ctx.fillRect(fx + 15, fy + fh - 28, fw - 30, 22);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(fx + 15, fy + fh - 28, fw - 30, 22);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.fillText('🕵️ 控方席 · 侦探菲克斯', fx + fw / 2, fy + fh - 13);

    ctx.restore();
  }

  drawDefenseFogg(ctx) {
    const w = this.canvas.width;
    const dx = w - 260;
    const dy = 95;
    const dw = 220;
    const dh = 240;

    ctx.save();
    // 辩方席木质讲台
    const standGrad = ctx.createLinearGradient(dx, dy, dx + dw, dy);
    standGrad.addColorStop(0, '#54361e');
    standGrad.addColorStop(1, '#362417');
    ctx.fillStyle = standGrad;
    ctx.fillRect(dx, dy + 120, dw, dh - 120);
    ctx.strokeStyle = '#50e3c2';
    ctx.lineWidth = 3;
    ctx.strokeRect(dx, dy + 120, dw, dh - 120);

    // 福克先生立绘原画
    if (this.foggImg && this.foggImg.complete && this.foggImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(dx + dw / 2, dy + 60, 52, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.foggImg, dx + dw / 2 - 52, dy + 8, 104, 104);
      ctx.restore();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // 辩方标牌
    ctx.fillStyle = '#1c2321';
    ctx.fillRect(dx + 15, dy + dh - 28, dw - 30, 22);
    ctx.strokeStyle = '#50e3c2';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(dx + 15, dy + dh - 28, dw - 30, 22);

    ctx.fillStyle = '#50e3c2';
    ctx.font = 'bold 12px "Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎩 辩方席 · 斐利亚·福克', dx + dw / 2, dy + dh - 13);

    ctx.restore();
  }

  drawScalesOfJustice(ctx) {
    const w = this.canvas.width;
    const sx = w / 2;
    const sy = 230;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.scalesTilt * 0.45);

    // 黄金支柱底座
    ctx.fillStyle = '#d4af37';
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 天平纯金横梁
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-90, 0);
    ctx.lineTo(90, 0);
    ctx.stroke();

    // 左右黄金吊链与托盘
    const drawPan = (px, isLeft) => {
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px - 14, 24);
      ctx.moveTo(px, 0);
      ctx.lineTo(px + 14, 24);
      ctx.stroke();

      // 托盘与砝码
      ctx.fillStyle = isLeft ? '#8b1e1e' : '#50e3c2';
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(px, 24, 20, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    };

    drawPan(-90, true);  // 控方托盘
    drawPan(90, false); // 辩方福克托盘

    ctx.restore();
  }

  drawMultiStatementAndCards(ctx) {
    const w = this.canvas.width;
    const curRound = this.rounds[this.currentRound];
    if (!curRound) return;

    const curStmt = curRound.statements[this.currentStatementIndex];

    ctx.save();
    // 1. 中央控方多陈述句羊皮纸卷轴
    const testX = 140;
    const testY = 285;
    const testW = w - 280;
    const testH = 165;

    const parchGrad = ctx.createLinearGradient(testX, testY, testX, testY + testH);
    parchGrad.addColorStop(0, '#fbf5e6');
    parchGrad.addColorStop(1, '#e3d2b3');
    ctx.fillStyle = parchGrad;
    ctx.fillRect(testX, testY, testW, testH);

    ctx.strokeStyle = '#8c6d23';
    ctx.lineWidth = 3;
    ctx.strokeRect(testX, testY, testW, testH);

    // 卷轴标题与翻页按钮
    ctx.fillStyle = '#8b1e1e';
    ctx.font = 'bold 14px "Baskerville", serif';
    ctx.textAlign = 'left';
    ctx.fillText('📜 ' + curRound.title, testX + 20, testY + 28);

    // 翻页器【◀ 上一句】 与 【下一句 ▶】
    ctx.fillStyle = '#2b4c7e';
    ctx.fillRect(testX + 20, testY + 40, 95, 26);
    ctx.fillRect(testX + testW - 115, testY + 40, 95, 26);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(testX + 20, testY + 40, 95, 26);
    ctx.strokeRect(testX + testW - 115, testY + 40, 95, 26);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('◀ 上一句 [A]', testX + 67, testY + 57);
    ctx.fillText('下一句 [D] ▶', testX + testW - 67, testY + 57);

    // 陈述句计数指示器 (例：陈述 2 / 3)
    ctx.fillStyle = '#8c6d23';
    ctx.font = 'bold 13px "Baskerville", serif';
    ctx.fillText('• 证词陈述 ' + (this.currentStatementIndex + 1) + ' / ' + curRound.statements.length + ' •', w / 2, testY + 57);

    // 当前证言内容 (打字机字幕)
    if (curStmt) {
      const showText = curStmt.text.substring(0, this.typewriterIndex);
      ctx.fillStyle = '#221911';
      ctx.font = '600 15px sans-serif';
      ctx.textAlign = 'left';
      this.wrapText(ctx, showText, testX + 25, testY + 92, testW - 50, 22);
    }

    // 核心操作：【💬 追问此句细节 / PRESS (Space / P)】按钮
    const pressBtnX = w / 2 - 100;
    const pressBtnY = testY + testH - 38;
    ctx.fillStyle = '#1c2321';
    ctx.fillRect(pressBtnX, pressBtnY, 200, 30);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(pressBtnX, pressBtnY, 200, 30);

    ctx.fillStyle = '#ffe87c';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💬 追问此句细节 [空格/P]', w / 2, pressBtnY + 20);

    // 如果在裁决评估阶段，展示法官当庭裁决条
    if (this.state === 'verdict_eval') {
      const isSuccess = this.isLastObjectionSuccess;
      ctx.fillStyle = isSuccess ? '#0f5132' : '#842029';
      ctx.fillRect(testX + 10, testY + testH - 45, testW - 20, 36);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isSuccess ? curRound.successVerdict : curRound.failVerdict, w / 2, testY + testH - 22);
    }

    // 2. 下方 4 张法理证据卡 (Parchment Legal Evidence Cards)
    for (let i = 0; i < 4; i++) {
      const card = curRound.cards[i];
      const row = Math.floor(i / 2);
      const col = i % 2;
      const cardX = 140 + col * 510;
      const cardY = 465 + row * 115;
      const cardW = 490;
      const cardH = 100;

      const isSelected = this.selectedCard === i;

      // 卡片底色
      const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
      if (isSelected) {
        cardGrad.addColorStop(0, card.isCorrect ? '#50e3c2' : '#ff4d4d');
        cardGrad.addColorStop(1, '#1c2321');
      } else {
        cardGrad.addColorStop(0, '#261a10');
        cardGrad.addColorStop(1, '#150d07');
      }
      ctx.fillStyle = cardGrad;
      ctx.fillRect(cardX, cardY, cardW, cardH);

      ctx.strokeStyle = isSelected ? '#ffd700' : '#8c6d23';
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.strokeRect(cardX, cardY, cardW, cardH);

      // 卡片数字快捷键徽标 [1][2][3][4]
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(cardX + 22, cardY + 24, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c140e';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('[' + (i + 1) + ']', cardX + 22, cardY + 29);

      // 卡片标题
      ctx.fillStyle = isSelected ? '#ffffff' : '#ffe87c';
      ctx.font = 'bold 14px "Baskerville", serif';
      ctx.textAlign = 'left';
      ctx.fillText(card.title, cardX + 45, cardY + 28);

      // 卡片释义
      ctx.fillStyle = '#e8d8be';
      ctx.font = '12px sans-serif';
      this.wrapText(ctx, card.desc, cardX + 20, cardY + 52, cardW - 40, 18);

      // 拍案辩词引用
      ctx.fillStyle = '#50e3c2';
      ctx.font = 'italic 11px sans-serif';
      ctx.fillText(card.quote, cardX + 20, cardY + 88);
    }

    ctx.restore();
  }

  drawPressDialogue(ctx) {
    const w = this.canvas.width;
    const curRound = this.rounds[this.currentRound];
    if (!curRound) return;
    const curStmt = curRound.statements[this.currentStatementIndex];
    if (!curStmt || !curStmt.pressResponse) return;

    ctx.save();
    // 追问对话全屏弹窗
    ctx.fillStyle = 'rgba(10, 8, 5, 0.88)';
    ctx.fillRect(100, 250, w - 200, 220);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.strokeRect(100, 250, w - 200, 220);

    // 福克发问气泡
    ctx.fillStyle = '#50e3c2';
    ctx.font = 'bold 14px "Baskerville", serif';
    ctx.textAlign = 'left';
    ctx.fillText('🎩 福克追问：', 130, 285);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    this.wrapText(ctx, curStmt.pressResponse.fogg, 130, 310, w - 260, 22);

    // 对方辩解破绽气泡
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 14px "Baskerville", serif';
    ctx.fillText('🕵️ ' + curStmt.speaker + '辩解：', 130, 365);
    ctx.fillStyle = '#ffe87c';
    ctx.font = '14px sans-serif';
    this.wrapText(ctx, curStmt.pressResponse.witness, 130, 390, w - 260, 22);

    // 底部提示
    ctx.fillStyle = '#8c6d23';
    ctx.font = 'italic 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('• 细节已记录至公堂案卷，按证据卡 [1/2/3/4] 针对此处矛盾直接出示证据！ •', w / 2, 450);

    ctx.restore();
  }

  drawObjectionCutIn(ctx) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const curRound = this.rounds[this.currentRound];
    const card = curRound.cards[this.selectedCard];
    const isCorrect = this.isLastObjectionSuccess;

    ctx.save();
    // 1. 全屏高能动态放射光芒 (Radiating Speedlines)
    const overlayGrad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * 0.7);
    overlayGrad.addColorStop(0, isCorrect ? 'rgba(255, 215, 0, 0.92)' : 'rgba(230, 57, 70, 0.92)');
    overlayGrad.addColorStop(1, 'rgba(15, 10, 6, 0.96)');
    ctx.fillStyle = overlayGrad;
    ctx.fillRect(0, 0, w, h);

    // 放射线条
    ctx.strokeStyle = isCorrect ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 100, 100, 0.45)';
    ctx.lineWidth = 3;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      ctx.lineTo(w / 2 + Math.cos(a + this.animTimer * 2) * w, h / 2 + Math.sin(a + this.animTimer * 2) * w);
      ctx.stroke();
    }

    // 2. 维多利亚古典金框特写横幅
    const bannerH = 160;
    const bannerY = (h - bannerH) / 2;

    ctx.fillStyle = '#1c140e';
    ctx.fillRect(0, bannerY, w, bannerH);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 5;
    ctx.strokeRect(0, bannerY, w, bannerH);

    // 3. 巨幅【⚡ 异议！ / OBJECTION!】漫画冲击文字
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = isCorrect ? '#ffd700' : '#ff0000';
    ctx.shadowBlur = 30;
    ctx.font = '900 64px "Baskerville", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isCorrect ? '⚡ 异议！ OBJECTION!' : '⚠️ 异议驳回！ OVERRULED!', w / 2, bannerY + 75);

    // 4. 辩词出示特写
    ctx.fillStyle = '#ffe87c';
    ctx.shadowBlur = 0;
    ctx.font = 'bold 20px "Baskerville", serif';
    ctx.fillText(card ? card.quote : '', w / 2, bannerY + 125);

    ctx.restore();
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    if (!ctx || text === undefined || text === null) return;
    const str = String(text);
    const words = str.split('');
    let line = '';
    let curY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, curY);
        line = words[n];
        curY += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line) {
      ctx.fillText(line, x, curY);
    }
  }
}
