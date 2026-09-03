import { GameImages } from '../assets/images.js';
import { ChromaKeyProcessor } from './chromaKey.js';

// 维多利亚纯净透明原画精灵渲染引擎 v6.0 (彻底消除白底方块，增加动态软阴影)
export class SpriteEngine {
  static rawImages = {};
  static processedCanvases = {};

  static init() {
    const keys = [
      'fogg', 'passepartout', 'fix', 'aouda', 'pass_run', 'pass_jump', 'pass_slide', 'kiouni_sprite',
      'revolver_fps', 'bandit_horse', 'saloon_brawler', 'tengu_acrobat',
      'kiouni_run', 'temple_wall', 'fire_altar', 'banyan_vines', 'suttee_shrine', 'victory_gate',
      'judge_obadiah', 'fix_prosecutor', 'ftg_passepartout', 'ftg_proctor'
    ];
    keys.forEach(k => {
      if (GameImages[k] && !this.rawImages[k]) {
        const img = new Image();
        img.src = GameImages[k];
        this.rawImages[k] = img;
      }
    });
  }

  static getTransparentSprite(key) {
    if (this.processedCanvases[key]) {
      return this.processedCanvases[key];
    }
    const img = this.rawImages[key];
    if (img && img.complete && img.naturalWidth > 0) {
      const transparentCanvas = ChromaKeyProcessor.processImage(img);
      this.processedCanvases[key] = transparentCanvas;
      return transparentCanvas;
    }
    return null;
  }

