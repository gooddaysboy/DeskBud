// DeskBud 站点公共逻辑：数据加载、渲染辅助、分类/排序、不蒜子统计、webmeji 加载器
const SITE = {
  data: null,
  _assetVer: 25, // 与 css/js ?v= 同步，图片缓存破除用

  // ====== webmeji 网页宠物加载器（全站统一开关） ======
  // 引擎基于 webmeji (Lars de Rooij, 2026)，详见 assets/webmeji/webmeji.js 头部注释
  webmeji: {
    base: 'assets/webmeji/',
    enabledPaths: ['/', '/index.html', '/pets.html'],  // 当前启用页：首页 + 伙伴之家
    init() {
      const path = location.pathname;
      const enabled = this.enabledPaths.some(p => path === p || path.endsWith(p));
      if (!enabled) return;
      // 1. 注入 css
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = this.base + 'webmeji.css?v=2';
      document.head.appendChild(css);
      // 2. 注入 config（先于 webmeji.js；多宠物 = 多个 config 脚本，全部加载完拼接 SPAWNING）
      const configFiles = ['rabbit.config.js?v=7', 'panda.config.js?v=2'];
      const loadCfg = (i) => {
        if (i >= configFiles.length) {
          window.SPAWNING = [
            ...(window.DESKBUD_RABBIT_SPAWNING || []),
            ...(window.DESKBUD_PANDA_SPAWNING || []),
          ];
          const s = document.createElement('script');
          s.src = this.base + 'webmeji.js?v=23';
          s.onload = () => {
            // 4. webmeji.js 在 DOMContentLoaded 注册 listener；动态注入时该事件已触发，重发一次唤醒
            window.dispatchEvent(new Event('DOMContentLoaded'));
            // 5. 引擎异步预载图片后才 new Creature 创建 .webmeji-container，用观察器兜底绑冒泡
            this.bindSpeechBubble();
          };
          document.head.appendChild(s);
          return;
        }
        const cfg = document.createElement('script');
        cfg.src = this.base + configFiles[i];
        cfg.onload = () => loadCfg(i + 1);
        document.head.appendChild(cfg);
      };
      loadCfg(0);
    },

    // 取一句 deskbud 语录（复用 bubble.js 的 window.BUBBLE 池，按宠物物种取池，失败兜底）
    // DeskBud v6.1: 走洗牌袋——同一物种相邻两条必不重复
    _pickQuote(container) {
      const species = (container && container._wmSpecies) || this._BUBBLE_CFG.pet;
      let line = null;
      if (window.BUBBLE && typeof window.BUBBLE.linesFor === 'function') {
        const pool = window.BUBBLE.linesFor(species) || [];
        if (window.BUBBLE.pickBag) line = window.BUBBLE.pickBag('l1:' + species, pool);
        else if (pool.length) line = pool[Math.floor(Math.random() * pool.length)];
      }
      if (!line) line = '今天也要元气满满哦';
      if (window.pick) {
        try { return window.pick(line); } catch (e) {}
      }
      return (line && (line.zh || line.en || line)) || '今天也要元气满满哦';
    },

    // ====== 气泡三层触发（对齐桌宠 v6，2026-09-07） ======
    // L1 随机（自动 + hover 抚摸） / L2 交互（click·drag，100% 触发、最高优先级）
    // L3 状态（进状态按概率 + 冷却，不抢正在显示的气泡）
    _BUBBLE_CFG: {
      pet: 'rabbit',
      reactMs: 3000,                 // L2 反应气泡时长
      stateMs: 2800,                 // L3 状态气泡时长（比反应略短）
      prob: {                        // 各状态触发概率（0 = 暂不启用，与桌宠一致）
        climb: 0.30, hang: 0.50, slip: 0.80, fall: 0.40, land: 0.60,
        walk: 0.15, idle_stare: 0.20, sleep: 0.40, coquetry: 0.25, naughty: 0.0
      },
      sameCd: 30000,                 // 同一状态冷却，防每次爬墙都念同一句
      minGap: 5000                   // 任意两条气泡最小间隔，防碎碎念
    },
    // webmeji 动作 → v6 状态池 key
    _WM_STATE_MAP: {
      climbSide: 'climb', climbTop: 'climb',
      hangstillTop: 'hang', hangstillSide: 'hang',
      slip: 'slip', falling: 'fall', trip: 'fall',
      fallen: 'land',
      walk: 'walk', forcewalk: 'walk', topwalk: 'walk',
      sit: 'sleep',
      stand: 'idle_stare', forcethink: 'idle_stare',
      pet: 'coquetry', spin: 'naughty', dance: 'naughty'
    },
    _wmContainers: [],
    _wmLastAny: 0,
    _wmStateLast: {},

    // 往某只宠物头上挂一条气泡（气泡 append 到 body(fixed)，避免被容器 overflow:hidden 裁掉）
    // 对齐 Kotlin PetBubble ⑪ 排版：，。！？；后强制换行（标点留行尾），一句一行有节奏。
    // CSS 侧配 white-space: pre-line；textContent 注入，防注入语义不变
    _bubbleFormat(text) {
      return String(text).replace(/([，。！？；])/g, '$1\n').trim();
    },

    _wmBubbleShow(container, text, ms) {
      if (!container || !text) return;
      const old = container._wmBubbleEl;
      if (old) {
        if (old._wmRaf) cancelAnimationFrame(old._wmRaf);
        if (old._wmTimer) clearTimeout(old._wmTimer);
        old.remove();
      }
      const bubble = document.createElement('div');
      bubble.className = 'wm-bubble';
      const bbl = document.createElement('span');
      bbl.className = 'wm-bbl';
      bbl.textContent = this._bubbleFormat(text);   // textContent 防注入
      bubble.appendChild(bbl);
      document.body.appendChild(bubble);
      // 定位到容器正上方居中（fixed，相对视口），并用 rAF 持续跟随宠物移动
      const place = () => {
        const r = container.getBoundingClientRect();
        bubble.style.left = (r.left + r.width / 2) + 'px';
        bubble.style.top = (r.top - 6) + 'px';
      };
      place();
      const follow = () => {
        if (!bubble.isConnected) return;   // 已被新气泡替换/移除则停止
        place();
        bubble._wmRaf = requestAnimationFrame(follow);
      };
      bubble._wmRaf = requestAnimationFrame(follow);
      container._wmBubbleEl = bubble;
      bubble._wmTimer = setTimeout(() => {
        bubble.classList.add('wm-bubble-out');
        bubble._wmTimer = setTimeout(() => {
          if (bubble._wmRaf) cancelAnimationFrame(bubble._wmRaf);
          bubble.remove();
          if (container._wmBubbleEl === bubble) container._wmBubbleEl = null;
        }, 450);
      }, ms || 3000);
      this._wmLastAny = Date.now();
    },
    _wmAnyShowing() {
      return this._wmContainers.some(c => !!(c && c._wmBubbleEl));
    },

    // L3 状态气泡：概率 → 最小间隔 → 同状态冷却 → 有池 → 不抢当前气泡（只给做动作的那只冒）
    _wmTryState(key, container) {
      const cfg = this._BUBBLE_CFG;
      if (Math.random() > (cfg.prob[key] || 0)) return;
      const now = Date.now();
      if (now - (this._wmLastAny || 0) < cfg.minGap) return;
      if (now - (this._wmStateLast[key] || -1e9) < cfg.sameCd) return;
      const species = (container && container._wmSpecies) || cfg.pet;
      const text = (window.BUBBLE && window.BUBBLE.pickState)
        ? window.BUBBLE.pickState(key, species) : '';
      if (!text) return;
      if (this._wmAnyShowing()) return;      // 反应/随机气泡优先，状态气泡不抢
      this._wmStateLast[key] = now;
      this._wmBubbleShow(container, text, cfg.stateMs);
    },

    // 按 img.id 找宠物容器（引擎事件 detail.id → 'deskbud-rabbit' / 'deskbud-panda'）
    _wmById(id) {
      return this._wmContainers.find(c => c && c._wmId === id) || null;
    },

    // 事件总线只绑一次：webmeji:react（L2）/ webmeji:action（L3）
    _ensureBubbleBus() {
      if (this._wmBusBound) return;
      this._wmBusBound = true;
      document.addEventListener('webmeji:react', (e) => {
        const kind = (e.detail && e.detail.kind) || 'click';
        const container = this._wmById(e.detail && e.detail.id);
        const species = (container && container._wmSpecies) || this._BUBBLE_CFG.pet;
        const text = (window.BUBBLE && window.BUBBLE.pickReaction)
          ? window.BUBBLE.pickReaction(kind, species) : '';
        if (!text) return;
        // 只给被交互的那只冒（找不到容器则退化为第一只）
        this._wmBubbleShow(container || this._wmContainers[0], text, this._BUBBLE_CFG.reactMs);
      });
      document.addEventListener('webmeji:focus', (e) => {
        // 专注模式广播：同步到各容器（抚摸气泡 gate 用）
        const on = !!(e.detail && e.detail.on);
        this._wmContainers.forEach(c => { c._wmFocus = on; });
      });
      document.addEventListener('webmeji:action', (e) => {
        if (e.detail && e.detail.focus) return; // 专注模式：自动气泡全抑制（2026-09-10）
        const key = this._WM_STATE_MAP[(e.detail && e.detail.action) || ''];
        if (!key) return;
        // 事件不带 id（外部测试派发/旧逻辑）时退化为第一只
        this._wmTryState(key, this._wmById(e.detail && e.detail.id) || this._wmContainers[0]);
      });
    },

    // 给单只宠物容器绑定点击/抚摸冒泡
    _bindSpeechBubble(container) {
      if (!container || container._wmBubbleBound) return;
      container._wmBubbleBound = true;
      if (this._wmContainers.indexOf(container) === -1) this._wmContainers.push(container);
      this._ensureBubbleBus();

      // 物种：img.id 'deskbud-rabbit' / 'deskbud-panda' → 气泡语录按物种取池
      const img = container.querySelector('img');
      container._wmId = (img && img.id) || '';
      container._wmSpecies = container._wmId.replace('deskbud-', '') || this._BUBBLE_CFG.pet;

      // L1：随机语录（自动 / 抚摸）——按各自物种的语录池
      const show = () => this._wmBubbleShow(container, this._pickQuote(container), 3000);

      let hoverTimer = null;
      container.addEventListener('click', () => {
        // 单击反应由 webmeji:react 统一触发（L2），这里不再重复冒，避免两条打架
        if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
      });
      container.addEventListener('mouseenter', () => {
        // 专注模式：抚摸气泡也抑制（webmeji:focus 广播同步状态）
        if (container._wmFocus) return;
        hoverTimer = setTimeout(show, 900);   // 抚摸延迟冒泡
      });
      container.addEventListener('mouseleave', () => {
        if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
      });

      // DeskBud: 宠物自己玩时随机自动冒语录(8~20s 一条)；双宠全局错峰——
      // 任意一只刚冒过 3s 内另一只不冒（避免俩同时碎碎念）
      const showAuto = () => {
        const now = Date.now();
        if (now - (this._wmLastAny || 0) < 3000) {    // 错峰：距上条气泡不足 3s → 顺延
          container._wmAutoTimer = setTimeout(() => { show(); scheduleAuto(); }, 3000);
          return;
        }
        show();
        scheduleAuto();
      };
      const scheduleAuto = () => {
        container._wmAutoTimer = setTimeout(showAuto, 8000 + Math.random() * 12000);
      };
      scheduleAuto();
    },

    // 监听 .webmeji-container 创建，逐个绑冒泡
    bindSpeechBubble() {
      const bind = (node) => {
        if (node && node.classList && node.classList.contains('webmeji-container')) {
          this._bindSpeechBubble(node);
        }
      };
      document.querySelectorAll('.webmeji-container').forEach(bind);
      if (this._wmObserver) return;
      this._wmObserver = new MutationObserver((mutations) => {
        mutations.forEach((m) => m.addedNodes.forEach(bind));
      });
      this._wmObserver.observe(document.body, { childList: true });
    }
  },
  async load() {
    if (this.data) return this.data;
    const res = await fetch('data/works.json', { cache: 'no-cache' });
    this.data = await res.json();
    return this.data;
  },
  // 伙伴之家目录（catalog.json）：详情页购买区用；cv 参数改内容时同步升
  async loadCatalog() {
    if (this.__cat) return this.__cat;
    this.__cat = fetch('data/catalog.json?cv=2', { cache: 'no-cache' }).then(r => r.json());
    return this.__cat;
  },
  // ---------- 购买收银台链路（2026-09-10 对齐 petpay，与 pyside6/kotlin 约定一致）----------
  // device_id：URL ?device_id= 优先（读到即存 localStorage，客户端 WebView 首次带入），
  // 无参时从 localStorage 恢复。格式校验 dsk+16hex（19 字符，pyside6/kotlin 同约定）。
  PAY_CHECKOUT: 'https://pay.deskbud.xyz/checkout.html',
  _DID_RE: /^dsk[0-9a-f]{16}$/i,
  getDeviceId() {
    try {
      const q = new URLSearchParams(location.search).get('device_id');
      if (q && this._DID_RE.test(q)) { localStorage.setItem('deskbud_device_id', q); return q; }
      const s = localStorage.getItem('deskbud_device_id');
      if (s && this._DID_RE.test(s)) return s;
    } catch (e) { /* localStorage 不可用时按无设备号处理 */ }
    return '';
  },
  // 收银台链接；device_id 为空返回 ''（调用方据此显示「先下载桌宠」）
  // 多选（2026-09-11 老曹/petpay 约定）：petIds 支持数组或单值，逗号分隔、去重、最多 10 只。
  // 单只仍用 pet_id=（向后兼容收银台旧参数），多只用 pet_ids=a,b（收银台一次扫码结算）。
  // didOverride（09-11）：下载页安装包链路用网页设备号下单时传入（缺省用客户端 did）
  checkoutUrl(petIds, didOverride) {
    const did = didOverride || this.getDeviceId();
    if (!did) return '';
    const ids = (Array.isArray(petIds) ? petIds : [petIds])
      .map(s => String(s == null ? '' : s).trim())
      .filter(Boolean);
    const uniq = [...new Set(ids)].slice(0, 10);
    if (!uniq.length) return '';
    const param = uniq.length > 1
      ? 'pet_ids=' + encodeURIComponent(uniq.join(','))
      : 'pet_id=' + encodeURIComponent(uniq[0]);
    // App 内嵌场景（html.embed-mode）→ 收银台也走内嵌版（老曹 2026-09-11 约定：&embed=1）
    const embed = document.documentElement.classList.contains('embed-mode') ? '&embed=1' : '';
    return `${this.PAY_CHECKOUT}?device_id=${encodeURIComponent(did)}&${param}${embed}`;
  },
  // 网页设备号（2026-09-11 协同板已定 #7）：下载页无客户端 did 时生成 dsk+16hex 存 localStorage，
  // 仅用于安装包(link)链路——语义边界：它只是"下载凭证"，不代表客户端激活。
  getOrCreateWebDid() {
    try {
      const s = localStorage.getItem('deskbud_web_device_id');
      if (s && this._DID_RE.test(s)) return s;
      const hex = [...crypto.getRandomValues(new Uint8Array(8))]
        .map(b => b.toString(16).padStart(2, '0')).join('');
      const did = 'dsk' + hex;
      localStorage.setItem('deskbud_web_device_id', did);
      return did;
    } catch (e) { return ''; }
  },

  // 选购集合（2026-09-11 老曹：选择要跨页面保持——软导航切走再回、刷新后都在）。
  // 伙伴页与首页共用同一份购物车（localStorage deskbud_picked）
  getPicked() {
    try { return new Set(JSON.parse(localStorage.getItem('deskbud_picked') || '[]')); }
    catch (e) { return new Set(); }
  },
  setPicked(set) {
    try { localStorage.setItem('deskbud_picked', JSON.stringify([...set])); } catch (e) {}
  },
  togglePicked(id) {
    const s = this.getPicked();
    if (s.has(id)) s.delete(id); else s.add(id);
    this.setPicked(s);
    return s;
  },

  // 已授权宠物 id 集合（有 device_id 时查询并缓存；force=true 强制重查——付款后从收银台切回要用）
  async fetchOwnedIds(force) {
    if (!force && this.__ownedIds) return this.__ownedIds;
    const did = this.getDeviceId();
    if (!did) { this.__ownedIds = new Set(); return this.__ownedIds; }
    try {
      const r = await fetch(`${this.PAY_CHECKOUT.replace('/checkout.html', '')}/api/entitlement?device_id=` + encodeURIComponent(did), { cache: 'no-cache' });
      const d = await r.json();
      this.__ownedIds = new Set(d.pets || []);
    } catch (e) { if (!this.__ownedIds) this.__ownedIds = new Set(); }
    return this.__ownedIds;
  },
  // 购物车清理（2026-09-11 老曹：付款后自动清除已购的）——把已授权的宠物从选购集合里剔除并持久化
  prunePicked(ownedIds) {
    const s = this.getPicked();
    let changed = false;
    ownedIds.forEach(id => { if (s.has(id)) { s.delete(id); changed = true; } });
    if (changed) this.setPicked(s);
    return s;
  },
  // 购物车清洗（2026-09-12 老曹：点线咪却显示"已选 2 只"）：内置宠物（开箱即用）与已下线作品都不该留在车里。
  // ⚠️ 只在内存里过滤没用——localStorage 里那份脏数据会被下一次 getPicked() 原样读回来，所以必须写回。
  sanitizePicked() {
    const s = this.getPicked();
    const works = (this.data && this.data.works) || [];
    const clean = new Set([...s].filter(id => { const w = works.find(x => x.id === id); return w && !w.builtin; }));
    if (clean.size !== s.size) this.setPicked(clean);
    return clean;
  },
  // 仅返回已上线的作品（status 不为 "hidden"），隐藏的占位作品统一在此过滤
  onlineWorks() {
    if (!this.data) return [];
    return this.data.works.filter(w => w.status !== 'hidden');
  },
  catName(id) {
    for (const c of this.data.categories) {
      if (c.id === id) return window.pick(c.name);
      if (c.children) {
        const ch = c.children.find(x => x.id === id);
        if (ch) return window.pick(ch.name);
      }
    }
    return id;
  },
  catIcon(id) {
    for (const c of this.data.categories) {
      if (c.id === id) return c.icon || '';
      if (c.children) {
        const ch = c.children.find(x => x.id === id);
        if (ch) return ch.icon || '';
      }
    }
    return '';
  },
  // 把分类 id 展开为可匹配的作品 category 列表（一级分类会展开成它所有二级叶子）
  expandCatIds(id) {
    if (!id || id === 'all') return null;
    const c = this.data.categories.find(x => x.id === id);
    if (!c) return [id];
    if (c.children && c.children.length) return c.children.map(x => x.id);
    return [id];
  },
  // 排序：latest 最新 / downloads 下载量（无真实下载数时退化为 0，等同不排序）/ hot 热门(精选优先+近期)
  sortWorks(list, mode) {
    const arr = list.slice();
    if (mode === 'downloads') arr.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    else if (mode === 'hot') arr.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (b.downloads || 0) - (a.downloads || 0) || (b.date || '').localeCompare(a.date || ''));
    else arr.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return arr;
  },
  fmt(n) {
    if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  },
  // 缩略图：优先 cover/thumb（webp 动画在 <img> 中自动播放），缺失时占位。
  // 不在卡片预载视频：视频体积大，仅在详情页「演示窗口」按需播放，保持列表清爽。
  thumbHTML(work) {
    const ver = (this && this._assetVer) || (SITE && SITE._assetVer) || 9;
    const v = (s) => s + (s.includes('?') ? '&' : '?') + 'v=' + ver;
    if (work.thumb) return `<img src="${v(work.thumb)}" alt="${window.pick(work.title)}" loading="lazy" draggable="false">`;
    if (work.cover) return `<img src="${v(work.cover)}" alt="${window.pick(work.title)}" loading="lazy" draggable="false">`;
    return '暂无预览';
  },
  cardHTML(work) {
    return `
    <a class="card" href="detail.html?id=${work.id}">
      <div class="thumb">
        ${SITE.thumbHTML(work)}
        <div class="card-bubbles" data-pet="${work.category}"></div>
        <div class="overlay">
          <div class="cat">${SITE.catIcon(work.category)} ${SITE.catName(work.category)}</div>
          <h3>${window.pick(work.title)}</h3>
        </div>
      </div>
      <div class="meta">
        <span>${window.pick(work.author)}</span>
        ${work.downloads != null ? `<span>⬇ <b class="stat" id="d-${work.id}">${SITE.fmt(work.downloads)}</b></span>` : ''}
      </div>
    </a>`;
  }
};

