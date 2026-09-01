// DeskBud 站点公共逻辑：数据加载、渲染辅助、分类/排序、不蒜子统计
const SITE = {
  data: null,
  _assetVer: 24, // 与 css/js ?v= 同步，图片缓存破除用
  async load() {
    if (this.data) return this.data;
    const res = await fetch('data/works.json', { cache: 'no-cache' });
    this.data = await res.json();
    return this.data;
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
    if (work.thumb) return `<img src="${v(work.thumb)}" alt="${window.pick(work.title)}" loading="lazy">`;
    if (work.cover) return `<img src="${v(work.cover)}" alt="${window.pick(work.title)}" loading="lazy">`;
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

// 公告栏：全站注入到 .topbar 之下、hero 之上，由 data/announcements.json 驱动
// 修复：lang:change 与 DOMContentLoaded 都会触发，故先清再插（幂等），避免重复两条
function initAnnounce() {
  fetch('data/announcements.json', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : []))
    .then(list => {
      const today = new Date().toISOString().slice(0, 10);
      const item = (list || []).find(a =>
        a.enabled !== false &&
        (!a.start || today >= a.start) &&
        (!a.end || today <= a.end)
      );
      // 幂等：移除旧 bar 再插入
      document.querySelectorAll('.announce-bar').forEach(b => b.remove());
      if (!item) return;
      const bar = document.createElement('div');
      bar.className = 'announce-bar' + (item.level === 'new' ? ' is-new' : '');
      const tag = item.level === 'new'
        ? window.pick({ zh: '上新', en: 'New' })
        : window.pick({ zh: '公告', en: 'Notice' });
      const more = window.pick({ zh: '查看详情 →', en: 'View details →' });
      const text = item.link
        ? `${window.pick(item.text)} <a href="${item.link}">${more}</a>`
        : window.pick(item.text);
      bar.innerHTML = `
        <div class="wrap">
          <span class="announce-tag">${tag}</span>
          <span class="announce-text">${text}</span>
        </div>`;
      const topbar = document.querySelector('.topbar');
      if (topbar) topbar.after(bar); // 导航栏之下、hero 之上，不抢最顶
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

/* ---------- 各页面初始化逻辑（集中管理，供首次加载与软导航复用） ---------- */
SITE.pages = {
  // 首页
  home: async function () {
    await SITE.load();
    document.getElementById('yr').textContent = new Date().getFullYear();
    if (window.BUBBLE) await BUBBLE.load();
    const fill = () => {
      const hot = SITE.sortWorks(SITE.onlineWorks(), 'hot').slice(0, 4);
      document.getElementById('hotGrid').innerHTML = hot.map(SITE.cardHTML).join('');
      if (window.BUBBLE) document.querySelectorAll('.card-bubbles').forEach(el => {
        SITE._cleanups.push(BUBBLE.renderKeep(el, el.dataset.pet, { minDur: 16000, maxDur: 24000 }));
      });
    };
    fill();
    window.__rerender = () => { SITE.runCleanups(); fill(); };
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
      const na = window.pick({ zh: '（暂无）', en: ' (soon)' });
      d.categories.filter(c => c.id !== 'all').forEach(c => {
        const topN = onlineCountFor(c.id);
        parts.push(`<button class="chip${c.id === curCat ? ' active' : ''}${topN === 0 ? ' muted' : ''}" data-cat="${c.id}">${SITE.catIcon(c.id)} ${SITE.catName(c.id)}${topN === 0 ? na : ''}</button>`);
        if (c.children) c.children.forEach(ch => {
          const n = onlineCountFor(ch.id);
          parts.push(`<button class="chip sub${ch.id === curCat ? ' active' : ''}${n === 0 ? na : ''}" data-cat="${ch.id}">${SITE.catIcon(ch.id)} ${SITE.catName(ch.id)}${n === 0 ? na : ''}</button>`);
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
      document.title = window.pick(w.title) + ' · DeskBud.xyz';
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
            ${hasVideo ? `<video src="${v.video}" controls preload="metadata" onerror="this.style.display='none';this.parentNode.classList.add('no-video')"></video>` : ''}
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
      initOpenKounter();
    }
    renderDetail(d, id);
    window.__rerender = () => renderDetail(SITE.data, id);
  },

  usage: function () { document.getElementById('yr').textContent = new Date().getFullYear(); },
  privacy: function () {},
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
function toggleBamboo(on) {
  let b = document.querySelector('.bamboo-bg');
  if (on && !b) {
    b = document.createElement('div'); b.className = 'bamboo-bg'; b.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(b, document.body.firstChild);
  } else if (!on && b) {
    b.remove();
  }
}

SITE.route = async function () {
  SITE.runCleanups();
  const path = location.pathname.split('/').pop();
  const params = new URLSearchParams(location.search);
  toggleBamboo(path === 'detail.html');
  setActiveNav(path);
  const p = SITE.pages;
  let fn;
  if (path === '' || path === 'index.html') fn = p.home;
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
    // 同页（路径+查询相同）→ 不软导航，交给浏览器（含锚点滚动）；避免重复历史记录
    if (target.pathname === location.pathname && target.search === location.search) return;
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
  injectChrome();      // 注入常驻 BGM 音频（#view 之外）
  SITE.initBgm();      // 绑定开关 + 跨页续播
  initSearch();        // 搜索框（常驻顶栏，仅一次）
  initAnnounce();      // 公告栏（常驻，仅一次）
  wireSoftNav();       // 链接拦截 + popstate
  SITE.route();        // 首屏渲染当前页
}
SITE.boot = boot;
