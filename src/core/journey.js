// 航程基准与玩家说明；只描述源码中实际存在的操作。
export const JOURNEY_STOPS = [
  ['改良俱乐部', 0], ['苏伊士', 7], ['孟买', 20], ['加尔各答', 23],
  ['香港', 36], ['横滨', 42], ['横滨 · 重聚', 43], ['旧金山', 64],
  ['纽约', 71], ['利物浦', 80], ['伦敦', 80]
];

export function getJourneyStatus(state) {
  const completed = JOURNEY_STOPS.reduce((last, _, i) => state.legResults?.[`leg${i}`] ? i : last, -1);
  const planned = completed < 0 ? 0 : JOURNEY_STOPS[completed][1];
  const margin = Math.round((planned - state.time.elapsed) * 10) / 10;
  const next = Math.min(completed + 1, JOURNEY_STOPS.length - 1);
  return {
    completed: completed + 1,
    nextCity: JOURNEY_STOPS[next][0],
    margin,
    pace: margin === 0 ? '与原定行程持平' : `${margin > 0 ? '领先' : '落后'}原定行程 ${Math.abs(margin).toFixed(1)} 天`
  };
}

export function getWagerOutcome(state, result) {
  // 最后一程一天，向东环游校正一天；误车另耗一天。此前节省的时间可以补救。
  const daysDelta = result.reached === false ? 0 : -1;
  const elapsed = Math.round((state.time.elapsed + 1 + daysDelta) * 10) / 10;
  const won = elapsed <= state.time.totalDays;
  return {
    won, elapsed, daysDelta,
    moneyDelta: won ? 20000 : 0,
    title: won ? '如约归来 · 赌约兑现' : '归来虽迟，旅程值得',
    comment: won
      ? `全程 ${elapsed.toFixed(1)} 天。${result.reached === false ? '前面攒下的时间弥补了这次误车。' : ''}福克：「诸位先生，我回来了。」`
      : `全程 ${elapsed.toFixed(1)} 天，超出约定 ${(elapsed - state.time.totalDays).toFixed(1)} 天。赌金未能赢回，但世界与旅伴都留在了这趟旅程里。`
  };
}

// 同一份方案同时驱动选择文案、关内支援与旅程账单，金额包含购象。
export const RESCUE_PLANS = [
  { id: 'observe', label: '用半天摸清暗路',
    subText: '购象 £2,000 · 营救准备 +0.5 天；两盏火把熄灭，开锁窗口更宽。',
    moneyDelta: -2000, daysDelta: 0.5, costColor: '#665032' },
  { id: 'divert', label: '请向导安排北门接应',
    subText: '购象及接应共 £2,300 · 不额外等待；福克牵制更久、恢复更快。',
    moneyDelta: -2300, daysDelta: 0, costColor: '#665032' }
];