  // 1. 绘制地面动态软阴影
  static drawGroundShadow(ctx, x, y, width = 60, height = 18, alpha = 0.45) {
    ctx.save();
    ctx.fillStyle = `rgba(15, 10, 5, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 2. 绘制主角路路通（100% 纯透明原画，带地面软阴影）
  static drawPassepartoutRunner(ctx, x, y, state = 'running', animTime = 0, groundY = 540) {
    this.init();

    // 阴影渲染：根据距地面高度动态缩放与淡化
    const alt = Math.max(0, groundY - (y + 70));
    const shadowScale = Math.max(0.4, 1.0 - alt / 200);
    const shadowAlpha = Math.max(0.1, 0.45 - alt / 350);
    this.drawGroundShadow(ctx, x + 45, groundY + 12, 55 * shadowScale, 16 * shadowScale, shadowAlpha);

    ctx.save();
    let imgKey = 'pass_run';
    let targetW = 95;
    let targetH = 95;
    let offsetY = -15;
    let rot = 0;

    if (state === 'jumping') {
      imgKey = 'pass_jump';
      targetW = 105;
      targetH = 105;
      offsetY = -25;
      rot = -0.08;
    } else if (state === 'sliding') {
      imgKey = 'pass_slide';
      targetW = 115;
      targetH = 80;
      offsetY = 15;
    } else {
      const bob = Math.sin(animTime * 14) * 3;
      offsetY += bob;
      rot = Math.sin(animTime * 14) * 0.04;
    }

    const sprite = this.getTransparentSprite(imgKey);
    if (sprite) {
      ctx.translate(x + targetW / 2, y + targetH / 2 + offsetY);
      ctx.rotate(rot);
      ctx.drawImage(sprite, -targetW / 2, -targetH / 2, targetW, targetH);
    } else {
      // 未就绪时用原始图像尝试
      const raw = this.rawImages[imgKey];
      if (raw && raw.complete) {
        ctx.drawImage(raw, x, y + offsetY, targetW, targetH);
      }
    }

    ctx.restore();
  }

  // 3. 绘制大师级活体战象奇阿尼（全骨骼/多关节拟真疾驰动画与高精维多利亚铜版质感）
  static drawElephant(ctx, x, y, isCharging = false, animTime = 0, scale = 1.0) {
    this.init();

    const baseW = 180 * scale;
    const baseH = 130 * scale;
    const groundY = y + baseH * 0.92;

    // 1. 地面多重动态加权软阴影 (随步伐与跳跃高度动态收缩)
    this.drawGroundShadow(ctx, x + baseW * 0.52, groundY + 8, 140 * scale, 26 * scale, 0.6);

    ctx.save();

    // 2. 奔跑周期与生物力学律动 (Gallop Kinematics)
    const runCycle = isCharging ? (animTime * 20) : (animTime * 14);
    const gallopBounce = Math.sin(runCycle) * (isCharging ? 6 : 4);
    const bodyTilt = (isCharging ? -0.07 : 0) + Math.sin(runCycle - 0.4) * 0.035;

    ctx.translate(x + baseW * 0.5, y + baseH * 0.55 + gallopBounce);
    ctx.rotate(bodyTilt);

    const s = scale;

    // 3. 绘制后侧双腿 (远景肢体，色彩稍暗)
    const drawLeg = (lx, ly, legPhase, isBackLeg = false, isFar = false) => {
      ctx.save();
      const kneeAngle = Math.sin(legPhase) * 0.55 + (isBackLeg ? -0.2 : 0.15);
      const footAngle = Math.cos(legPhase) * 0.35;

      ctx.fillStyle = isFar ? '#424a52' : '#57626d';
      ctx.strokeStyle = '#272c32';
      ctx.lineWidth = 2.5 * s;

      // 大腿
      ctx.beginPath();
      ctx.ellipse(lx, ly, 18 * s, 26 * s, kneeAngle, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 小腿与厚重象蹄
      const footX = lx + Math.sin(kneeAngle) * 28 * s;
      const footY = ly + Math.cos(kneeAngle) * 28 * s;
      ctx.beginPath();
      ctx.roundRect(footX - 12 * s, footY, 24 * s, 20 * s, [4 * s, 4 * s, 8 * s, 8 * s]);
      ctx.fill();
      ctx.stroke();

      // 纯金象蹄脚环 (Gold Anklet)
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(footX - 13 * s, footY + 4 * s, 26 * s, 5 * s);
      ctx.strokeRect(footX - 13 * s, footY + 4 * s, 26 * s, 5 * s);

      ctx.restore();
    };

    // 远景后腿 & 远景前腿
    drawLeg(-35 * s, 10 * s, runCycle + Math.PI * 0.8, true, true);
    drawLeg(30 * s, 12 * s, runCycle + Math.PI * 0.2, false, true);

    // 4. 巨象粗壮躯干 (Heavy Muscular Torso with Slate Gray Engraving Texture)
    // 躯干肌肉阴影
    const bodyGrad = ctx.createRadialGradient(0, -10 * s, 10 * s, 0, 0, 75 * s);
    bodyGrad.addColorStop(0, '#6c7987');
    bodyGrad.addColorStop(0.7, '#4e5863');
    bodyGrad.addColorStop(1, '#343b43');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#22272d';
    ctx.lineWidth = 3 * s;

    ctx.beginPath();
    ctx.ellipse(0, -5 * s, 68 * s, 44 * s, 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 5. 摇曳的象尾 (Swinging Tail with Bushy Hair)
    const tailAngle = Math.sin(runCycle * 0.8) * 0.4 - 0.5;
    ctx.save();
    ctx.translate(-62 * s, -12 * s);
    ctx.rotate(tailAngle);
    ctx.strokeStyle = '#4e5863';
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-15 * s, 18 * s, -10 * s, 36 * s);
    ctx.stroke();
    // 尾毛
    ctx.fillStyle = '#22272d';
    ctx.beginPath();
    ctx.ellipse(-10 * s, 38 * s, 6 * s, 10 * s, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 6. 皇家红色丝绒金边象毯 (Royal Embroidered Velvet Saddle Cloth)
    ctx.fillStyle = '#8b1e1e';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.roundRect(-42 * s, -30 * s, 70 * s, 42 * s, 6 * s);
    ctx.fill();
    ctx.stroke();

    // 象毯上的纯金古典印花与流苏金铃 (Golden Fringes & Bells)
    ctx.fillStyle = '#ffe87c';
    for (let bx = -35 * s; bx <= 22 * s; bx += 14 * s) {
      ctx.beginPath();
      ctx.arc(bx, 13 * s, 3.5 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. 纯金雕花皇家象鞍 (Royal Howdah Throne)
    ctx.fillStyle = '#b8860b';
    ctx.fillRect(-28 * s, -48 * s, 46 * s, 22 * s);
    ctx.strokeStyle = '#ffe87c';
    ctx.lineWidth = 2 * s;
    ctx.strokeRect(-28 * s, -48 * s, 46 * s, 22 * s);
    // 靠背红丝绒
    ctx.fillStyle = '#a12323';
    ctx.fillRect(-24 * s, -58 * s, 18 * s, 14 * s);
    ctx.strokeRect(-24 * s, -58 * s, 18 * s, 14 * s);

    // 8. 乘象人物：福克先生与路路通 (Animated Riders)
    // 8.1 斐利亚·福克先生 (Phileas Fogg sitting majestically in Howdah)
    ctx.save();
    ctx.translate(-15 * s, -60 * s);
    // 绅士黑色大衣
    ctx.fillStyle = '#1c2321';
    ctx.fillRect(-6 * s, 0, 14 * s, 18 * s);
    // 头部与金丝单片眼镜
    ctx.fillStyle = '#f3d2b8';
    ctx.beginPath();
    ctx.arc(1 * s, -7 * s, 7 * s, 0, Math.PI * 2);
    ctx.fill();
    // 维多利亚黑色高礼帽 (Top Hat)
    ctx.fillStyle = '#111111';
    ctx.fillRect(-8 * s, -12 * s, 18 * s, 3 * s);
    ctx.fillRect(-5 * s, -23 * s, 12 * s, 12 * s);
    ctx.restore();

    // 8.2 让·路路通 (Passepartout driving elephant in front)
    ctx.save();
    ctx.translate(14 * s, -46 * s);
    // 水手/仆人制服
    ctx.fillStyle = '#2b4c7e';
    ctx.fillRect(-6 * s, 0, 13 * s, 16 * s);
    // 头部
    ctx.fillStyle = '#f3d2b8';
    ctx.beginPath();
    ctx.arc(0, -6 * s, 6.5 * s, 0, Math.PI * 2);
    ctx.fill();
    // 贝雷帽
    ctx.fillStyle = '#8b1e1e';
    ctx.beginPath();
    ctx.arc(0, -10 * s, 7 * s, Math.PI, 0);
    ctx.fill();
    // 执缰绳双手 (Hands holding golden reins)
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(4 * s, 5 * s);
    ctx.lineTo(26 * s, 10 * s);
    ctx.stroke();
    ctx.restore();

    // 9. 巨象头部与纯金象额面甲 (Head & Golden Forehead Armor Plate)
    ctx.save();
    ctx.translate(46 * s, -14 * s);

    // 象头肌肉
    ctx.fillStyle = '#57626d';
    ctx.strokeStyle = '#272c32';
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.arc(0, 0, 24 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 纯金象额面甲与红宝石 (Golden Head Armor Plate & Ruby)
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.moveTo(-8 * s, -18 * s);
    ctx.lineTo(14 * s, -14 * s);
    ctx.lineTo(8 * s, 8 * s);
    ctx.lineTo(-10 * s, 4 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 额头红宝石
    ctx.fillStyle = '#e60000';
    ctx.beginPath();
    ctx.arc(2 * s, -5 * s, 4.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // 10. 灵动煽动的大象耳朵 (Flapping Ears with Gold Tassel)
    const earFlap = Math.sin(runCycle + 0.5) * 0.22 - 0.1;
    ctx.save();
    ctx.translate(-8 * s, -2 * s);
    ctx.rotate(earFlap);
    ctx.fillStyle = '#65727f';
    ctx.strokeStyle = '#272c32';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.ellipse(0, 8 * s, 18 * s, 26 * s, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 耳坠流苏
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(-2 * s, 30 * s, 5 * s, 10 * s);
    ctx.restore();

    // 11. 弯曲锋利的象牙 (Curved Ivory Tusks)
    ctx.fillStyle = '#fcf8ea';
    ctx.strokeStyle = '#b59d57';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(8 * s, 12 * s);
    ctx.quadraticCurveTo(28 * s, 26 * s, 38 * s, 4 * s);
    ctx.quadraticCurveTo(24 * s, 18 * s, 6 * s, 16 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 12. 活体起伏的长象鼻 (Living Articulated Trunk)
    const trunkWag = Math.sin(runCycle * 1.2) * 0.35 + (isCharging ? -0.4 : 0);
    ctx.save();
    ctx.translate(16 * s, 4 * s);
    ctx.rotate(trunkWag);
    ctx.strokeStyle = '#57626d';
    ctx.lineWidth = 14 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(16 * s, 26 * s, 8 * s, 46 * s);
    ctx.quadraticCurveTo(4 * s, 58 * s, 18 * s, 56 * s);
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // 结束象头

    // 13. 绘制近景强劲双腿 (Foreground Legs)
    drawLeg(-22 * s, 12 * s, runCycle, true, false);
    drawLeg(42 * s, 14 * s, runCycle + Math.PI, false, false);

    ctx.restore(); // 结束整象
  }

  // 3.1 绘制实体化古神庙雕花石壁 (Solid 3D Sandstone Temple Relief Block)
  static drawTempleStoneWall(ctx, x, y, w = 65, h = 130, broken = false) {
    if (broken) return;

    this.drawGroundShadow(ctx, x + w / 2, y + h + 6, w * 1.2, 22, 0.55);

    ctx.save();
    // 砂岩基石渐变与厚重阴影
    const stoneGrad = ctx.createLinearGradient(x, y, x + w, y);
    stoneGrad.addColorStop(0, '#9e8c75');
    stoneGrad.addColorStop(0.35, '#bfab91');
    stoneGrad.addColorStop(0.8, '#7d6c59');
    stoneGrad.addColorStop(1, '#4a3e31');
    ctx.fillStyle = stoneGrad;
    ctx.fillRect(x, y, w, h);

    // 3D 浮雕厚重边框
    ctx.strokeStyle = '#2d2319';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // 内部双层金边雕纹与象头神浮雕 (Ganesha Bas-Relief)
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 5, y + 6, w - 10, h - 12);

    // 砂岩浮雕石刻横梁与砖缝
    ctx.fillStyle = 'rgba(45, 35, 25, 0.65)';
    for (let ly = y + 26; ly < y + h - 10; ly += 24) {
      ctx.fillRect(x + 5, ly, w - 10, 2.5);
    }

    // 顶部青苔藤蔓点缀 (Overgrown Moss)
    ctx.fillStyle = '#2d5a27';
    ctx.beginPath();
    ctx.roundRect(x - 2, y - 4, w + 4, 12, [4, 4, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#ffe87c';
    ctx.font = 'bold 12px "Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.fillText('🛕 冲撞', x + w / 2, y + h / 2 + 5);

    ctx.restore();
  }

  // 3.2 绘制实体化古吠陀青铜火盆祭坛 (Solid Bronze Dragon Brazier with Living Roaring Flames)
  static drawFireAltar(ctx, x, y, w = 80, h = 85, animTime = 0, extinguished = false) {
    if (extinguished) return;

    this.drawGroundShadow(ctx, x + w / 2, y + h + 4, w * 1.15, 24, 0.6);

    ctx.save();
    // 1. 地面烈火辐射光晕 (Ambient Fire Light)
    const glowGrad = ctx.createRadialGradient(x + w / 2, y + h * 0.4, 8, x + w / 2, y + h * 0.4, w * 0.9);
    glowGrad.addColorStop(0, 'rgba(255, 200, 50, 0.55)');
    glowGrad.addColorStop(0.6, 'rgba(255, 80, 20, 0.25)');
    glowGrad.addColorStop(1, 'rgba(180, 20, 10, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(x - 30, y - 40, w + 60, h + 50);

    // 2. 青铜三足浮雕大鼎基座 (Solid Bronze Cauldron Base)
    const bx = x + w * 0.15;
    const by = y + h * 0.45;
    const bw = w * 0.7;
    const bh = h * 0.5;

    const bronzeGrad = ctx.createLinearGradient(bx, by, bx + bw, by);
    bronzeGrad.addColorStop(0, '#543d2b');
    bronzeGrad.addColorStop(0.3, '#8c6847');
    bronzeGrad.addColorStop(0.7, '#6e4f35');
    bronzeGrad.addColorStop(1, '#362417');
    ctx.fillStyle = bronzeGrad;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bw, by);
    ctx.quadraticCurveTo(bx + bw + 6, by + bh * 0.7, bx + bw * 0.75, by + bh);
    ctx.lineTo(bx + bw * 0.25, by + bh);
    ctx.quadraticCurveTo(bx - 6, by + bh * 0.7, bx, by);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#24170e';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 鼎耳与金纹饰
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + 4, by + 6, bw - 8, bh * 0.4);

    // 3. 动态跳跃神火 (Multi-layered Living Vedic Flames)
    const cx = x + w / 2;
    const cy = by + 2;
    for (let f = -20; f <= 20; f += 8) {
      const flH = 32 + Math.sin(animTime * 18 + f) * 14;
      const flW = 10 + Math.cos(animTime * 12 + f) * 3;
      const flGrad = ctx.createLinearGradient(cx + f, cy, cx + f, cy - flH);
      flGrad.addColorStop(0, '#ffffff');
      flGrad.addColorStop(0.25, '#ffe87c');
      flGrad.addColorStop(0.65, '#ff5500');
      flGrad.addColorStop(1, 'rgba(200, 20, 0, 0)');
      ctx.fillStyle = flGrad;
      ctx.beginPath();
      ctx.moveTo(cx + f - flW, cy);
      ctx.quadraticCurveTo(cx + f + Math.sin(animTime * 20 + f) * 8, cy - flH * 0.6, cx + f, cy - flH);
      ctx.quadraticCurveTo(cx + f + flW * 0.6, cy - flH * 0.4, cx + f + flW, cy);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // 3.3 绘制实体化热带古榕树垂藤 (Solid Banyan Tree Canopy & Dangling Orchid Vines)
  static drawBanyanVines(ctx, x, y, w = 60, h = 135, animTime = 0) {
    ctx.save();
    // 顶部粗壮古榕树干 (Overhead Banyan Tree Trunk)
    const woodGrad = ctx.createLinearGradient(x - 20, y, x + w + 20, y + 25);
    woodGrad.addColorStop(0, '#36281b');
    woodGrad.addColorStop(0.5, '#5c4530');
    woodGrad.addColorStop(1, '#291d12');
    ctx.fillStyle = woodGrad;
    ctx.fillRect(x - 30, y - 30, w + 60, 38);

    // 垂悬的苍劲藤蔓与气生根 (Dangling Vines with Natural Sway)
    for (let vx = x - 10; vx <= x + w + 10; vx += 15) {
      const sway = Math.sin(animTime * 4 + vx * 0.2) * 8;
      ctx.strokeStyle = '#2d5a27';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(vx, y + 8);
      ctx.quadraticCurveTo(vx + sway * 0.5, y + h * 0.5, vx + sway, y + h);
      ctx.stroke();

      // 紫色热带兰花簇 (Wild Purple Orchids)
      if (vx % 30 === 0) {
        ctx.fillStyle = '#d63384';
        ctx.beginPath();
        ctx.arc(vx + sway * 0.7, y + h * 0.65, 5, 0, Math.PI * 2);
        ctx.arc(vx + sway * 0.7 - 4, y + h * 0.65 + 4, 4, 0, Math.PI * 2);
        ctx.arc(vx + sway * 0.7 + 4, y + h * 0.65 + 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe87c';
        ctx.beginPath();
        ctx.arc(vx + sway * 0.7, y + h * 0.65 + 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#ffe87c';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🌿 滑铲[S/↓]', x + w / 2, y + h - 6);

    ctx.restore();
  }

  // 3.4 绘制现场神庙宝刹大营救大场景 (Suttee Pagoda Temple Gate with Princess Aouda)
  static drawSutteePagodaShrine(ctx, x, y, w = 340, h = 240, animTime = 0, smashed = false) {
    this.drawGroundShadow(ctx, x + w / 2, y + h + 8, w * 1.05, 45, 0.65);

    ctx.save();
    // 1. 宏伟古印度佛塔砂岩立柱与门楼 (Grand Sandstone Pagoda Gateway)
    const pagodaGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    pagodaGrad.addColorStop(0, '#8c5828');
    pagodaGrad.addColorStop(0.5, '#b07842');
    pagodaGrad.addColorStop(1, '#4a2c12');
    ctx.fillStyle = pagodaGrad;

    // 左侧与右侧巨型浮雕石柱
    ctx.fillRect(x, y + 20, 55, h - 20);
    ctx.fillRect(x + w - 55, y + 20, 55, h - 20);
    ctx.strokeStyle = '#29170a';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y + 20, 55, h - 20);
    ctx.strokeRect(x + w - 55, y + 20, 55, h - 20);

    // 顶部重檐金顶宝刹楼阁 (Multi-tiered Pagoda Roof & Golden Dome)
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.moveTo(x - 20, y + 25);
    ctx.lineTo(x + w / 2, y - 45);
    ctx.lineTo(x + w + 20, y + 25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffe87c';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 2. 中央萨蒂火祭神坛与艾娥达夫人 (Sacred Pyre & Princess Aouda)
    if (!smashed) {
      const cx = x + w / 2;
      const cy = y + h * 0.55;

      // 神坛金光神圣光环
      const haloGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 75);
      haloGrad.addColorStop(0, 'rgba(255, 232, 124, 0.7)');
      haloGrad.addColorStop(0.7, 'rgba(255, 120, 30, 0.3)');
      haloGrad.addColorStop(1, 'rgba(180, 20, 10, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 75, 0, Math.PI * 2);
      ctx.fill();

      // 祭木火堆
      ctx.fillStyle = '#54361e';
      ctx.fillRect(cx - 38, cy + 20, 76, 22);
      ctx.strokeStyle = '#29170a';
      ctx.strokeRect(cx - 38, cy + 20, 76, 22);

      // 艾娥达夫人立绘 (Princess Aouda bound at altar)
      const aoudaImg = this.rawImages.aouda;
      if (aoudaImg && aoudaImg.complete && aoudaImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy - 8, 28, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(aoudaImg, cx - 28, cy - 36, 56, 56);
        ctx.restore();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      ctx.fillStyle = '#ffe87c';
      ctx.font = 'bold 15px "Baskerville", serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑 萨蒂火祭神坛 · 营救艾娥达！', cx, y - 55);
    }

    ctx.restore();
  }

  // 3.5 绘制阿拉哈巴德凯旋胜利之门 (纯引擎原生手绘 2D 宏伟古典建筑，与游戏画风 100% 完美融合)
  static drawAllahabadVictoryGate(ctx, x, y, w = 480, h = 340, animTime = 0) {
    // 1. 铺向玩家的漫长皇家红地毯 (Red Royal Carpet Rolling Out Forward)
    ctx.save();
    const carpetLen = 380;
    const cx = x - carpetLen + 60;
    const cy = y + h - 14;

    const carpetGrad = ctx.createLinearGradient(cx, cy, cx + carpetLen, cy);
    carpetGrad.addColorStop(0, 'rgba(139, 30, 30, 0)');
    carpetGrad.addColorStop(0.3, '#8b1e1e');
    carpetGrad.addColorStop(1, '#6b1414');
    ctx.fillStyle = carpetGrad;
    ctx.fillRect(cx, cy, carpetLen, 14);

    // 金色镶边
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 60, cy);
    ctx.lineTo(cx + carpetLen, cy);
    ctx.moveTo(cx + 60, cy + 14);
    ctx.lineTo(cx + carpetLen, cy + 14);
    ctx.stroke();

    // 散落玫瑰花瓣与金币
    for (let px = cx + 70; px < cx + carpetLen; px += 32) {
      ctx.fillStyle = px % 64 === 0 ? '#ffd700' : '#d90429';
      ctx.beginPath();
      ctx.arc(px, cy + 7 + Math.sin(px * 0.4) * 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 2. 凯旋大门宏伟地面深沉投影
    this.drawGroundShadow(ctx, x + w * 0.5, y + h + 10, w * 1.1, 48, 0.7);

    ctx.save();

    // 3. 大理石与砂岩宏伟主体建筑 (Grand Marble & Sandstone Pylons)
    const colW = 75;
    const archW = 180;
    const archH = 200;
    const archX = x + (w - archW) / 2;
    const archY = y + h - archH;

    // 3.1 左塔与右塔 (Twin Pylons)
    const drawPylon = (px) => {
      // 塔身渐变
      const towerGrad = ctx.createLinearGradient(px, y + 50, px + colW, y + 50);
      towerGrad.addColorStop(0, '#d9d0c1');
      towerGrad.addColorStop(0.4, '#faf6ee');
      towerGrad.addColorStop(0.8, '#c9bea9');
      towerGrad.addColorStop(1, '#8c7d6b');
      ctx.fillStyle = towerGrad;
      ctx.fillRect(px, y + 50, colW, h - 50);

      // 塔身 3D 浮雕与金边线槽
      ctx.strokeStyle = '#2d2319';
      ctx.lineWidth = 3;
      ctx.strokeRect(px, y + 50, colW, h - 50);

      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 8, y + 60, colW - 16, h - 75);

      // 壁龛与拱形装饰窗 (Niche Windows)
      ctx.fillStyle = '#221911';
      ctx.beginPath();
      ctx.arc(px + colW / 2, y + 130, 16, Math.PI, 0);
      ctx.rect(px + colW / 2 - 16, y + 130, 32, 45);
      ctx.fill();
      ctx.strokeStyle = '#d4af37';
      ctx.stroke();

      // 塔楼顶层纯金小洋葱圆顶 (Side Minaret Domes)
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.moveTo(px - 4, y + 50);
      ctx.quadraticCurveTo(px + colW / 2, y + 5, px + colW + 4, y + 50);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffe87c';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 塔尖金顶宝珠 (Finials)
      ctx.fillStyle = '#fff0a6';
      ctx.beginPath();
      ctx.arc(px + colW / 2, y + 5, 5, 0, Math.PI * 2);
      ctx.fill();
    };

    drawPylon(x + 20);
    drawPylon(x + w - 20 - colW);

    // 3.2 中央凯旋拱门通途与深邃内景 (Open Triumphal Arch Portal)
    ctx.fillStyle = '#140c06'; // 深邃门洞
    ctx.beginPath();
    ctx.moveTo(archX, y + h);
    ctx.lineTo(archX, archY + archW / 2);
    ctx.arc(archX + archW / 2, archY + archW / 2, archW / 2, Math.PI, 0);
    ctx.lineTo(archX + archW, y + h);
    ctx.closePath();
    ctx.fill();

    // 拱门大理石发券与金雕拱心石 (Arch Keystones & Gold Inlay)
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 5;
    ctx.stroke();

    // 拱顶放射状大理石雕刻线
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
    ctx.lineWidth = 2;
    for (let angle = Math.PI; angle <= Math.PI * 2; angle += Math.PI / 10) {
      const sx = archX + archW / 2 + Math.cos(angle) * (archW / 2 - 15);
      const sy = archY + archW / 2 + Math.sin(angle) * (archW / 2 - 15);
      const ex = archX + archW / 2 + Math.cos(angle) * (archW / 2);
      const ey = archY + archW / 2 + Math.sin(angle) * (archW / 2);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }

    // 3.3 拱门上方宏伟横梁与金匾 (Grand Entablature & Victory Plaque)
    const entGrad = ctx.createLinearGradient(x + 30, y + 40, x + w - 30, y + 40);
    entGrad.addColorStop(0, '#ded5c5');
    entGrad.addColorStop(0.5, '#ffffff');
    entGrad.addColorStop(1, '#c2b49d');
    ctx.fillStyle = entGrad;
    ctx.fillRect(x + 30, y + 40, w - 60, 48);
    ctx.strokeStyle = '#2d2319';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 30, y + 40, w - 60, 48);

    // 胜利金匾 (Victory Gold Plaque)
    ctx.fillStyle = '#1c2321';
    ctx.fillRect(x + 75, y + 48, w - 150, 32);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 75, y + 48, w - 150, 32);

    ctx.fillStyle = '#ffe87c';
    ctx.font = 'bold 16px "Baskerville", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 ALLAHABAD · 凯旋之门 1872', x + w / 2, y + 70);

    // 3.4 中央巍峨纯金洋葱主穹顶 (Monumental Golden Central Onion Dome)
    const domeW = 120;
    const dx = x + (w - domeW) / 2;
    const domeGrad = ctx.createRadialGradient(dx + domeW * 0.4, y + 10, 10, dx + domeW * 0.5, y + 20, domeW * 0.6);
    domeGrad.addColorStop(0, '#fff4b8');
    domeGrad.addColorStop(0.4, '#ffd700');
    domeGrad.addColorStop(0.85, '#c99700');
    domeGrad.addColorStop(1, '#6b4f00');
    ctx.fillStyle = domeGrad;

    ctx.beginPath();
    ctx.moveTo(dx, y + 40);
    ctx.quadraticCurveTo(dx - 10, y + 10, dx + domeW * 0.5, y - 35);
    ctx.quadraticCurveTo(dx + domeW + 10, y + 10, dx + domeW, y + 40);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffe87c';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 穹顶尖顶黄铜高塔 (Central Spire)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(dx + domeW * 0.5, y - 35, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(dx + domeW * 0.5, y - 35);
    ctx.lineTo(dx + domeW * 0.5, y - 55);
    ctx.stroke();

    // 4. 双侧动态飘扬的英国米字旗与皇家胜利彩旗 (Dynamic Animated Flags)
    const drawFlag = (fx, fy, isLeft = true) => {
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx, fy - 65);
      ctx.stroke();

      // 旗帜飘扬波动
      const flagWave = Math.sin(animTime * 7 + (isLeft ? 0 : 2)) * 6;
      ctx.save();
      ctx.translate(fx, fy - 60);

      // 皇家深红胜利燕尾旗
      ctx.fillStyle = '#8b1e1e';
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(20, flagWave, 42, 4 + flagWave * 0.5);
      ctx.lineTo(34, 15);
      ctx.lineTo(42, 26 - flagWave * 0.5);
      ctx.quadraticCurveTo(20, 22 - flagWave, 0, 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    drawFlag(x + 35, y + 50, true);
    drawFlag(x + w - 35, y + 50, false);

    // 5. 跨越双塔的胜利花环与金色流苏 (Laurel Garlands & Bunting)
    ctx.strokeStyle = '#2d5a27';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + colW + 15, y + 70);
    ctx.quadraticCurveTo(x + w * 0.5, y + 105, x + w - colW - 15, y + 70);
    ctx.stroke();

    // 花环上点缀的金铃与红花
    for (let t = 0.15; t <= 0.85; t += 0.15) {
      const gx = (x + colW + 15) * (1 - t) * (1 - t) + (x + w * 0.5) * 2 * (1 - t) * t + (x + w - colW - 15) * t * t;
      const gy = (y + 70) * (1 - t) * (1 - t) + (y + 105) * 2 * (1 - t) * t + (y + 70) * t * t;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(gx, gy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. 终点飘落的金色胜利彩带与礼花粒子 (Falling Gold Victory Confetti)
    for (let i = 0; i < 26; i++) {
      const cfX = x - 60 + ((i * 41 + (animTime * 65)) % (w + 120));
      const cfY = y - 30 + ((i * 31 + (animTime * 85)) % (h + 50));
      const cfRot = animTime * 4 + i;
      ctx.save();
      ctx.translate(cfX, cfY);
      ctx.rotate(cfRot);
      ctx.fillStyle = i % 3 === 0 ? '#ffd700' : (i % 3 === 1 ? '#ff3b30' : '#00d4ff');
      ctx.fillRect(-3.5, -2, 7, 4);
      ctx.restore();
    }

    ctx.restore();
  }

  // 4. 绘制福克先生肖像 (带金框)
  static drawFoggPortrait(ctx, x, y, size = 60) {
    this.init();
    const img = this.rawImages.fogg;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, x, y, size, size);
    }
  }

  // 5. 绘制路路通肖像
  static drawPassepartoutPortrait(ctx, x, y, size = 60) {
    this.init();
    const img = this.rawImages.passepartout;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, x, y, size, size);
    }
  }

  // 6. 绘制侦探菲克斯肖像
  static drawFixPortrait(ctx, x, y, size = 60) {
    this.init();
    const img = this.rawImages.fix;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, x, y, size, size);
    }
  }

  // 7. 绘制艾娥达夫人肖像
  static drawAoudaPortrait(ctx, x, y, size = 60) {
    this.init();
    const img = this.rawImages.aouda;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, x, y, size, size);
    }
  }

  // 8. 正统第一人称前向瞄准柯尔特六响左轮手枪 (True Forward-Aiming FPS Revolver with Dynamic Perspective & Muzzle Burst)
  static drawFPSRevolver(ctx, crosshairX, crosshairY, isFiring = false, recoilAnim = 0, ammoCount = 6) {
    this.init();
    ctx.save();

    // 枪根部位于屏幕底部中央偏右，随准星水平微调
    const gunRootX = 640 + (crosshairX - 640) * 0.35 + 80;
    const gunRootY = 720 + recoilAnim * 20;

    // 计算枪管指向准星的 3D 透视仰俯与水平偏角
    const dx = crosshairX - gunRootX;
    const dy = crosshairY - (gunRootY - 140);
    const aimAngle = Math.atan2(dy, dx) + Math.PI / 2; // 0 为直指正上方

    // 限制枪管摆动范围，保持自然握持
    const clampedAngle = Math.max(-0.45, Math.min(0.45, aimAngle));

    ctx.translate(gunRootX, gunRootY);
    ctx.rotate(clampedAngle + (isFiring ? -0.22 : 0));

    // 1. 绘制后坐力向上踢跳与手部皮套
    const kickBackY = isFiring ? -35 : 0;
    ctx.translate(0, kickBackY);

    // 2. 绘制戴维多利亚皮手套的右手与手腕 (Leather Gloved Hand)
    ctx.save();
    // 手臂阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(30, 45, 65, 40, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // 深褐色做旧真皮手套
    const gloveGrad = ctx.createLinearGradient(-50, 0, 80, 80);
    gloveGrad.addColorStop(0, '#4a2f1b');
    gloveGrad.addColorStop(0.5, '#2e1c10');
    gloveGrad.addColorStop(1, '#1a0f08');
    ctx.fillStyle = gloveGrad;

    // 手腕与手掌
    ctx.beginPath();
    ctx.moveTo(-35, 90);
    ctx.lineTo(-45, 10);
    ctx.quadraticCurveTo(-30, -35, 15, -45);
    ctx.quadraticCurveTo(60, -35, 75, 15);
    ctx.lineTo(65, 90);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6b4629';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 手套缝线与黄铜手腕搭扣
    ctx.strokeStyle = '#9c6f49';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(15, 60, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. 绘制柯尔特胡桃木握把 (Walnut Wood Grip with Brass Medallion)
    ctx.save();
    const woodGrad = ctx.createLinearGradient(-25, -20, 25, 60);
    woodGrad.addColorStop(0, '#8b4513');
    woodGrad.addColorStop(0.4, '#5c2d0c');
    woodGrad.addColorStop(1, '#2b1204');
    ctx.fillStyle = woodGrad;

    ctx.beginPath();
    ctx.moveTo(-18, 55);
    ctx.lineTo(-22, -15);
    ctx.lineTo(22, -15);
    ctx.lineTo(18, 55);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3a1a06';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 握把中央黄铜柯尔特飞马徽章
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(0, 15, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. 绘制柯尔特六响左轮枪身机匣与击锤 (Receiver Frame & Cocked Hammer)
    ctx.save();
    const steelGrad = ctx.createLinearGradient(-35, -90, 35, 0);
    steelGrad.addColorStop(0, '#555f68');
    steelGrad.addColorStop(0.3, '#7d8a96');
    steelGrad.addColorStop(0.7, '#383f45');
    steelGrad.addColorStop(1, '#1b1f23');
    ctx.fillStyle = steelGrad;

    // 机匣主体
    ctx.fillRect(-28, -85, 56, 72);
    ctx.strokeStyle = '#22282d';
    ctx.lineWidth = 2;
    ctx.strokeRect(-28, -85, 56, 72);

    // 击锤 (Hammer)
    ctx.fillStyle = isFiring ? '#333b42' : '#66727c';
    ctx.beginPath();
    ctx.moveTo(-6, -85);
    ctx.lineTo(-10, -105);
    ctx.lineTo(0, -112);
    ctx.lineTo(6, -105);
    ctx.lineTo(6, -85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5. 绘制旋转弹巢 (6-Shot Revolving Cylinder with Flutes)
    const cylGrad = ctx.createLinearGradient(-32, -90, 32, -90);
    cylGrad.addColorStop(0, '#2b3137');
    cylGrad.addColorStop(0.25, '#6a7782');
    cylGrad.addColorStop(0.5, '#8b9aa6');
    cylGrad.addColorStop(0.75, '#6a7782');
    cylGrad.addColorStop(1, '#2b3137');
    ctx.fillStyle = cylGrad;

    ctx.beginPath();
    ctx.roundRect(-30, -135, 60, 52, 6);
    ctx.fill();
    ctx.strokeStyle = '#181c20';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 弹巢减重凹槽 (Cylinder Flutes)
    ctx.fillStyle = '#1e2226';
    ctx.fillRect(-22, -130, 8, 42);
    ctx.fillRect(-4, -130, 8, 42);
    ctx.fillRect(14, -130, 8, 42);

    // 6. 绘制第一人称前向延伸八角枪管 (Octagonal Rifled Steel Barrel)
    const barrelGrad = ctx.createLinearGradient(-16, -260, 16, -260);
    barrelGrad.addColorStop(0, '#3a4249');
    barrelGrad.addColorStop(0.3, '#7d8c99');
    barrelGrad.addColorStop(0.5, '#a4b5c4');
    barrelGrad.addColorStop(0.7, '#7d8c99');
    barrelGrad.addColorStop(1, '#3a4249');
    ctx.fillStyle = barrelGrad;

    // 前向透视枪管 (底部稍宽，顶部略窄)
    ctx.beginPath();
    ctx.moveTo(-16, -135);
    ctx.lineTo(-12, -260);
    ctx.lineTo(12, -260);
    ctx.lineTo(16, -135);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1d2226';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 枪管下方的退壳杆与通条套管 (Ejector Rod Housing)
    ctx.fillStyle = '#4c555c';
    ctx.fillRect(8, -230, 7, 95);
    ctx.strokeStyle = '#22282d';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(8, -230, 7, 95);

    // 7. 枪口准星照门与枪膛准心瞄准线 (Front Sight Blade & Bore)
    // 枪口切面
    ctx.fillStyle = '#0f1214';
    ctx.beginPath();
    ctx.ellipse(0, -260, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 枪膛内径
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, -260, 6, 0, Math.PI * 2);
    ctx.fill();

    // 枪口前方凸起准星叶片 (Front Sight Blade)
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(-2, -274, 4, 14);
    ctx.strokeStyle = '#1b1b1b';
    ctx.lineWidth = 1;
    ctx.strokeRect(-2, -274, 4, 14);

    // 照门缺口准心对齐光芒 (Sight Notch Glow)
    ctx.fillStyle = 'rgba(0, 255, 200, 0.85)';
    ctx.fillRect(-1.5, -264, 3, 3);
    ctx.restore();

    // 8. 射击时喷薄而出的 3D 枪口巨型星芒烈焰与烟雾环 (3D Muzzle Blast Flare)
    if (isFiring) {
      ctx.save();
      // 烈焰中心
      const fx = 0;
      const fy = -275;

      // 放射状多瓣金黄枪火
      ctx.fillStyle = 'rgba(255, 220, 50, 0.95)';
      ctx.shadowColor = '#ff3300';
      ctx.shadowBlur = 35;
      ctx.beginPath();
      ctx.arc(fx, fy, 45, 0, Math.PI * 2);
      ctx.fill();

      // 十字高光星芒
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(fx - 70, fy);
      ctx.lineTo(fx + 70, fy);
      ctx.moveTo(fx, fy - 70);
      ctx.lineTo(fx, fy + 70);
      ctx.stroke();

      // 内层纯白爆芯
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(fx, fy, 22, 0, Math.PI * 2);
      ctx.fill();

      // 冲天火花
      for (let s = 0; s < 8; s++) {
        const ang = (s * Math.PI) / 4 + Math.random() * 0.2;
        const dist = 60 + Math.random() * 40;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(fx + Math.cos(ang) * dist, fy + Math.sin(ang) * dist, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.restore();
  }

  // 8.5 正统第三人称后视维多利亚风帆雪橇 (True 3D Rear-View Victorian Sail Sledge with Realistic Passengers, Canvas Sails & Ice Rooster Tails)
  static drawIceSledge(ctx, x, y, speed = 50, driftDir = 0, isTrimmingSail = false, animTime = 0) {
    this.init();
    ctx.save();
    ctx.translate(x, y);

    // 1. 动态入弯侧倾与飘移摆角 (Dynamic Banking Angle)
    const bankAngle = driftDir * 0.28;
    ctx.rotate(bankAngle);

    // 2. 左右两侧高速铁刃滑行雪浪与冰晶喷射 (Twin Snow Rooster Tails)
    const isHighSpeed = speed >= 65;
    const sprayHeight = 35 + (speed / 50) * 25;

    ctx.save();
    // 左刃雪浪
    const leftSprayGrad = ctx.createLinearGradient(-55, 30, -75, 30 - sprayHeight);
    leftSprayGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    leftSprayGrad.addColorStop(0.6, 'rgba(200, 240, 255, 0.45)');
    leftSprayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = leftSprayGrad;

    ctx.beginPath();
    ctx.moveTo(-55, 30);
    ctx.quadraticCurveTo(-75, 10, -85 - (driftDir < 0 ? 25 : 5), 30 - sprayHeight);
    ctx.quadraticCurveTo(-60, 20, -45, 30);
    ctx.closePath();
    ctx.fill();

    // 右刃雪浪
    const rightSprayGrad = ctx.createLinearGradient(55, 30, 75, 30 - sprayHeight);
    rightSprayGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    rightSprayGrad.addColorStop(0.6, 'rgba(200, 240, 255, 0.45)');
    rightSprayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = rightSprayGrad;

    ctx.beginPath();
    ctx.moveTo(55, 30);
    ctx.quadraticCurveTo(75, 10, 85 + (driftDir > 0 ? 25 : 5), 30 - sprayHeight);
    ctx.quadraticCurveTo(60, 20, 45, 30);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 3. 左右淬火精钢雪橇滑刀 (Forged Steel Runner Blades viewed from rear)
    const steelGrad = ctx.createLinearGradient(-60, 0, 60, 0);
    steelGrad.addColorStop(0, '#546e7a');
    steelGrad.addColorStop(0.5, '#cfd8dc');
    steelGrad.addColorStop(1, '#37474f');
    ctx.fillStyle = steelGrad;

    // 左滑刀
    ctx.beginPath();
    ctx.roundRect(-62, 10, 16, 26, [2, 2, 8, 8]);
    ctx.fill();
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 右滑刀
    ctx.beginPath();
    ctx.roundRect(46, 10, 16, 26, [2, 2, 8, 8]);
    ctx.fill();
    ctx.stroke();

    // 4. 重型橡木雪橇座舱后甲板 (Dark Oak Sledge Hull & Stern)
    const hullGrad = ctx.createLinearGradient(-50, -20, 50, 25);
    hullGrad.addColorStop(0, '#4a2f1b');
    hullGrad.addColorStop(0.3, '#6e4528');
    hullGrad.addColorStop(0.7, '#382011');
    hullGrad.addColorStop(1, '#1e1008');
    ctx.fillStyle = hullGrad;

    ctx.beginPath();
    ctx.moveTo(-52, -15);
    ctx.lineTo(52, -15);
    ctx.lineTo(44, 24);
    ctx.lineTo(-44, 24);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 座舱后侧木板缝隙与黄铜铆钉
    ctx.strokeStyle = '#26140a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-48, -2); ctx.lineTo(48, -2);
    ctx.moveTo(-44, 11); ctx.lineTo(44, 11);
    ctx.stroke();

    // 黄铜黄昏防风尾灯 (Twin Brass Stern Lanterns)
    for (const lx of [-42, 42]) {
      ctx.fillStyle = '#1b120c';
      ctx.fillRect(lx - 5, 2, 10, 14);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1;
      ctx.strokeRect(lx - 5, 2, 10, 14);

      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(lx, 9, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 5. 维多利亚后视乘员三人组 (Phileas Fogg, Aouda & Pilot Mudge)
    // 【乘员一：发明家马奇 (掌舵手，左侧海狸皮大衣与防寒皮帽，双手掌舵)】
    ctx.save();
    // 棕色海狸皮大衣后背
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.ellipse(-26, -14, 14, 18, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1b0000';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 海狸皮毛帽子
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.ellipse(-26, -30, 10, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3e2723';
    ctx.stroke();

    // 橡木操舵舵柄 (Steering Tiller Held by Mudge)
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-22, -10);
    ctx.lineTo(-5 + driftDir * 8, 20);
    ctx.stroke();
    ctx.restore();

    // 【乘员二：福克先生 (右侧，身披深蓝双排扣绅士大衣，佩戴标志性高顶礼帽)】
    ctx.save();
    // 深蓝色维多利亚绅士大衣后背
    const foggCoatGrad = ctx.createLinearGradient(-5, -20, 25, 0);
    foggCoatGrad.addColorStop(0, '#102027');
    foggCoatGrad.addColorStop(0.6, '#1e3847');
    foggCoatGrad.addColorStop(1, '#0a141a');
    ctx.fillStyle = foggCoatGrad;

    ctx.beginPath();
    ctx.ellipse(24, -14, 13, 17, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 福克先生黑色丝绒高顶礼帽 (Silk Top Hat from Rear)
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.ellipse(24, -30, 12, 4, 0, 0, Math.PI * 2); // 帽檐
    ctx.fill();
    ctx.fillRect(17, -48, 14, 18); // 帽身
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 1;
    ctx.strokeRect(17, -48, 14, 18);

    // 高顶帽金色缎带
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(17, -33, 14, 3);
    ctx.restore();

    // 【乘员三：艾娥达夫人 (端坐在两人之间，裹着鲜艳的皇家绯红羊绒格子毛毯)】
    ctx.save();
    // 绯红羊绒毛毯 (Royal Crimson Tartan Blanket)
    const tartanGrad = ctx.createLinearGradient(-15, -20, 15, 10);
    tartanGrad.addColorStop(0, '#b71c1c');
    tartanGrad.addColorStop(0.5, '#d32f2f');
    tartanGrad.addColorStop(1, '#880e4f');
    ctx.fillStyle = tartanGrad;

    ctx.beginPath();
    ctx.ellipse(0, -10, 15, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 艾娥达夫人深棕色发髻与红色防风头巾
    ctx.fillStyle = '#c2185b';
    ctx.beginPath();
    ctx.arc(0, -25, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 6. 高耸木质主桅杆与吃满暴风的巨幅白色帆布 (Tall Mast & Billowing White Canvas Sails)
    ctx.save();
    // 主桅杆 (Center Mast)
    ctx.strokeStyle = '#271610';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(0, -170);
    ctx.stroke();

    // 横桁 (Upper Yardarm)
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-55, -150);
    ctx.lineTo(55, -150);
    ctx.stroke();

    // 巨幅鼓胀白帆 (Billowing Canvas Sail with Shaded Cloth Folds)
    const sailBreath = Math.sin(animTime * 12) * 4;
    const sailWidth = isTrimmingSail ? 62 : 54 + sailBreath;
    const sailGrad = ctx.createLinearGradient(-sailWidth, -160, sailWidth, -30);
    sailGrad.addColorStop(0, '#ffffff');
    sailGrad.addColorStop(0.3, '#f5f5f5');
    sailGrad.addColorStop(0.7, '#e0e0e0');
    sailGrad.addColorStop(1, '#b0bec5');
    ctx.fillStyle = sailGrad;

    ctx.beginPath();
    ctx.moveTo(0, -165);
    ctx.quadraticCurveTo(sailWidth, -100, 0, -45);
    ctx.quadraticCurveTo(-sailWidth * 0.4, -100, 0, -165);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 帆布加固斜索与缝线 (Rigging Ropes & Stitching)
    ctx.strokeStyle = 'rgba(78, 52, 46, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-50, -150); ctx.lineTo(0, -45);
    ctx.moveTo(50, -150); ctx.lineTo(0, -45);
    ctx.stroke();

    // 桅顶飘扬的皇家红色防风风向三角旗 (Pennant Flag)
    ctx.fillStyle = '#d32f2f';
    ctx.beginPath();
    ctx.moveTo(0, -170);
    ctx.lineTo(24 + Math.sin(animTime * 15) * 6, -164);
    ctx.lineTo(0, -158);
    ctx.closePath();
    ctx.fill();

    // 7. 顺风加速 / 飘移小喷时的破空能量光翼 (Golden Aero Wind Stream)
    if (isTrimmingSail || isHighSpeed) {
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(0, -165);
      ctx.quadraticCurveTo(sailWidth + 14, -100, 0, -45);
      ctx.stroke();

      // 双侧加速流光
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.75)';
      ctx.beginPath();
      ctx.moveTo(-sailWidth - 10, -90);
      ctx.lineTo(-sailWidth - 25, -40);
      ctx.moveTo(sailWidth + 10, -90);
      ctx.lineTo(sailWidth + 25, -40);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
    ctx.restore();
  }

  // 8.6 绘制赛车专属美术实体 (无字文全手绘：加速踏板、热茶暖炉、雪覆倒木、飞跃跳台、针叶松树与终点龙门架)
  static drawBoostPad(ctx, x, y, size = 40, animTime = 0) {
    ctx.save();
    ctx.translate(x, y);

    // 1. 黄铜金属底框与蒸汽格栅
    const padW = size * 1.8;
    const padH = size * 0.75;

    const frameGrad = ctx.createLinearGradient(-padW/2, 0, padW/2, 0);
    frameGrad.addColorStop(0, '#5c4326');
    frameGrad.addColorStop(0.5, '#d4af37');
    frameGrad.addColorStop(1, '#5c4326');
    ctx.fillStyle = frameGrad;
    ctx.beginPath();
    ctx.roundRect(-padW/2, -padH/2, padW, padH, 8);
    ctx.fill();
    ctx.strokeStyle = '#1b120c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. 内嵌金属格栅与发光能量槽
    ctx.fillStyle = '#102027';
    ctx.fillRect(-padW/2 + 4, -padH/2 + 4, padW - 8, padH - 8);

    // 3. 动态向前流动的能量三箭头 (Pulsing Cyan/Gold Chevrons)
    const arrowOffset = (animTime * 6) % 3;
    for (let i = 0; i < 3; i++) {
      const ax = (i - 1) * (size * 0.45);
      const isGlow = Math.abs(i - arrowOffset) < 0.8;

      ctx.fillStyle = isGlow ? '#00ffff' : '#ffd700';
      ctx.shadowColor = isGlow ? '#00ffff' : '#ff8800';
      ctx.shadowBlur = isGlow ? 16 : 6;

      ctx.beginPath();
      ctx.moveTo(ax - 10, padH/2 - 8);
      ctx.lineTo(ax, -padH/2 + 8);
      ctx.lineTo(ax + 10, padH/2 - 8);
      ctx.lineTo(ax + 4, padH/2 - 8);
      ctx.lineTo(ax, -padH/2 + 14);
      ctx.lineTo(ax - 4, padH/2 - 8);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  static drawSamovarWarmer(ctx, x, y, size = 35, animTime = 0) {
    ctx.save();
    ctx.translate(x, y);

    // 1. 暖色发光光环 (Warm Amber Glow)
    const haloRadius = size * 0.9 + Math.sin(animTime * 8) * 3;
    const haloGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, haloRadius);
    haloGrad.addColorStop(0, 'rgba(255, 120, 150, 0.6)');
    haloGrad.addColorStop(0.7, 'rgba(255, 180, 50, 0.2)');
    haloGrad.addColorStop(1, 'rgba(255, 180, 50, 0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(0, 0, haloRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. 维多利亚纯银保温热茶壶 (Embossed Silver Tea Urn)
    const urnGrad = ctx.createLinearGradient(-size*0.4, 0, size*0.4, 0);
    urnGrad.addColorStop(0, '#90a4ae');
    urnGrad.addColorStop(0.4, '#ffffff');
    urnGrad.addColorStop(0.8, '#cfd8dc');
    urnGrad.addColorStop(1, '#607d8b');
    ctx.fillStyle = urnGrad;

    // 壶身
    ctx.beginPath();
    ctx.moveTo(-size*0.35, -size*0.2);
    ctx.quadraticCurveTo(-size*0.45, size*0.3, -size*0.25, size*0.45);
    ctx.lineTo(size*0.25, size*0.45);
    ctx.quadraticCurveTo(size*0.45, size*0.3, size*0.35, -size*0.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 壶顶黄铜圆顶与旋钮
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(0, -size*0.28, size*0.14, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -size*0.36, size*0.06, 0, Math.PI * 2);
    ctx.fill();

    // 3. 升腾的白色热蒸汽 (Swirling Steam)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (let s = 0; s < 3; s++) {
      const sy = -size*0.45 - (s * 8 + (animTime * 25) % 24);
      const sx = Math.sin(animTime * 6 + s * 2) * 5;
      const sr = 3 + s * 2;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  static drawSnowLog(ctx, x, y, size = 40) {
    ctx.save();
    ctx.translate(x, y);

    const logW = size * 1.7;
    const logH = size * 0.6;

    // 1. 深褐色粗糙松木树干 (Dark Bark Wood Texture)
    const barkGrad = ctx.createLinearGradient(0, -logH/2, 0, logH/2);
    barkGrad.addColorStop(0, '#4a2e18');
    barkGrad.addColorStop(0.5, '#2e1c0f');
    barkGrad.addColorStop(1, '#1b1008');
    ctx.fillStyle = barkGrad;

    ctx.beginPath();
    ctx.roundRect(-logW/2, -logH/2, logW, logH, 6);
    ctx.fill();
    ctx.strokeStyle = '#100a05';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 树木断截面年轮
    ctx.fillStyle = '#795548';
    ctx.beginPath();
    ctx.ellipse(-logW/2 + 5, 0, 4, logH/2 - 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4e342e';
    ctx.stroke();

    // 绿色青苔斑痕
    ctx.fillStyle = '#33691e';
    ctx.fillRect(-logW/4, logH/4, size*0.4, 4);

    // 2. 树干上方厚厚的松软积雪毯 (Thick White Snow Blanket)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-logW/2 + 2, -logH/2);
    ctx.quadraticCurveTo(-logW/4, -logH/2 - 10, 0, -logH/2 - 7);
    ctx.quadraticCurveTo(logW/4, -logH/2 - 12, logW/2 - 2, -logH/2);
    ctx.lineTo(logW/2 - 2, -logH/2 + 6);
    ctx.quadraticCurveTo(0, -logH/2 + 2, -logW/2 + 2, -logH/2 + 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#cfd8dc';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  static drawJumpRamp(ctx, x, y, size = 45, animTime = 0) {
    ctx.save();
    ctx.translate(x, y);

    const rampW = size * 1.8;
    const rampH = size * 0.9;

    // 1. 厚重原木斜坡框架 (Timber Ramp Skeleton)
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.moveTo(-rampW/2, rampH/2);
    ctx.lineTo(0, -rampH/2);
    ctx.lineTo(rampW/2, rampH/2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 2. 跑道黑黄相间危险跳台警示条 (Yellow/Black Hazard Striping)
    ctx.save();
    ctx.clip();
    const stripeW = 12;
    for (let s = -rampW/2 - 20; s < rampW/2 + 20; s += stripeW * 2) {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(s, rampH/2);
      ctx.lineTo(s + stripeW, rampH/2);
      ctx.lineTo(s + stripeW + 15, -rampH/2);
      ctx.lineTo(s + 15, -rampH/2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 3. 跑道起跳边缘高光与青色起跳引导灯
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(-rampW/2 + 10, -rampH/2 + 8);
    ctx.lineTo(rampW/2 - 10, -rampH/2 + 8);
    ctx.stroke();

    ctx.restore();
  }

  static drawPineTree3D(ctx, x, y, size = 50) {
    ctx.save();
    ctx.translate(x, y);

    // 1. 树干
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(-size*0.08, size*0.3, size*0.16, size*0.4);

    // 2. 三层深绿松针覆雪树冠 (Layered Snow Pine Needles)
    const layers = [
      { y: size*0.3, w: size*0.8, h: size*0.35, snow: 6 },
      { y: 0, w: size*0.6, h: size*0.35, snow: 5 },
      { y: -size*0.3, w: size*0.4, h: size*0.35, snow: 4 }
    ];

    for (const l of layers) {
      // 墨绿色松针
      ctx.fillStyle = '#1b4d24';
      ctx.beginPath();
      ctx.moveTo(0, l.y - l.h);
      ctx.lineTo(l.w/2, l.y);
      ctx.lineTo(-l.w/2, l.y);
      ctx.closePath();
      ctx.fill();

      // 树顶积雪
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, l.y - l.h);
      ctx.lineTo(l.w/3, l.y - l.h/2 + l.snow);
      ctx.lineTo(-l.w/3, l.y - l.h/2 + l.snow);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  static drawFinishGantry(ctx, x, y, width = 450, height = 180) {
    ctx.save();
    ctx.translate(x, y);

    // 1. 左右重型橡木立柱
    ctx.fillStyle = '#271610';
    ctx.fillRect(-width/2, -height, 28, height);
    ctx.fillRect(width/2 - 28, -height, 28, height);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(-width/2, -height, 28, height);
    ctx.strokeRect(width/2 - 28, -height, 28, height);

    // 2. 顶部龙门横梁
    const beamGrad = ctx.createLinearGradient(0, -height, 0, -height + 40);
    beamGrad.addColorStop(0, '#4e342e');
    beamGrad.addColorStop(0.5, '#271610');
    beamGrad.addColorStop(1, '#1b0f0a');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(-width/2 - 15, -height, width + 30, 40);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.strokeRect(-width/2 - 15, -height, width + 30, 40);

    // 3. 黑白赛车冲线方格旗纹样 (Checkered Finish Banner)
    const checkSize = 15;
    for (let cx = -width/2 + 20; cx < width/2 - 20; cx += checkSize * 2) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx, -height + 10, checkSize, checkSize);
      ctx.fillRect(cx + checkSize, -height + 25, checkSize, checkSize);
      ctx.fillStyle = '#111111';
      ctx.fillRect(cx + checkSize, -height + 10, checkSize, checkSize);
      ctx.fillRect(cx, -height + 25, checkSize, checkSize);
    }

    // 4. 黄金铜牌题字：OMAHA CENTRAL TERMINUS
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.font = 'bold 15px "Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ OMAHA CENTRAL TERMINUS · 终点大冲线 ★', 0, -height - 10);

    // 5. 左右两盏发光的维多利亚防风煤油吊灯
    for (const lx of [-width/2 + 14, width/2 - 14]) {
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(lx, -height + 55, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // 8.7 关9 亨丽埃塔号 狂暴大西洋热力节拍天王 (透纳油画级大西洋怒涛与维多利亚黄铜朋克节奏台典藏版)
  static drawAtlanticCinematicScene(ctx, width, height, speedKnots = 20, isFever = false, animTime = 0) {
    ctx.save();

    const skyH = height * 0.60;

    // =========================================================================
    // 1. 透纳油画级：大西洋暴风雨狂澜夜空与雷暴云层 (Turner Storm Sky & Lightning)
    // =========================================================================
    const skyGrad = ctx.createLinearGradient(0, 0, 0, skyH);
    skyGrad.addColorStop(0, '#04070a');
    skyGrad.addColorStop(0.3, '#0b1620');
    skyGrad.addColorStop(0.7, '#132837');
    skyGrad.addColorStop(1, '#081a24');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, skyH);

    // 翻滚的墨黑风暴云团 (Billowing Storm Clouds)
    for (let c = 0; c < 5; c++) {
      const cx = (c * 280 + animTime * 40) % (width + 300) - 150;
      const cy = 30 + Math.sin(c * 1.5) * 20;
      const cloudGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 140);
      cloudGrad.addColorStop(0, 'rgba(25, 45, 60, 0.45)');
      cloudGrad.addColorStop(0.6, 'rgba(15, 28, 38, 0.3)');
      cloudGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = cloudGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 140, 0, Math.PI * 2);
      ctx.fill();
    }

    // 撕裂夜空的剧烈闪电 (Dramatic Lightning Flash)
    if (Math.sin(animTime * 2.8) > 0.96) {
      ctx.fillStyle = 'rgba(230, 248, 255, 0.48)';
      ctx.fillRect(0, 0, width, skyH);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(width * 0.7, 0);
      ctx.lineTo(width * 0.68, 60);
      ctx.lineTo(width * 0.72, 110);
      ctx.lineTo(width * 0.69, 170);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // =========================================================================
    // 2. 滔天层叠大西洋巨浪与浪花碎沫 (Multi-Layer Titanic Ocean Swells)
    // =========================================================================
    for (let w = 0; w < 4; w++) {
      const waveBaseY = skyH * 0.52 + w * 34;
      const waveGrad = ctx.createLinearGradient(0, waveBaseY - 30, 0, skyH);
      waveGrad.addColorStop(0, w === 0 ? 'rgba(30, 65, 85, 0.88)' : (w === 1 ? 'rgba(22, 52, 70, 0.94)' : (w === 2 ? '#113042' : '#0a1e2a')));
      waveGrad.addColorStop(1, '#051017');
      ctx.fillStyle = waveGrad;

      ctx.beginPath();
      ctx.moveTo(0, skyH);
      ctx.lineTo(0, waveBaseY);
      for (let x = 0; x <= width; x += 25) {
        const freq = 0.011 - w * 0.0015;
        const speed = (w + 1) * 160;
        const wy = waveBaseY + Math.sin((x + animTime * speed) * freq) * (20 + w * 8) + Math.cos((x * 0.5 + animTime * 80) * 0.015) * 8;
        ctx.lineTo(x, wy);
      }
      ctx.lineTo(width, skyH);
      ctx.closePath();
      ctx.fill();

      // 浪尖白沫碎浪 (White Sea Foam Crests)
      ctx.strokeStyle = w === 3 ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = w === 3 ? 3.5 : 2;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 25) {
        const freq = 0.011 - w * 0.0015;
        const speed = (w + 1) * 160;
        const wy = waveBaseY + Math.sin((x + animTime * speed) * freq) * (20 + w * 8) + Math.cos((x * 0.5 + animTime * 80) * 0.015) * 8;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }

    // =========================================================================
    // 3. 亨丽埃塔号高精维多利亚明轮战舰 (Master Steamer SS Henrietta)
    // =========================================================================
    const shipX = width * 0.48;
    const shipPitch = Math.sin(animTime * 4.2) * 0.09;
    const shipY = skyH * 0.58 + Math.sin(animTime * 3.5) * 14;

    ctx.save();
    ctx.translate(shipX, shipY);
    ctx.rotate(shipPitch);

    // 船体吃水下层红铜底板 (Copper Sheathed Keel)
    ctx.fillStyle = '#6d2b18';
    ctx.beginPath();
    ctx.moveTo(-175, 25);
    ctx.lineTo(215, 22);
    ctx.lineTo(170, 58);
    ctx.lineTo(-140, 55);
    ctx.closePath();
    ctx.fill();

    // 船身上层黑色铆接厚钢骨架 (Black Riveted Steel Hull)
    const hullGrad = ctx.createLinearGradient(0, -35, 0, 30);
    hullGrad.addColorStop(0, '#455a64');
    hullGrad.addColorStop(0.3, '#263238');
    hullGrad.addColorStop(0.7, '#1b2327');
    hullGrad.addColorStop(1, '#0e1417');
    ctx.fillStyle = hullGrad;

    ctx.beginPath();
    ctx.moveTo(-195, -18);
    ctx.lineTo(235, -22);
    ctx.lineTo(215, 26);
    ctx.lineTo(-175, 26);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = isFever ? '#ffd700' : '#b0bec5';
    ctx.lineWidth = isFever ? 3.5 : 2;
    ctx.stroke();

    // 船舷金边装饰带与排水口 (Gold Trim & Scuppers)
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-190, -8);
    ctx.lineTo(228, -12);
    ctx.stroke();

    // 船身金字铭牌: SS HENRIETTA
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 9px "Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ S.S. HENRIETTA ★', 35, 12);

    // 舷窗内透出的温暖火光 (Glowing Amber Portholes)
    for (let px = -130; px < 160; px += 35) {
      ctx.fillStyle = '#ffb300';
      ctx.beginPath();
      ctx.arc(px, 2, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 上甲板柚木护栏与驾驶舵楼 (Upper Deck Cabins & Brass Railing)
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(-60, -38, 120, 20);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(-60, -38, 120, 20);

    // 船首斜桅 (Bowsprit Spar)
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.moveTo(230, -20);
    ctx.lineTo(285, -45);
    ctx.lineTo(285, -40);
    ctx.lineTo(232, -15);
    ctx.closePath();
    ctx.fill();

    // 桅顶英国皇家红色三角旗 (Flying Crimson Pennant)
    ctx.fillStyle = '#d32f2f';
    ctx.beginPath();
    ctx.moveTo(-180, -95);
    ctx.lineTo(-215 - Math.sin(animTime * 18) * 12, -88);
    ctx.lineTo(-180, -80);
    ctx.closePath();
    ctx.fill();

    // 双生高耸蒸汽烟囱 (Twin Forged Iron Smokestacks)
    for (const fx of [-40, 50]) {
      // 烟囱管身
      const stackGrad = ctx.createLinearGradient(fx - 15, 0, fx + 15, 0);
      stackGrad.addColorStop(0, '#263238');
      stackGrad.addColorStop(0.5, '#455a64');
      stackGrad.addColorStop(1, '#1a2327');
      ctx.fillStyle = stackGrad;
      ctx.fillRect(fx - 15, -95, 30, 65);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.strokeRect(fx - 15, -95, 30, 65);

      // 烟囱上部鲜红条纹 (Red Stripe)
      ctx.fillStyle = '#c62828';
      ctx.fillRect(fx - 14, -93, 28, 16);

      // 喷薄而出的冲天烈火风暴与火星 (Roaring Flame Blast & Fire Plumes)
      const fireH = isFever ? 115 : 68;
      const flameGrad = ctx.createLinearGradient(0, -95, 0, -95 - fireH);
      flameGrad.addColorStop(0, '#ffffff');
      flameGrad.addColorStop(0.25, '#ffcc00');
      flameGrad.addColorStop(0.65, '#ff3300');
      flameGrad.addColorStop(1, 'rgba(255, 30, 0, 0)');
      ctx.fillStyle = flameGrad;

      ctx.beginPath();
      ctx.moveTo(fx - 14, -95);
      ctx.quadraticCurveTo(fx - 30 - (speedKnots * 1.2), -95 - fireH - Math.sin(animTime * 25) * 15, fx + 14, -95);
      ctx.closePath();
      ctx.fill();

      // 滚滚向后弥漫的黑色煤烟云 (Dark Smoke Billows)
      for (let s = 0; s < 5; s++) {
        const sx = fx - 35 - s * 34 - (speedKnots * 2.2);
        const sy = -95 - fireH * 0.6 - s * 16 + Math.sin(animTime * 8 + s) * 10;
        const sr = 18 + s * 10;
        ctx.fillStyle = isFever ? 'rgba(255, 110, 0, 0.7)' : 'rgba(30, 38, 44, 0.7)';
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 中央巨型精钢黄铜明轮 (Giant Paddle Wheel)
    const wheelX = 5;
    const wheelY = 18;
    ctx.save();
    ctx.translate(wheelX, wheelY);
    ctx.rotate(animTime * speedKnots * 0.7);

    // 明轮外罩半圆弧
    ctx.fillStyle = '#263238';
    ctx.beginPath();
    ctx.arc(0, 0, 36, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 明轮叶片 (Paddle Wheel Blades)
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      ctx.strokeStyle = '#b87333';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 34, Math.sin(a) * 34);
      ctx.stroke();

      // 叶片末端木板
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(Math.cos(a) * 26 - 4, Math.sin(a) * 26 - 4, 8, 8);
    }
    // 轴心黄铜盖
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 船头撕裂狂暴浪花 (Explosive Bow Spray)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.beginPath();
    ctx.moveTo(235, -22);
    ctx.quadraticCurveTo(275 + Math.sin(animTime * 20) * 25, 5, 205, 48);
    ctx.lineTo(235, -22);
    ctx.fill();

    // FEVER 狂暴状态全屏金色光翼与破空速度线
    if (isFever) {
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.85)';
      ctx.lineWidth = 4.5;
      ctx.shadowColor = '#ff3300';
      ctx.shadowBlur = 30;
      ctx.strokeRect(-205, -105, 450, 170);
      ctx.shadowBlur = 0;
    }

    ctx.restore();

    // 4. 呼啸暴风雨斜向雨丝
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.lineWidth = 1.5;
    for (let r = 0; r < 40; r++) {
      const rx = (r * 36 + animTime * 750) % (width + 120);
      const ry = (r * 16 + animTime * 950) % skyH;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 28, ry + 42);
      ctx.stroke();
    }

    ctx.restore();
  }

  static drawRhythmHighway(ctx, x, y, width, height, hitTargetX = 230, animTime = 0) {
    ctx.save();
    ctx.translate(x, y);

    // =========================================================================
    // 1. 维多利亚黄铜与铸铁铆接机车控制台底盘 (Steampunk Locomotive Chassis)
    // =========================================================================
    const chassisGrad = ctx.createLinearGradient(0, 0, 0, height);
    chassisGrad.addColorStop(0, '#263238');
    chassisGrad.addColorStop(0.15, '#1b262c');
    chassisGrad.addColorStop(0.85, '#0f171c');
    chassisGrad.addColorStop(1, '#080c0e');
    ctx.fillStyle = chassisGrad;

    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, 18);
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 上下纯金雕花饰带 (Gold Trim Filigree)
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(0, 0, width, 10);
    ctx.fillRect(0, height - 10, width, 10);

    // 左右四个角落古典黄铜加固角花 (Victorian Corner Brackets)
    for (const [bx, by] of [[8, 8], [width - 24, 8], [8, height - 24], [width - 24, height - 24]]) {
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(bx, by, 16, 16);
      ctx.fillStyle = '#37474f';
      ctx.beginPath();
      ctx.arc(bx + 8, by + 8, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // =========================================================================
    // 2. 4 条高精度彩色发光琉璃导轨 (4 Stained-Glass Rhythm Rails)
    // =========================================================================
    const laneH = (height - 20) / 4;
    const laneThemes = [
      { border: 'rgba(255, 51, 0, 0.35)', stream: '#ff3300', glow: 'rgba(255, 51, 0, 0.12)' },    // 轨0: 🔴 斩木
      { border: 'rgba(255, 179, 0, 0.35)', stream: '#ffb300', glow: 'rgba(255, 179, 0, 0.12)' },  // 轨1: 🟡 投炉
      { border: 'rgba(0, 229, 255, 0.35)', stream: '#00e5ff', glow: 'rgba(0, 229, 255, 0.12)' },  // 轨2: 🔵 爆气
      { border: 'rgba(224, 64, 251, 0.35)', stream: '#e040fb', glow: 'rgba(224, 64, 251, 0.12)' } // 轨3: 🟣 抗浪
    ];

    for (let l = 0; l < 4; l++) {
      const ly = 10 + l * laneH;
      const theme = laneThemes[l];

      // 轨道底色光晕
      ctx.fillStyle = theme.glow;
      ctx.fillRect(0, ly, width, laneH);

      // 分割线
      if (l > 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, ly);
        ctx.lineTo(width, ly);
        ctx.stroke();
      }

      // 导轨流光波纹 (Highway Pulse Stream)
      ctx.strokeStyle = theme.stream;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([25, 45]);
      ctx.lineDashOffset = -animTime * 380;
      ctx.beginPath();
      ctx.moveTo(hitTargetX, ly + laneH / 2);
      ctx.lineTo(width - 20, ly + laneH / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // =========================================================================
    // 3. 黄金齿轮透镜判定核心区 (Golden Gear Judgement Core)
    // =========================================================================
    // 判定光柱背景
    const coreGrad = ctx.createLinearGradient(hitTargetX - 35, 0, hitTargetX + 35, 0);
    coreGrad.addColorStop(0, 'rgba(255, 215, 0, 0.05)');
    coreGrad.addColorStop(0.5, 'rgba(255, 215, 0, 0.55)');
    coreGrad.addColorStop(1, 'rgba(255, 215, 0, 0.05)');
    ctx.fillStyle = coreGrad;
    ctx.fillRect(hitTargetX - 45, 10, 90, height - 20);

    // 垂直黄金判定激光线
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(hitTargetX, 10);
    ctx.lineTo(hitTargetX, height - 10);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 4 个轨道的黄铜宝石判定盘 (4 Ornate Target Nodes)
    for (let l = 0; l < 4; l++) {
      const cy = 10 + l * laneH + laneH / 2;

      // 齿轮外圈
      ctx.fillStyle = '#0a1014';
      ctx.beginPath();
      ctx.arc(hitTargetX, cy, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 内圈呼吸光晕
      const nodePulse = Math.sin(animTime * 12 + l) * 0.2 + 0.8;
      ctx.strokeStyle = laneThemes[l].stream;
      ctx.lineWidth = 2.5 * nodePulse;
      ctx.beginPath();
      ctx.arc(hitTargetX, cy, 21, 0, Math.PI * 2);
      ctx.stroke();

      // 醒目按键提示
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      const keyLabel = l === 0 ? 'J / 🪓' : (l === 1 ? 'K / 🔥' : (l === 2 ? 'SPACE' : 'W / 🌊'));
      ctx.fillText(keyLabel, hitTargetX, cy + 4);
    }

    ctx.restore();
  }

  static drawRhythmNote(ctx, x, y, lane = 0, type = 'chop', animTime = 0) {
    ctx.save();
    ctx.translate(x, y);

    const radius = 26;

    if (lane === 0 || type === 'chop') {
      // 🔴 红色音符：烈火劈木双刃战斧 (Red Molten Steel Axe)
      const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, radius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#ff5722');
      grad.addColorStop(0.8, '#d32f2f');
      grad.addColorStop(1, '#7f0000');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 旋转双刃飞斧图标
      ctx.save();
      ctx.rotate(animTime * 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🪓', 0, 6);
      ctx.restore();

    } else if (lane === 1 || type === 'shovel') {
      // 🟡 黄色音符：黄金原木与火膛烈焰 (Yellow Blazing Hearth Log)
      const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, radius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.35, '#ffd700');
      grad.addColorStop(0.8, '#ff8f00');
      grad.addColorStop(1, '#bf360c');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔥', 0, 7);

    } else if (lane === 2 || type === 'vent') {
      // 🔵 蓝色音符：高压蒸汽涡轮与闪电电弧 (Blue Steam Turbine Dynamo)
      const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, radius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.35, '#00e5ff');
      grad.addColorStop(0.8, '#0288d1');
      grad.addColorStop(1, '#01579b');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡', 0, 7);

    } else {
      // 🟣 紫色音符：大西洋滔天狂澜晶球 (Purple Oceanic Tidal Sphere)
      const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, radius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.35, '#ea80fc');
      grad.addColorStop(0.8, '#aa00ff');
      grad.addColorStop(1, '#4a148c');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🌊', 0, 7);
    }

    ctx.restore();
  }

  // 9. 绘制狂野西部骑马强盗追兵 (带疾驰动画与马蹄软阴影)
  static drawBanditHorse(ctx, x, y, width = 175, height = 175, isFlipped = false, animTime = 0) {
    this.init();
    ctx.save();

    // 软阴影
    this.drawGroundShadow(ctx, x, y + height * 0.42, 110, 24, 0.4);

    const gallopBob = Math.sin(animTime * 16) * 6;
    ctx.translate(x, y + gallopBob);

    if (isFlipped) {
      ctx.scale(-1, 1);
    }

    const sprite = this.getTransparentSprite('bandit_horse');
    if (sprite) {
      ctx.drawImage(sprite, -width / 2, -height / 2, width, height);
    } else {
      const raw = this.rawImages.bandit_horse;
      if (raw && raw.complete) {
        ctx.drawImage(raw, -width / 2, -height / 2, width, height);
      }
    }

    ctx.restore();
  }

  // 10. 绘制旧金山酒馆红衣牛仔打手
  static drawSaloonBrawler(ctx, x, y, width = 150, height = 150, isFlipped = false, animTime = 0) {
    this.init();
    ctx.save();

    this.drawGroundShadow(ctx, x, y + height * 0.45, 80, 20, 0.45);

    const brawlerBob = Math.sin(animTime * 12) * 4;
    ctx.translate(x, y + brawlerBob);

    if (isFlipped) {
      ctx.scale(-1, 1);
    }

    const sprite = this.getTransparentSprite('saloon_brawler');
    if (sprite) {
      ctx.drawImage(sprite, -width / 2, -height / 2, width, height);
    } else {
      const raw = this.rawImages.saloon_brawler;
      if (raw && raw.complete) {
        ctx.drawImage(raw, -width / 2, -height / 2, width, height);
      }
    }

    ctx.restore();
  }

  // 11. 绘制日本横滨长鼻天狗杂技艺人 (带长鼻木雕与和服羽织)
  static drawTenguAcrobat(ctx, x, y, width = 135, height = 135, tiltRad = 0) {
    this.init();
    ctx.save();

    ctx.translate(x, y);
    ctx.rotate(tiltRad);

    const sprite = this.getTransparentSprite('tengu_acrobat');
    if (sprite) {
      ctx.drawImage(sprite, -width / 2, -height / 2, width, height);
    } else {
      const raw = this.rawImages.tengu_acrobat;
      if (raw && raw.complete) {
        ctx.drawImage(raw, -width / 2, -height / 2, width, height);
      }
    }

    ctx.restore();
  }

  // 12. 绘制暗夜神庙婆罗门护寺武僧与卫兵 (1872 印式头巾、弯刀与动态火把)
  static drawTempleGuard(ctx, x, y, facingAngle = 0, alertLevel = 0, isKnockedOut = false, animTime = 0) {
    this.init();
    ctx.save();

    // 软阴影
    this.drawGroundShadow(ctx, x, y + 26, 46, 14, 0.45);

    if (isKnockedOut) {
      // 击晕状态：侧躺在地面，头顶冒出旋转金色眩晕星星
      ctx.translate(x, y + 16);
      ctx.rotate(Math.PI * 0.48);

      // 躯体与头巾
      ctx.fillStyle = '#b84a14'; // 藏红花色僧袍
      ctx.fillRect(-12, -22, 24, 44);
      ctx.strokeStyle = '#2d1808';
      ctx.lineWidth = 2;
      ctx.strokeRect(-12, -22, 24, 44);

      // 头部与头巾
      ctx.fillStyle = '#8c360d';
      ctx.beginPath();
      ctx.arc(0, -28, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 掉落的弯刀
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(18, 10);
      ctx.quadraticCurveTo(32, -4, 40, -18);
      ctx.stroke();

      // 头顶眩晕星星
      const starAngle = animTime * 4;
      for (let i = 0; i < 3; i++) {
        const sa = starAngle + (i * Math.PI * 2) / 3;
        const sx = Math.cos(sa) * 16;
        const sy = -36 + Math.sin(sa) * 6;
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('💫', sx - 6, sy + 4);
      }
    } else {
      // 站立巡逻状态
      const breathBob = Math.sin(animTime * 6) * 2;
      ctx.translate(x, y + breathBob);
      ctx.rotate(facingAngle);

      // 躯体：藏红花色僧袍与皮质宽腰带
      ctx.fillStyle = '#d4651e';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2d1808';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 头部：缠绕式印式大头巾 (Saffron Turban)
      ctx.fillStyle = '#ff7b00';
      ctx.beginPath();
      ctx.arc(0, -6, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a3300';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 头巾顶饰红宝石金徽
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(0, -14, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 手中紧握的古印度弯刀 (Talwar)
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(12, 6);
      ctx.quadraticCurveTo(24, 14, 28, 26);
      ctx.stroke();
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(8, 4);
      ctx.lineTo(16, 8);
      ctx.stroke();

      // 警觉状态指示器 (❓ 调查 / ❗ 警报)
      if (alertLevel === 1) {
        ctx.rotate(-facingAngle);
        ctx.fillStyle = '#ffe87c';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('❓', -6, -28);
      } else if (alertLevel === 2) {
        ctx.rotate(-facingAngle);
        ctx.fillStyle = '#ff4d4d';
        ctx.font = '900 18px sans-serif';
        ctx.fillText('❗', -4, -28);
      }
    }

    ctx.restore();
  }

  // 13. 绘制神庙巡逻猎犬 (Temple Bloodhound)
  static drawGuardDog(ctx, x, y, facingAngle = 0, isAlert = false, animTime = 0) {
    ctx.save();
    this.drawGroundShadow(ctx, x, y + 16, 32, 10, 0.4);

    const trotBob = Math.sin(animTime * 12) * 2;
    ctx.translate(x, y + trotBob);
    ctx.rotate(facingAngle);

    // 躯体 (Brown Hound Body)
    ctx.fillStyle = '#6b4423';
    ctx.strokeStyle = '#2b1708';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 头部与长耳朵
    ctx.fillStyle = '#855228';
    ctx.beginPath();
    ctx.arc(14, -2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 摇摆尾巴
    const tailWag = Math.sin(animTime * 18) * 0.4;
    ctx.strokeStyle = '#6b4423';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.quadraticCurveTo(-22, -6 + tailWag * 8, -26, -2);
    ctx.stroke();

    ctx.restore();
  }

  // 14. 绘制暗夜潜行路路通与土邦王化装 (Infiltration Cloak & Rajah Disguise)
  static drawInfiltrationPassepartout(ctx, x, y, facingAngle = 0, isHiding = false, isDisguisedRajah = false, animTime = 0) {
    ctx.save();
    this.drawGroundShadow(ctx, x, y + 24, 42, 12, isHiding ? 0.2 : 0.45);

    ctx.translate(x, y);

    if (isHiding) {
      // 匿踪在阴影与草丛中：半透明暗夜微光
      ctx.globalAlpha = 0.55;
      ctx.shadowColor = '#50e3c2';
      ctx.shadowBlur = 12;
    }

    if (isDisguisedRajah) {
      // 🌟 假扮土邦王复活：纯金华丽王冠 + 猩红织锦王袍与孔雀羽
      ctx.fillStyle = '#8b0000';
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 金丝刺绣披风
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(-14, -6, 28, 12);

      // 纯金高耸王冠与孔雀羽翎
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(-10, -18);
      ctx.lineTo(-5, -28);
      ctx.lineTo(0, -22);
      ctx.lineTo(5, -28);
      ctx.lineTo(10, -18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fff0a6';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 孔雀羽饰
      ctx.fillStyle = '#00a896';
      ctx.beginPath();
      ctx.arc(0, -32, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 暗夜潜行斗篷装束
      ctx.rotate(facingAngle);

      ctx.fillStyle = '#1c2430'; // 暗夜蓝斗篷
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#50e3c2';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 贝雷帽与小圆领
      ctx.fillStyle = '#2b3a4a';
      ctx.beginPath();
      ctx.arc(0, -5, 11, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // 15. 绘制暗夜神庙茂密合欢与榕树灌木丛 (Lush Stealth Bush)
  static drawTempleBush(ctx, x, y, w = 90, h = 60) {
    ctx.save();
    this.drawGroundShadow(ctx, x + w / 2, y + h - 6, w * 0.9, 20, 0.4);

    // 茂密丛生灌木球
    const bushGrad = ctx.createLinearGradient(x, y, x, y + h);
    bushGrad.addColorStop(0, '#2d5a27');
    bushGrad.addColorStop(0.6, '#1b3a17');
    bushGrad.addColorStop(1, '#0e200c');

    ctx.fillStyle = bushGrad;
    ctx.strokeStyle = '#0f240d';
    ctx.lineWidth = 2;

    const clusters = [
      { cx: x + w * 0.25, cy: y + h * 0.5, r: h * 0.42 },
      { cx: x + w * 0.5, cy: y + h * 0.38, r: h * 0.48 },
      { cx: x + w * 0.75, cy: y + h * 0.52, r: h * 0.44 }
    ];

    clusters.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // 树叶点缀
    ctx.fillStyle = '#4ade80';
    for (let i = 0; i < 6; i++) {
      const lx = x + 15 + (i * (w - 30)) / 6;
      const ly = y + 15 + Math.sin(i * 1.5) * 10;
      ctx.beginPath();
      ctx.arc(lx, ly, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }


  // 16. 绘制 1872 维多利亚 20 吨双桅领航小帆船「坦克德尔号」(Tankadere Pilot Schooner)
  static drawTankadereSchooner(ctx, x, y, tiltAngle = 0, sailTrimRatio = 0.6, isOverdrive = false, animTime = 0) {
    this.init();
    ctx.save();

    // 船身波浪起伏与俯仰颠簸
    const pitchBob = Math.sin(animTime * 8) * 4;
    ctx.translate(x, y + pitchBob);
    ctx.rotate(tiltAngle);

    // 1. 船底吃水与浪花飞沫阴影 (Waterline Foam & Shadow)
    ctx.fillStyle = 'rgba(10, 25, 40, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 26, 68, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. 船体：柚木深褐与水线铜皮 (Teak Hull & Copper Sheathing)
    // 船体上部柚木
    const hullGrad = ctx.createLinearGradient(-55, -20, 55, 30);
    hullGrad.addColorStop(0, '#5c3a21');
    hullGrad.addColorStop(0.5, '#3d2514');
    hullGrad.addColorStop(1, '#24140a');
    ctx.fillStyle = hullGrad;

    ctx.beginPath();
    ctx.moveTo(0, -60); // 尖锐船首 (Bow)
    ctx.quadraticCurveTo(36, -20, 38, 25); // 右舷 (Starboard)
    ctx.lineTo(-38, 25); // 船尾平截 (Transom Stern)
    ctx.quadraticCurveTo(-36, -20, 0, -60); // 左舷 (Port)
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = isOverdrive ? '#ffd700' : '#8c6d23';
    ctx.lineWidth = isOverdrive ? 3 : 2;
    ctx.stroke();

    // 金色船首斜桅 (Bowsprit)
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, -55);
    ctx.lineTo(0, -88);
    ctx.stroke();

    // 3. 双桅杆与索具 (Fore & Main Masts & Rigging)
    ctx.strokeStyle = '#23160c';
    ctx.lineWidth = 4;
    // 前桅 (Foremast)
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(0, -18);
    ctx.stroke();
    // 主桅 (Mainmast)
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(0, 10);
    ctx.stroke();

    // 4. 动态鼓胀帆布 (Billowing Canvas Sails)
    const sailSpan = (sailTrimRatio || 0.6) * 58;
    const billowPulse = Math.sin(animTime * 12) * 3;

    // 主帆 (Mainsail)
    const sailGrad = ctx.createLinearGradient(-sailSpan, 0, sailSpan, 0);
    sailGrad.addColorStop(0, '#ede4d3');
    sailGrad.addColorStop(0.5, '#fffaf0');
    sailGrad.addColorStop(1, '#d8cbba');
    ctx.fillStyle = sailGrad;

    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.quadraticCurveTo(sailSpan * 0.7 + billowPulse, -15, sailSpan, -42);
    ctx.lineTo(0, -42);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = isOverdrive ? '#50e3c2' : '#8c6d23';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 前三角大斜帆 (Jib Sail)
    ctx.fillStyle = '#f7f2e7';
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.quadraticCurveTo(sailSpan * 0.5 + billowPulse, -50, sailSpan * 0.7, -72);
    ctx.lineTo(0, -80);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5. 满帆超频风暴光环 (Full Sail Overdrive Golden Trail)
    if (isOverdrive) {
      ctx.strokeStyle = 'rgba(80, 227, 194, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 65, -Math.PI * 0.7, Math.PI * 0.7);
      ctx.stroke();

      // 航速气流线
      for (let i = 0; i < 4; i++) {
        const lx = -25 + i * 16;
        ctx.strokeStyle = 'rgba(255, 235, 124, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lx, 32);
        ctx.lineTo(lx - 4, 60 + Math.random() * 15);
        ctx.stroke();
      }
    }

    // 6. 甲板人物微型立绘 (Captain John Bunsby & Fogg)
    // 船尾舵轮 (Helm Wheel)
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(0, 18, 5, 0, Math.PI * 2);
    ctx.fill();

    // 约翰船长 (Captain Bunsby in Blue Oilskin)
    ctx.fillStyle = '#1c3144';
    ctx.beginPath();
    ctx.arc(6, 14, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // 斐利亚·福克先生 (Fogg in Black Top Hat)
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(-8, -4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-10, -7, 4, 3); // 黑色礼帽顶

    // 艾娥达夫人 (Princess Aouda in Hooded Sea Cloak)
    ctx.fillStyle = '#8b1e1e';
    ctx.beginPath();
    ctx.arc(-8, 8, 4, 0, Math.PI * 2);
    ctx.fill();

    // 7. 船尾领航黄铜马灯 (Stern Brass Lantern)
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ff9900';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 25, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  // 17. 绘制太平洋邮船「科罗拉多号」巨型明轮蒸汽客船 (SS Colorado Steamer)
  static drawSSColoradoSteamer(ctx, x, y, w = 380, h = 180, animTime = 0) {
    this.init();
    ctx.save();

    const bob = Math.sin(animTime * 4) * 5;
    ctx.translate(x, y + bob);

    // 1. 庞大黑铁船体 (Black Iron Hull)
    const hullGrad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    hullGrad.addColorStop(0, '#222222');
    hullGrad.addColorStop(0.7, '#111111');
    hullGrad.addColorStop(0.71, '#8b0000'); // 红色水线 (Red Waterline)
    hullGrad.addColorStop(1, '#550000');

    ctx.fillStyle = hullGrad;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -15);
    ctx.lineTo(w / 2 - 30, -15);
    ctx.quadraticCurveTo(w / 2, 0, w / 2 - 10, 35);
    ctx.lineTo(-w / 2 + 20, 35);
    ctx.quadraticCurveTo(-w / 2, 10, -w / 2, -15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 2. 维多利亚白色多层甲板舱室 (White Multi-tier Cabins)
    ctx.fillStyle = '#f0ece1';
    ctx.fillRect(-w / 2 + 50, -48, w - 110, 33);
    ctx.fillRect(-w / 2 + 90, -75, w - 190, 27);
    ctx.strokeStyle = '#2b1f17';
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2 + 50, -48, w - 110, 33);
    ctx.strokeRect(-w / 2 + 90, -75, w - 190, 27);

    // 舷窗暖黄灯火 (Glowing Yellow Portholes)
    ctx.fillStyle = '#ffe87c';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 8;
    for (let px = -w / 2 + 65; px < w / 2 - 75; px += 22) {
      ctx.beginPath();
      ctx.arc(px, -32, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 3. 巨型双烟囱与滚滚浓烟 (Twin Black Smokestacks & Smoke)
    const drawFunnel = (fx) => {
      ctx.fillStyle = '#111111';
      ctx.fillRect(fx - 12, -120, 24, 45);
      // 红黑相间蒸汽带
      ctx.fillStyle = '#d90429';
      ctx.fillRect(fx - 12, -112, 24, 10);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(fx - 12, -120, 24, 45);

      // 浓烈蒸汽烟云
      ctx.fillStyle = 'rgba(60, 60, 60, 0.65)';
      for (let s = 0; s < 4; s++) {
        const sa = animTime * 6 + s * 1.5;
        const sx = fx - 25 - s * 22;
        const sy = -135 - s * 12 + Math.sin(sa) * 6;
        ctx.beginPath();
        ctx.arc(sx, sy, 14 + s * 8, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    drawFunnel(-45);
    drawFunnel(45);

    // 4. 外露巨型明轮箱 (Giant Paddlewheel Box)
    ctx.fillStyle = '#3a2b1f';
    ctx.beginPath();
    ctx.arc(0, 10, 36, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 翻滚飞溅的明轮白沫 (Churning White Foam)
    const wheelAngle = animTime * 14;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 2.5;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      const rx = Math.cos(a + wheelAngle) * 30;
      const ry = 10 + Math.sin(a + wheelAngle) * 30;
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.lineTo(rx, ry);
      ctx.stroke();
    }

    // 5. 舰首探照金光 (Searchlight Beam)
    const beamGrad = ctx.createRadialGradient(-w / 2 - 20, -10, 10, -w / 2 - 200, 40, 280);
    beamGrad.addColorStop(0, 'rgba(255, 235, 150, 0.85)');
    beamGrad.addColorStop(0.4, 'rgba(255, 215, 0, 0.35)');
    beamGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(-w / 2 - 20, -10);
    ctx.lineTo(-w / 2 - 280, -60);
    ctx.lineTo(-w / 2 - 280, 120);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // 18. 绘制南中国海暗礁巨岩 (Volcanic Sea Reef Rock)
  static drawSeaReefRock(ctx, x, y, radius = 35, animTime = 0) {
    ctx.save();
    // 暗礁吃水黑影
    ctx.fillStyle = 'rgba(5, 10, 15, 0.6)';
    ctx.beginPath();
    ctx.arc(x, y + 4, radius + 10, 0, Math.PI * 2);
    ctx.fill();

    // 嶙峋黑玄武岩
    const rockGrad = ctx.createRadialGradient(x - 10, y - 10, 5, x, y, radius);
    rockGrad.addColorStop(0, '#4a5568');
    rockGrad.addColorStop(0.6, '#2d3748');
    rockGrad.addColorStop(1, '#1a202c');
    ctx.fillStyle = rockGrad;

    ctx.beginPath();
    ctx.moveTo(x - radius, y + 10);
    ctx.lineTo(x - radius * 0.6, y - radius * 0.8);
    ctx.lineTo(x, y - radius);
    ctx.lineTo(x + radius * 0.7, y - radius * 0.6);
    ctx.lineTo(x + radius, y + 12);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#718096';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 拍击白浪花沫 (Crashing Foam Ring)
    const foamPulse = Math.sin(animTime * 10) * 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y + 6, radius + 4 + foamPulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  // 19. 绘制漂浮补给木箱 (Floating Supply Crate)
  static drawFloatingSupplyCrate(ctx, x, y, animTime = 0) {
    ctx.save();
    const bob = Math.sin(animTime * 8) * 3;
    ctx.translate(x, y + bob);

    // 阴影
    ctx.fillStyle = 'rgba(10, 20, 30, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 橡木箱身
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(-16, -16, 32, 32);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(-16, -16, 32, 32);

    // 铁箍加固条
    ctx.strokeStyle = '#2b1f17';
    ctx.lineWidth = 2;
    ctx.strokeRect(-12, -12, 24, 24);

    // 信号弹补给徽记
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', 0, 5);

    ctx.restore();
  }


  // 20. 绘制侧视 2.5D 巨浪冲浪版「坦克德尔号」双桅飞剪领航帆船 (Side-Profile Tankadere Surf Schooner)
  static drawTankadereSideProfile(ctx, x, y, tiltAngle = 0, isAirborne = false, isOverdrive = false, animTime = 0) {
    this.init();
    ctx.save();

    ctx.translate(x, y);
    ctx.rotate(tiltAngle);

    // 1. 船底吃水水花与白浪喷涌 (Bow Spray & Waterline)
    if (!isAirborne) {
      const sprayWave = Math.sin(animTime * 18) * 4;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.ellipse(-50, 18, 28 + sprayWave, 8, -0.2, 0, Math.PI * 2);
      ctx.ellipse(35, 14, 18, 6, 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. 侧视柚木飞剪船体 (Sleek Teak Clipper Hull)
    const hullGrad = ctx.createLinearGradient(0, -15, 0, 25);
    hullGrad.addColorStop(0, '#5c3a21');
    hullGrad.addColorStop(0.65, '#3a2313');
    hullGrad.addColorStop(0.66, '#8b0000'); // 鲜红铜质防腐水线 (Red Copper Bottom)
    hullGrad.addColorStop(1, '#550000');
    ctx.fillStyle = hullGrad;

    ctx.beginPath();
    ctx.moveTo(68, -12); // 尖锐飞剪船首 (Clipper Bow)
    ctx.lineTo(88, -20); // 船首斜桅根部 (Bowsprit base)
    ctx.lineTo(60, 16);  // 船首吃水下部
    ctx.quadraticCurveTo(0, 22, -65, 18); // 龙骨底部
    ctx.lineTo(-72, -8); // 优雅方形平截船尾 (Transom Stern)
    ctx.lineTo(-65, -12);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = isOverdrive ? '#ffd700' : '#d4af37';
    ctx.lineWidth = isOverdrive ? 3 : 2;
    ctx.stroke();

    // 细长金色船首斜桅 (Extended Bowsprit)
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(68, -12);
    ctx.lineTo(112, -26);
    ctx.stroke();

    // 3. 倾斜双桅杆 (Raked Fore & Main Masts)
    ctx.strokeStyle = '#2b1b0f';
    ctx.lineWidth = 3.5;
    // 前桅 (Foremast)
    ctx.beginPath();
    ctx.moveTo(25, -12);
    ctx.lineTo(15, -95);
    ctx.stroke();
    // 主桅 (Mainmast)
    ctx.beginPath();
    ctx.moveTo(-25, -12);
    ctx.lineTo(-38, -115);
    ctx.stroke();

    // 4. 鼓胀的雪白双斜帆与前大三角帆 (Full Wind Billowing Sails)
    const billow = Math.sin(animTime * 14) * 3;

    // 主帆 (Mainsail)
    const mainGrad = ctx.createLinearGradient(-38, -110, -85, -20);
    mainGrad.addColorStop(0, '#fffaf0');
    mainGrad.addColorStop(0.5, '#ede4d3');
    mainGrad.addColorStop(1, '#cfc2af');
    ctx.fillStyle = mainGrad;

    ctx.beginPath();
    ctx.moveTo(-38, -108);
    ctx.quadraticCurveTo(-70 + billow, -65, -88, -24); // 帆角后扬
    ctx.lineTo(-30, -18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = isOverdrive ? '#50e3c2' : '#8c6d23';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 前桅帆 (Foresail)
    ctx.fillStyle = '#f7f2e7';
    ctx.beginPath();
    ctx.moveTo(15, -90);
    ctx.quadraticCurveTo(-15 + billow, -55, -28, -20);
    ctx.lineTo(20, -16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 飞剪大三角主斜帆 (Flying Jib)
    ctx.fillStyle = '#faf6ed';
    ctx.beginPath();
    ctx.moveTo(15, -85);
    ctx.quadraticCurveTo(60 + billow, -45, 105, -24);
    ctx.lineTo(30, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5. 甲板人物剪影 (John Bunsby, Fogg, Aouda)
    // 约翰船长掌舵 (Captain at Stern)
    ctx.fillStyle = '#1c3144';
    ctx.beginPath();
    ctx.arc(-58, -18, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-62, -13, 8, 8); // 躯干

    // 福克先生 (Fogg with Monocle & Top Hat)
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(-5, -20, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-8, -26, 6, 7); // 黑色礼帽
    ctx.fillRect(-8, -15, 8, 9); // 大衣

    // 艾娥达夫人 (Aouda in Hooded Cloak)
    ctx.fillStyle = '#8b1e1e';
    ctx.beginPath();
    ctx.arc(8, -18, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(5, -13, 8, 7);

    // 6. 船尾黄铜风暴马灯 (Stern Lantern Glow)
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ff8c00';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(-72, -12, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 7. 满帆超频黄金气流粒子 (Overdrive Wind Aura)
    if (isOverdrive) {
      ctx.strokeStyle = 'rgba(80, 227, 194, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-90, -40);
      ctx.quadraticCurveTo(0, -120, 110, -25);
      ctx.stroke();

      for (let i = 0; i < 5; i++) {
        const ax = -80 + i * 35;
        ctx.strokeStyle = 'rgba(255, 235, 124, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ax, 20 + Math.random() * 8);
        ctx.lineTo(ax - 28, 25 + Math.random() * 12);
        ctx.stroke();
      }
    }

    ctx.restore();
  }


  // 21. 绘制漂浮强化道具胶囊 [P] / [S] / [B] (Arcade Power-Up Capsule)
  static drawPowerUpItem(ctx, x, y, type = 'P', animTime = 0) {
    ctx.save();
    const bob = Math.sin(animTime * 8) * 4;
    ctx.translate(x, y + bob);

    // 外围旋转能量环
    ctx.strokeStyle = type === 'P' ? '#ff4d4d' : (type === 'S' ? '#50e3c2' : '#ffd700');
    ctx.lineWidth = 2.5;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.stroke();

    // 内部发光底盘
    ctx.fillStyle = type === 'P' ? 'rgba(255, 77, 77, 0.35)' : (type === 'S' ? 'rgba(80, 227, 194, 0.35)' : 'rgba(255, 215, 0, 0.35)');
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();

    // 文字标识
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText(type, 0, 1);

    ctx.restore();
  }

  // 22. 绘制南中国海幽灵海盗炮艇 (Ghost Pirate Sloop)
  static drawPirateCutter(ctx, x, y, animTime = 0) {
    ctx.save();
    const bob = Math.sin(animTime * 6) * 3;
    ctx.translate(x, y + bob);

    // 船体吃水阴影
    ctx.fillStyle = 'rgba(10, 15, 25, 0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 20, 36, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // 黑色海盗木船身
    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath();
    ctx.moveTo(0, 35); // 船头朝下
    ctx.lineTo(24, -20);
    ctx.lineTo(-24, -20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8b0000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 黑色破损海盗船帆
    ctx.fillStyle = '#2d1818';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(28, 10);
    ctx.lineTo(0, 18);
    ctx.lineTo(-28, 10);
    ctx.closePath();
    ctx.fill();

    // 骷髅徽记
    ctx.fillStyle = '#ff4d4d';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('☠️', 0, 2);

    ctx.restore();
  }

  // 23. 绘制深海克拉肯巨兽拍击触手 (Kraken Tentacle)
  static drawKrakenTentacle(ctx, x, y, hpRatio = 1.0, animTime = 0) {
    ctx.save();
    ctx.translate(x, y);

    // 水面翻滚浪花
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 25, 34, 10, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 挥舞扭曲的大触手
    const wave = Math.sin(animTime * 8) * 14;
    const tentGrad = ctx.createLinearGradient(-15, -45, 15, 30);
    tentGrad.addColorStop(0, '#800080');
    tentGrad.addColorStop(0.5, '#4b0082');
    tentGrad.addColorStop(1, '#191970');
    ctx.fillStyle = tentGrad;

    ctx.beginPath();
    ctx.moveTo(-18, 25);
    ctx.quadraticCurveTo(-14 + wave, -15, 0 + wave * 1.5, -55); // 尖端
    ctx.quadraticCurveTo(14 + wave, -15, 18, 25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ba55d3';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 吸盘
    ctx.fillStyle = '#ff69b4';
    for (let i = 0; i < 4; i++) {
      const sy = 12 - i * 16;
      const sx = (wave * (i + 1)) / 4;
      ctx.beginPath();
      ctx.arc(sx - 6, sy, 3.5, 0, Math.PI * 2);
      ctx.arc(sx + 6, sy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 血条
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(-22, -68, 44, 5);
    ctx.fillStyle = '#00ffcc';
    ctx.fillRect(-22, -68, 44 * Math.max(0, hpRatio), 5);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(-22, -68, 44, 5);

    ctx.restore();
  }

  // 24. 绘制关底台风海怪克拉肯巨兽 (双阶段史诗 Boss · 阶段 1 深海暗甲 / 阶段 2 灭世狂暴)
  static drawKrakenBoss(ctx, x, y, hpRatio = 1.0, phase = 1, shieldActive = false, isChargingLaser = false, laserChargeRatio = 0, hitFlash = false, animTime = 0) {
    ctx.save();
    const bob = Math.sin(animTime * (phase === 2 ? 8 : 5)) * (phase === 2 ? 10 : 6);
    ctx.translate(x, y + bob);

    // 1. 水底深渊黑影与咆哮巨浪漩涡
    ctx.fillStyle = phase === 2 ? 'rgba(35, 5, 10, 0.85)' : 'rgba(5, 12, 25, 0.75)';
    ctx.beginPath();
    ctx.ellipse(0, 20, 125, 52, 0, 0, Math.PI * 2);
    ctx.fill();

    // 旋转风暴漩涡水流
    const vortexAngle = animTime * (phase === 2 ? 7 : 4);
    ctx.strokeStyle = phase === 2 ? 'rgba(255, 0, 85, 0.75)' : 'rgba(80, 227, 194, 0.65)';
    ctx.lineWidth = phase === 2 ? 4 : 3;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      ctx.beginPath();
      ctx.arc(0, 20, phase === 2 ? 105 : 90, a + vortexAngle, a + vortexAngle + Math.PI / 4);
      ctx.stroke();
    }

    // 2. 巨兽头颅甲壳 (受击白闪与狂暴赤红渐变)
    if (hitFlash) {
      ctx.fillStyle = '#ffffff';
    } else if (phase === 2) {
      const rageGrad = ctx.createRadialGradient(0, -10, 15, 0, 0, 95);
      rageGrad.addColorStop(0, '#ff0055');
      rageGrad.addColorStop(0.5, '#8b0000');
      rageGrad.addColorStop(1, '#2b0000');
      ctx.fillStyle = rageGrad;
    } else {
      const headGrad = ctx.createRadialGradient(0, -10, 15, 0, 0, 85);
      headGrad.addColorStop(0, '#9400d3');
      headGrad.addColorStop(0.6, '#4b0082');
      headGrad.addColorStop(1, '#0b001a');
      ctx.fillStyle = headGrad;
    }

    ctx.beginPath();
    ctx.ellipse(0, 0, 82, 60, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = phase === 2 ? '#ff0044' : '#ffd700';
    ctx.lineWidth = phase === 2 ? 4 : 3;
    ctx.stroke();

    // 阶段 1：雷暴护盾屏障 (Thunder Carapace Shield)
    if (shieldActive) {
      ctx.strokeStyle = 'rgba(80, 227, 194, 0.85)';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.ellipse(0, 0, 100, 75, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 护盾符文闪烁
      ctx.fillStyle = '#50e3c2';
      ctx.font = '900 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🛡️ [深海雷暴护盾 - 需先斩双触手破防!]', 0, 78);
      ctx.shadowBlur = 0;
    }

    // 阶段 2：风暴之心弱点核心 (Core Eye Weakpoint)
    if (phase === 2) {
      const corePulse = Math.sin(animTime * 12) * 4;
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffcc00';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 5, 18 + corePulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('弱点', 0, 9);
    }

    // 3. 闪烁雷光巨眼 (Raging Glowing Eyes)
    const eyeGlow = phase === 2 ? '#ff0000' : (Math.sin(animTime * 10) > 0 ? '#ff0055' : '#ffcc00');
    ctx.fillStyle = eyeGlow;
    ctx.shadowColor = eyeGlow;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(-28, -8, 14, 0, Math.PI * 2);
    ctx.arc(28, -8, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 竖瞳
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(-28, -8, 4, 12, 0, 0, Math.PI * 2);
    ctx.ellipse(28, -8, 4, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. 阶段 2 巨型毁灭雷暴激光充能 (Laser Charging Sphere)
    if (isChargingLaser) {
      const chargeRadius = (laserChargeRatio || 0.5) * 32;
      ctx.fillStyle = 'rgba(255, 0, 68, 0.85)';
      ctx.shadowColor = '#ff0044';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(0, 32, chargeRadius, 0, Math.PI * 2);
      ctx.fill();

      // 充能预警激光瞄准虚线
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(0, 35);
      ctx.lineTo(0, 600);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
    }

    // 5. Boss 顶部阶段与血条 (Phase & Health Bar)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(-130, -95, 260, 18);
    ctx.fillStyle = phase === 2 ? '#ff0000' : '#8b0000';
    ctx.fillRect(-128, -93, 256, 14);

    ctx.fillStyle = phase === 2 ? '#ff0044' : '#00ffcc';
    ctx.fillRect(-128, -93, 256 * Math.max(0, hpRatio), 14);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(-130, -95, 260, 18);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      phase === 2 ? '🔥 PHASE 2: 灭世狂暴克拉肯巨兽 (弱点核心暴击!)' : '⚡ PHASE 1: 深海雷暴克拉肯 (先破双生触手!)',
      0,
      -102
    );

    ctx.restore();
  }

  // 25. 绘制阶段 2 贯穿全屏的灭世雷暴死光 (Gigavolt Storm Laser Beam - 支持动态横向扫射)
  static drawKrakenLaser(ctx, startX, startY, endX = null, endY = 720, animTime = 0) {
    ctx.save();
    const targetX = endX !== null ? endX : startX;
    const pulseWidth = 55 + Math.sin(animTime * 30) * 10;

    // 外围赤红高能粒子光晕
    ctx.strokeStyle = 'rgba(255, 0, 68, 0.95)';
    ctx.lineWidth = pulseWidth;
    ctx.shadowColor = '#ff0044';
    ctx.shadowBlur = 35;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(targetX, endY);
    ctx.stroke();

    // 中间金红电离层
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = pulseWidth * 0.6;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(targetX, endY);
    ctx.stroke();

    // 核心白炽等离子光束
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = pulseWidth * 0.3;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(targetX, endY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 激光轰击水面掀起的剧烈白浪与等离子火星
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 10; i++) {
      const t = Math.random();
      const lx = startX + (targetX - startX) * t + (Math.random() - 0.5) * pulseWidth;
      const ly = startY + (endY - startY) * t;
      ctx.beginPath();
      ctx.arc(lx, ly, 3 + Math.random() * 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }


  // 26. 绘制横滨马戏团抛落道具 (奖励光环 vs 醒目红圈危险品 100% 视觉区分版)
  static drawCircusPropItem(ctx, x, y, type = 'ball', animTime = 0) {
    ctx.save();
    ctx.translate(x, y);

    const spin = animTime * 4;

    if (type === 'banana') {
      // 🍌 捣蛋香蕉皮 (醒目红色脉冲危险警示圈 + ⚠️ 标志，绝不与金币混淆！)
      const pulse = Math.sin(animTime * 10) * 4;
      ctx.strokeStyle = 'rgba(255, 0, 68, 0.9)';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ff0044';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, 24 + pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 顶部 ⚠️ 危险警告红标
      ctx.fillStyle = '#ff0044';
      ctx.font = '900 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️', 0, -26);

      // 香蕉皮本体 (黄黑分明)
      ctx.rotate(Math.sin(animTime * 8) * 0.25);
      ctx.fillStyle = '#ffd600';
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(-18, 12);
      ctx.quadraticCurveTo(-6, -10, 0, -14);
      ctx.quadraticCurveTo(6, -10, 18, 12);
      ctx.quadraticCurveTo(8, 6, 0, 4);
      ctx.quadraticCurveTo(-8, 6, -18, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 黑色皮尖与果皮分叉
      ctx.fillStyle = '#111111';
      ctx.fillRect(-3, -15, 6, 4);
      ctx.fillRect(-17, 10, 5, 3);
      ctx.fillRect(12, 10, 5, 3);

    } else if (type === 'firecracker') {
      // 💣 骷髅黑铁大炸弹 (醒目红光警告圈 + ☠️ 骷髅标)
      const pulse = Math.sin(animTime * 12) * 4;
      ctx.strokeStyle = 'rgba(255, 0, 68, 0.95)';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(0, 0, 24 + pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 顶部 ☠️ 骷髅标
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('☠️', 0, -26);

      // 黑铁圆球炸弹
      ctx.fillStyle = '#1c1c24';
      ctx.beginPath();
      ctx.arc(0, 2, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 炸弹引信与火花
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(6, -20);
      ctx.stroke();

      // 喷溅橙红火花
      ctx.fillStyle = '#ff3300';
      ctx.beginPath();
      ctx.arc(6, -20, 4 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (type === 'coin') {
      // 🪙 闪耀大金币 (明亮纯金光环 + ✦ 闪光粒子)
      ctx.rotate(spin * 1.5);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 方形钱眼与钻石反光
      ctx.fillStyle = '#4a2c00';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✦', 10, -8);

    } else if (type === 'ball') {
      // ⚽ 杂技七彩高亮旋转球 (青红黄绿彩虹转轮)
      ctx.rotate(spin);
      const colors = ['#ff0055', '#ffea00', '#00f0ff', '#00ff66'];
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 18, (i * Math.PI) / 2, ((i + 1) * Math.PI) / 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.stroke();

    } else if (type === 'onigiri') {
      // 🍙 纯白海苔饭团 (热气蒸腾 + 诱人美味)
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.quadraticCurveTo(20, 14, 16, 18);
      ctx.quadraticCurveTo(0, 20, -16, 18);
      ctx.quadraticCurveTo(-20, 14, 0, -20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 深绿海苔片
      ctx.fillStyle = '#0a2312';
      ctx.fillRect(-9, 3, 18, 16);

      // 美味热气
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.8;
      for (let i = -1; i <= 1; i++) {
        const sx = i * 9;
        const sy = -24 + Math.sin(animTime * 6 + i) * 4;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + 5, sy - 6, sx, sy - 14);
        ctx.stroke();
      }

    } else if (type === 'fan') {
      // 🪭 朱红金边折扇 (扇舞翩翩)
      ctx.rotate(Math.sin(animTime * 6) * 0.35);
      const fanGrad = ctx.createLinearGradient(-25, 0, 25, 0);
      fanGrad.addColorStop(0, '#d90429');
      fanGrad.addColorStop(0.5, '#ffd700');
      fanGrad.addColorStop(1, '#d90429');
      ctx.fillStyle = fanGrad;

      ctx.beginPath();
      ctx.moveTo(0, 14);
      ctx.arc(0, 14, 28, -Math.PI * 0.85, -Math.PI * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 扇骨
      ctx.strokeStyle = '#5c3a21';
      ctx.lineWidth = 2;
      for (let a = -Math.PI * 0.8; a <= -Math.PI * 0.2; a += Math.PI * 0.15) {
        ctx.beginPath();
        ctx.moveTo(0, 14);
        ctx.lineTo(Math.cos(a) * 28, 14 + Math.sin(a) * 28);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // 27. 绘制天狗装路路通杂技演员 (动态疾跑/翻滚/长鼻接抛/展翅大 POSE/飞扑)
  static drawPassepartoutTenguAcrobat(ctx, x, y, animTime = 0, action = 'idle', facing = 1, tiltRad = 0) {
    this.init();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tiltRad);
    ctx.scale(facing, 1);

    // 优先使用透明精灵
    const sprite = this.getTransparentSprite('tengu_acrobat');
    if (sprite) {
      if (action === 'dive') {
        ctx.rotate(-0.6 * facing);
      } else if (action === 'slide') {
        ctx.rotate(0.4 * facing);
      }
      ctx.drawImage(sprite, -58, -60, 116, 120);

      // 若处于 POSE 状态，头顶浮现金光展翅特效
      if (action === 'pose') {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(0, -15, 55 + Math.sin(animTime * 15) * 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffd700';
        ctx.font = '900 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✨ PERFECT POSE! ✨', 0, -68);
      }
    } else {
      // 矢量兜底绘制高精度长鼻天狗
      const bob = action === 'run' ? Math.sin(animTime * 14) * 4 : Math.sin(animTime * 5) * 2;

      // 1. 金色羽翼 (Golden Tengu Wings)
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.moveTo(-10, -20 + bob);
      ctx.quadraticCurveTo(-45, -40, -50, -10);
      ctx.quadraticCurveTo(-35, 5, -10, 0 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8c6d23';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 2. 和服身躯与宽腰带 (Red Kimono & Obi)
      ctx.fillStyle = '#c1121f';
      ctx.beginPath();
      ctx.arc(0, 0 + bob, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2b1f17';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffd700';
      ctx.fillRect(-14, 4 + bob, 28, 6);

      // 3. 天狗红色面具与长鼻 (Tengu Long Nose Mask)
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.arc(0, -20 + bob, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 三尺长竹鼻 (3-Foot Long Bamboo Nose)
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.moveTo(10, -22 + bob);
      ctx.lineTo(42, -22 + bob);
      ctx.lineTo(42, -18 + bob);
      ctx.lineTo(10, -16 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 怒目金睛
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(4, -22 + bob, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(5, -22 + bob, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // 28. 绘制台下 VIP 贵宾席与福克先生/艾娥达夫人 (VIP Box with Mr. Fogg & Mrs. Aouda)
  static drawVIPAudienceBox(ctx, x, y, isSpotlight = false, animTime = 0) {
    ctx.save();
    ctx.translate(x, y);

    // 贵宾包厢金红围栏
    ctx.fillStyle = '#3a0814';
    ctx.fillRect(-70, -20, 140, 50);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.strokeRect(-70, -20, 140, 50);

    // 金色雕花帷幕
    ctx.fillStyle = '#d90429';
    ctx.beginPath();
    ctx.moveTo(-70, -20);
    ctx.quadraticCurveTo(0, 5, 70, -20);
    ctx.lineTo(70, -10);
    ctx.quadraticCurveTo(0, 15, -70, -10);
    ctx.closePath();
    ctx.fill();

    // 斐利亚·福克先生 (Mr. Fogg: 绅士高礼帽、手持怀表)
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(-45, -45, 24, 28);
    // 高礼帽
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(-48, -70, 30, 26);
    ctx.fillRect(-52, -45, 38, 5);
    // 金色怀表反光
    const watchPulse = Math.sin(animTime * 8) * 3;
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(-22, -26, 5 + watchPulse * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 艾娥达夫人 (Mrs. Aouda: 印度织锦披巾、挥舞白丝绢)
    ctx.fillStyle = '#6a040f';
    ctx.beginPath();
    ctx.arc(25, -36, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(15, -24, 22, 20);

    // 挥动的白色手绢 (Waving Handkerchief)
    const wave = Math.sin(animTime * 10) * 8;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(35, -25);
    ctx.quadraticCurveTo(45 + wave, -40, 40, -45);
    ctx.lineTo(32, -35);
    ctx.closePath();
    ctx.fill();

    // 探照灯高亮光圈
    if (isSpotlight) {
      ctx.strokeStyle = 'rgba(255, 235, 120, 0.9)';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(0, -25, 68, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⭐ 贵宾席：福克先生与艾娥达！', 0, 48);
    }

    ctx.restore();
  }


  // 29. 绘制旧金山格斗主角路路通 (拳法/萨瓦特回旋踢/挥舞手杖/抱酒桶投掷/文明棍旋风大招)
  static drawBrawlHeroPassepartout(ctx, x, y, action = 'idle', facing = 1, comboIndex = 0, animTime = 0, hitFlash = false) {
    this.init();
    ctx.save();
    this.drawGroundShadow(ctx, x, y + 42, 60, 16, 0.5);

    ctx.translate(x, y);
    ctx.scale(facing, 1);

    if (hitFlash) {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 20;
    }

    // 优先使用透明精灵
    const sprite = this.getTransparentSprite('passepartout');
    const bob = action === 'run' ? Math.sin(animTime * 14) * 4 : Math.sin(animTime * 6) * 2;

    if (action === 'kick') {
      // 萨瓦特高踢腿
      ctx.rotate(-0.35);
    } else if (action === 'slide') {
      ctx.rotate(0.5);
    }

    if (sprite) {
      ctx.drawImage(sprite, -50, -55 + bob, 100, 110);
    } else {
      // 矢量高精度路路通
      ctx.fillStyle = '#1e3d59'; // 法国蓝夹克
      ctx.fillRect(-16, -22 + bob, 32, 44);
      ctx.strokeStyle = '#17252a';
      ctx.lineWidth = 2;
      ctx.strokeRect(-16, -22 + bob, 32, 44);

      // 头部与贝雷帽
      ctx.fillStyle = '#d4a373';
      ctx.beginPath();
      ctx.arc(0, -32 + bob, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#17252a';
      ctx.beginPath();
      ctx.arc(0, -38 + bob, 16, Math.PI, 0);
      ctx.fill();
    }

    // 绘制手杖挥击与拳脚金色轨迹光效
    if (action === 'punch') {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(15, -15);
      ctx.lineTo(45, -15);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(45, -15, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (action === 'kick') {
      // 弧形金色踢击刀光
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.85)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(10, 0, 48, -0.6, 0.6);
      ctx.stroke();
    } else if (action === 'cyclone') {
      // 旋风大招全方位金色暴风残影
      ctx.strokeStyle = 'rgba(80, 227, 194, 0.85)';
      ctx.lineWidth = 10;
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, -10, 75 + Math.sin(animTime * 20) * 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffd700';
      ctx.font = '900 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ 绅士旋风暴击! ⚡', 0, -85);
    }

    ctx.restore();
  }

  // 30. 绘制关底 Boss：斯坦普·普罗克托上校 (Colonel Stamp Proctor)
  static drawColonelProctorBoss(ctx, x, y, hpRatio = 1.0, action = 'idle', facing = -1, animTime = 0, hitFlash = false) {
    this.init();
    ctx.save();
    this.drawGroundShadow(ctx, x, y + 55, 95, 24, 0.6);

    ctx.translate(x, y);
    ctx.scale(facing, 1);

    const bob = Math.sin(animTime * 8) * 3;

    // 1. 魁梧上校身躯 (蓝军装军大衣 + 金色肩章)
    ctx.fillStyle = hitFlash ? '#ffffff' : '#1c2d42';
    ctx.fillRect(-35, -45 + bob, 70, 90);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.strokeRect(-35, -45 + bob, 70, 90);

    // 金色军用双排纽扣与绶带
    ctx.fillStyle = '#ffd700';
    for (let row = -30; row <= 25; row += 16) {
      ctx.beginPath();
      ctx.arc(-12, row + bob, 4, 0, Math.PI * 2);
      ctx.arc(12, row + bob, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 纯金金色肩章
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(-42, -48 + bob, 18, 10);
    ctx.fillRect(24, -48 + bob, 18, 10);

    // 2. 凶悍方脸、浓密连鬓大胡子
    ctx.fillStyle = hitFlash ? '#ffffff' : '#c68642';
    ctx.fillRect(-20, -75 + bob, 40, 32);
    ctx.strokeStyle = '#2b1a09';
    ctx.lineWidth = 2;
    ctx.strokeRect(-20, -75 + bob, 40, 32);

    // 棕黑连鬓胡子
    ctx.fillStyle = '#3a2010';
    ctx.beginPath();
    ctx.arc(0, -50 + bob, 22, 0, Math.PI);
    ctx.fill();

    // 点燃的雪茄与袅袅青烟
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(12, -58 + bob, 16, 5);
    ctx.fillStyle = '#ff3300';
    ctx.fillRect(26, -58 + bob, 4, 5);
    // 烟雾
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(30, -58 + bob);
    ctx.quadraticCurveTo(36, -70, 32, -82);
    ctx.stroke();

    // 3. 白色斯泰森牛仔大宽檐帽 (Stetson Hat)
    ctx.fillStyle = '#f0ece1';
    ctx.fillRect(-22, -100 + bob, 44, 28);
    ctx.fillRect(-45, -76 + bob, 90, 8);
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 2;
    ctx.strokeRect(-22, -100 + bob, 44, 28);
    ctx.strokeRect(-45, -76 + bob, 90, 8);

    // 4. 手持柯尔特左轮手枪 / 巨拳
    if (action === 'shoot') {
      ctx.fillStyle = '#222222';
      ctx.fillRect(32, -25 + bob, 30, 10);
      ctx.fillRect(48, -20 + bob, 8, 14);
      // 开火火花
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(65, -20 + bob, 8 + Math.random() * 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (action === 'charge') {
      // 狂暴冲撞红色残影
      ctx.strokeStyle = 'rgba(255, 0, 68, 0.8)';
      ctx.lineWidth = 6;
      ctx.strokeRect(-40, -50 + bob, 80, 100);
    }

    // 5. Boss 顶部专属血条
    ctx.restore();
    ctx.save();
    ctx.translate(x, y - 115);

    ctx.fillStyle = 'rgba(10, 5, 5, 0.85)';
    ctx.fillRect(-90, 0, 180, 16);
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(-88, 2, 176, 12);
    ctx.fillStyle = '#ff0044';
    ctx.fillRect(-88, 2, 176 * Math.max(0, hpRatio), 12);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(-90, 0, 180, 16);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🥊 斯坦普·普罗克托上校 🥊', 0, -5);

    ctx.restore();
  }

  // 31. 绘制酒馆可捡起投掷道具 (威士忌酒瓶/橡木酒桶/飞椅/烤鸡腿)
  static drawSaloonThrowableItem(ctx, x, y, type = 'bottle', rot = 0, animTime = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    if (type === 'bottle') {
      // 🍾 绿色玻璃威士忌酒瓶
      ctx.fillStyle = '#1b4332';
      ctx.fillRect(-6, -10, 12, 22);
      ctx.fillRect(-3, -18, 6, 8);
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(-5, -4, 10, 10);
      ctx.strokeStyle = '#081c15';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-6, -10, 12, 22);
    } else if (type === 'barrel') {
      // 🪵 橡木重型小酒桶
      ctx.fillStyle = '#6f4e37';
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1b120c';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 铁箍
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-16, -8);
      ctx.lineTo(16, -8);
      ctx.moveTo(-16, 8);
      ctx.lineTo(16, 8);
      ctx.stroke();
    } else if (type === 'chair') {
      // 🪑 西部红木椅子
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(-14, -14, 28, 28);
      ctx.strokeStyle = '#3e1f07';
      ctx.lineWidth = 2;
      ctx.strokeRect(-14, -14, 28, 28);
    } else if (type === 'chicken') {
      // 🍗 香喷喷黄金烤鸡腿 (回血美食)
      const pulse = Math.sin(animTime * 10) * 3;
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, 14 + pulse * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#c67d0a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 9, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // 骨头
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-14, -3, 8, 5);
      ctx.beginPath();
      ctx.arc(-14, -4, 3, 0, Math.PI * 2);
      ctx.arc(-14, 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // 32. 绘制 1872 太平洋大铁路巨型蒸汽机车 (4-4-0 American Steam Locomotive)
  static drawPacificRailroadTrain(ctx, x, y, animTime = 0) {
    ctx.save();
    ctx.translate(x, y);

    // 1. 巨大黑色铸铁车头
    ctx.fillStyle = '#111118';
    ctx.fillRect(-180, -70, 360, 90);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.strokeRect(-180, -70, 360, 90);

    // 驾驶室木质车厢 (Red Wooden Cab)
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(80, -110, 100, 130);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(80, -110, 100, 130);

    // 驾驶室暖黄车窗
    ctx.fillStyle = '#ffe87c';
    ctx.fillRect(105, -95, 50, 40);

    // 2. 经典漏斗大烟囱与滚滚蒸汽 (Funnel Smokestack)
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(-140, -70);
    ctx.lineTo(-155, -135);
    ctx.lineTo(-105, -135);
    ctx.lineTo(-120, -70);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 浓厚白色蒸汽烟云
    ctx.fillStyle = 'rgba(240, 240, 250, 0.75)';
    for (let s = 0; s < 5; s++) {
      const sa = animTime * 8 + s * 1.6;
      const sx = -130 - s * 45;
      const sy = -150 - s * 18 + Math.sin(sa) * 10;
      ctx.beginPath();
      ctx.arc(sx, sy, 22 + s * 12, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. 车头大探照灯 (Giant Brass Headlight)
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(-195, -60, 25, 35);
    ctx.fillStyle = '#ffffbb';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(-195, -42, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 4. 车头排障器 (Cowcatcher Pilot)
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.moveTo(-180, 20);
    ctx.lineTo(-235, 30);
    ctx.lineTo(-180, 30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 5. 铁轨巨轮 (Driving Wheels)
    const wheelAngle = animTime * 12;
    const drawWheel = (wx, wy, rad) => {
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(wx, wy, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 辐条
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.lineTo(wx + Math.cos(a + wheelAngle) * rad, wy + Math.sin(a + wheelAngle) * rad);
        ctx.stroke();
      }
    };

    drawWheel(-130, 28, 22);
    drawWheel(-80, 28, 22);
    drawWheel(0, 22, 34);
    drawWheel(60, 22, 34);

    ctx.restore();
  }


  // 33. 正统 2D 街机格斗真·关键帧精灵库 · 1v1 街霸/拳皇 (多姿态原画切换 + 帧动画破空 + 360°升龙 + 超必杀残影)
  static drawFTGPassepartout(ctx, x, y, action = 'idle', facing = 1, animTime = 0, hitFlash = false, actionProgress = 0, afterImages = []) {
    this.init();
    ctx.save();

    // 根据当前格斗动作动态切换「真正专属的格斗动作关键帧原画」！
    let spriteKey = 'ftg_passepartout';
    if (action === 'punch') {
      spriteKey = 'ftg_pass_punch';
    } else if (action === 'kick') {
      spriteKey = 'ftg_pass_kick';
    } else if (action === 'rising_kick') {
      spriteKey = 'ftg_pass_rising';
    } else if (action === 'super') {
      // 超必杀高速交替关键帧！
      const subAction = Math.floor(animTime * 15) % 3;
      spriteKey = subAction === 0 ? 'ftg_pass_punch' : (subAction === 1 ? 'ftg_pass_kick' : 'ftg_pass_rising');
    }

    const sprite = this.getTransparentSprite(spriteKey) || this.rawImages[spriteKey] || this.getTransparentSprite('ftg_passepartout');

    // 1. 绘制超必杀/冲刺金色幽灵残影 (Ghost Trails)
    if (afterImages && afterImages.length > 0) {
      for (let i = 0; i < afterImages.length; i++) {
        const af = afterImages[i];
        ctx.save();
        ctx.translate(af.x, af.y);
        ctx.scale(af.facing, 1);
        ctx.globalAlpha = af.alpha * 0.45;
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 20;
        if (sprite && sprite.complete !== false) {
          ctx.drawImage(sprite, -110, -145, 220, 220);
        }
        ctx.restore();
      }
    }

    // 2. 动态地面软阴影
    let groundShadowScale = 1.0;
    let groundShadowAlpha = 0.55;
    if (action === 'rising_kick') {
      groundShadowScale = Math.max(0.2, 1.0 - actionProgress * 0.8);
      groundShadowAlpha = Math.max(0.1, 0.55 - actionProgress * 0.45);
    }
    this.drawGroundShadow(ctx, x, y + 65, 95 * groundShadowScale, 24 * groundShadowScale, groundShadowAlpha);

    ctx.translate(x, y);
    ctx.scale(facing, 1);

    if (hitFlash) {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 35;
    }

    // 3. 仿 Spine 呼吸与动作骨骼变形动力学
    let transX = 0;
    let transY = 0;
    let rot = 0;
    let scaleX = 1.0;
    let scaleY = 1.0;

    const breath = Math.sin(animTime * 12);
    const kneeBounce = Math.abs(Math.sin(animTime * 6)) * 4;

    if (action === 'idle') {
      transY = -kneeBounce;
      scaleY = 1.0 + breath * 0.03;
      scaleX = 1.0 - breath * 0.02;

    } else if (action === 'walk') {
      const walkCycle = animTime * 18;
      transX = Math.sin(walkCycle) * 8;
      transY = -Math.abs(Math.cos(walkCycle)) * 10;
      rot = Math.sin(walkCycle) * 0.08;

    } else if (action === 'guard') {
      transX = -18;
      transY = 8;
      rot = -0.1;
      scaleY = 0.94;
      scaleX = 1.05;

      // 电离六边形格挡盾
      ctx.save();
      ctx.strokeStyle = 'rgba(80, 227, 194, 0.95)';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.arc(45, -25, 65, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();

      const shieldPulse = (animTime * 15) % 10;
      ctx.strokeStyle = 'rgba(255, 255, 255, ' + (1 - shieldPulse / 10) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(45, -25, 60 + shieldPulse * 2, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
      ctx.restore();

    } else if (action === 'punch') {
      // 真实直拳关键帧：爆冲延伸 + 破空冲击环
      const punchPhase = Math.sin(actionProgress * Math.PI);
      transX = punchPhase * 30;
      transY = -punchPhase * 2;
      scaleX = 1.0 + punchPhase * 0.08;

      ctx.save();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 10;
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(40, -35);
      ctx.lineTo(135, -35);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(135, -35, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(120, -35, 8, 28, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

    } else if (action === 'kick') {
      // 真实萨瓦特劈腿关键帧：凌空大劈腿 + 新月斩击光刃
      const kickPhase = Math.sin(actionProgress * Math.PI);
      transX = kickPhase * 20;
      transY = -kickPhase * 15;

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.95)';
      ctx.lineWidth = 16;
      ctx.shadowColor = '#ff4400';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(15, -20, 125, -0.8, 0.8);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(15, -20, 125, -0.65, 0.65);
      ctx.stroke();
      ctx.restore();

    } else if (action === 'rising_kick') {
      // 真实拔地升龙拳关键帧：烈焰冲天 + 螺旋升空
      transY = -actionProgress * 80;

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 180, 0, 0.95)';
      ctx.lineWidth = 18;
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(0, -60, 110, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
      ctx.fillRect(-50, -180, 100, 220);
      ctx.restore();

    } else if (action === 'super') {
      const superPulse = Math.sin(animTime * 35);
      transX = superPulse * 25;
      scaleX = 1.15;
      scaleY = 1.15;

      ctx.save();
      ctx.strokeStyle = 'rgba(0, 255, 200, 0.95)';
      ctx.lineWidth = 16;
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 40;
      ctx.beginPath();
      ctx.arc(0, -30, 130 + superPulse * 15, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-130, -30);
      ctx.lineTo(130, -30);
      ctx.moveTo(0, -160);
      ctx.lineTo(0, 100);
      ctx.stroke();
      ctx.restore();

    } else if (action === 'hit') {
      transX = -30;
      transY = 12;
      rot = -0.38;
      scaleX = 0.88;
      scaleY = 1.15;

    } else if (action === 'knockdown') {
      transX = -45;
      transY = 55;
      rot = -1.52;
      scaleX = 1.1;
      scaleY = 0.9;
    }

    // 4. 矩阵变换与高精关键帧原画渲染
    ctx.save();
    ctx.translate(transX, transY);
    ctx.rotate(rot);
    ctx.scale(scaleX, scaleY);

    if (sprite && sprite.complete !== false) {
      ctx.drawImage(sprite, -110, -145, 220, 220);
    }
    ctx.restore();

    ctx.restore();
  }

  // 34. 仿 Spine 骨骼动力学 · 1v1 街霸/拳皇高精斯坦普·普罗克托上校 (巨拳冲撞/掀桌地波/左轮后坐力/帽子飞出物理)
  static drawFTGColonelProctor(ctx, x, y, action = 'idle', facing = -1, animTime = 0, hitFlash = false, actionProgress = 0, hatOffset = null) {
    this.init();
    ctx.save();

    const sprite = this.getTransparentSprite('ftg_proctor') || this.rawImages['ftg_proctor'];

    // 1. 动态地面软阴影
    this.drawGroundShadow(ctx, x, y + 70, 125, 28, 0.65);

    ctx.translate(x, y);
    ctx.scale(facing, 1);

    if (hitFlash) {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 35;
    }

    // 2. 仿 Spine 重量级骨骼动力学
    let transX = 0;
    let transY = 0;
    let rot = 0;
    let scaleX = 1.0;
    let scaleY = 1.0;

    const heavyBreath = Math.sin(animTime * 8);
    const heavyBounce = Math.abs(Math.sin(animTime * 4)) * 3;

    if (action === 'idle') {
      transY = -heavyBounce;
      scaleY = 1.0 + heavyBreath * 0.025;
      scaleX = 1.0 - heavyBreath * 0.015;

    } else if (action === 'walk') {
      const walkCycle = animTime * 14;
      transX = Math.sin(walkCycle) * 10;
      transY = -Math.abs(Math.cos(walkCycle)) * 12;
      rot = Math.sin(walkCycle) * 0.06;

    } else if (action === 'guard') {
      transX = -15;
      transY = 10;
      scaleY = 0.95;
      scaleX = 1.08;

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 0, 68, 0.95)';
      ctx.lineWidth = 8;
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(50, -25, 75, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
      ctx.restore();

    } else if (action === 'punch') {
      const punchPhase = Math.sin(actionProgress * Math.PI);
      transX = punchPhase * 55;
      transY = -punchPhase * 6;
      rot = punchPhase * 0.18;
      scaleX = 1.0 + punchPhase * 0.18;

      ctx.save();
      ctx.strokeStyle = '#ff0044';
      ctx.lineWidth = 14;
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.moveTo(30, -35);
      ctx.lineTo(145, -35);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(145, -35, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

    } else if (action === 'charge') {
      transX = 40;
      transY = 15;
      rot = 0.25;
      scaleX = 1.15;
      scaleY = 0.92;

      ctx.save();
      ctx.fillStyle = 'rgba(255, 0, 0, 0.45)';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 35;
      ctx.beginPath();
      ctx.arc(0, -35, 120, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

    } else if (action === 'shoot') {
      const shootPhase = Math.sin(actionProgress * Math.PI);
      transX = -shootPhase * 25;
      rot = -shootPhase * 0.15;

      ctx.save();
      ctx.fillStyle = '#ffcc00';
      ctx.shadowColor = '#ff3300';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(115, -45, 25, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(75, -45);
      ctx.lineTo(155, -45);
      ctx.moveTo(115, -85);
      ctx.lineTo(115, -5);
      ctx.stroke();
      ctx.restore();

    } else if (action === 'hit') {
      transX = -35;
      transY = 15;
      rot = -0.38;
      scaleX = 0.9;
      scaleY = 1.12;

    } else if (action === 'knockdown') {
      transX = -55;
      transY = 65;
      rot = -1.55;
      scaleX = 1.15;
      scaleY = 0.88;
    }

    // 3. 矩阵变换与高精原画渲染
    ctx.save();
    ctx.translate(transX, transY);
    ctx.rotate(rot);
    ctx.scale(scaleX, scaleY);

    if (sprite && sprite.complete !== false) {
      ctx.drawImage(sprite, -125, -165, 250, 250);
    }
    ctx.restore();

    // 4. 击倒 KO 时被打飞的牛仔帽独立物理掉落
    if (hatOffset && action === 'knockdown') {
      ctx.save();
      ctx.translate(hatOffset.x, hatOffset.y);
      ctx.rotate(hatOffset.rot);
      ctx.fillStyle = '#f0ece1';
      ctx.fillRect(-22, -14, 44, 28);
      ctx.fillRect(-45, 10, 90, 8);
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 2;
      ctx.strokeRect(-22, -14, 44, 28);
      ctx.strokeRect(-45, 10, 90, 8);
      ctx.restore();
    }

    ctx.restore();
  }
}