// Open-Kounter 统计（替代不蒜子）：自增 PV + 读取填充 busuanzi 兼容 span
// 后端：https://kounter.deskbud.xyz （gooddaysboy/open-kounter，EdgeOne Pages + Blob）
// 读：GET /api/counter?target=X -> {code:0,data:{time:N}}
// 自增：POST /api/counter {"action":"batch_inc","requests":[{"target":"site-pv"},{"target":<当前页>}]}
// 域名白名单已配：仅放行 deskbud.xyz（其他域 inc 被拒）；GET 读不受白名单限制。
const OK_BASE = 'https://kounter.deskbud.xyz';
function initOpenKounter() {
  const pageTarget = 'page:' + location.pathname + location.search;
  // 1) 自增（受域名白名单限制，仅 deskbud.xyz 允许）
  fetch(OK_BASE + '/api/counter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'batch_inc', requests: [ { target: 'site-pv' }, { target: pageTarget } ] }),
    cache: 'no-store'
  }).catch(() => {});
  // 2) 读取并填充（GET 不受白名单限制；span 可能异步渲染，故重试；绕过边缘缓存）
  const fill = (target, elId) => {
    let tries = 0;
    const attempt = () => {
      const el = document.getElementById(elId);
      if (el) {
        fetch(OK_BASE + '/api/counter?target=' + encodeURIComponent(target) + '&_=' + Date.now(), { cache: 'no-store' })
          .then(r => (r.ok ? r.json() : null))
          .then(j => { if (j && j.code === 0) el.textContent = j.data.time; })
          .catch(() => {});
        return;
      }
      if (tries++ < 12) setTimeout(attempt, 200); // 等卡片渲染，最多 ~2.4s
    };
    attempt();
  };
  fill('site-pv', 'busuanzi_value_site_pv');   // 全站 PV（页面无此 span 时静默跳过，后台仍可见）
  fill(pageTarget, 'busuanzi_value_page_pv');  // 当前页 / 作品 PV
}

// 公告栏：全站注入到 .topbar 之下、搜索栏之上，由 data/announcements.json 驱动
// 改为「走马灯」：取全部在期公告，横向无缝滚动（仿详情页姿态走马灯），滚动作品集公告
// 幂等：lang:change 与 DOMContentLoaded 都会触发，故先清再插，避免重复
// 公告栏：全站注入到 .topbar 之下、搜索栏之上，由 data/works.json 驱动，
// 横向无缝滚动「在线作品集」（不再显示公告文字）。lang:change 与 DOMContentLoaded 都会触发，故先清再插（幂等）。
function initAnnounce() {
  // 首页极简：不注入公告走马灯（新首屏自带大展示卡）；软导航离开首页时由 syncHomeChrome 补建
  if (typeof isHomePath === 'function' && isMinimalPath()) {
    document.querySelectorAll('.announce-bar').forEach(b => b.remove());
    return;
  }
  fetch('data/works.json', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : null))
    .then(data => {
      if (typeof isHomePath === 'function' && isMinimalPath()) return; // fetch 期间软导航回极简页则放弃插入
      const works = (data && data.works) || [];
      const items = works.filter(w => w.status === 'online');
      // 幂等：移除旧 bar 再插入
      document.querySelectorAll('.announce-bar').forEach(b => b.remove());
      if (!items.length) return;
      const buildItem = (w) => {
        const name = window.pick(w.title);
        const img = w.thumb || w.cover || '';
        const cover = img
          ? `<img class="announce-cover" src="${img}" alt="${name}" draggable="false">`
          : '';
        return `<a class="announce-item" href="detail.html?id=${encodeURIComponent(w.id)}">${cover}<span class="announce-text">${name}</span></a>`;
      };
      const bar = document.createElement('div');
      bar.className = 'announce-bar announce-marquee';
      const one = items.map(buildItem).join('');
      // 间隔：作品少宽、作品多窄；复制足够份数铺满 ≥2×视口，平移一份即无缝，时刻有内容不露白
      const gap = items.length <= 3 ? 120 : (items.length <= 6 ? 78 : (items.length <= 10 ? 54 : 40));
      bar.style.setProperty('--announce-gap', gap + 'px');
      bar.innerHTML = `<div class="announce-track">${one}</div>`;
      const topbar = document.querySelector('.topbar');
      if (!topbar) return;
      topbar.after(bar); // 先插入 DOM 才能准确测量宽度
      const track = bar.querySelector('.announce-track');
      const oneW = track.scrollWidth + gap; // 含末 item 间距，平移此值即严格无缝
      const barW = bar.clientWidth || document.documentElement.clientWidth;
      const copies = Math.max(2, Math.ceil((barW * 2) / oneW) + 1);
      track.innerHTML = one.repeat(copies);
      track.style.setProperty('--one-w', oneW + 'px');
      track.style.animationDuration = Math.max(16, Math.round(oneW / 55)) + 's';
      // 导航栏之下、搜索栏之上，不抢最顶
    })
    .catch(() => {});
}