export const CHALLENGE_GUIDES = {
  whist: {
    title: '伦敦 · 牌桌上的赌约', location: '伦敦 · 改良俱乐部',
    subtitle: '你与对面的搭档合力赢牌。先选合约，再跟出同花色；没有同花时可用红桃王牌。',
    goal: '7 轮里赢够约定的墩数；牌局奖励可带上旅途。', tip: '先选 4 墩熟悉规则；亮起的手牌都是合法出牌。',
    controls: [{ key: '点击 / 拖动手牌', desc: '出牌' }, { key: '♥ 红桃', desc: '王牌' }]
  },
  parkour: {
    title: '多佛 · 赶上最后的跳板', location: '多佛 · 海港',
    subtitle: '路路通自动向前跑。你只管越过货箱、低身穿过横梁，福克在船边接应。',
    goal: '先完成两次不计时练习，再用 24 秒赶上渡轮。', tip: '跳跃轻点就够；滑铲要按住，直到离开横梁。失手后可以重新调整动作。',
    controls: [{ key: '空格 / ↑ · 触屏 A', desc: '轻点跳跃' }, { key: '↓ / K · 触屏 B', desc: '按住滑铲' }]
  },
  steamOverdrive: {
    title: '红海 · 让轮机跟上你的节拍', location: '红海 · 蒙古号轮机舱',
    subtitle: '音符到达左侧圆环时，按对应颜色。金色双音按空格，或同时按两个键。',
    goal: '先练红、蓝、双音各一拍，再开始 45 秒航行。85% 命中且最高连击 20，可提前两天抵达。', tip: '练习不计分，漏拍可以再试；金色双音也能直接点击下方中间金键。',
    controls: [{ key: 'D / ← · 触屏 A', desc: '红轨' }, { key: 'K / → · 触屏 B', desc: '蓝轨' }, { key: '空格 · A+B', desc: '金色双音' }]
  },
  elephantRide: {
    title: '印度 · 与奇阿尼穿过丛林', location: '印度 · 柯尔比丛林',
    subtitle: '骑象越过石障，低头避开藤蔓，遇到火障用喷水开路。',
    goal: '穿过丛林，抵达神庙外的营地；随后再商量营救方案。', tip: '自动向前，先学跳跃与低头；遇到石障可向右冲锋。',
    controls: [{ key: '空格 / ↑ · 触屏 A', desc: '跳跃' }, { key: '↓ / S', desc: '低头' }, { key: 'K · 触屏 B', desc: '喷水灭火' }]
  },
  stealthRescue: {
    title: '神庙 · 把艾娥达带出来', location: '印度 · 火祭神庙',
    subtitle: '先绕到右侧救人，再一起回左侧西门。警觉条升起时，退回暗处或让福克牵制。',
    goal: '90 秒内解开三道锁，带艾娥达抵达西门。主线失手可重试，也可付出半天改道接应。', tip: '灭火后的圈内可隐蔽，石柱能挡住视线。开锁要松开按键，再等下一次时机。',
    controls: [{ key: '方向键 / WASD', desc: '移动' }, { key: '空格 · A', desc: '交互 / 解锁' }, { key: 'Q / K · B', desc: '灭火' }, { key: 'C · 支援键', desc: '福克牵制' }]
  },
  courtBail: {
    title: '加尔各答 · 找出证词的破绽', location: '加尔各答 · 法庭',
    subtitle: '读完证词，再选择能反驳它的证据。不要急着把每条指控都当成事实。',
    goal: '完成辩护，争取保释与后续船期。', tip: '这是推理关，先看证词与证据的矛盾。',
    controls: [{ key: '点击证词 / 选项', desc: '调查与选择' }, { key: '空格 / 点击', desc: '推进对话' }]
  },
  typhoonSailing: {
    title: '南海 · 追上上海邮船', location: '南中国海 · 坦克德尔号',
    subtitle: '借风赶路，收帆护船。到上海外海发出信号，让邮船为你停下来。开头有不计时试航。',
    goal: '75 秒内抵达上海外海，再用 12 秒驶入灯光带发信号。船体 ≥80% 且抵达时余裕 ≥10 秒可获 S 级、省半天。',
    tip: '强风提前 3 秒预告。平静时展帆，强风时收帆；全程收帆会错过船期。',
    controls: [{ key: '← → / A D / 点海面', desc: '跟随金色航道' },
      { key: '空格 · 触屏 A', desc: '切换收帆 / 展帆' }, { key: 'Q · 触屏 B', desc: '上海外海发信号' }]
  },
  circusAcrobat: {
    title: '横滨 · 再演最后一场', location: '横滨 · 马戏团',
    subtitle: '先接道具，再稳住人梯。最后 12 秒，主动向台下的福克飞扑；等到落幕不会自动重聚。',
    goal: '40 秒三幕演出。完成相认即可过关；接住至少 3 件道具、摆出 2 次姿势并重聚可获 S 级、省半天。',
    tip: '绿区内才能稳稳摆姿势。每次动作都要先松开再按，长按不能连刷；主线错过相认可多花半天到后台寻找。',
    controls: [{ key: '← → / A D / 点舞台', desc: '移动；平衡时轻调左右' }, { key: '空格 · 触屏 A', desc: '起跳 / 摆姿势 / 相认' }, { key: '点右侧福克', desc: '最后一幕主动相认' }]
  },
  sanFranciscoBrawl: {
    title: '旧金山 · 从乱局中脱身', location: '旧金山 · 酒馆',
    subtitle: '靠近对手出拳或踢击，拉开距离避开反击。先稳住站位，再追求连招。',
    goal: '击倒对手，或主动移动、格挡、反击并守住 99 秒，掩护同伴脱身。击倒且体力高于 60% 可省半天；挂机或失手可重试，也可多花半天休整。',
    tip: '后退自动格挡；↑ 跳跃。能量达到 50% 时轻按 Q 或触屏 C 发动组合技，长按不会自动连打。',
    controls: [{ key: '← → / A D', desc: '移动' }, { key: 'J / 空格 · 触屏 A', desc: '出拳' }, { key: 'K · 触屏 B', desc: '踢击' }, { key: 'Q · 触屏 C', desc: '组合技' }]
  },
  trainDefense: {
    title: '洛矶山 · 守住这班列车', location: '洛矶山 · 列车车顶',
    subtitle: '瞄准追兵射击；六发子弹打完前，找空当换弹。',
    goal: '守住 45 秒。车体仍高于 65% 可省半天；车体耗尽算防守失败，主线可重试或多用一天维修换乘。',
    tip: '点到目标才开枪；E 轻按切换专注，R 换弹。接受列车结果后，雪橇重试不会重跑列车。',
    controls: [{ key: '鼠标 / 点击目标', desc: '瞄准与射击' }, { key: '空格 · 触屏 A', desc: '开火' }, { key: 'R · 触屏 B', desc: '换弹' }]
  },
  iceSledge: {
    title: '雪原 · 借一阵顺风', location: '内布拉斯加 · 风帆雪橇',
    subtitle: '左右避开冰障，利用顺风提速。遇到急转弯先让出余地。',
    goal: '25 秒内抵达奥马哈车站，再转车去纽约；暖炉可延长时间。到站第一名省半天，未到终点则需多用一天换乘。',
    tip: '按住空格加速；急弯时同时转向并按 S 漂移。主线账单合计列车与雪橇两段时间，重试只重玩雪橇。',
    controls: [{ key: '← → / A D', desc: '转向' }, { key: '空格 · 触屏 A', desc: '顺风加速' }, { key: 'S · 触屏 B', desc: '漂移' }]
  },
  atlanticBurning: {
    title: '大西洋 · 最后一炉火', location: '大西洋 · 亨丽埃塔号',
    subtitle: '先听两小节找准节拍。材料中心到达金色判定线时，击打对应轨道，让最后的燃料推动轮船。',
    goal: '50 秒内到港；到港且最高连击 ≥35 可省一天。未到港可重试，或多用一天等待接应。',
    tip: '20 连击进入全速，漏拍会失去连击。手机点对应轨道；电脑用 1、2、3、4，每次松开再按。',
    controls: [{ key: '1 / 2 / 3 / 4', desc: '由上至下四轨' }, { key: '点击对应轨道', desc: '触屏击打' }]
  },
  londonFinale: {
    title: '伦敦 · 把最后一天找回来', location: '伦敦 · 改良俱乐部',
    subtitle: '先将经度向东转满一周，再驾车穿过街道。你一路攒下的时间，此刻算数。',
    goal: '40 秒内到达俱乐部。误车增加一天，赌约按全程实际天数判定。', tip: '按住加速并绕开行人；轻点转向，尽量保住速度。',
    controls: [{ key: '← → / A D', desc: '转动经度 / 驾车' }, { key: '空格 · 长按触屏 A', desc: '扬鞭加速' }]
  }
};
