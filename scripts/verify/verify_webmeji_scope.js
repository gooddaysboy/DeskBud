/* 宠物（webmeji）启用范围回归 —— 2026-09-14 老曹定「除排除页外全站启用 · 仅桌面」
 *
 * 背景：原为白名单 enabledPaths ['/','/index.html','/pets.html'] ⇒ 只有从首页/伙伴之家进来才挂宠物；
 *       直接打开/刷新子页没有宠物（宠物容器挂 body、软导航只换 #view，挂上后全站跟随）。
 *       老曹要求补齐「直接开子页」这个边界，并只在桌面端启用。
 *
 * 断言：
 *   A 桌面 UA × 内容页 → 必须挂宠物：index / list / detail / download / pets / privacy / usage / contact
 *   B 桌面 UA × 排除页 → 必须无宠物：buddies / editor / bubble / get
 *   C 移动 UA → 一律无宠物（index.html 按既有 UA 分流跳 buddies.html）
 *   D 软导航：从 list.html 点站内链接切到 detail.html，宠物容器须常驻（不丢、不重生）
 *
 * 跑法：NODE_PATH=<node workspace>/node_modules <node> scripts/verify/verify_webmeji_scope.js
 */
const path = require('path');
const { chromeExe } = require(path.join(__dirname, '_env.js'));
const { chromium } = require(process.env.PW || 'playwright-core');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8081';
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

let pass = 0, fail = 0;
const ok = (c, label, extra) => { if (c) { pass++; console.log('  ✅ ' + label); } else { fail++; console.log('  ❌ ' + label + (extra ? '  → ' + extra : '')); } };

async function petCount(p, ms = 4500) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const n = await p.evaluate(() => document.querySelectorAll('.webmeji-container').length);
    if (n > 0) return n;
    await p.waitForTimeout(200);
  }
  return 0;
}

(async () => {
  const b = await chromium.launch({ executablePath: chromeExe, headless: true });

  console.log('=== A. 桌面 UA × 内容页（应挂宠物）===');
  for (const pg of ['index.html', 'list.html', 'detail.html', 'download.html', 'pets.html', 'privacy.html', 'usage.html', 'contact.html']) {
    const ctx = await b.newContext({ viewport: { width: 1200, height: 900 }, userAgent: DESKTOP_UA });
    const p = await ctx.newPage();
    try {
      await p.goto(BASE + '/' + pg, { waitUntil: 'domcontentloaded' });
      const n = await petCount(p);
      ok(n > 0, pg + ' 有宠物', 'pets=' + n);
    } catch (e) { ok(false, pg, e.message); }
    await ctx.close();
  }

  console.log('=== B. 桌面 UA × 排除页（应无宠物）===');
  for (const pg of ['buddies.html', 'editor.html', 'bubble.html', 'get.html']) {
    const ctx = await b.newContext({ viewport: { width: 1200, height: 900 }, userAgent: DESKTOP_UA });
    const p = await ctx.newPage();
    try {
      await p.goto(BASE + '/' + pg, { waitUntil: 'domcontentloaded' });
      const n = await petCount(p, 3000);
      ok(n === 0, pg + ' 无宠物', 'pets=' + n);
    } catch (e) { ok(false, pg, e.message); }
    await ctx.close();
  }

  console.log('=== C. 移动 UA（应无宠物）===');
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, userAgent: MOBILE_UA, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    await p.goto(BASE + '/list.html', { waitUntil: 'domcontentloaded' });
    ok((await petCount(p, 3000)) === 0, 'list.html（移动 UA）无宠物');
    await p.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1600);
    const info = await p.evaluate(() => ({ path: location.pathname, pets: document.querySelectorAll('.webmeji-container').length }));
    ok(info.pets === 0, 'index.html（移动 UA）无宠物（实际落在 ' + info.path + '）');
    await ctx.close();
  }

  console.log('=== D. 软导航：宠物容器常驻 ===');
  {
    const ctx = await b.newContext({ viewport: { width: 1200, height: 900 }, userAgent: DESKTOP_UA });
    const p = await ctx.newPage();
    await p.goto(BASE + '/list.html', { waitUntil: 'domcontentloaded' });
    const n0 = await petCount(p);
    ok(n0 > 0, 'list.html 直接打开即有宠物', 'pets=' + n0);
    await p.evaluate(() => {
      const a = [...document.querySelectorAll('a')].find(x => /detail\.html/.test(x.getAttribute('href') || ''));
      if (a) a.click(); else { history.pushState({}, '', '/detail.html?id=rabbit'); window.dispatchEvent(new Event('popstate')); }
    });
    await p.waitForTimeout(1300);
    const info = await p.evaluate(() => ({ path: location.pathname, pets: document.querySelectorAll('.webmeji-container').length }));
    ok(info.path === '/detail.html' && info.pets >= n0, '软导航 → detail.html 宠物常驻', 'path=' + info.path + ' pets=' + info.pets);
    await ctx.close();
  }

  await b.close();
  console.log('RESULT: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });
