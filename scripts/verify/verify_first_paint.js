// 首屏直出回归验证（方案 A 全站推广 · 2026-09-14）
// 对 6 个会慢网白屏的落地页，分别验证：
//   模式 A：abort site.js/i18n.js/bubble.js（复刻慢网 JS 未到）→ 首屏必须有内容，不空白
//   模式 B：全量加载 → JS 重建后内容正确、无 pageerror/console error
// 运行：NODE_PATH=<node_modules> node scripts/verify/verify_first_paint.js
const { chromium } = require('playwright-core');
const { chromeExe } = require('./_env.js');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8081';

const PAGES = [
  { path: '/index.html', name: 'index' },
  { path: '/buddies.html', name: 'buddies' },
  { path: '/list.html', name: 'list' },
  { path: '/pets.html', name: 'pets' },
  { path: '/download.html', name: 'download' },
  { path: '/detail.html?id=linekit', name: 'detail' },
];

function fpCheck(name, s) {
  switch (name) {
    case 'index': return s.pickerCards >= 3 && s.showcaseFigs >= 6 && s.posesFigs >= 20 && s.hdTitle.includes('线咪') && s.buyLink;
    case 'buddies': return s.tiles >= 1 && s.buyLen > 0 && s.nameLen > 0;
    case 'list': return s.cards >= 3 && s.chips >= 1;
    case 'pets': return s.petCards >= 2;
    case 'download': return s.dlCards === 3;
    case 'detail': return s.detailTitle.includes('线咪') && s.verCards >= 1 && s.buyLink;
    default: return false;
  }
}

function probe(name) {
  if (name === 'buddies') return () => ({
    tiles: document.querySelectorAll('#buddyWall .buddy-tile').length,
    buyLen: (document.getElementById('buddyBuy') || {}).textContent.trim().length,
    nameLen: (document.getElementById('buddyName') || {}).textContent.trim().length,
  });
  if (name === 'index') return () => ({
    pickerCards: document.querySelectorAll('#petPicker .pick-card').length,
    showcaseFigs: document.querySelectorAll('#showcaseTrack .spose-item').length,
    posesFigs: document.querySelectorAll('#posesGrid .pose-card').length,
    hdTitle: (document.getElementById('hdTitle') || {}).textContent || '',
    buyLink: !!(document.querySelector('#hdBuy a')),
  });
  if (name === 'list') return () => ({
    cards: document.querySelectorAll('#grid .card').length,
    chips: document.querySelectorAll('#filters .chip').length,
  });
  if (name === 'pets') return () => ({ petCards: document.querySelectorAll('#petsGrid .pet-card').length });
  if (name === 'download') return () => ({ dlCards: document.querySelectorAll('#dlGrid .dl-card').length });
  if (name === 'detail') return () => ({
    detailTitle: (document.querySelector('#detail .detail-title') || {}).textContent || '',
    verCards: document.querySelectorAll('#detail .ver-card').length,
    buyLink: !!(document.querySelector('#detail .buy-block a')),
  });
  return () => ({});
}

(async () => {
  const browser = await chromium.launch({ executablePath: chromeExe, headless: true });
  let allPass = true;
  for (const pg of PAGES) {
    // 模式 A：abort JS
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push('PE:' + e.message));
      await page.route('**/assets/js/site.js*', r => r.abort());
      await page.route('**/assets/js/i18n.js*', r => r.abort());
      await page.route('**/bubble.js*', r => r.abort());
      await page.goto(BASE + pg.path, { waitUntil: 'load', timeout: 15000 });
      await page.waitForTimeout(700);
      const s = await page.evaluate(probe(pg.name));
      const pass = fpCheck(pg.name, s);
      const realErr = errs.filter(e => !/SITE is not defined|ERR_FAILED|abort/i.test(e));
      console.log(`[首屏A] ${pg.name.padEnd(8)} ${pass ? 'PASS' : 'FAIL'}  ${JSON.stringify(s)}  ${realErr.length ? 'ERR:' + realErr.join(',') : ''}`);
      if (!pass) allPass = false;
      await ctx.close();
    }
    // 模式 B：全量加载
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push('PE:' + e.message));
      page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|404/i.test(m.text())) errs.push('CE:' + m.text()); });
      await page.goto(BASE + pg.path, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1200);
      const s = await page.evaluate(probe(pg.name));
      const pass = fpCheck(pg.name, s);
      console.log(`[全量B] ${pg.name.padEnd(8)} ${pass ? 'PASS' : 'FAIL'}  ${JSON.stringify(s)}  ${errs.length ? 'ERR:' + errs.join(',') : ''}`);
      if (!pass || errs.length) allPass = false;
      await ctx.close();
    }
  }
  await browser.close();
  console.log(allPass ? '\n=== ALL PASS ===' : '\n=== SOME FAIL ===');
  process.exit(allPass ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
