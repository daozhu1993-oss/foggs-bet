const fs = require('fs');
let code = fs.readFileSync('src/minigames/parkour.js', 'utf-8');

const newRenderSection = `  render(ctx) {
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. 多佛港海港背景（原画视差绘制）
    if (this.doverBgImg.complete && this.doverBgImg.naturalWidth > 0) {
      const bgOffsetX = -(this.camera.x * 0.25) % w;
      ctx.drawImage(this.doverBgImg, bgOffsetX, 0, w, h);
      if (bgOffsetX < 0) {
        ctx.drawImage(this.doverBgImg, bgOffsetX + w, 0, w, h);
      }
    } else {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 500);
      skyGrad.addColorStop(0, '#151328');
      skyGrad.addColorStop(0.5, '#683022');
      skyGrad.addColorStop(1, '#c46424');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. 摄像机空间渲染
    this.camera.apply(ctx);

    // 3. 终点：维多利亚皇家远洋巨轮【蒙古号 SS MONGOLIA】高精原画与检票登船跳板
    ctx.save();
    const shipX = 3950;
    const shipY = 80;
    const shipW = 1050;
    const shipH = 580;

    if (this.mongoliaImg.complete && this.mongoliaImg.naturalWidth > 0) {
      ctx.drawImage(this.mongoliaImg, shipX, shipY, shipW, shipH);
      if (Math.random() < 0.35) {
        particles.emitSteam(shipX + 370 + Math.random() * 40, shipY + 80, 2);
        particles.emitSteam(shipX + 460 + Math.random() * 40, shipY + 80, 2);
      }
    } else {
      ctx.fillStyle = '#1c1815';
      ctx.beginPath();
      ctx.moveTo(shipX, shipY + 300);
      ctx.lineTo(shipX + 900, shipY + 280);
      ctx.lineTo(shipX + 980, shipY + 180);
      ctx.lineTo(shipX + 1020, shipY + 540);
      ctx.lineTo(shipX, shipY + 540);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#8b1e1e';
      ctx.fillRect(shipX + 360, shipY + 110, 55, 170);
      ctx.fillRect(shipX + 460, shipY + 110, 55, 170);
      ctx.fillStyle = '#ffe87c';
      ctx.font = 'bold 32px "Baskerville", serif';
      ctx.fillText('S.S. MONGOLIA', shipX + 320, shipY + 340);
    }

    // 登船实木长跳板与红地毯 (Gangplank)
    const gpStartX = this.boardingZone.gangplankX;
    const gpStartY = this.player.baseY + this.player.h;
    const gpEndX = this.boardingZone.gangplankEndX;
    const gpEndY = this.boardingZone.gangplankTopY + this.player.h;

    // 桥体阴影
    ctx.fillStyle = 'rgba(15, 10, 5, 0.45)';
    ctx.beginPath();
    ctx.moveTo(gpStartX, gpStartY + 10);
    ctx.lineTo(gpEndX, gpEndY + 10);
    ctx.lineTo(gpEndX, 720);
    ctx.lineTo(gpStartX, 720);
    ctx.closePath();
    ctx.fill();

    // 实木甲板跳板斜面
    ctx.strokeStyle = '#4a2f1b';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(gpStartX, gpStartY);
    ctx.lineTo(gpEndX, gpEndY);
    ctx.stroke();

    // 黄金铆钉与红毯
    ctx.strokeStyle = '#8b1e1e';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(gpStartX, gpStartY - 2);
    ctx.lineTo(gpEndX, gpEndY - 2);
    ctx.stroke();

    // 登船检票口金箔牌匾
    ctx.fillStyle = 'rgba(36, 26, 18, 0.95)';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2.5;
    ctx.fillRect(gpStartX + 40, gpEndY + 10, 220, 44);
    ctx.strokeRect(gpStartX + 40, gpEndY + 10, 220, 44);
    ctx.fillStyle = '#ffe87c';
    ctx.font = 'bold 15px "Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.fillText('🚢 蒙古号 · 检票登船跳板', gpStartX + 150, gpEndY + 38);
    ctx.restore();

    // 4. 多佛码头老木栈道地面与海水波光
    this.drawVictorianPier(ctx);

    // 5. 绘制维多利亚铸铁立体桁架平台
    for (const p of this.platforms) {
      this.drawCranePlatform(ctx, p);
    }

    // 6. 绘制菲克斯 BOSS
    if (!this.fixBoss.defeated) {
      ctx.save();
      if (this.fixImg.complete && this.fixImg.naturalWidth > 0) {
        ctx.drawImage(this.fixImg, this.fixBoss.x, this.fixBoss.y, this.fixBoss.w, this.fixBoss.h);
      } else {
        SpriteEngine.drawFixPortrait(ctx, this.fixBoss.x, this.fixBoss.y, 60);
      }
      ctx.fillStyle = '#ff4d4d';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🕵️ 菲克斯截击！(滑铲击飞/蒸汽弹轰击)', this.fixBoss.x + 25, this.fixBoss.y - 14);
      ctx.restore();
    }

    // 7. 绘制维多利亚皇家海关货箱
    for (const mb of this.mysteryBlocks) {
      this.drawVictorianCargoCrate(ctx, mb);
    }

    // 8. 绘制维多利亚重型蒸汽黄铜活塞弹跳机
    for (const b of this.bouncers) {
      this.drawSteamBouncer(ctx, b);
    }

    // 9. 绘制蒸汽火球弹
    for (const b of this.bullets) {
      this.drawSteamBullet(ctx, b);
    }

    // 10. 绘制加固橡木朗姆酒桶敌人
    for (const e of this.enemies) {
      if (e.alive) {
        this.drawOakBarrel(ctx, e);
      }
    }

    // 11. 绘制 3D 自转金镑硬币
    for (const c of this.coins) {
      if (!c.collected) {
        this.drawGoldSovereign(ctx, c);
      }
    }

    // 12. 物理碎片
    physicsDebris.render(ctx);

    // 13. 绘制主角路路通（黑伞滑翔、贴地滑铲与狂暴金光光晕）
    ctx.save();
    if (this.player.isGiant || this.player.isFever) {
      ctx.shadowColor = '#ffe87c';
      ctx.shadowBlur = 28;
    }

    SpriteEngine.drawPassepartoutRunner(
      ctx,
      this.player.x,
      this.player.y,
      this.player.state,
      this.player.animTime,
      this.player.baseY + this.player.h
    );

    // 绘制撑开的维多利亚绅士黑伞
    if (this.player.isGliding) {
      ctx.save();
      ctx.translate(this.player.x + 45, this.player.y - 12);
      ctx.rotate(Math.sin(this.player.animTime * 8) * 0.08);

      // 黑色丝绸伞面
      ctx.fillStyle = '#171717';
      ctx.beginPath();
      ctx.arc(0, 0, 44, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#444444';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 金色伞顶针与中轴伞柄
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -44);
      ctx.lineTo(0, 32);
      ctx.stroke();

      // 弯曲木质握柄
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(-6, 32, 6, 0, Math.PI);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    // 恢复摄像机
    this.camera.restore(ctx);

    // 14. 顶部商业级 HUD 饰板
    this.drawParkourHUD(ctx, w);
  }

  // 绘制真实多佛港口老木栈道与海水波光
  drawVictorianPier(ctx) {
    const groundY = this.player.baseY + this.player.h;

    // 海水浪潮
    const waterGrad = ctx.createLinearGradient(0, groundY + 20, 0, 720);
    waterGrad.addColorStop(0, '#102231');
    waterGrad.addColorStop(1, '#08121a');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(-200, groundY + 20, this.levelWidth + 800, 720 - groundY);

    // 厚实老橡木栈道台面
    ctx.fillStyle = '#3a271a';
    ctx.fillRect(-200, groundY, this.levelWidth + 800, 28);
    ctx.strokeStyle = '#5a3d28';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-200, groundY, this.levelWidth + 800, 28);

    // 木板接缝与铁钉
    ctx.strokeStyle = '#26180f';
    ctx.lineWidth = 1.5;
    for (let x = -200; x < this.levelWidth + 800; x += 45) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x, groundY + 28);
      ctx.stroke();
    }

    // 支撑木桩、系缆桩与煤气路灯
    for (let x = -100; x < this.levelWidth + 800; x += 180) {
      ctx.fillStyle = '#241810';
      ctx.fillRect(x, groundY + 28, 22, 180);

      // 黄铜铸铁系缆桩
      ctx.fillStyle = '#1c1815';
      ctx.beginPath();
      ctx.arc(x + 11, groundY - 8, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 复古煤气路灯
      if (x % 360 === 0) {
        ctx.fillStyle = '#17110a';
        ctx.fillRect(x + 8, groundY - 140, 6, 140);

        const coneGrad = ctx.createRadialGradient(x + 11, groundY - 130, 5, x + 11, groundY - 130, 75);
        coneGrad.addColorStop(0, 'rgba(255, 220, 130, 0.45)');
        coneGrad.addColorStop(1, 'rgba(255, 220, 130, 0)');
        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.arc(x + 11, groundY - 130, 75, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffe87c';
        ctx.beginPath();
        ctx.arc(x + 11, groundY - 130, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 绘制维多利亚起重桁架平台
  drawCranePlatform(ctx, p) {
    ctx.save();
    const platGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    platGrad.addColorStop(0, '#4a3222');
    platGrad.addColorStop(1, '#241810');
    ctx.fillStyle = platGrad;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, p.w, p.h);

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x + 15, p.y); ctx.lineTo(p.x + 15, p.y - 120);
    ctx.moveTo(p.x + p.w - 15, p.y); ctx.lineTo(p.x + p.w - 15, p.y - 120);
    ctx.stroke();

    ctx.fillStyle = '#ffe87c';
    ctx.font = 'bold 12px "Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.label, p.x + p.w / 2, p.y + 17);
    ctx.restore();
  }

  // 绘制维多利亚皇家海关货箱
  drawVictorianCargoCrate(ctx, mb) {
    ctx.save();
    const by = mb.y + mb.bounceY;

    ctx.fillStyle = mb.hit ? '#3d2c20' : '#7c4d25';
    ctx.fillRect(mb.x, by, mb.w, mb.h);

    ctx.strokeStyle = mb.hit ? '#5a4637' : '#ffd700';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(mb.x, by, mb.w, mb.h);

    ctx.beginPath();
    ctx.moveTo(mb.x, by); ctx.lineTo(mb.x + mb.w, by + mb.h);
    ctx.moveTo(mb.x + mb.w, by); ctx.lineTo(mb.x, by + mb.h);
    ctx.stroke();

    ctx.fillStyle = mb.hit ? '#554234' : '#1c120c';
    ctx.fillRect(mb.x + 10, by + 12, mb.w - 20, mb.h - 24);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(mb.x + 10, by + 12, mb.w - 20, mb.h - 24);

    ctx.fillStyle = mb.hit ? '#7a6652' : '#ffe87c';
    ctx.font = 'bold 18px "Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.fillText(mb.hit ? '✓' : (mb.type === 'bullet' ? '🔥' : (mb.type === 'giant' ? '⭐' : '£')), mb.x + mb.w / 2, by + 34);
    ctx.restore();
  }

  // 绘制维多利亚重型蒸汽黄铜活塞弹跳机
  drawSteamBouncer(ctx, b) {
    ctx.save();
    ctx.fillStyle = '#261b12';
    ctx.fillRect(b.x, b.y + 8, b.w, b.h - 8);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b.x, b.y + 8, b.w, b.h - 8);

    // 螺旋钢弹簧
    ctx.strokeStyle = '#cfd8dc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let sy = b.y + 8; sy >= b.y; sy -= 2) {
      const sx = b.x + b.w / 2 + Math.sin(sy * 1.8) * (b.w * 0.35);
      if (sy === b.y + 8) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // 顶部红皮压花踏板
    ctx.fillStyle = '#8b1e1e';
    ctx.fillRect(b.x - 4, b.y, b.w + 8, 8);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x - 4, b.y, b.w + 8, 8);
    ctx.restore();
  }

  // 绘制真实加固橡木朗姆酒桶
  drawOakBarrel(ctx, e) {
    ctx.save();
    const cx = e.x + 21;
    const cy = e.y + 21;
    ctx.translate(cx, cy);
    ctx.rotate((e.x * 0.05));

    ctx.fillStyle = '#5c3a21';
    ctx.beginPath();
    ctx.arc(0, 0, 21, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1c1510';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#3e2716';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-21, 0); ctx.lineTo(21, 0);
    ctx.moveTo(0, -21); ctx.lineTo(0, 21);
    ctx.stroke();

    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 绘制 3D 自转金镑硬币
  drawGoldSovereign(ctx, c) {
    ctx.save();
    const cx = c.x + 12;
    const cy = c.y + 12;
    const spin = Math.sin(this.player.animTime * 6 + c.x * 0.1);

    ctx.translate(cx, cy);
    ctx.scale(spin, 1);

    ctx.fillStyle = '#ffde59';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c59b27';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  // 绘制蒸汽火球弹
  drawSteamBullet(ctx, b) {
    ctx.save();
    ctx.fillStyle = '#ffde59';
    ctx.shadowColor = '#ff4d4d';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // 绘制商业级顶部 HUD
  drawParkourHUD(ctx, w) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 10, 6, 0.92)';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2.5;
    ctx.fillRect(20, 16, 460, 56);
    ctx.strokeRect(20, 16, 460, 56);

    ctx.fillStyle = '#ffe87c';
    ctx.font = 'bold 15px "Baskerville", serif';
    ctx.fillText('⏱ 赶船倒计时: ' + Math.max(0, Math.ceil(this.timeRemaining)) + 's  |  🪙 金镑: ' + this.player.coins + '  |  得分: ' + this.player.score, 35, 40);

    // Fever 狂暴能量条
    ctx.fillStyle = '#26180f';
    ctx.fillRect(35, 48, 430, 14);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(35, 48, 430, 14);

    const feverProgress = this.player.isFever ? (this.player.feverTimer / 4.0) : (this.player.feverMeter / 100);
    ctx.fillStyle = this.player.isFever ? '#ffd700' : '#50e3c2';
    ctx.fillRect(36, 49, 428 * feverProgress, 12);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.player.isFever ? '⚡ FEVER 极速狂暴中 ⚡' : 'FEVER 冲刺能量 (碎箱/吃金币积攒)', 250, 58);

    // 快捷键提示栏
    ctx.fillStyle = 'rgba(15, 10, 6, 0.9)';
    ctx.fillRect(w - 380, 16, 360, 42);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(w - 380, 16, 360, 42);

    ctx.fillStyle = '#ffe87c';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎮 [A/空格] 跳跃/伞滑 | [S/↓] 滑铲碎箱 | [B] 蒸汽弹', w - 200, 42);

    ctx.restore();
  }
}
`;

const renderIndex = code.indexOf('  render(ctx) {');
code = code.substring(0, renderIndex) + newRenderSection;

fs.writeFileSync('src/minigames/parkour.js', code, 'utf-8');
console.log('✅ parkour.js successfully updated with master Victorian props and shaders!');