// 全站搜索：顶部搜索框，匹配作品名称/描述/作者/分类，结果下拉点击跳详情页
function initSearch() {
  const form = document.getElementById('siteSearch');
  if (!form) return;
  const input = document.getElementById('siteSearchInput');
  const box = document.getElementById('siteSearchResults');
  let works = [];
  let catMap = {};
  fetch('data/works.json', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : null))
    .then(d => {
      works = ((d && d.works) || []).filter(w => w.status !== 'hidden');
      (d && d.categories || []).forEach(c => {
        catMap[c.id] = c.name;
        (c.children || []).forEach(ch => { catMap[ch.id] = ch.name; });
      });
    })
    .catch(() => { works = []; });
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const catName = id => window.pick(catMap[id]) || id;
  function doSearch(q) {
    q = (q || '').trim().toLowerCase();
    if (!q) { box.hidden = true; box.innerHTML = ''; return; }
    const hits = works.filter(w => {
      const blob = [window.pick(w.title), window.pick(w.summary), window.pick(w.description), window.pick(w.author), catName(w.category)]
        .filter(Boolean).join(' ').toLowerCase();
      return blob.includes(q);
    }).slice(0, 8);
    if (!hits.length) {
      box.innerHTML = '<div class="ssr-empty">' + window.pick({ zh: '没有找到相关作品', en: 'No matching works found' }) + '</div>';
    } else {
      box.innerHTML = hits.map(w => `
        <a class="ssr-item" href="detail.html?id=${encodeURIComponent(w.id)}">
          <span class="ssr-title">${esc(window.pick(w.title))}</span>
          <span class="ssr-cat">${esc(catName(w.category))}</span>
          <span class="ssr-desc">${esc((window.pick(w.summary) || window.pick(w.description) || '').slice(0, 46))}</span>
        </a>`).join('');
    }
    box.hidden = false;
  }
  let t;
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => doSearch(input.value), 150); });
  form.addEventListener('submit', e => { e.preventDefault(); doSearch(input.value); box.hidden = false; });
  input.addEventListener('focus', () => { if (input.value.trim()) doSearch(input.value); });
  document.addEventListener('click', e => { if (!form.contains(e.target)) box.hidden = true; });
  window.addEventListener('scroll', () => { if (!box.hidden) box.hidden = true; }, true);
}

// 语言切换时：公告重渲染 + 动态内容（卡片/列表/详情）由页面注册的 __rerender 重渲染
window.addEventListener('lang:change', () => {
  initAnnounce();
  if (typeof window.__rerender === 'function') window.__rerender();
});

/* ---------- 全站公共外壳：BGM 音频（每页自动注入，零改 HTML；常驻于 #view 之外，软导航不被销毁） ---------- */
function injectChrome() {
  if (!document.getElementById('siteBgm')) {
    const a = document.createElement('audio');
    a.id = 'siteBgm';
    a.loop = true;            // 循环
    a.preload = 'none';
    a.src = 'assets/audio/AfternoonInBambooGrove.mp3';
    document.body.appendChild(a); // 放在 body 末尾、#view 之外 → 软导航换页时保留，音乐不中断
  }
}

// BGM 总开关：导航栏「首页」左侧按钮控制，状态存 localStorage，跨页延续
// 语义：开 → 所有页面访问即播；关 → 所有页面都停。仅需一个开关（状态全局单一）。
// 关键：音频元素常驻（见 injectChrome），软导航只换 #view，故切页/进详情/回首页音乐不重头、不中断。
SITE.initBgm = function () {
  const bgm = document.getElementById('siteBgm');
  const btn = document.getElementById('bgmToggle');
  if (!bgm) return;
  const KEY = 'deskbud_bgm';
  let on = localStorage.getItem(KEY) === '1';
  function paint() {
    if (!btn) return;
    btn.classList.toggle('on', on);
    const icon = btn.querySelector('#bgmIcon');
    if (icon) icon.textContent = on ? '🔊' : '🔇'; // 🔊 播放中 / 🔇 已静音，状态更明显
  }
  paint();
  // 开 → 立即尝试播放（已在本域名交互过的，Chrome 媒体参与度通常允许自动续播）
  function tryResume() { if (on && bgm.paused) bgm.play().catch(() => {}); }
  if (on) {
    bgm.play().catch(() => {
      document.addEventListener('pointerdown', tryResume, { passive: true });
      document.addEventListener('keydown', tryResume);
    });
  }
  if (btn) {
    btn.addEventListener('click', () => {
      on = !on;
      localStorage.setItem(KEY, on ? '1' : '0');
      paint();
      if (on) bgm.play().catch(() => { btn.classList.add('err'); btn.title = '音频未就绪：请确认 assets/audio/AfternoonInBambooGrove.mp3 存在'; });
      else bgm.pause();
    });
  }
};

/* ---------- 页面计时器清理：离开页面时停止上一页的泡泡循环，避免泄漏 ---------- */
SITE._cleanups = [];
SITE.runCleanups = function () {
  SITE._cleanups.forEach(fn => { try { fn(); } catch (e) {} });
  SITE._cleanups = [];
};

/* ---------- 用户手册页：平台 tab + 中英语言块显隐 ---------- */
// tab 点击：切 .manual-panel 显隐（DOM 事件委托，幂等：每次进入 usage 重新绑到新 #view 内容）
function initManualTabs() {
  const tabs = document.getElementById('manualTabs');
  if (!tabs) return;
  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tab]');
    if (!btn) return;
    const name = btn.getAttribute('data-tab');
    tabs.querySelectorAll('button').forEach(b => {
      const on = (b === btn);
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('.manual-panel').forEach(p => {
      p.classList.toggle('on', p.getAttribute('data-panel') === name);
    });
    fitAllManualFrames();
  });
}
// 窗口缩放时重算可见手册 iframe 高度（防抖）
let _manualRzT;
window.addEventListener('resize', () => {
  clearTimeout(_manualRzT);
  _manualRzT = setTimeout(fitAllManualFrames, 150);
});
// 语言切换：.manual 内 [data-manual-lang] 只显示当前语言块（zh/en 双容器，长文不塞 i18n JSON）
function syncManualLang() {
  const lang = (window.__lang === 'en') ? 'en' : 'zh';
  document.querySelectorAll('.manual [data-manual-lang]').forEach(el => {
    el.classList.toggle('on', el.getAttribute('data-manual-lang') === lang);
  });
  fitAllManualFrames();
}
// 手册 iframe（原版手册整页嵌入）高度自适应：同源直读文档高度
function fitManualFrame(f) {
  try {
    if (!f.offsetParent) return; // 面板/语言块隐藏时跳过
    const doc = f.contentDocument;
    if (!doc || !doc.body) return;
    const h = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight);
    if (h) f.style.height = h + 'px';
  } catch (e) { /* 非 http 环境或跨域时静默 */ }
}
function fitAllManualFrames() {
  document.querySelectorAll('.manual-frame').forEach(fitManualFrame);
}
function initManualFrames() {
  document.querySelectorAll('.manual-frame').forEach(f => {
    if (f.__fitBound) return; // 幂等：软导航回位不重复绑
    f.__fitBound = true;
    f.addEventListener('load', () => {
      fitManualFrame(f);
      try {
        const doc = f.contentDocument;
        doc.addEventListener('toggle', () => fitManualFrame(f), true);          // FAQ <details> 展开/收起
        doc.addEventListener('click', () => setTimeout(() => fitManualFrame(f), 60), true); // 其他交互兜底
      } catch (e) {}
      setTimeout(() => fitManualFrame(f), 300); // 字体/图片加载后二次校准
    });
  });
  fitAllManualFrames();
}

/* ---------- 伙伴之家卡片渲染（整页加载 / 软导航共用） ----------
   背景：渲染逻辑原本写在 pets.html 页尾内联 script，只有整页加载才执行；
   软导航只替换 #view，不重跑内联脚本 → 从首页点「伙伴之家」进来是空 grid（必须刷新）。
   故搬到这里，由 SITE.route() 统一调度（见 SITE.pages.pets）。 */
const PetsView = {
  data: null,

  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  },
  // 渠道来源透传（?from=xx），每次动态读 location，软导航换页后也准
  from() { try { return new URLSearchParams(location.search).get('from') || ''; } catch (e) { return ''; } },
  withFrom(url) {
    const f = this.from();
    if (!url || !f) return url;
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'from=' + encodeURIComponent(f);
  },
  action(url, label, cls, soonKey, soonFb) {
    const text = url ? this.esc(window.pick(label)) : this.esc(window.I18N.t(soonKey, soonFb));
    if (url) return '<a class="btn ' + cls + '" href="' + this.esc(this.withFrom(url)) + '" target="_blank" rel="noopener">' + text + '</a>';
    return '<span class="btn ' + cls + '" style="opacity:.5;pointer-events:none">' + text + '</span>';
  },
  card(p) {
    const online = p.status === 'online';
    const cover = p.cover
      ? '<img src="' + this.esc(p.cover) + '" alt="' + this.esc(window.pick(p.title)) + '" loading="lazy" draggable="false">'
      : '<span class="pet-emoji">' + this.esc(p.emoji || '🐾') + '</span>';
    const badge = online
      ? '<span class="pet-badge">' + this.esc(window.I18N.t('pets.badgeOnline', '已上线')) + '</span>'
      : '<span class="pet-badge soon">' + this.esc(window.I18N.t('pets.badgeSoon', '织制中')) + '</span>';
    const detail = p.detail
      ? '<a class="btn" href="' + this.esc(this.withFrom(p.detail)) + '">' + this.esc(window.I18N.t('pets.detail', '了解详情')) + '</a>'
      : '';
    let actions;
    if (online) {
      // 渠道未上线时不输出占位（2026-09-07 老曹要求）；有 url 才显示按钮（fallback 文案避免商业用词，2026-09-09）
      const buy = p.buy && p.buy.url
        ? this.action(p.buy.url, (p.buy && p.buy.label) || { zh: '把伙伴领回家', en: 'Bring it home' }, '', '', '')
        : '';
      actions =
        this.action(p.download && p.download.url, (p.download && p.download.label) || { zh: '下载', en: 'Download' }, 'btn-primary', 'pets.soonBtn', '下载即将上线') +
        buy +
        detail;
    } else {
      actions = '<span class="pet-soon-note">' + this.esc(window.I18N.t('pets.soonNote', '织好之后第一时间上线，敬请期待～')) + '</span>';
    }
    return '<article class="pet-card' + (online ? '' : ' is-soon') + '">' +
      '<div class="pet-cover">' + cover + badge + '</div>' +
      '<div class="pet-body">' +
        '<h3 class="pet-name">' + this.esc(window.pick(p.title)) + '</h3>' +
        '<p class="pet-tagline">' + this.esc(window.pick(p.tagline)) + '</p>' +
        '<div class="pet-actions">' + actions + '</div>' +
      '</div></article>';
  },
  renderChans(data) {
    const box = document.getElementById('petsChannels');
    const chans = (data && data.channels) || [];
    if (!chans.length || !data.channelsVisible || !box) return;
    const items = chans.map(c => {
      const name = this.esc(window.pick(c.label));
      return c.url ? '<a href="' + this.esc(this.withFrom(c.url)) + '" target="_blank" rel="noopener">' + name + '</a>' : name;
    }).join(' / ');
    box.innerHTML = window.pick({ zh: '也可在 {list} 搜索 DeskBud', en: 'Also find DeskBud on {list}' }).replace('{list}', items);
    box.hidden = false;
  },

  // 幂等重绘：不在本页（#petsGrid 不存在）时静默跳过，跨页软导航安全
  paint() {
    const grid = document.getElementById('petsGrid');
    if (!grid || !this.data) return;
    // status:'hidden' = 未上线占位（织制中但暂不展示），与 works.json 的 hidden 语义一致
    const pets = (this.data.pets || []).filter(p => p.status !== 'hidden');
    grid.innerHTML = pets.map(p => this.card(p)).join('');
    this.renderChans(this.data);
  },
  apply(data) {
    if (!(data && data.pets && data.pets.length)) return false;
    this.data = data;
    this.paint();
    return true;
  },

  async load() {
    const grid = document.getElementById('petsGrid');
    if (!grid) return;
    // 1. 首屏：整页加载时页面上带内联 catalogData（首屏直出，不依赖网络往返 → 线上首访不空白）
    let hasInlined = false;
    const inlineEl = document.getElementById('catalogData');
    if (inlineEl) {
      try { hasInlined = this.apply(JSON.parse(inlineEl.textContent)); } catch (e) { /* 内联损坏则走 fetch */ }
    }
    // 2. 更新通道：catalog.json 改版后静默覆盖（软导航进本页时内联块不在 DOM，靠这条出内容）
    try {
      const r = await fetch('data/catalog.json?cv=4', { cache: 'no-cache' });
      this.apply(await r.json());
    } catch (e) {
      if (!hasInlined) grid.innerHTML = '<p class="pets-note">加载失败，请刷新重试。</p>';
    }
  }
};
// 语言切换重绘：全局只绑一次（切 N 次语言不叠 N 个监听）
if (!window.__petsLangWired) {
  window.__petsLangWired = true;
  window.addEventListener('lang:change', () => PetsView.paint());
}

