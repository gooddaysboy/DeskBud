// 桌宠泡泡语录引擎：加载 data/bubble.json（与桌宠程序共用同一份数据源）
// 网页端策略：打开拉一次 -> 内存循环滚动 -> 页面生命周期内不再请求网络
// 容错：拿不到 json 或 json 损坏 -> 用内置备用文案，页面不报错不白屏
// 视觉：可爱对话气泡，带宠物头像 + 柔和随机配色 + 缓慢上升 + 轻微摇摆
const PET_EMOJI = { panda: '🐼', cat: '🐱', dog: '🐶', plant: '🌱', rabbit: '🐰', public: '💭' };
const CUTE = ['#ffd9e8', '#d8f3e6', '#fff1ca', '#d8ecff', '#e9ddff', '#ffe2d1'];

const BUBBLE = {
  data: null,
  ready: false,
  // 内置备用文案（兜底，保证降级不白屏）
  fallback: {
    version: 0,
    public: [
      "思绪飘到天外去咯",
      "时间慢慢来不用急",
      "今日宜发呆摸鱼",
      "平平淡淡也是美好"
    ],
    pets: {
      panda: ["竹子永远不会嫌多", "圆乎乎没有烦心事"],
      cat: ["呼噜呼噜治愈一切", "毛线团是宇宙宝藏"],
      dog: ["见到你就超级开心", "什么都不如出去玩"],
      plant: ["静待花开不必匆忙", "绿叶代表好心情"],
      rabbit: ["门牙是用来啃快乐的", "长耳朵听得见好心情", "圆滚滚才是真可爱", "蹦蹦跳跳烦恼全跑"]
    }
  },
  async load() {
    try {
      const res = await fetch('data/bubble.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      // 基础结构校验：缺 public/pets 也尽量兜底，避免整页失效
      if (!json || typeof json !== 'object') throw new Error('JSON 不是对象');
      this.data = {
        version: typeof json.version === 'number' ? json.version : 0,
        public: Array.isArray(json.public) ? json.public : [],
        pets: (json.pets && typeof json.pets === 'object') ? json.pets : {}
      };
      // 若 public 为空，至少用兜底 public，保证有内容可飘
      if (!this.data.public.length) this.data.public = this.fallback.public.slice();
      this.ready = true;
      console.info('[bubble] 已加载语录 v' + this.data.version + '，公共 ' + this.data.public.length + ' 条');
    } catch (e) {
      console.warn('[bubble] 加载失败，使用内置备用文案：', e.message);
      this.data = this.fallback;
      this.ready = true;
    }
    return this.data;
  },
  // 取某宠物（category 叶子 id）的合并语录：公共 + 该宠物专属，随机打散
  linesFor(category) {
    const src = this.data || this.fallback;
    const pub = src.public || [];
    const own = (src.pets && src.pets[category]) || [];
    return this.shuffle(pub.concat(own));
  },
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  // 在单个容器里飘出 1 条气泡（不负责节奏，由 render / startGlobal / renderKeep 调度）
  // animDelay：可选负数（秒），让气泡“已经飘到一半”，用于各列表起始位置错开、像一直在跑
  // dir：运动方向 rise/fall/lr/rl/d1/d2；不传则随机，像随机冒出来的念头
  spawnBubble(container, category, dur, animDelay, dir) {
    const lines = this.linesFor(category);
    if (!lines.length) return;
    const text = window.pick(lines[Math.floor(Math.random() * lines.length)]);
    if (dur == null) dur = 14000 + Math.random() * 8000;   // 默认 14~22s（缓慢）
    const DIRS = ['rise', 'fall', 'lr', 'rl', 'd1', 'd2'];
    if (!dir || DIRS.indexOf(dir) < 0) dir = DIRS[Math.floor(Math.random() * DIRS.length)];
    const wrap = document.createElement('div');
    wrap.className = 'bubble dir-' + dir;
    // 中部区域随机起点（避开卡片四角的文字/分类/角标），用 left/top 定位
    const W = container.clientWidth || 300;
    const H = container.clientHeight || 280;
    // 水平/垂直位移量：朝对应方向飘到容器外
    const rise = H + 24;
    const dx = W * (0.45 + Math.random() * 0.35);
    const dy = H * (0.45 + Math.random() * 0.30);
    // 各方向对应起点与终点（左/上坐标 + 偏离方向）
    const place = {
      rise: { l: 30 + Math.random() * 40, t: 38 + Math.random() * 22, tx: 0, ty: -rise },
      fall: { l: 30 + Math.random() * 40, t: 38 + Math.random() * 22, tx: 0, ty: rise },
      lr:   { l: 22 + Math.random() * 18, t: 38 + Math.random() * 22, tx: dx,  ty: 0 },
      rl:   { l: 60 + Math.random() * 18, t: 38 + Math.random() * 22, tx: -dx, ty: 0 },
      d1:   { l: 22 + Math.random() * 18, t: 38 + Math.random() * 22, tx: dx,  ty: dy },
      d2:   { l: 60 + Math.random() * 18, t: 38 + Math.random() * 22, tx: -dx, ty: dy }
    }[dir] || { l: 40, t: 50, tx: 0, ty: -rise };
    wrap.style.left = place.l + '%';
    wrap.style.top = place.t + '%';
    wrap.style.setProperty('--rise', rise + 'px');
    wrap.style.setProperty('--dx', dx + 'px');
    wrap.style.setProperty('--dy', dy + 'px');
    wrap.style.setProperty('--tx', place.tx + 'px');
    wrap.style.setProperty('--ty', place.ty + 'px');
    wrap.style.setProperty('--dur', (dur / 1000) + 's');
    if (animDelay != null) wrap.style.animationDelay = (animDelay / 1000) + 's';
    const inner = document.createElement('div');
    inner.className = 'bbl';
    const tx = document.createElement('span');
    tx.className = 'bbl-text';
    tx.textContent = text;                 // textContent 防注入
    inner.appendChild(tx);
    wrap.appendChild(inner);
    container.appendChild(wrap);
    const life = (animDelay != null) ? dur + animDelay : dur;
    setTimeout(() => wrap.remove(), life + 400);
  },
  // 单个容器模式：每 interval 毫秒飘 1 条（该容器同时最多 1 条）。用于详情页等单区域
  // 返回清理函数
  render(container, category, interval) {
    if (!container) return () => {};
    if (container._bubbleTimer) { clearTimeout(container._bubbleTimer); container._bubbleTimer = null; }
    if (!container.classList.contains('card-bubbles')) container.classList.add('bubble-zone');
    const gap = Math.max(12000, interval || 20000); // 默认约 20 秒一条
    const tick = () => {
      this.spawnBubble(container, category);
      container._bubbleTimer = setTimeout(tick, gap);
    };
    container._bubbleTimer = setTimeout(tick, 800); // 打开后稍等片刻飘第一条
    return () => {
      if (container._bubbleTimer) { clearTimeout(container._bubbleTimer); container._bubbleTimer = null; }
    };
  },
  // 全局模式：整页（selector 选中的所有容器）同一时刻只飘 1 条，随机轮流，约 interval 毫秒一条。
  // 用于列表多卡片，避免刷屏。返回清理函数
  startGlobal(selector, interval) {
    const els = Array.from(document.querySelectorAll(selector));
    if (!els.length) return () => {};
    const gap = Math.max(12000, interval || 20000);
    let timer = null;
    const tick = () => {
      const el = els[Math.floor(Math.random() * els.length)];
      const cat = el.dataset.cat || el.dataset.pet;
      this.spawnBubble(el, cat);
      timer = setTimeout(tick, gap);
    };
    timer = setTimeout(tick, 800);
    return () => { if (timer) { clearTimeout(timer); timer = null; } };
  },
  // 持续模式：每个容器始终有 1 条在飘（旧气泡将消失时下一条已升起，不空屏），
  // 各容器起始时间随机错开 -> 时间不统一、随机出现。用于泡泡墙每面板
  renderKeep(container, category, opts) {
    if (!container) return () => {};
    if (container._bubbleTimer) { clearTimeout(container._bubbleTimer); container._bubbleTimer = null; }
    if (!container.classList.contains('card-bubbles')) container.classList.add('bubble-zone');
    const minDur = (opts && opts.minDur) || 18000;
    const maxDur = (opts && opts.maxDur) || 26000;
    const dur = minDur + Math.random() * (maxDur - minDur);
    const dir = ['rise', 'fall', 'lr', 'rl', 'd1', 'd2'][Math.floor(Math.random() * 6)]; // 每张卡片一个固定方向
    const startDelay = Math.random() * 1500;     // 首条很快出现（≤1.5s）
    let timer = null;
    let first = true;
    const tick = () => {
      // 首条用随机负延迟 -> 该列表首条已在不同高度/位置，像一直在跑；后续按固定方向衔接
      const off = first ? -(Math.random() * dur * 0.78) : 0;
      first = false;
      const life = dur + off;                    // 首条因负延迟实际更短
      this.spawnBubble(container, category, dur, off, dir);
      timer = setTimeout(tick, life * 0.8);      // 下一条在本条快结束（80%）时升起，重叠衔接不空屏
    };
    timer = setTimeout(tick, startDelay);
    return () => { if (timer) { clearTimeout(timer); timer = null; } };
  }
};
