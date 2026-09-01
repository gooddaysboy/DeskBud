// DeskBud 站点公共逻辑：数据加载、渲染辅助、分类/排序、不蒜子统计
const SITE = {
  data: null,
  _assetVer: 17, // 与 css/js ?v= 同步，图片缓存破除用
  async load() {
    if (this.data) return this.data;
    const res = await fetch('data/works.json', { cache: 'no-cache' });
    this.data = await res.json();
    return this.data;
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
  // 排序：latest 最新 / downloads 下载量 / hot 热门(下载量+近期加权，这里用 downloads 近似)
  sortWorks(list, mode) {
    const arr = list.slice();
    if (mode === 'downloads') arr.sort((a, b) => b.downloads - a.downloads);
    else if (mode === 'hot') arr.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.downloads - a.downloads);
    else arr.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return arr;
  },
  fmt(n) {
    if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  },
  // 缩略图：优先视频（自动播放），其次图片；缺失时显示占位。
  // src 加 ?v= 版本号防缓存（与 css/js 同步，本次 v8）
  thumbHTML(work) {
    const ver = (this && this._assetVer) || (SITE && SITE._assetVer) || 9;
    const v = (s) => s + (s.includes('?') ? '&' : '?') + 'v=' + ver;
    const vid = (work.media || []).find(m => m.type === 'video');
    if (vid) {
      return `<video src="${v(vid.src)}" autoplay loop muted playsinline preload="metadata"></video>`;
    }
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
        <span>⬇ <b class="stat" id="d-${work.id}">${SITE.fmt(work.downloads)}</b></span>
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
      works = (d && d.works) || [];
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

function boot() { initAnnounce(); initSearch(); }

// 语言切换时：公告重渲染 + 动态内容（卡片/列表/详情）由页面注册的 __rerender 重渲染
window.addEventListener('lang:change', () => {
  initAnnounce();
  if (typeof window.__rerender === 'function') window.__rerender();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