/* ---------- 各页面初始化逻辑（集中管理，供首次加载与软导航复用） ---------- */
SITE.pages = {
  // 伙伴之家
  pets: async function () {
    const yr = document.getElementById('yr');
    if (yr) yr.textContent = new Date().getFullYear();
    await PetsView.load();
    window.__rerender = () => PetsView.paint();
  },

  // 伙伴页（2026-09-10 二轮改版，老曹拍板）：①纯图选择墙（idle 动图）②聚合姿态动图小窗+购买入口
  // ③宣传视频大窗（与首页详情窗口同款：win/android/mac 三标签，播完自动轮播）
  buddies: async function () {
    await SITE.load();
    const yr = document.getElementById('yr');
    if (yr) yr.textContent = new Date().getFullYear();
    const works = SITE.onlineWorks();
    if (!works.length) return;
    let cur = 0, animTimer = null, frameIdx = 0, frames = [];

    const wall = document.getElementById('buddyWall');
    const animImg = document.getElementById('buddyAnimImg');
    const nameEl = document.getElementById('buddyName');
    const buyEl = document.getElementById('buddyBuy');
    const videoStage = document.getElementById('buddyVideo');
    const videoTabs = document.getElementById('buddyVideoTabs');

    // 聚合/待机动图素材（tools/material 迁移产物，已拷入 works/*-anim/）；
    // 未登记素材的宠物自动退回 states 帧轮播兜底
    // lite = 方块墙专用轻量待机动图（160px，tools/material/make_lite_anim.py 产出、无水印）
    // 方块屏显只有 50px，吃 240px 原动画纯浪费（279~557KB → 43~93KB 一只）
    const ANIM = {
      panda: { idle: 'works/panda-anim/panda_idle.webp', lite: 'works/panda-lite/idle.webp', all: 'works/panda-anim/panda_all.webp' },
      rabbit: { idle: 'works/rabbit-anim/rabbit_idle.webp', lite: 'works/rabbit-lite/idle.webp', all: 'works/rabbit-anim/rabbit_all.webp' },
      linekit: { idle: 'works/linekit-anim/linekit_idle.webp', lite: 'works/linekit-lite/linekit_idle.webp', all: 'works/linekit-anim/linekit_all.webp' },
    };
    const poseList = w => (w.states && w.states.length ? w.states : [{ src: w.cover || w.thumb, caption: { zh: '待机', en: 'Idle' } }]);

    function stopAnim() { if (animTimer) { clearInterval(animTimer); animTimer = null; } }

    // 姿态小窗：优先聚合动图（img 直接播，循环），无素材退回 states 帧轮播
    function startAnim(w) {
      stopAnim();
      if (!animImg) return;
      const a = ANIM[w.id];
      if (a && a.all) {
        animTimer = null;
        animImg.src = a.all;
        return;
      }
      frames = poseList(w); frameIdx = 0;
      const show = () => {
        const s = frames[frameIdx];
        if (!s) return;
        animImg.src = s.src;
        frameIdx = (frameIdx + 1) % frames.length;
      };
      show();
      animTimer = setInterval(show, 800);
    }

    // 宣传视频大窗：与首页详情窗口同款（PLAT_ORDER 三标签 + ended 自动轮播，无手册同步）
    const PLAT_ORDER = ['win', 'android', 'mac'];
    function renderVideo(w) {
      const byPlat = {};
      (w.versions || []).forEach(v => { byPlat[v.platform] = v; });
      const curPlat = renderVideo._plat && byPlat[renderVideo._plat] ? renderVideo._plat
        : (PLAT_ORDER.find(p => byPlat[p] && byPlat[p].video) || 'win');
      renderVideo._plat = curPlat;
      if (videoTabs) {
        videoTabs.innerHTML = PLAT_ORDER.map(p => {
          const pv = byPlat[p];
          const label = pv ? window.pick(pv.platformLabel) : p.toUpperCase();
          return `<button type="button" class="vtab${p === curPlat ? ' on' : ''}" data-p="${p}">${label}</button>`;
        }).join('');
        videoTabs.querySelectorAll('.vtab').forEach(b => b.addEventListener('click', () => {
          renderVideo._plat = b.dataset.p;
          renderVideo(works[cur]);
        }));
      }
      if (!videoStage) return;
      const v = byPlat[curPlat];
      if (v && v.video) {
        videoStage.innerHTML = `<video src="${v.video}" controls muted loop playsinline preload="metadata"></video>`;
        const el = videoStage.querySelector('video');
        el.addEventListener('ended', () => {
          const withVid = PLAT_ORDER.filter(p => byPlat[p] && byPlat[p].video);
          if (withVid.length <= 1) { el.currentTime = 0; el.play().catch(() => {}); return; }
          renderVideo._plat = withVid[(withVid.indexOf(renderVideo._plat) + 1) % withVid.length];
          renderVideo(works[cur]);
        });
      } else {
        videoStage.innerHTML = `<div class="video-ph"><span class="vplay">▶</span><span>${window.pick({ zh: '视频即将上线', en: 'Video coming soon' })}</span></div>`;
      }
    }

    // 购买入口（2026-09-10 对齐 petpay 付费链路，与 pyside6/kotlin 约定一致）：
    // 有 device_id（URL/localStorage）→ 拼收银台链接；无 → 「先下载桌宠」引导去下载页
    // （2026-09-10 老曹三道防线第一道：没装客户端没有 device_id，订单绑不到设备——必须拦住，不能只提醒）
    // getDeviceId/checkoutUrl 共享实现见 SITE（首页详情区同逻辑）。
    // 2026-09-12 老曹 B 方案：无 device_id 也显示"已选 N 只"反馈，按钮仍引导下载
    function renderBuy(w) {
      if (!buyEl) return;
      buyEl.innerHTML = '';
      const url = SITE.checkoutUrl(pickedIds());
      const n = picked.size;
      // 选中反馈独立于 device_id（B 方案）：选了就显示数量，无设备号时按钮退回下载引导
      const tip = n >= 1 ? `<span class="buy-tip">${window.pick({ zh: `已选 ${n} 只`, en: `${n} selected` })}</span>` : '';
      // 内置宠物（织熊猫/织兔子）：开箱即用，无购买入口；文案引导去下载客户端（2026-09-12 老曹：点击连接到下载）
      if (w.builtin && n === 0) {
        buyEl.innerHTML = `<a class="buy-builtin" href="download.html">🎁 ${window.pick({ zh: '已内置 · 开箱即用，下载客户端使用', en: 'Built-in · ready to use — download the app' })}</a>`;
        return;
      }
      if (url) {
        const label = n > 1
          ? window.pick({ zh: `一起带回家 · ${n} 只`, en: `Take ${n} home together` })
          : window.pick({ zh: '把伙伴领回家', en: 'Bring it home' });
        buyEl.innerHTML = `${tip}<a class="btn" href="${url}" target="_blank" rel="noopener">🏠 ${label}</a>`;
      } else {
        buyEl.innerHTML = `${tip}<a class="btn" href="download.html">🐾 ${window.pick({ zh: '先下载桌宠', en: 'Get DeskBud first' })}</a><span class="buy-hint">${window.pick({ zh: '安装后可在客户端内直接访问', en: 'After install, open this page in the app' })}</span>`;
      }
    }

    /* ---------- 多选（2026-09-11 老曹：伙伴页勾选多只，收银台一次结算） ---------- */
    // 规则：勾选框在方块右上角；勾选 ≥1 只时姿态窗口下的购买按钮直接变「一起带回家 · N 只」
    //（不再用底部浮条——老曹反馈"拉的太远要滑动找"，按钮紧贴姿态窗口最好找）
    // 选择跨页面保持（SITE.getPicked 持久化购物车，伙伴页/首页共用）；已拥有的禁勾
    // sanitizePicked 而非 getPicked：内置宠物的历史残留会被清掉并写回 localStorage（2026-09-12 修"点线咪显示已选 2 只"）
    let picked = SITE.sanitizePicked();
    const owned = new Set();          // 已授权的宠物 id（有 device_id 时查询）
    const pickedIds = () => {
      const ids = picked.size ? [...picked] : [works[cur].id];
      return ids.filter(id => { const w = works.find(x => x.id === id); return w && !w.builtin; });
    };

    // 查询已授权（避免重复购买 + 付款后自动清购物车）；失败静默按"全部可购"处理
    // force=true：从收银台切回本页时重查，拿到新授权 → 已购的自动移出购物车
    async function loadOwned(force) {
      const s = await SITE.fetchOwnedIds(force);
      owned.clear(); s.forEach(id => owned.add(id));
      picked = SITE.prunePicked(s);          // 付款后自动清除已购项
      picked = SITE.sanitizePicked();        // 清掉内置/下线的历史购物车残留（并写回 localStorage）
      paintWall(); renderBuy(works[cur]);
    }
    const onVisible = () => { if (!document.hidden) loadOwned(true); };
    document.addEventListener('visibilitychange', onVisible);
    SITE._cleanups.push(() => document.removeEventListener('visibilitychange', onVisible));

    function paintWall() {
      if (!wall) return;
      // 内置宠物（织熊猫/织兔子）单独一排（2026-09-12 老曹：不与新宠物混排）
      // 内置宠物（开箱即用）不放勾选框——2026-09-12 老曹：方块只有 50px，文字徽标会把图标压住
      // （英文 "Built-in" 更宽，整个方块糊死）；含义改由下方 .wall-break 一行小字承担，方块保持纯图
      const tile = (w, i) => {
        const a = ANIM[w.id];
        const src = (a && (a.lite || a.idle)) || w.thumb || w.cover || (poseList(w)[0] || {}).src || '';
        const isOwned = owned.has(w.id);
        const isPicked = picked.has(w.id);
        const isBuiltin = !!w.builtin;
        const chip = isBuiltin ? '' : `<span class="buddy-check${isPicked ? ' on' : ''}" role="checkbox" aria-checked="${isPicked}" aria-label="${window.pick({ zh: '选中一起购买', en: 'Select to buy together' })}">${isOwned ? window.pick({ zh: '已拥有', en: 'Owned' }) : '✓'}</span>`;
        const tip = isBuiltin ? `${window.pick(w.title)} · ${window.pick({ zh: '已内置，开箱即用', en: 'built-in, ready to use' })}` : window.pick(w.title);
        return `<button type="button" class="buddy-tile${i === cur ? ' on' : ''}${isOwned ? ' owned' : ''}" role="tab" aria-selected="${i === cur}" data-i="${i}" title="${tip}">
          <img src="${src}" alt="${window.pick(w.title)}" draggable="false" loading="lazy">
          ${chip}
        </button>`;
      };
      const main = [], builtin = [];
      works.forEach((w, i) => (w.builtin ? builtin : main).push(tile(w, i)));
      wall.innerHTML = main.join('') + (builtin.length ? `<div class="wall-break">${window.pick({ zh: '内置 · 开箱即用', en: 'Built-in · ready to use' })}</div>` + builtin.join('') : '');
      wall.querySelectorAll('.buddy-tile').forEach(b => {
        const i = +b.dataset.i, wid = works[i].id;
        b.addEventListener('click', () => {
          if (i === cur) return;
          cur = i;
          paintWall(); startAnim(works[cur]); renderVideo(works[cur]); renderBuy(works[cur]);
          if (nameEl) nameEl.textContent = window.pick(works[cur].title);
        });
        // 勾选框（stopPropagation：不触发切换展示）
        const cb = b.querySelector('.buddy-check');
        if (cb) cb.addEventListener('click', (e) => {
          e.stopPropagation();
          if (owned.has(wid) || works[i].builtin) return;   // 已拥有 / 内置不可选
          picked = SITE.togglePicked(wid);            // 持久化（跨页保持）
          paintWall(); renderBuy(works[cur]);
        });
      });
    }

    paintWall();
    if (nameEl) nameEl.textContent = window.pick(works[0].title);
    startAnim(works[0]); renderVideo(works[0]); renderBuy(works[0]);
    loadOwned();
    SITE._cleanups.push(stopAnim); // 软导航离开时停帧轮播兜底
    window.__rerender = () => { picked = SITE.sanitizePicked(); paintWall(); startAnim(works[cur]); renderVideo(works[cur]); renderBuy(works[cur]); if (nameEl) nameEl.textContent = window.pick(works[cur].title); };
  },

  // 首页（2026-09-09 改版）：左选择卡切换 ｜ 右大展示卡姿态轮播 ｜ 下部介绍+下载/购买 ｜ 宣传视频
  home: async function () {
    // 移动设备首选伙伴页（2026-09-10 老曹拍板）：软导航/整页进入首页一律跳转（head 内联脚本已兜整页首载）
    if (SITE.isMobileUA()) { location.replace('buddies.html'); return; }
    await SITE.load();
    document.getElementById('yr').textContent = new Date().getFullYear();
    const works = SITE.onlineWorks();
    if (!works.length) return;
    let cur = 0, curPose = 0, timer = null;

    const $ = id => document.getElementById(id);
const picker = $('petPicker'), badge = $('showcaseBadge'), track = $('showcaseTrack'), card = $('showcaseCard'),
          heroKickerText = $('heroKickerText'), heroBig = $('heroBig'), heroLead = $('heroLead'),
          pickerTitle = $('pickerTitle'),
          hdBadge = $('hdBadge'),
          hdTitle = $('hdTitle'), hdSummary = $('hdSummary'), hdDesc = $('hdDesc'),
          hdGetLabel = $('hdGetLabel'),
          hdBuy = $('hdBuy'),
          vdBadge = $('vdBadge'), vdStage = $('vdStage'), vdTabs = $('vdTabs'),
          posesBadge = $('posesBadge'), posesTitle = $('posesTitle'),
          posesGrid = $('posesGrid');
    // 视频轮播：固定顺序 Windows → Android → macOS（老曹拍板），三标签常驻可切换；
    // 手册卡与视频窗口平台双向同步（点任一侧标签，另一侧跟着切）
    const PLAT_ORDER = ['win', 'android', 'mac'];
    let curPlat = 'win', lastPetId = null;

    const poses = w => (w.states && w.states.length ? w.states : [{ src: w.cover || w.thumb, caption: { zh: '待机', en: 'Idle' } }]);
    const poseName = s => window.pick(s.caption || { zh: '', en: '' }) || '';
    // 走马灯走【轻量动画套】works/<pet>-lite/（2026-09-12 老曹 A 方案）：
    // 原动画 240~384px、单张 280~700KB → 首页 25s 下载 5.6MB（比视频还大）；轻量套 160px+抽帧 ≈ 原 1/5
    const liteSrc = (w, src) => 'works/' + w.id + '-lite/' + String(src).split('/').pop();

    function paintHero() {
      if (heroKickerText) heroKickerText.textContent = window.pick({ zh: '桌面伙伴 · 与你同欢', en: 'DESK BUDDIES · JOY TOGETHER' });
      if (heroBig) heroBig.innerHTML = window.pick({
        zh: '方寸屏间有伙伴，漫游窗口<span class="hl">觅清欢</span>。时而攀沿窗栏看，消解心头百般烦。',
        en: 'A tiny pal on your screen, <span class="hl">roaming windows with you</span> — melting the day\'s worries away.'
      });
      // lead 走 innerHTML 才能保留 <span class="hl"> 强调「时光」（老曹 2026-09-09 拍板）
      if (heroLead) heroLead.innerHTML = window.pick({
        zh: '屏幕角落趴着一只专属小宠物，安静陪你度过每一段<span class="hl">时光</span>。',
        en: 'A little pet rests in the corner of your screen, quietly keeping you company through every <span class="hl">moment</span>.'
      });
      if (pickerTitle) pickerTitle.textContent = window.pick({ zh: '选择伙伴', en: 'Choose a buddy' });
      if (hdGetLabel) hdGetLabel.textContent = window.pick({ zh: '把伙伴领回家', en: 'Bring it home' });
    }

    // 多选（2026-09-11 老曹：首页同样支持一起选购 + 选择跨页保持）：卡片右上角勾选框；勾选 ≥1 → 购买按钮变「一起带回家 · N 只」
    let picked = SITE.sanitizePicked();     // 与伙伴页共享同一份持久购物车（sanitize：清内置残留并写回）
    const owned = new Set();
    const pickedIds = () => {
      const ids = picked.size ? [...picked] : [works[cur].id];
      return ids.filter(id => { const w = works.find(x => x.id === id); return w && !w.builtin; });
    };
    async function loadOwned(force) {
      const s = await SITE.fetchOwnedIds(force);
      owned.clear(); s.forEach(id => owned.add(id));
      picked = SITE.prunePicked(s);          // 付款后自动清除已购项
      picked = SITE.sanitizePicked();        // 清掉内置/下线的历史购物车残留（并写回 localStorage）
      paintPicker(); paintDetail();
    }
    const onVisible = () => { if (!document.hidden) loadOwned(true); };
    document.addEventListener('visibilitychange', onVisible);
    SITE._cleanups.push(() => document.removeEventListener('visibilitychange', onVisible));

    function paintPicker() {
      if (!picker) return;
      // 内置宠物（织熊猫/织兔子）单独一排（2026-09-12 老曹：不与新宠物混排）；同样不放勾选框，
      // 含义交给 .picker-break 行标（勾选框压住卡片右上角文字，英文 "Built-in" 尤其挤）
      const card = (w, i) => {
        const isOwned = owned.has(w.id), isPicked = picked.has(w.id);
        const isBuiltin = !!w.builtin;
        const chip = isBuiltin ? '' : `<span class="buddy-check${isPicked ? ' on' : ''}" role="checkbox" aria-checked="${isPicked}" aria-label="${window.pick({ zh: '选中一起购买', en: 'Select to buy together' })}">${isOwned ? window.pick({ zh: '已拥有', en: 'Owned' }) : '✓'}</span>`;
        return `
        <button type="button" class="pick-card${i === cur ? ' active' : ''}${isOwned ? ' owned' : ''}" data-i="${i}">
          <img class="pick-thumb" src="${w.thumb ? liteSrc(w, w.thumb) : (w.cover || '')}" alt="" draggable="false">
          <span class="pick-txt"><b>${window.pick(w.title)}</b><small>${window.pick(w.summary)}</small></span>
          <span class="pick-arrow">›</span>
          ${chip}
        </button>`;
      };
      const main = [], builtin = [];
      works.forEach((w, i) => (w.builtin ? builtin : main).push(card(w, i)));
      picker.innerHTML = main.join('') + (builtin.length ? `<div class="picker-break">${window.pick({ zh: '内置 · 开箱即用', en: 'Built-in · ready to use' })}</div>` + builtin.join('') : '');
      picker.querySelectorAll('.pick-card').forEach(btn => {
        const i = +btn.dataset.i, wid = works[i].id;
        btn.addEventListener('click', () => {
          if (i === cur) return;
          cur = i; curPose = 0;
          paintPicker(); paintDots(); paintShowcase(); paintDetail(); paintPoses(); restart();
        });
        const cb = btn.querySelector('.buddy-check');
        if (cb) cb.addEventListener('click', (e) => {
          e.stopPropagation();
          if (owned.has(wid) || works[i].builtin) return;   // 已拥有 / 内置不可选
          picked = SITE.togglePicked(wid);   // 持久化（跨页保持）
          paintPicker(); paintDetail();
        });
      });
    }

    function paintDots() {
      // 首页展示卡改为横滚走马灯（CSS 动画驱动），圆点导航已废止（HTML 已删 #showcaseDots）；
      // 保留函数位以避免调用方报错，实际 no-op。
      return;
    }

    function paintShowcase() {
      if (!track || !badge) return;
      const w = works[cur], list = poses(w);
      const items = list.map(s => `<figure class="spose-item"><div class="spose-guard" oncontextmenu="return false"></div><img src="${liteSrc(w, s.src)}" alt="${poseName(s) || window.pick(w.title)}" draggable="false" loading="lazy" style="-webkit-user-drag:none;user-select:none;pointer-events:none;"></figure>`).join('');
      // 复制一份做无缝循环
      track.innerHTML = items + items;
      // 徽标显示第一帧（走马灯自身循环播放，无需人为切换）
      const first = list[curPose] || list[0];
      badge.textContent = `${window.pick(w.title)} · ${poseName(first) || ''}`;
    }

    // 视频轮播渲染：当前平台有视频→静音自动播放，播完按 win→android→mac 顺序切下一个；无视频→占位卡
    // （ended 自动轮播只切视频，不打扰手册阅读；手动点标签才双向同步）
    function renderVideo(w) {
      const byPlat = {};
      (w.versions || []).forEach(v => { byPlat[v.platform] = v; });
      const v = byPlat[curPlat];
      if (vdBadge) vdBadge.textContent = v ? window.pick(v.platformLabel) : curPlat.toUpperCase();
      if (vdTabs) {
        vdTabs.innerHTML = PLAT_ORDER.map(p => {
          const pv = byPlat[p];
          const label = pv ? window.pick(pv.platformLabel) : p.toUpperCase();
          return `<button type="button" class="vtab${p === curPlat ? ' on' : ''}" data-p="${p}">${label}</button>`;
        }).join('');
        vdTabs.querySelectorAll('.vtab').forEach(b => b.addEventListener('click', () => {
          if (b.dataset.p === curPlat) return;
          curPlat = b.dataset.p;
          renderVideo(works[cur]);
        }));
      }
      if (!vdStage) return;
      if (v && v.video) {
        vdStage.innerHTML = `<video src="${v.video}" autoplay muted loop playsinline preload="metadata"></video>`;
        const el = vdStage.querySelector('video');
        el.addEventListener('ended', () => {
          const withVid = PLAT_ORDER.filter(p => byPlat[p] && byPlat[p].video);
          if (withVid.length <= 1) { el.currentTime = 0; el.play().catch(() => {}); return; }
          curPlat = withVid[(withVid.indexOf(curPlat) + 1) % withVid.length];
          renderVideo(w);
        });
      } else {
        vdStage.innerHTML = `<div class="video-ph"><span class="vplay">▶</span><span>${window.pick({ zh: '视频即将上线', en: 'Video coming soon' })}</span></div>`;
      }
    }

    // 姿态速览宫格（2026-09-12 老曹）：展示当前伙伴的"全部姿态"，用轻量静态缩略图
    // （数据源 works.json 的 poses；图片为 make_pose_thumbs.py 从动画首帧抽取的 200px 静态 webp）
    function paintPoses() {
      if (!posesGrid) return;
      const w = works[cur];
      const list = (w.poses && w.poses.length) ? w.poses : [];
      if (posesBadge) posesBadge.textContent = window.pick({ zh: '姿态速览', en: 'Poses' });
      if (posesTitle) posesTitle.textContent = window.pick(w.title) + ' · ' + window.pick({ zh: '全部姿态', en: 'all poses' });
      // 「共 N 个姿态」计数行已删（2026-09-12 老曹：宫格自己会说话，不用报数）
      posesGrid.innerHTML = list.map(p =>
        `<figure class="pose-card"><div class="pose-img"><img src="${p.src}" alt="${window.pick(p.name)}" loading="lazy" draggable="false"></div></figure>`).join('');
    }

    function paintDetail() {
      const w = works[cur];
      if (lastPetId !== w.id) { curPlat = 'win'; lastPetId = w.id; }
      if (hdBadge) hdBadge.textContent = window.pick({ zh: '伙伴档案', en: 'Profile' });
      if (hdTitle) hdTitle.textContent = window.pick(w.title);
      if (hdSummary) hdSummary.textContent = window.pick(w.summary);
      if (hdDesc) hdDesc.textContent = window.pick(w.description) || '';
      if (hdBuy) {
        hdBuy.innerHTML = '';
        // 2026-09-10 对齐 petpay 付费链路（与伙伴页一致）：有 device_id → 收银台链接；
        // 无 → 「请在客户端内购买」（设备绑定授权模型，网页裸访客不直接售卖）
        SITE.loadCatalog().then(cat => {
          const chans = (cat.channelsVisible ? (cat.channels || []) : []).filter(c => c && c.label);
          const items = chans.map(c => {
            const name = window.pick(c.label);
            return c.url ? `<a href="${c.url}" target="_blank" rel="noopener">${name}</a>` : name;
          }).join(' / ');
          const payUrl = SITE.checkoutUrl(pickedIds());
          const n = picked.size;
          // 2026-09-12 老曹 B 方案：选中反馈独立于 device_id（选了就显示数量），无设备号按钮退回下载引导
          const tip = n >= 1 ? `<span class="buy-tip">${window.pick({ zh: `已选 ${n} 只`, en: `${n} selected` })}</span>` : '';
          // 内置宠物（织熊猫/织兔子）：开箱即用，无购买入口；文案引导去下载客户端（2026-09-12 老曹：点击连接到下载）
          const isBuiltin = !!w.builtin;
          if (isBuiltin && n === 0) {
            hdBuy.innerHTML = `<div class="buy-row"><a class="buy-builtin" href="download.html">🎁 ${window.pick({ zh: '已内置 · 开箱即用，下载客户端使用', en: 'Built-in · ready to use — download the app' })}</a></div>`;
            renderVideo(w); return;
          }
          let main = '';
          if (payUrl) {
            const label = n > 1
              ? window.pick({ zh: `一起带回家 · ${n} 只`, en: `Take ${n} home together` })
              : window.pick({ zh: '把伙伴领回家', en: 'Bring it home' });
            main = `${tip}<a class="btn btn-primary" href="${payUrl}" target="_blank" rel="noopener">🏠 ${label}</a>`;
          } else {
            main = `${tip}<a class="btn btn-primary" href="download.html">🐾 ${window.pick({ zh: '先下载桌宠', en: 'Get DeskBud first' })}</a><span class="buy-hint">${window.pick({ zh: '安装后可在客户端内直接访问', en: 'After install, open this page in the app' })}</span>`;
          }
          const tail = items ? window.pick({ zh: `也可在 ${items} 搜索 DeskBud`, en: `Also find DeskBud on ${items}` }) : '';
          if (!main && !tail) { hdBuy.innerHTML = ''; return; }
          hdBuy.innerHTML = `<div class="buy-row">${main}${tail ? `<span class="buy-chans">${tail}</span>` : ''}</div>`;
        }).catch(() => {});
      }
      renderVideo(w);
    }

    function restart() {
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        const list = poses(works[cur]);
        curPose = (curPose + 1) % list.length;
        paintShowcase();
      }, 3200);
    }

    paintHero(); paintPicker(); paintDots(); paintShowcase(); paintDetail(); paintPoses(); restart();
    // 悬停大卡暂停轮播，移开恢复
    if (card) {
      card.addEventListener('mouseenter', () => { if (timer) { clearInterval(timer); timer = null; } });
      card.addEventListener('mouseleave', restart);
    }
    // 软导航离开首页时停掉轮播定时器
    SITE._cleanups.push(() => { if (timer) { clearInterval(timer); timer = null; } });
    window.__rerender = () => { picked = SITE.sanitizePicked(); paintHero(); paintPicker(); paintDots(); paintShowcase(); paintDetail(); paintPoses(); };
    loadOwned();   // 已授权标记（避免重复购买）
    initOpenKounter();
  },

  // 作品列表
  list: async function () {
    const d = await SITE.load();
    if (window.BUBBLE) await BUBBLE.load();
    document.getElementById('yr').textContent = new Date().getFullYear();
    const params = new URLSearchParams(location.search);
    let curCat = params.get('cat') || 'all';
    let curSort = params.get('sort') || 'latest';
    const filters = document.getElementById('filters');
    const grid = document.getElementById('grid');
    const emptyEl = document.getElementById('empty');
    const countTip = document.getElementById('countTip');
    const sortEl = document.getElementById('sort');

    function onlineCountFor(catId) {
      const ids = SITE.expandCatIds(catId);
      return SITE.onlineWorks().filter(w => !ids || ids.includes(w.category)).length;
    }
    function renderFilters() {
      const parts = [`<button class="chip" data-cat="all">${SITE.catIcon('all')} ${window.pick({ zh: '全部', en: 'All' })}</button>`];
      // 分类栏只显示「有在线作品」的分类；无作品的（植物/人类/机器人、空的猫/狗）一律不渲染
      d.categories.filter(c => c.id !== 'all').forEach(c => {
        const topN = onlineCountFor(c.id);
        if (topN === 0) return;
        parts.push(`<button class="chip${c.id === curCat ? ' active' : ''}" data-cat="${c.id}">${SITE.catIcon(c.id)} ${SITE.catName(c.id)}</button>`);
        if (c.children) c.children.forEach(ch => {
          const n = onlineCountFor(ch.id);
          if (n === 0) return;
          parts.push(`<button class="chip sub${ch.id === curCat ? ' active' : ''}" data-cat="${ch.id}">${SITE.catIcon(ch.id)} ${SITE.catName(ch.id)}</button>`);
        });
      });
      filters.innerHTML = parts.join('');
      filters.querySelectorAll('.chip').forEach(btn => {
        btn.addEventListener('click', () => { curCat = btn.dataset.cat; renderFilters(); render(); });
      });
    }
    function render() {
      SITE.runCleanups();
      let list = SITE.onlineWorks().slice();
      const ids = SITE.expandCatIds(curCat);
      if (ids) list = list.filter(w => ids.includes(w.category));
      list = SITE.sortWorks(list, curSort);
      countTip.textContent = `${list.length} ${window.pick({ zh: '个作品', en: 'works' })}`;
      grid.innerHTML = list.map(SITE.cardHTML).join('');
      emptyEl.style.display = list.length ? 'none' : 'block';
      if (window.BUBBLE) document.querySelectorAll('.card-bubbles').forEach(el => {
        SITE._cleanups.push(BUBBLE.renderKeep(el, el.dataset.pet, { minDur: 16000, maxDur: 24000 }));
      });
    }
    sortEl.value = curSort;
    sortEl.addEventListener('change', () => { curSort = sortEl.value; render(); });
    renderFilters();
    render();
    window.__rerender = () => { renderFilters(); render(); };
    initOpenKounter();
  },

  // 详情页
  detail: async function (params) {
    const d = await SITE.load();
    document.getElementById('yr').textContent = new Date().getFullYear();
    const id = params.get('id');
    function renderDetail(data, wid) {
      const w = data.works.find(x => x.id === wid);
      const el = document.getElementById('detail');
      if (!w) { el.innerHTML = '<div class="empty">' + window.pick({ zh: '未找到该作品', en: 'Work not found' }) + '</div>'; return; }
      if (w.status === 'hidden') { el.innerHTML = '<div class="empty">' + window.pick({ zh: '该作品暂未上线', en: 'This work is not available yet' }) + '</div>'; return; }
      document.title = window.pick(w.title) + ' · DeskBud';
      const icon = SITE.catIcon(w.category);
      const catName = SITE.catName(w.category);
      const onePose = (w.states || []).map(s => `
        <figure class="pose-item">
          <div class="pose-guard" oncontextmenu="return false"></div>
          <img src="${s.src}" alt="" draggable="false" loading="lazy" style="-webkit-user-drag:none;user-select:none;pointer-events:none;">
        </figure>`).join('');
      const states = onePose + onePose; // 复制一份，保证 -50% 平移无缝循环
      const vers = (w.versions || []).map(v => {
        const hasVideo = !!v.video;
        const hasUrl = !!(v.download && v.download.url);
        const cls = 'ver-card' + (v.platform === 'android' ? ' v-android' : '') + (hasUrl ? '' : ' is-soon');
        const videoHTML = `
          <div class="ver-video ${hasVideo ? '' : 'no-video'}">
            ${hasVideo ? `<video src="${v.video}" autoplay muted loop playsinline preload="metadata" onerror="this.style.display='none';this.parentNode.classList.add('no-video')"></video>` : ''}
            <div class="ver-ph"><span class="vplay">▶</span><span class="vhint">${window.pick({ zh: '演示视频即将上线', en: 'Demo video coming soon' })}</span></div>
          </div>`;
        const actionHTML = hasUrl
          ? `<div class="ver-actions"><a class="btn btn-primary" href="${v.download.url}" target="_blank" rel="noopener">⬇ ${window.pick(v.download.label)}</a></div>`
          : `<div class="ver-actions"><span class="ver-soon">${window.pick({ zh: '下载即将上线', en: 'Download coming soon' })}</span></div>`;
        return `
          <div class="${cls}">
            <div class="ver-head">
              <span class="ver-badge">${window.pick(v.platformLabel)}</span>
              ${hasUrl ? '' : `<span class="ver-soon-tag">${window.pick({ zh: '敬请期待', en: 'Soon' })}</span>`}
            </div>
            ${videoHTML}
            <div class="ver-install">${window.pick(v.install)}</div>
            ${actionHTML}
          </div>`;
      }).join('');
      el.innerHTML = `
        <h1 class="detail-title">${window.pick(w.title)}</h1>
        <p class="detail-tagline">${window.pick(w.summary)}</p>
        <div class="detail-chips"><span class="detail-chip">${icon} ${catName}</span></div>
        <div class="block-label">${window.pick({ zh: '动作姿态', en: 'Poses & Moods' })}<span class="hint">${window.pick({ zh: '桌宠的每一种状态 · 悬停可暂停', en: 'Every state · hover to pause' })}</span></div>
        <div class="pose-marquee" oncontextmenu="return false"><div class="pose-track">${states}</div></div>
        <div class="block-label">${window.pick({ zh: '各平台版本', en: 'Available Platforms' })}<span class="hint">${window.pick({ zh: '动作一样，下载与安装不同', en: 'Same pet, different install' })}</span></div>
        <div class="ver-grid">${vers}</div>`;
      // 购买角色包区（数据来自 catalog.json，按作品 id 匹配宠物；渠道兜底行 = 全站 channels）
      const buyHost = document.createElement('div');
      buyHost.className = 'buy-block';
      el.appendChild(buyHost);
      SITE.loadCatalog().then(cat => {
        const chans = (cat.channelsVisible ? (cat.channels || []) : []).filter(c => c && c.label);
        const items = chans.map(c => {
          const name = window.pick(c.label);
          return c.url ? `<a href="${c.url}" target="_blank" rel="noopener">${name}</a>` : name;
        }).join(' / ');
        // 2026-09-10 对齐 petpay 付费链路（与首页/伙伴页一致）：有 device_id → 收银台链接；
        // 无 → 「请在客户端内购买」（设备绑定授权模型）
        // 2026-09-12 补：内置宠物（织熊猫/织兔子）开箱即用、免费 → 绝不能挂收银台（原来漏了这条，
        // 详情页还在给免费内置宠物卖单），改引导去下载客户端，与伙伴页/首页文案一致
        const payUrl = SITE.checkoutUrl(id);
        const isBi = !!w.builtin;
        let main = '';
        if (isBi) {
          main = `<a class="buy-builtin" href="download.html">🎁 ${window.pick({ zh: '已内置 · 开箱即用，下载客户端使用', en: 'Built-in · ready to use — download the app' })}</a>`;
        } else if (payUrl) {
          main = `<a class="btn btn-primary" href="${payUrl}" target="_blank" rel="noopener">🏠 ${window.pick({ zh: '把伙伴领回家', en: 'Bring it home' })}</a>`;
        } else {
          main = `<a class="btn btn-primary" href="download.html">🐾 ${window.pick({ zh: '先下载桌宠', en: 'Get DeskBud first' })}</a>`;
        }
        const tail = items
          ? window.pick({ zh: `也可在 ${items} 搜索 DeskBud`, en: `Also find DeskBud on ${items}` })
          : '';
        const headLabel = isBi ? window.pick({ zh: '开箱即用', en: 'Ready out of the box' }) : window.pick({ zh: '把伙伴领回家', en: 'Bring it home' });
        const headHint = isBi ? window.pick({ zh: '内置免费，下载客户端即可使用', en: 'Free & built in — just download the app' }) : window.pick({ zh: '解锁更多动作、表情与皮肤', en: 'Unlock more actions, moods & skins' });
        if (!main && !tail) { buyHost.remove(); return; }
        buyHost.innerHTML = `
          <div class="block-label">${headLabel}<span class="hint">${headHint}</span></div>
          <div class="buy-row">${main}${tail ? `<span class="buy-chans">${tail}</span>` : ''}</div>`;
      }).catch(() => { buyHost.remove(); });
      initOpenKounter();
    }
    renderDetail(d, id);
    window.__rerender = () => renderDetail(SITE.data, id);
  },

  usage: function () {
    document.getElementById('yr').textContent = new Date().getFullYear();
    initManualTabs();
    syncManualLang();
    initManualFrames();
    window.__rerender = () => { syncManualLang(); initManualFrames(); };
  },
  privacy: function () {},

  // 下载页（2026-09-10）：Windows/Android/macOS 三平台，付费鉴权后浏览器下载安装包。
  // 流程：有 device_id（客户端 WebView 带入或 localStorage 恢复）→ 轮询 petpay entitlement →
  // 已授权 → 显示对应平台安装包下载按钮；未授权 → 「购买解锁」跳收银台（付款后回本页自动变下载）。
  // 无 device_id（纯浏览器访客）→ 提示在客户端内打开本页。
  // ⚠️ APP_DOWNLOADS 为安装包直链占位：petpay COS 上传安装包后按此路径生效（files/ 目录）。
  // 下载页（2026-09-11 15:15 按协同板 #0/#7 二次改造）：
  // 链接策略 = **version-download.json 优先 → 内置 gitee release 常量兜底**（不写死单一来源）。
  // 背景：petpay #0 命名更正——安装包以 gitee release 的**带版本号**文件为准；
  //       #7 version-download.json 由 pyside6 建（win/mac/android 各一段 {version,url}），website 负责本页对接。
  // 实测（15:12，已更新 20:05）：COS files/ 的 Win/Mac 已 404、Android 403（私有）；gitee release 现可用——
  //   桌面端（win+mac 同一 release tag `v0.1.24`）、安卓独立 tag `android-v0.1.7`。兜底常量须与 manifest 的 tag 对齐（曾误写成 win-v0.1.24/mac-v0.1.24 导致 404）。
  // 因此：能取到 manifest 用 manifest；取不到用常量表；两者都没文件时给「正在准备中」提示，避免用户撞裸 404。
  download: async function () {
    const yr = document.getElementById('yr');
    if (yr) yr.textContent = new Date().getFullYear();
    const grid = document.getElementById('dlGrid');
    if (!grid) return;

    const GITEE = 'https://gitee.com/deskbud/version';
    const MANIFEST = GITEE + '/raw/master/version-download.json';
    // 兜底常量（随发版更新；manifest 上线后会自动覆盖）
    const FALLBACK = {
      win: GITEE + '/releases/download/v0.1.24/DeskBud_Win_v0124.exe',
      mac: GITEE + '/releases/download/v0.1.24/DeskBud_Mac_v0124.dmg',
      android: GITEE + '/releases/download/android-v0.1.7/DeskBud_Android_v017.apk',
    };
    const LINKS = Object.assign({}, FALLBACK);
    const VER = {};
    const PLATS = [
      { id: 'win', icon: '🖥️', label: () => window.pick({ zh: 'Windows 版', en: 'Windows' }), desc: () => window.pick({ zh: '绿色单文件 · Win10 及以上', en: 'Single file · Windows 10+' }) },
      { id: 'android', icon: '🤖', label: () => window.pick({ zh: 'Android 版', en: 'Android' }), desc: () => window.pick({ zh: 'APK · Android 8.0 及以上', en: 'APK · Android 8.0+' }) },
      { id: 'mac', icon: '🍎', label: () => window.pick({ zh: 'macOS 版', en: 'macOS' }), desc: () => window.pick({ zh: 'DMG · 支持 Apple 芯片', en: 'DMG · Apple Silicon' }) },
    ];

    function render() {
      grid.innerHTML = PLATS.map(pl => `<div class="dl-card">
          <div class="dl-icon">${pl.icon}</div>
          <b class="dl-name">${pl.label()}</b>
          <span class="dl-desc">${pl.desc()}${VER[pl.id] ? ' · v' + String(VER[pl.id]).replace(/^v/i, '') : ''}</span>
          <div class="dl-action"><a class="btn" href="${LINKS[pl.id]}" rel="noopener">⬇ ${window.pick({ zh: '免费下载', en: 'Download free' })}</a></div>
        </div>`).join('');
    }

    // 先按兜底常量渲染（秒开），再尝试 manifest 覆盖
    render();
    try {
      const r = await fetch(MANIFEST, { cache: 'no-cache' });
      if (r.ok) {
        const d = await r.json();
        ['win', 'mac', 'android'].forEach(p => {
          if (d && d[p] && d[p].url) { LINKS[p] = d[p].url; if (d[p].version) VER[p] = d[p].version; }
        });
        render();
      }
    } catch (e) { /* manifest 未就绪 → 用兜底常量 */ }

    const tip = document.getElementById('dlTip');
    if (tip) tip.textContent = window.pick({
      zh: '下载遇到 404 或文件未就绪？说明该平台安装包正在发布中，可稍后重试或邮件 deskbud@qq.com。',
      en: 'Got a 404 or file not ready? That platform build is still publishing — retry later or email deskbud@qq.com.',
    });

    // 用户手册（复用首页手册卡：win/android/mac 标签 + iframe 语言联动 + 自适应高度）
    // ⚠️ 2026-09-11：本段曾因重写下载页被整段覆盖丢失——**以后再重写本函数务必核对这段**（verify_download_v4 会兜）
    const hmTabs = document.getElementById('dlHmTabs');
    const hmFrame = document.getElementById('dlHmFrame');
    let curHmPlat = 'win';
    function paintManual() {
      if (hmTabs) {
        const names = { win: 'Windows', android: 'Android', mac: 'macOS' };
        hmTabs.innerHTML = ['win', 'android', 'mac'].map(p =>
          '<button type="button" class="vtab' + (p === curHmPlat ? ' on' : '') + '" data-p="' + p + '">' + names[p] + '</button>').join('');
        hmTabs.querySelectorAll('.vtab').forEach(btn => btn.addEventListener('click', () => { curHmPlat = btn.dataset.p; paintManual(); }));
      }
      if (hmFrame) {
        const lang = (window.__lang === 'en') ? 'en' : 'zh';
        const src = 'manual/' + curHmPlat + '-' + lang + '.html';
        if (hmFrame.getAttribute('src') !== src) hmFrame.setAttribute('src', src);
      }
    }
    paintManual();
    if (typeof initManualFrames === 'function') initManualFrames();  // 自适应高度（幂等）

    window.__rerender = () => { render(); paintManual(); };   // 语言切换时重绘
  },

  contact: function () {
    document.getElementById('yr').textContent = new Date().getFullYear();
    window.copyText = function (btn, text) {
      const label = () => (window.I18N && window.I18N.t) ? window.I18N.t('contact.copied', '已复制 ✓') : '已复制 ✓';
      const ok = () => { const old = btn.textContent; btn.textContent = label(); btn.disabled = true; setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 1400); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok).catch(() => prompt('复制：', text));
      else prompt('复制：', text);
    };
  }
};

