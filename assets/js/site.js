// DeskBud 站点公共逻辑：数据加载、渲染辅助、分类/排序、不蒜子统计
const SITE = {
  data: null,
  async load() {
    if (this.data) return this.data;
    const res = await fetch('data/works.json', { cache: 'no-cache' });
    this.data = await res.json();
    return this.data;
  },
  catName(id) {
    for (const c of this.data.categories) {
      if (c.id === id) return c.name;
      if (c.children) {
        const ch = c.children.find(x => x.id === id);
        if (ch) return ch.name;
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
    const ver = (this && this._assetVer) || (SITE && SITE._assetVer) || 8;
    const v = (s) => s + (s.includes('?') ? '&' : '?') + 'v=' + ver;
    const vid = (work.media || []).find(m => m.type === 'video');
    if (vid) {
      return `<video src="${v(vid.src)}" autoplay loop muted playsinline preload="metadata"></video>`;
    }
    if (work.thumb) return `<img src="${v(work.thumb)}" alt="${work.title}" loading="lazy">`;
    if (work.cover) return `<img src="${v(work.cover)}" alt="${work.title}" loading="lazy">`;
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
          <h3>${work.title}</h3>
        </div>
      </div>
      <div class="meta">
        <span>${work.author}</span>
        <span>⬇ <b class="stat" id="d-${work.id}">${SITE.fmt(work.downloads)}</b></span>
      </div>
    </a>`;
  }
};

// 不蒜子统计：全站 + 单页访问量。放在 body 末尾或动态注入。
function ensureBusuanzi() {
  if (document.getElementById('busuanzi_container_site_pv')) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
  document.body.appendChild(s);
}
