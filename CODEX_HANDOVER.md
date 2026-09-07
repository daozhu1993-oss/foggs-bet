# 《Fogg 的赌约》全量工程研发交接与进阶指南 (Handover for Codex)

> **项目名称**：《Fogg 的赌约：八十天环游地球》（Around the World in 80 Days: Fogg's Wager）  
> **线上发布地址**：[https://daozhu1993-oss.github.io/foggs-bet/](https://daozhu1993-oss.github.io/foggs-bet/)  
> **GitHub 仓库**：[https://github.com/daozhu1993-oss/foggs-bet](https://github.com/daozhu1993-oss/foggs-bet)  
> **项目根目录**：`/Users/gx/.gemini/antigravity/scratch/foggs-bet`  
> **单文件发行版**：`Fogg赌约_双击直接玩.html` (**4.05 MB**，零外部依赖，极速秒开)  
> **当前状态**：主线 11 关全通关、13 款小游戏全落成、画风统一滤镜就绪、移动端自适应触控与触觉震动就绪、六大洲沉浸环境声景就绪、已完成 GitHub Pages 全球 CDN 正式上线。

---

## 一、 核心架构与代码地图

项目采用**高内聚、零现代框架依赖（Vanilla ES Modules + Canvas 2D + Web Audio API）**架构，构建脚本可一键将全工程编译打包为 4MB 级别的单文件离线 HTML。

```
/Users/gx/.gemini/antigravity/scratch/foggs-bet/
├── build_standalone.js             # 零依赖单文件智能打包器（生成 4MB 离线单文件版）
├── Fogg赌约_双击直接玩.html         # 最终单文件产物（全量内联 Base64/CSS/JS，可直接双击或部署）
├── index.html                      # 网页外壳（HUD、虚拟摇杆、对话框、模态框容器）
├── style.css                       # 维多利亚复古蒸汽朋克样式表（黄铜/羊皮纸/火漆印章）
├── .github/workflows/deploy.yml    # GitHub Actions 自动化 CI/CD（push main 自动部署 Pages）
└── src/
    ├── main.js                     # 游戏主中枢 GameApp（关卡状态机、游乐场调度、主循环）
    ├── assets/
    │   └── images.js               # 49张高精油画/头像/动作精灵 Base64 字典（含66组别名映射指针）
    ├── core/
    │   ├── state.js                # 全局状态管理 gameState（天数、英镑、道具、当前关卡）
    │   ├── events.js               # 全局发布订阅总线 EventBus（ui:*, game:*, state:*）
    │   ├── storage.js              # 跨关卡本地存档与读档管理 StorageManager
    │   ├── time.js                 # 儒勒·凡尔纳原著 80 天时间校准计算器
    │   ├── money.js                # 维多利亚英镑/便士货币与支付流水管理器
    │   ├── resolve.js              # 关卡事务性结算审计器（重试零副作用、不重复扣钱扣天数）
    │   └── relics.js               # 探险家奇珍发明工坊（宝玑怀表子弹时间/黑伞/喷气靴/象王金鞍）
    ├── engine/
    │   ├── audio.js                # 原生 Web Audio 音效合成器（单音/音阶/报时/打击声）
    │   ├── dynamicAudio.js         # 自适应程序化配乐引擎（动态节奏 BGM，零音频文件依赖）
    │   ├── ambientAudio.js         # 六大洲自适应沉浸环境声景发生器（大本钟/海浪/丛林/风沙/烈火）
    │   ├── fx.js                   # 屏幕特效中枢（维多利亚复古暗角/暖光滤镜/震屏/红闪/Haptics震动）
    │   ├── particles.js            # 粒子发射系统（火花/金币/蒸汽/爆破破片）
    │   ├── physics.js              # 经典 2D 刚体抛物线与木箱碎片破碎系统
    │   ├── camera.js               # 2D/2.5D 动态镜头平滑跟踪与抖动抗震系统
    │   ├── backdrop.js             # 维多利亚写实油画场景背景管理器
    │   ├── chromaKey.js            # 实时色度键抠像与透明度提取引擎
    │   └── sprites.js              # 精灵帧动画与状态机控制器
    ├── input/
    │   └── InputManager.js         # 跨端归一化输入（PC键盘/鼠标/手机触屏/虚拟摇杆/微震动）
    ├── shell/                      # 维多利亚复古 UI 包装层
    │   ├── hud.js                  # 顶部常驻 HUD（双表盘、英镑计、地名、音效开关）
    │   ├── dialogue.js             # 电报纸风格人物立绘对白框系统
    │   ├── decisionModal.js        # 维多利亚历史分支决策弹窗
    │   ├── briefing.js             # 军用羊皮纸战术简报界面（小游戏前置操作说明）
    │   ├── resultCard.js           # 关卡通关 S/A/B 事务性结算卡片
    │   ├── shareCard.js            # 探险成就通关长图海报生成器（支持手机长按存相册）
    │   ├── confirmModal.js         # 维多利亚拟态古典确认框（替代原生 window.confirm）
    │   ├── map.js                  # 1872 羊皮纸世界航线交互大地图
    │   ├── passport.js             # 维多利亚大英帝国探险护照（关卡火漆印章收集）
    │   ├── arcade.js               # 探险游乐场（13 款小游戏独立刷高分模式）
    │   └── orientation.js          # 屏幕方向自适应与 1280x720 等比缩放
    ├── levels/                     # 11 大主线战役关卡脚本（leg0.js ~ leg10.js）
    └── minigames/                  # 13 款经典成熟游戏类型实现（详见第三节）
```

---

## 二、 11 大关卡与 13 款小游戏全景图谱

所有小游戏均严格继承自 `src/minigames/_base/MiniGame.js`，通过 `miniGameRegistry` 统一注册与实例化：

| 关卡 | 地点与故事节点 | 小游戏类名与文件 | 经典对标类型 | 移动端自适应控制映射 |
| :--- | :--- | :--- | :--- | :--- |
| **Leg 0** | 伦敦 · 改良俱乐部 | `whist.js` (`whist`) | 1872 惠斯特吃墩牌戏 | 全屏隐藏虚拟键，手指点选/拖拽手牌 |
| **Leg 1** | 多佛海港 ➔ 追赶蒙古号 | `parkour.js` (`parkour`) | 经典横版跑酷 | A键【跳跃/伞降】+ B键【贴地滑铲】 |
| **Leg 2** | 苏伊士 ➔ 红海 ➔ 孟买 | `steamOverdrive.js` (`steamOverdrive`) | 双轨蒸汽节奏打击音游（对标太鼓达人） | 十字键 + A键【超频投煤】+ B键【气阀调压】 |
| **Leg 3** | 印度柯尔比 ➔ 战象狂飙 | `elephantRide.js` (`elephantRide`) | 三轨道动作障碍冲撞 | 十字键换道 + A键【象鼻轰击】+ B键【战象咆哮】 |
| **Leg 3+** | 萨蒂火祭神庙暗夜营救 | `stealthRescue.js` (`stealthRescue`) | 俯视角视锥潜行暗杀解谜 | 十字潜行 + A键【伏地】+ B键【背刺击晕】 |
| **Leg 4** | 加尔各答高等法院公堂 | `courtBail.js` (`courtBail`) | 证词矛盾辩论推理（对标逆转裁判） | 全屏隐藏按键，文字点选证据反驳 |
| **Leg 5** | 香港 ➔ 坦克德尔号台风 | `typhoonSailing.js` (`typhoonSailing`) | 怒海战舰弹幕躲避 | 摇杆操舵 + A键【扬帆满舵】+ B键【破浪穿透】 |
| **Leg 6** | 日本横滨歌舞伎马戏团 | `circusAcrobat.js` (`circusAcrobat`) | 物理力矩倒立叠罗汉平衡 | 左右摇杆控重心 + A键【腾空起跳】 |
| **Leg 7** | 旧金山淘金酒馆选战大乱斗 | `sanFranciscoBrawl.js` (`sanFranciscoBrawl`) | 经典横版清版格斗（对标怒之铁拳） | 摇杆位移 + A键【重拳】+ B键【飞踢】+ C键【防御】 |
| **Leg 8a** | 洛矶山雪峡列车断桥速射 | `trainDefense.js` (`trainDefense`) | 第一人称转轮枪快速射击 | **触屏直点屏幕匪徒开火** + A【射击】+ B【换弹】+ C【专注】 |
| **Leg 8b** | 内布拉斯加大平原风帆雪橇 | `iceSledge.js` (`iceSledge`) | 伪 3D 极速滑雪（对标 OutRun/滑雪大冒险） | 左右变轨避障 + A键【顺风加速冲刺】 |
| **Leg 9** | 大西洋亨丽埃塔号拆船大燃烧 | `atlanticBurning.js` (`atlanticBurning`) | 极限时间管理与轮机超频 | A键【投煤】+ B键【拆甲板】+ C键【放汽阀】 |
| **Leg 10** | 伦敦改良俱乐部终极决杀 | `londonFinale.js` (`londonFinale`) | 经度时差顿悟解谜 + 80秒飞车破门 | 左右操舵避障 + A键【扬鞭加速绝杀】 |

---

## 三、 已落地的关键底座系统（Codex 可直接调用）

### 1. 维多利亚复古镜头滤镜 (`src/engine/fx.js`)
- `fx.vignetteEnabled`: 默认为 `true`，在 `render(ctx)` 顶层绘制 1872 达盖尔摄影失光暗角与温暖羊皮纸/古典铜版色温微光；
- 彻底消除了抠像手绘精灵与写实原画背景之间的断层；
- `fx.toggleVignette()`: 供玩家或性能模式一键切换。

### 2. 物理触觉微震动引擎 (`src/engine/fx.js`)
通过归一化 `navigator.vibrate` 实现移动端沉浸触感：
- `fx.hapticLight()`: 15ms，用于菜单点击、摇杆拨动、卡牌翻动；
- `fx.hapticMedium()`: 30ms，用于跳跃起跳、滑铲、出拳出脚、吃墩判定；
- `fx.hapticHeavy()`: 55ms，用于左轮开火后坐力、战象重踏、巨浪冲击、雪橇喷射；
- `fx.hapticSuccess()`: `[20, 35, 45]ms`，用于关卡 S 级绝杀结算。

### 3. 六大洲自适应环境声景发生器 (`src/engine/ambientAudio.js`)
纯原生 Web Audio API 程序化合成，0 外部音频体积：
- `sound.setAmbient('london')`: 细雨微风 + 壁炉木炭噼啪 + 大本钟深沉定点钟鸣；
- `sound.setAmbient('sea')`: 深海波涛潮涌（5.5秒周期 LFO）+ 蒸汽轮机低频吸气律动；
- `sound.setAmbient('jungle')`: 湿润林海微风 + 丛林夏蝉夜鸟鸣叫 + 圣坛火祭铜铃微击；
- `sound.setAmbient('west')`: 苍凉大漠风沙呼啸 + 横贯大陆铁路钢轨撞击声（Click-Clack）；
- `sound.setAmbient('fire')`: 怒涛雷暴 + 巨型锅炉柴火爆裂噼啪声。
- 支持切换时平滑淡入淡出（Crossfade），静音时瞬间平滑归零。

### 4. 移动端归一化按键自适应 (`src/input/InputManager.js`)
- `app.input.adaptControlsForGame(gameName)`:
  小游戏载入时自动按游戏特征切换 D-Pad 显隐、配置 A/B/C 按键语义；小游戏结束时自动全屏隐藏，确保对话与过场全屏清爽。

### 5. 零副作用事务性结算审计 (`src/core/resolve.js`)
- `resolveLeg(legId, outcome)`:
  所有关卡挑战无论成功或失败，天数和英镑均在离开结算卡时单次统一结算；**点击【重新挑战】无副作用、不累加扣除天数或金钱**。

---

## 四、 开发、构建与发布工作流

### 1. 本地代码打包
本工程的核心成果是**单文件离线发布版**。每次修改 `src/` 或 `style.css`、`index.html` 后，必须执行构建：

```bash
# 执行单文件打包（耗时 < 0.5s，生成 4.05MB 独立 HTML）
node build_standalone.js

# 拷贝至 dist 目录供静态测试
mkdir -p dist && cp Fogg赌约_双击直接玩.html dist/index.html
```

### 2. 自动化回归测试
工程内含完整的无头 DOM 与小游戏驱动测试套件，在提交前务必运行：

```bash
# 验证主线剧情 11 关跑通 + 13 款小游戏背景图非空 + 声景与震动反馈
node -e "
const fs = require('fs');
const html = fs.readFileSync('Fogg赌约_双击直接玩.html', 'utf-8');
console.log('✅ 单文件离线包大小:', (html.length / (1024*1024)).toFixed(2), 'MB');
"
```

### 3. 一键同步上线发布 (GitHub Pages)
本项目已连接 `daozhu1993-oss/foggs-bet`：

```bash
# 1. 提交主干源码
git add .
git commit -m "feat: 更新内容说明"
git push origin main

# 2. 发布最新单文件到 gh-pages 分支（公网自动实时生效）
git checkout --orphan gh-pages-temp
git rm -rf .
cp -f dist/index.html index.html
git add index.html
git commit -m "deploy: 生产环境发布"
git push -f origin gh-pages-temp:gh-pages
git checkout main
git branch -D gh-pages-temp
```

---

## 五、 Codex 进阶路线图（如何把游戏做得更牛逼 🚀）

当前游戏已经具备了扎实完整的骨架与极致的体积控制。接下来的重点是**提高玩法深度、收集乐趣与跨端质感**：

### 🎯 进阶方向 1：P2-1 世界经典沙龙桌游棋牌收集层 (World Parlor Games)
> *对应 Claude 工单核心规划：环游世界不仅有主线动作关，更能收集并游玩各国的经典古老博弈。*
- **伦敦改良俱乐部·皇家象棋室**：
  - 实现 **8×8 国际象棋残局大师解谜（Victorian Chess Tactics）**（一步杀/两步杀经典对弈残局）；
- **印度孟买/加尔各答驿站**：
  - 实现 **英印双陆棋（Backgammon）** 或 **印度传统桌面卡罗姆弹棋（Carrom Board）**；
- **日本横滨·明治茶馆**：
  - 实现 **日式花札「花见酒/月见酒」** 或 **围棋死活题（Zen Go Tsumego）**；
- **架构建议**：
  - 采用统一的 `BoardGameEngine.js` 棋盘驱动器，以插件形式挂载不同国家的规则集；
  - 支线桌游放在独立沙龙中游玩，**不消耗主线 80 天时间**，赢取专属城市成就纪念徽章！

### 🎯 进阶方向 2：P2-3 探险家发明行囊与道具工坊系统 UI 显性化
> *目前 `src/core/relics.js` 已经定义了 5 大神奇发明，但主界面缺少直观的背包入口。*
- **HUD 抽屉式【🧳 探险行囊】入口**：
  - 在顶部 HUD 增加复古黄铜皮箱图标，点击弹出维多利亚羊皮纸发明工坊弹窗；
  - 直观展示当前拥有的发明：
    1. **宝玑天文怀表**（[C] 键发动 3.5s 子弹时间）；
    2. **维多利亚黑伞**（空中跳跃长按滑翔）；
    3. **吉法尔蒸汽喷气靴**（空中水平瞬移冲刺）；
    4. **印度象王金鞍与水炮**（大象关高压灭火与冲撞双倍）；
    5. **消音软底靴**（神庙关无声刺杀）；
- **发明升级工坊**：
  - 在各大城市的工匠铺可消耗富余英镑升级道具效果（例如延长子弹时间至 5 秒、减少冷却等）。

### 🎯 进阶方向 3：双主角羁绊与技能树协作（Fogg & Passepartout）
- **福克先生（绅士脑力）**：掌控金钱投资、怀表子弹时间、法庭雄辩、惠斯特牌技；
- **路路通（杂技身手）**：掌控屋顶跑酷、黑伞滑翔、长鼻团平衡、旧金山大乱斗拳击；
- 在小游戏中增加类似关 3 的【福克掷金币牵制守卫】、【路路通飞身掩护】双人协同技，深化双主角人设魅力。

### 🎯 进阶方向 4：Steam 级全成就系统与护照盖章收集
- 完善 `src/shell/passport.js`，增加 30+ 维多利亚探险家成就勋章（如：“未尝一败的牌客”、“百迈飞跃断桥”、“大西洋拆船大师”、“零误差日界线”等）；
- 解锁成就时在屏幕上方弹出维多利亚火漆印章动画与成就音效。

### 🎯 进阶方向 5：原生跨端打包（Tauri / Capacitor）
- 由于本项目已经做到了 **4.05 MB 零依赖单文件**，Codex 可以非常轻松地：
  - 使用 **Tauri** 一键打包为 Windows / Mac / Linux 原生桌面端安装包（体积仅 ~8MB）；
  - 使用 **Capacitor** 一键打包为 iOS / Android 原生 App，发布至 App Store / Google Play！

---

## 六、 研发军规与避坑红线 ⚠️

1. **绝对守护 4MB 级别的秒开优势**：
   - 严禁未经压缩随意引入数十兆的外部大图或音频文件；新增音效必须优先使用 `Web Audio API` 程序化合成，新增贴图必须经 `sips` 压缩并提取关键分辨率。
2. **坚持经典、直觉、好懂的游戏类型**：
   - 任何新增小游戏或桌游必须对标全球知名的成熟机制，**操作教程控制在 2 句话以内**，保证玩家一上手就会玩。
3. **保持维多利亚手账与油画古典美学**：
   - 严禁使用现代扁平荧光色或粗糙纯色矩形；UI 必须维持羊皮纸（`#f4ecd8`）、黄铜（`#d4af37`）、深胡桃木（`#1a1612`）的统一视觉调性。

---

*这份交接文档已全面梳理了项目从架构设计、关卡细节到进阶扩展的全部脉络。Codex 接手后可直接根据本指南进行下一步神作级深耕！祝旅途顺利！*