/* ---------- 路由：按当前 location 调度页面初始化 ---------- */
function setActiveNav(path) {
  const cur = (path === '' || path === 'index.html') ? 'index.html' : path;
  document.querySelectorAll('.nav a').forEach(a => {
    const href = (a.getAttribute('href') || '').split('/').pop();
    const match = href === cur || (cur === 'index.html' && href === '');
    a.classList.toggle('active', match);
    if (match) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}
// 详情页场景背景：按作品 id 分流（兔子 → 田野，其余 → 竹子），非详情页不铺背景。
// 场景表：以后新增作品想换背景，在这里加一行即可（需配套 CSS 背景层 + assets/img/*.svg）。
const SCENE_BG = {
  rabbit: 'field-bg'
};
const DEFAULT_SCENE_BG = 'bamboo-bg';

function setSceneBg(path, workId) {
  const want = (path === 'detail.html')
    ? (SCENE_BG[workId] || DEFAULT_SCENE_BG)
    : '';
  // 清掉所有场景层，再按需建一个新的（软导航换作品时也会正确切换）
  document.querySelectorAll('.bamboo-bg, .field-bg').forEach(el => {
    if (!want || !el.classList.contains(want)) el.remove();
  });
  if (want && !document.querySelector('.' + want)) {
    const b = document.createElement('div');
    b.className = want;
    b.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(b, document.body.firstChild);
  }
}

// 首页判定：'/' 或 /index.html
function isHomePath() {
  const p = location.pathname.split('/').pop();
  return p === '' || p === 'index.html';
}
// 移动设备判定（2026-09-10 老曹拍板）：手机端首选 buddies.html，首页 UA 检测自动跳转
SITE.isMobileUA = function () {
  return /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(navigator.userAgent || '');
};
// 极简页判定（2026-09-09 老曹拍板）：首页 + 许可与隐私页 + 伙伴页（2026-09-10 手机极简页）都隐藏搜索栏/走马灯
function isMinimalPath() {
  const p = location.pathname.split('/').pop();
  return isHomePath() || p === 'privacy.html' || p === 'buddies.html' || p === 'download.html';
}
// 首页极简同步：首页/隐私页隐藏搜索栏 + 移除公告走马灯。
// 这些块都在 #view 之外，软导航换 #view 带不动它们，故每次路由统一增删。
// initAnnounce 幂等（先清再插 / 极简页守卫），重复调用安全。
// 语录已并入顶部宣传语条（2026-09-12 老曹"广告+语录合到一起"），不再有独立语录条。
function syncHomeChrome() {
  const minimal = isMinimalPath();
  const search = document.querySelector('.top-search');
  if (search) search.style.display = minimal ? 'none' : '';
  // 隐私页整页独特色背景（软导航进出同步 body class）
  const isPrivacy = location.pathname.split('/').pop() === 'privacy.html';
  document.body.classList.toggle('privacy-warm', isPrivacy);
  if (minimal) {
    document.querySelectorAll('.announce-bar').forEach(b => b.remove());
  } else if (!document.querySelector('.announce-bar')) {
    initAnnounce();
  }
}

/* ---------- 全站宣传语条（2026-09-11 老曹：放宣传语，含首页/下载等极简页） ----------
   与内容页原有的 announce-bar（作品公告）区分：本条是营销口号，全站统一露出。
   合规：避开"最/第一"等极限词（广告法）；embed 模式不注入（App 内嵌不需要广告位）。 */
const SLOGANS = [
  { zh: '免费无广告 · 一只很良心的桌面宠物', en: 'Free & ad-free — a desktop pet you can trust' },
  { zh: '摸鱼好搭子 · 免费桌面宠物太治愈了', en: 'A tiny desk buddy — free, and oddly healing' },
  { zh: '桌面终于有活物了 · 完全免费、无广告', en: 'Your desktop finally has a living thing — free, no ads' },
  { zh: '打工人的桌面解压小物 · 摸鱼党狂喜', en: 'A desktop stress-reliever for busy days' },
];
// 2026-09-12 老曹："上面只有广告、没有语录，应该合到一起" → 语录并入同一条顶部走马灯（广告+语录混排），
// 独立语录条（.quote-bar）已移除。池 = 4 条广告均匀穿插在语录中（先兜底，随后 fetch bubble.json 公共语录补全）。
const TOP_QUOTES_FALLBACK = [
  { zh: '今天也要开开心心~', en: 'Stay happy today~' },
  { zh: '陪你摸鱼每一刻', en: 'Here with you every moment' },
  { zh: '桌面因你而热闹', en: 'My desktop is livelier with you' },
  { zh: '小小的伙伴，暖暖的陪伴', en: 'A tiny pal, warm company' },
];
// 把 4 条广告均匀铺进语录池（每 stride 条语录插一条广告，尾部补余）
function _mergeTopPool(quotes) {
  const out = [];
  const stride = Math.max(1, Math.round(quotes.length / SLOGANS.length));
  let si = 0;
  quotes.forEach((it, i) => {
    if (i > 0 && i % stride === 0 && si < SLOGANS.length) out.push(SLOGANS[si++]);
    out.push(it);
  });
  while (si < SLOGANS.length) out.push(SLOGANS[si++]);
  return out;
}
let _topPool = _mergeTopPool(TOP_QUOTES_FALLBACK);
let _topQuotesLoaded = false;
function _loadTopQuotes() {
  if (_topQuotesLoaded) return;
  _topQuotesLoaded = true;
  fetch('data/bubble.json', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : null))
    .then(d => {
      const pub = (d && d.public) || [];
      const qs = pub.map(x => (x && typeof x === 'object')
        ? { zh: x.zh || '', en: x.en || '' }
        : { zh: String(x == null ? '' : x), en: String(x == null ? '' : x) })
        .filter(o => o.zh || o.en);
      if (qs.length) _topPool = _mergeTopPool(qs);
    })
    .catch(() => {});
}
let _sloganIdx = 0;
function buildSloganTrack() {
  const bar = document.querySelector('.slogan-bar');
  if (!bar) return;
  let track = bar.querySelector('.slogan-track');
  const N = _topPool.length;
  if (!track) {
    track = document.createElement('div');
    track.className = 'slogan-track';
    bar.appendChild(track);
    for (let i = 0; i < 2; i++) {
      const el = document.createElement('span');
      el.className = 'slogan-item';
      el.dataset.idx = String((_sloganIdx + i) % N);
      // 每跑完一轮换句（此刻元素在屏外 100%，切换不可见＝无跳变）；两槽位各前进 2 条，交替覆盖全池
      el.addEventListener('animationiteration', () => {
        const n = _topPool.length;
        el.dataset.idx = String((+el.dataset.idx + 2) % n);
        el.textContent = window.pick(_topPool[+el.dataset.idx]);
      });
      track.appendChild(el);
    }
  }
  // 语言切换 / 池变更重绘：保留各槽位当前句（进度不打断），仅换语言；越界回绕
  track.querySelectorAll('.slogan-item').forEach((el) => {
    const n = _topPool.length;
    if (+el.dataset.idx >= n) el.dataset.idx = String(+el.dataset.idx % n);
    el.textContent = window.pick(_topPool[+el.dataset.idx]);
  });
}
// ⚠️ 全站单例：**不进 SITE._cleanups**——list 等页的 render() 内部也会调 runCleanups()，
// 注册进 cleanups 会被页面级渲染清掉（2026-09-11 实测踩坑）。幂等 init + 模块级事件。
SITE.initSloganBar = function () {
  const existing = document.querySelector('.slogan-bar');
  if (document.documentElement.classList.contains('embed-mode')) { if (existing) existing.remove(); return; }
  if (!existing) {
    _sloganIdx = Math.floor(Math.random() * SLOGANS.length);   // 随机起步（仅首次；软导航不重置）
    const topbar = document.querySelector('.topbar');
    if (!topbar || !topbar.parentNode) return;
    const bar = document.createElement('div');
    bar.className = 'slogan-bar';
    bar.setAttribute('role', 'note');
    topbar.after(bar);
    // ⚠️ i18n 把 lang:change 派发在 **window** 上（i18n.js line 98 window.dispatchEvent），
    // 监听 document 收不到（window 派发的事件不会反向到达 document）——2026-09-11 实测踩坑
    window.addEventListener('lang:change', buildSloganTrack); // 文案走 pick → 切语言重建轨道
  }
  _loadTopQuotes();   // 合并语录池（首次；异步补全后下一轮 animationiteration 生效）
  buildSloganTrack();
};

SITE.route = async function () {
  SITE.runCleanups();
  const path = location.pathname.split('/').pop();
  const params = new URLSearchParams(location.search);
  setSceneBg(path, params.get('id') || ''); // 兔子→田野，其余→竹子
  setActiveNav(path);
  syncHomeChrome(); // 首页隐藏搜索/走马灯，离开首页补建
  SITE.initSloganBar(); // 全站宣传语条（含极简页；embed 自动跳过）
  const p = SITE.pages;
  let fn;
  if (path === '' || path === 'index.html') fn = p.home;
  else if (path === 'buddies.html') fn = p.buddies;
  else if (path === 'download.html') fn = p.download;
  else if (path === 'pets.html') fn = p.pets;
  else if (path === 'list.html') fn = p.list;
  else if (path === 'detail.html') fn = () => p.detail(params);
  else if (path === 'usage.html') fn = p.usage;
  else if (path === 'privacy.html') fn = p.privacy;
  else if (path === 'contact.html') fn = p.contact;
  if (!fn) return; // 未知内容页（如 editor/bubble）不软导航处理
  try { await fn(); } catch (e) { console.error('[route]', e); }
  if (window.applyI18nStatic) window.applyI18nStatic(); // 新注入 #view 重新套静态翻译
};

/* ---------- 软导航：拦截站内链接，只换 #view，音频常驻不中断 ---------- */
const SOFTNAV_EXCLUDE = new Set(['editor.html', 'bubble.html']); // 后台/泡泡墙保持整页加载
SITE.loadView = async function (url, push) {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const newView = doc.querySelector('#view');
    const newTitle = doc.querySelector('title');
    if (!newView) throw new Error('target has no #view');
    const view = document.querySelector('#view');
    if (!view) throw new Error('current page has no #view');
    view.innerHTML = newView.innerHTML;
    if (newTitle) document.title = newTitle.textContent;
    if (push) history.pushState({ deskbud: 1 }, '', url);
    window.scrollTo(0, 0);
    await SITE.route();
  } catch (e) {
    console.warn('[softNav] 失败，回退整页加载：', e);
    window.location.href = url; // 兜底：目标页异常时整页加载（BGM 会重启，仅兜底场景）
  }
};
SITE.softNav = function (url) { return SITE.loadView(url, true); };

