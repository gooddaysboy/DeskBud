// 桌宠泡泡语录引擎：加载 data/bubble.json（与桌宠程序共用同一份数据源）
// 网页端策略：打开拉一次 -> 内存循环滚动 -> 页面生命周期内不再请求网络
// 容错：拿不到 json 或 json 损坏 -> 用内置备用文案，页面不报错不白屏
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
      plant: ["静待花开不必匆忙", "绿叶代表好心情"]
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
        public: Array.isArray(json.public) ? json.public.filter(s => typeof s === 'string') : [],
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
  // 在单个容器里飘出 1 条气泡（不负责节奏，由 render / startGlobal 调度）
  spawnBubble(container, category) {
    const lines = this.linesFor(category);
    if (!lines.length) return;
    const b = document.createElement('div');
    b.className = 'bubble';
    b.textContent = lines[Math.floor(Math.random() * lines.length)];
    const left = 6 + Math.random() * 68;          // 随机水平位置 %
    const dur = 9 + Math.random() * 4;            // 动画时长 9~13s（< 间隔，保证屏上同时最多 1 条）
    b.style.left = left + '%';
    b.style.animationDuration = dur + 's';
    container.appendChild(b);
    b.addEventListener('animationend', () => b.remove());
  },
  // 单个容器模式：每 interval 毫秒飘 1 条（该容器同时最多 1 条）。用于详情页等单区域
  // 返回清理函数
  render(container, category, interval) {
    if (!container) return () => {};
    if (container._bubbleTimer) { clearTimeout(container._bubbleTimer); container._bubbleTimer = null; }
    container.classList.add('bubble-zone');
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
  // 用于泡泡墙 / 列表多卡片，避免刷屏。返回清理函数
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
  }
};
