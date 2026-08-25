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
  // 在容器内渲染向上飘的半透明气泡。count=同时存在的泡泡数（首页少、详情页多）
  // 返回清理函数（切换作品时调用，避免计时器叠加）
  render(container, category, count) {
    if (!container) return () => {};
    if (container._bubbleTimer) {
      clearInterval(container._bubbleTimer);
      container._bubbleTimer = null;
    }
    container.innerHTML = '';
    container.classList.add('bubble-zone');
    const lines = this.linesFor(category);
    if (!lines.length) return () => {};
    let idx = 0;
    const spawn = () => {
      const b = document.createElement('div');
      b.className = 'bubble';
      b.textContent = lines[idx % lines.length];
      idx++;
      const left = 4 + Math.random() * 72;      // 随机水平位置 %
      const dur = 7 + Math.random() * 5;        // 随机时长 7~12s
      b.style.left = left + '%';
      b.style.animationDuration = dur + 's';
      b.style.animationDelay = (Math.random() * 1.5) + 's';
      container.appendChild(b);
      b.addEventListener('animationend', () => b.remove());
    };
    const gap = Math.max(2200, 4200 - count * 250); // 同时越多，生成越密
    for (let i = 0; i < count; i++) setTimeout(spawn, i * (gap / count));
    container._bubbleTimer = setInterval(spawn, gap);
    return () => {
      if (container._bubbleTimer) { clearInterval(container._bubbleTimer); container._bubbleTimer = null; }
    };
  }
};
