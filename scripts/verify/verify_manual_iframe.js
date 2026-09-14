// 验证下载页用户手册 iframe（#dlHmFrame）：平台 tab / 语言切换后高度自适应重算，且无内部滚动条。
// 2026-09-14：原脚本针对 usage.html（已移入 _spare/）的 .manual-panel/button[data-tab] 结构，
//             现役手册入口是 download.html 的 #dlHmFrame + #dlHmTabs .vtab[data-p]，改测之。
//             同时补上「无内部滚动条」断言（老曹 2026-09-14 报 win/mac 手册有滑动条）。
const path = require('path');
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ executablePath: chromeExe, headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('http://127.0.0.1:8081/download.html', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2000);

  let ok = 0, fail = 0;
  const check = (name, cond) => { cond ? ok++ : (fail++, console.log('FAIL ' + name)); };

  const state = () => page.evaluate(() => {
    const f = document.getElementById('dlHmFrame');
    if (!f) return null;
    const doc = f.contentDocument;
    return {
      src: f.getAttribute('src'),
      h: f.style.height || '(none)',
      clientH: f.clientHeight,
      contentH: doc ? doc.documentElement.scrollHeight : null,
      vscroll: doc ? doc.documentElement.scrollHeight > f.clientHeight + 1 : null
    };
  });
  const clickTab = (p) => page.evaluate(pl => {
    document.querySelectorAll('#dlHmTabs .vtab').forEach(b => { if (b.dataset.p === pl) b.click(); });
  }, p);
  const setLang = (l) => page.evaluate(lg => { window.__lang = lg; window.dispatchEvent(new Event('lang:change')); }, l);
  const hasHeight = (r) => !!r && /^\d{3,}px$/.test(r.h);

  // 初始：win 中文手册，有高度且无内部滚动条
  let r = await state();
  check('初始 = win-zh 且有高度 ' + JSON.stringify(r), r && r.src === 'manual/win-zh.html' && hasHeight(r));
  check('初始 win-zh 无内部滚动条 ' + JSON.stringify(r), r && r.vscroll === false);

  // 切 Android / macOS tab → src 与高度都重算
  for (const [plat, want] of [['android', 'manual/android-zh.html'], ['mac', 'manual/mac-zh.html']]) {
    await clickTab(plat);
    await page.waitForTimeout(2500);
    r = await state();
    check(plat + ' tab → ' + (r && r.src) + ' h=' + (r && r.h), r && r.src === want && hasHeight(r));
    check(plat + ' 无内部滚动条 ' + JSON.stringify(r), r && r.vscroll === false);
  }

  // 切英文 → *-en.html + 高度重算
  await setLang('en');
  await page.waitForTimeout(2500);
  r = await state();
  check('切英文 → mac-en 高度重算 ' + JSON.stringify(r), r && r.src === 'manual/mac-en.html' && hasHeight(r));
  check('英文 mac 无内部滚动条 ' + JSON.stringify(r), r && r.vscroll === false);

  // 切回中文 + win，展开 FAQ <details> → 高度应变大（toggle 事件触发重算）
  await setLang('zh');
  await page.waitForTimeout(500);
  await clickTab('win');
  await page.waitForTimeout(2500);
  const before = await page.evaluate(() => parseInt((document.getElementById('dlHmFrame') || {}).style.height) || 0);
  await page.evaluate(() => {
    const d = document.getElementById('dlHmFrame').contentDocument.querySelectorAll('details');
    if (d && d.length) d[d.length - 1].open = true;
  }).catch(() => {});
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => parseInt((document.getElementById('dlHmFrame') || {}).style.height) || 0);
  check('FAQ details 展开后高度 ' + before + ' -> ' + after, after >= before);

  check('无页面 JS 报错', errs.length === 0);
  if (errs.length) console.log(errs.join('\n'));
  console.log(`结果: ${ok} PASS / ${fail} FAIL`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
