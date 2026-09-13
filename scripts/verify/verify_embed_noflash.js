// 2026-09-14 App 内嵌「顶栏不露馅」根治验证（kotlin 报的慢网络 bug）
//   场景：App WebView 带 ?embed=1，但 site.js（99KB）在 1.98KB/s 下 50s 才到 →
//         HTML 先渲染 ⇒ 旧实现里 embed-mode 由 boot() 加 ⇒ 顶栏/页脚/「下载」整段露出。
//   修法：embed-mode 改由 <head> 内联脚本立刻加（不依赖 site.js）。
//   本脚本用「abort 掉 site.js 请求」精确复刻"JS 未到"这一态。
//   ① 11 页 HTML 源码都带 data-embed-boot 内联脚本
//   ② JS 未到 + ?embed=1：html.embed-mode 已挂 / 顶栏·页脚·下载按钮 全不显示
//   ③ JS 未到 + 无 embed（官网访客）：顶栏仍正常显示（不误伤）
//   ④ 首页购买区静态文案已清空（JS 未到时不再闪访客版文案）
//   ⑤ 正常加载（JS 到齐）回归：embed 隐藏 + 访客/App 双皮肤未受影响
const path = require('path');
const fs = require('fs');
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');
const BASE = 'http://127.0.0.1:8081';
const ROOT = path.join(__dirname, '..', '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const chk = (n, c, x) => { c ? (pass++, console.log('PASS', n)) : (fail++, console.log('FAIL', n, x || '')); };

const UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
// App WebView 的 UA 形态（含 wv）
const UA_WEBVIEW = 'Mozilla/5.0 (Linux; Android 13; 2201122C Build/TKQ1.220807.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36';
const ARGS = ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];

const PAGES = ['bubble.html', 'bubble_preview.html', 'buddies.html', 'detail.html', 'download.html',
  'editor.html', 'index.html', 'list.html', 'pets.html', 'privacy.html', 'usage.html'];

const probeChrome = () => {
  const vis = el => { if (!el) return null; const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && el.offsetParent !== null; };
  return {
    htmlClass: document.documentElement.className,
    topbar: vis(document.querySelector('.topbar')),
    footer: vis(document.querySelector('.footer')),
    navDl: vis(document.querySelector('.nav-dl')),
    navDlText: (document.querySelector('.nav-dl') || {}).textContent || '',
    hdGetLabel: (document.getElementById('hdGetLabel') || {}).textContent || '',
  };
};