function wireSoftNav() {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href) return;
    if (a.target && a.target !== '_self') return;       // 新窗口打开
    if (a.hasAttribute('download')) return;             // 下载
    if (/^(mailto:|tel:|#)/i.test(href)) return;         // 邮件/电话/锚点
    let target;
    try { target = new URL(href, location.href); } catch { return; }
    if (target.origin !== location.origin) return;       // 外链整页
    const base = target.pathname.split('/').pop();
    if (SOFTNAV_EXCLUDE.has(base)) return;               // 排除页整页
    // 同页（路径+查询相同）：
    //   带锚点 → 交给浏览器（fragment 滚动，不重载页面）
    //   无锚点 → 必须阻止默认！浏览器对同页无锚点链接的默认行为是整页重载
    //   （后果：宠物随机重生=位置"回退"、BGM 重启。2026-09-08 老曹实测踩坑）
    if (target.pathname === location.pathname && target.search === location.search) {
      if (target.hash) return;
      e.preventDefault();
      window.scrollTo(0, 0);
      return;
    }
    e.preventDefault();
    SITE.softNav(target.pathname + target.search + target.hash);
  });
  // 浏览器前进/后退：重新渲染当前 location（不再 pushState）
  window.addEventListener('popstate', () => {
    SITE.loadView(location.pathname + location.search + location.hash, false);
  });
}

