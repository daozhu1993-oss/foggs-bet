// 零依赖单文件智能打包器 v6.0 (全透明精灵与纯净舞台版)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cleanModule(code) {
  return code
    .replace(/^\s*import\s+.*?from\s+['"].*?['"];?/gm, '')
    .replace(/^\s*import\s+['"].*?['"];?/gm, '')
    .replace(/^\s*export\s+default\s+/gm, '')
    .replace(/^\s*export\s+(const|let|var|class|function|async function)\s+/gm, '$1 ')
    .replace(/^\s*export\s*\{[^}]*\};?/gm, '');
}

function build() {
  console.log('--- 开始构建《Fogg 的赌约》v6.0 终极全要素纯透明精灵单文件版 ---');

  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
  const css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf-8');

  // 按依赖拓扑序排列
  const files = [
    'src/assets/images.js',
    'src/core/events.js',
    'src/core/state.js',
    'src/core/time.js',
    'src/core/money.js',
    'src/core/storage.js',
    'src/core/resolve.js',
    'src/core/relics.js',
    'src/engine/dynamicAudio.js',
    'src/engine/ambientAudio.js',
    'src/engine/audio.js',
    'src/engine/particles.js',
    'src/engine/fx.js',
    'src/engine/physics.js',
    'src/engine/camera.js',
    'src/engine/chromaKey.js',
    'src/engine/sprites.js',
    'src/engine/backdrop.js',
    'src/input/InputManager.js',
    'src/shell/orientation.js',
    'src/shell/briefing.js',
    'src/shell/hud.js',
    'src/shell/dialogue.js',
    'src/shell/decisionModal.js',
    'src/shell/map.js',
    'src/shell/passport.js',
    'src/shell/resultCard.js',
    'src/shell/shareCard.js',
    'src/shell/arcade.js',
    'src/minigames/_base/MiniGame.js',
    'src/minigames/whist.js',
    'src/minigames/parkour.js',
    'src/minigames/steamOverdrive.js',
    'src/minigames/elephantRide.js',
    'src/minigames/stealthRescue.js',
    'src/minigames/courtBail.js',
    'src/minigames/typhoonSailing.js',
    'src/minigames/circusAcrobat.js',
    'src/minigames/sanFranciscoBrawl.js',
    'src/minigames/trainDefense.js',
    'src/minigames/iceSledge.js',
    'src/minigames/atlanticBurning.js',
    'src/minigames/londonFinale.js',
    'src/minigames/_base/registry.js',
    'src/levels/leg0.js',
    'src/levels/leg1.js',
    'src/levels/leg2.js',
    'src/levels/leg3.js',
    'src/levels/leg4.js',
    'src/levels/leg5.js',
    'src/levels/leg6.js',
    'src/levels/leg7.js',
    'src/levels/leg8.js',
    'src/levels/leg9.js',
    'src/levels/leg10.js',
    'src/main.js'
  ];

  let bundle = '(function() {\n  "use strict";\n\n';

  for (const f of files) {
    const raw = fs.readFileSync(path.join(__dirname, f), 'utf-8');
    const cleaned = cleanModule(raw);
    bundle += `\n/* ==================== ${f} ==================== */\n` + cleaned + '\n';
  }

  bundle += '\n})();';

  let bundledHtml = html
    .replace('<link rel="stylesheet" href="./style.css">', () => `<style>\n${css}\n</style>`)
    .replace('<script type="module" src="./src/main.js"></script>', () => `<script id="game-main-bundle">\n${bundle}\n</script>`);

  const outPath = path.join(__dirname, 'Fogg赌约_双击直接玩.html');
  fs.writeFileSync(outPath, bundledHtml, 'utf-8');
  console.log(`✅ 成功生成单文件离线版: ${outPath} (${(bundledHtml.length / (1024 * 1024)).toFixed(2)} MB)`);

  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);
  fs.writeFileSync(path.join(distDir, 'index.html'), bundledHtml, 'utf-8');
}

build();