(async () => {
  const b = await chromium.launch({ executablePath: chromeExe, headless: true, args: ARGS });

  /* ---------- ① 11 页源码都带内联脚本 ---------- */
  const missing = [];
  for (const f of PAGES) {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (!/data-embed-boot/.test(s)) missing.push(f);
    // 必须在 <head> 里、且在 <body> 之前
    const i = s.indexOf('data-embed-boot');
    const j = s.indexOf('<body');
    if (i < 0 || j < 0 || i > j) missing.push(f + '(不在 head)');
  }
  chk('①11 页 HTML 均含 head 内联 embed 脚本', missing.length === 0, missing.join(','));

  /* ---------- ② JS 未到 + embed=1（App 慢网络复刻） ---------- */
  let ctx = await b.newContext({ viewport: { width: 412, height: 860 }, userAgent: UA_WEBVIEW });
  await ctx.route('**/assets/js/site.js*', r => r.abort());
  let p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 80)));
  await p.goto(BASE + '/buddies.html?embed=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(800);
  let s = await p.evaluate(probeChrome);
  chk('②App·html 已挂 embed-mode（不等 JS）', /embed-mode/.test(s.htmlClass), s.htmlClass);
  chk('②App·顶栏不显示', s.topbar === false, 'topbar=' + s.topbar);
  chk('②App·页脚不显示', s.footer === false, 'footer=' + s.footer);
  chk('②App·「下载」按钮不显示', s.navDl === false, 'navDl=' + s.navDl + ' text=' + s.navDlText);
  await p.screenshot({ path: path.join(ROOT, 'outputs', 'embed_noflash_app.png'), fullPage: true });
  await ctx.close();

  // App（移动 UA）落到首页时，index.html 头部会整页 replace 到 buddies.html
  //   → 2026-09-14 修：跳转必须**带上 query**，否则 embed/device_id 丢光（顶栏露出 + 退回访客皮肤）
  ctx = await b.newContext({ viewport: { width: 412, height: 860 }, userAgent: UA_WEBVIEW });
  await ctx.route('**/assets/js/site.js*', r => r.abort());
  p = await ctx.newPage();
  await p.goto(BASE + '/index.html?embed=1&device_id=dsk0123456789abcdef', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(1000);
  s = await p.evaluate(() => Object.assign(
    { href: location.href, search: location.search },
    (() => { const v = document.querySelector('.topbar'), c = getComputedStyle(v); return { topbar: c.display !== 'none' && v.offsetParent !== null }; })(),
    { htmlClass: document.documentElement.className }
  ));
  chk('②App·移动端首页跳伙伴页且带住 query', /buddies\.html\?embed=1&device_id=/.test(s.href), s.href);
  chk('②App·跳转后顶栏仍不显示（embed 没丢）', s.topbar === false && /embed-mode/.test(s.htmlClass), 'topbar=' + s.topbar + ' class=' + s.htmlClass);
  await ctx.close();

  // ④ 首页购买区静态文案（桌面 UA 才停在首页）
  ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, userAgent: UA_DESKTOP });
  await ctx.route('**/assets/js/site.js*', r => r.abort());
  p = await ctx.newPage();
  await p.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(600);
  s = await p.evaluate(probeChrome);
  chk('④首页购买区静态文案已清空', s.hdGetLabel.trim() === '', JSON.stringify(s.hdGetLabel));
  await ctx.close();

  /* ---------- ③ JS 未到 + 无 embed（官网访客）不该误伤 ---------- */
  ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, userAgent: UA_DESKTOP });
  await ctx.route('**/assets/js/site.js*', r => r.abort());
  p = await ctx.newPage();
  await p.goto(BASE + '/buddies.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(600);
  s = await p.evaluate(probeChrome);
  chk('③访客·无 embed 顶栏正常显示', s.topbar === true, 'topbar=' + s.topbar);
  chk('③访客·html 未误挂 embed-mode', !/embed-mode/.test(s.htmlClass), s.htmlClass);
  await ctx.close();

  /* ---------- ⑤ 正常加载回归（JS 到齐） ---------- */
  // ⑤a App 内（embed + did）→ 顶栏隐、购买皮肤在
  ctx = await b.newContext({ viewport: { width: 412, height: 860 }, userAgent: UA_WEBVIEW });
  p = await ctx.newPage();
  await p.goto(BASE + '/buddies.html?device_id=dsk0123456789abcdef&embed=1', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(1800);
  s = await p.evaluate(probeChrome);
  chk('⑤a App·顶栏隐 + did 生效', /embed-mode/.test(s.htmlClass) && s.topbar === false, s.htmlClass);
  let buy = await p.evaluate(() => {
    const box = document.querySelector('#buddyBuy');
    const a = box ? box.querySelector('a') : null;
    return {
      html: box ? box.innerHTML.slice(0, 300) : '',
      href: a ? a.getAttribute('href') : '',
      txt: a ? a.textContent.trim() : '',
      checks: document.querySelectorAll('#buddyWall .buddy-check').length,  // 勾选框在伙伴墙方块上
      picked: (document.querySelector('.buy-picked') || {}).textContent || '',
    };
  });
  chk('⑤a App·购买皮肤（伙伴墙勾选框 + 🐾领养→收银台）',
    buy.checks > 0 && /pay\.deskbud\.xyz\/checkout/.test(buy.href) && /领养/.test(buy.txt),
    JSON.stringify(buy));
  await ctx.close();

  // ⑤b 访客（无 did）→ 顶栏在、下载引导在
  ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, userAgent: UA_DESKTOP });
  p = await ctx.newPage();
  await p.goto(BASE + '/buddies.html', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(1800);
  s = await p.evaluate(probeChrome);
  chk('⑤b 访客·顶栏在', s.topbar === true, s.topbar);
  buy = await p.evaluate(() => {
    const a = document.querySelector('#buddyBuy a.lead-dl');
    return a ? { href: a.getAttribute('href'), txt: a.textContent.trim() } : null;
  });
  chk('⑤b 访客·下载引导在', !!buy && buy.href === 'download.html', JSON.stringify(buy));
  await ctx.close();

  await b.close();
  console.log('RESULT: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