/* ---------- 启动：每页 <script>SITE.boot()</script> 触发（仅真首次加载跑一次） ---------- */
function boot() {
  // App 内嵌模式（2026-09-10 kotlin 实测）：?embed=1 隐藏顶栏/BGM/页脚等 chrome，只留内容
  // （App 上方已有「伙伴商店」标题，网页自带顶栏/页脚会重复；class 挂 html 上软导航不丢）
  try { if (new URLSearchParams(location.search).get('embed') === '1') document.documentElement.classList.add('embed-mode'); } catch (e) { /* ignore */ }
  injectChrome();      // 注入常驻 BGM 音频（#view 之外）
  SITE.initBgm();      // 绑定开关 + 跨页续播
  initSearch();        // 搜索框（常驻顶栏，仅一次）
  initAnnounce();      // 公告栏（常驻，仅一次）
  wireSoftNav();       // 链接拦截 + popstate
  // 图片右键菜单拦截：右键落在 <img> 上直接阻止（防「图片另存为」）；落在外层链接（如走马灯封面，pointer-events:none）则由链接接管，不拦
  if (!window.__imgCtxGuard) {
    window.__imgCtxGuard = true;
    document.addEventListener('contextmenu', (e) => {
      let t = e.target;
      while (t && t !== document) { if (t.tagName === 'IMG') { e.preventDefault(); return; } t = t.parentElement; }
    });
  }
  SITE.route();        // 首屏渲染当前页
  SITE.webmeji.init(); // 全站统一：当前页在启用列表时挂载网页宠物
}
SITE.boot = boot;

