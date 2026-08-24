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
    const c = this.data.categories.find(c => c.id === id);
    return c ? c.name : id;
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
  // 缩略图：优先图片，缺失时显示占位
  thumbHTML(work) {
    if (work.thumb) return `<img src="${work.thumb}" alt="${work.title}" loading="lazy">`;
    if (work.cover) return `<img src="${work.cover}" alt="${work.title}" loading="lazy">`;
    return '暂无预览';
  },
  cardHTML(work) {
    return `
    <a class="card" href="detail.html?id=${work.id}">
      <div class="thumb">${this.thumbHTML(work)}</div>
      <div class="body">
        <span class="cat">${this.catName(work.category)}</span>
        <h3>${work.title}</h3>
        <p>${work.summary}</p>
        <div class="meta">
          <span>👤 ${work.author}</span>
          <span>⬇ <b class="stat" id="d-${work.id}">${this.fmt(work.downloads)}</b></span>
        </div>
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