/* ---------- 全站更新探测（1C 混合）：HEAD 探 index.html 版本，有新版才整页刷新 ----------
   触发：load 记基线 → 切回标签页 / 点击（60s 节流）→ 每 5 分钟轮询兜底（挂机看走马灯场景）。
   HEAD 只拿响应头（ETag / Last-Modified），流量几字节；拿不到版本头则静默跳过，绝不误刷。 */
(function () {
  let known = null;
  let lastTap = 0;
  const check = async () => {
    try {
      const r = await fetch('index.html', { method: 'HEAD', cache: 'no-store' });
      if (!r.ok) return;
      const tag = r.headers.get('ETag') || r.headers.get('Last-Modified');
      if (!tag) return;                              // 托管不发版本头 → 不探测，防误刷
      if (known === null) { known = tag; return; }   // 首次只记基线，不刷
      if (tag !== known) { known = tag; location.reload(); }
    } catch { /* 离线/请求中断：静默 */ }
  };
  window.addEventListener('load', () => {
    check();
    setInterval(check, 5 * 60 * 1000);               // 5 分钟兜底轮询
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();  // 切回标签页即探
    });
    document.addEventListener('click', () => {       // 点击即探，60s 节流防狂发
      const now = Date.now();
      if (now - lastTap < 60000) return;
      lastTap = now;
      check();
    });
  });
})();

// 暴露到全局：便于控制台调试与自动化验证（气泡三层参数、路由等）
window.SITE = SITE;
