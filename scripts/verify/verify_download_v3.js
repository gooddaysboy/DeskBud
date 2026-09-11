// 2026-09-11 13:30 下载页验证（客户端免费版：静态直链，无付费/鉴权/device_id）
// 协同板「已定 #8」：安装包直链 COS files/ 公有读；付费点只有宠物（本页无购买入口）
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');
const BASE = 'http://127.0.0.1:8081';
const COS = 'https://deskbudpacks-1253913845.cos.ap-beijing.myqcloud.com/files/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const chk = (n, c, x) => { c ? (pass++, console.log('PASS', n)) : (fail++, console.log('FAIL', n, x || '')); };

(async () => {
  const b = await chromium.launch({ executablePath: chromeExe, headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });

  /* ① 无 device_id（纯浏览器访客）：直接可下载，无购买按钮、无鉴权请求 */
  const ctx1 = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p1 = await ctx1.newPage();
  const reqs = [];
  p1.on('request', r => { const u = r.url(); if (u.includes('/api/')) reqs.push(u); });
  await p1.goto(BASE + '/download.html', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(1800);
  const c1 = await p1.evaluate(() => ({
    cards: document.querySelectorAll('.dl-card').length,
    links: [...document.querySelectorAll('#dlGrid .dl-action a')].map(a => a.getAttribute('href')),
    buyers: document.querySelectorAll('#dlGrid .dl-btn').length,
    sub: (document.querySelector('.dl-sub') || {}).textContent || '',
  }));
  chk('①三卡三直链', c1.cards === 3 && c1.links.length === 3, JSON.stringify(c1));
  chk('①链接指 gitee release(win/mac/android)', c1.links.every(u => u.includes('gitee.com/deskbud/version/releases/download')) && c1.links.length === 3, c1.links.join(' | '));
  chk('①无购买按钮(客户端免费)', c1.buyers === 0);
  chk('①无任何 /api/ 请求(不走鉴权)', reqs.length === 0, reqs.join(' | '));
  chk('①副标题已改"免费"口径', c1.sub.includes('免费'), c1.sub);

  /* ② 带 device_id（客户端 WebView 进入）：同样直链，不因 did 变化 */
  const ctx2 = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p2 = await ctx2.newPage();
  await p2.goto(BASE + '/download.html?device_id=dsk0123456789abcdef', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(1800);
  const c2 = await p2.evaluate(() => ({
    links: [...document.querySelectorAll('#dlGrid .dl-action a')].map(a => a.getAttribute('href')),
    buyers: document.querySelectorAll('#dlGrid .dl-btn, #dlGrid .hd-soon').length,
  }));
  chk('②有did→仍直链无购买态', c2.links.length === 3 && c2.buyers === 0, JSON.stringify(c2));

  /* ③ 英文模式文案（lang=en） */
  const ctx3 = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p3 = await ctx3.newPage();
  await p3.goto(BASE + '/download.html?lang=en', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(1800);
  const c3 = await p3.evaluate(() => ({ btn: (document.querySelector('#dlGrid .dl-action a') || {}).textContent || '', sub: (document.querySelector('.dl-sub') || {}).textContent || '' }));
  chk('③英文文案(Download free)', c3.btn.includes('Download free') && c3.sub.includes('free'), JSON.stringify(c3));

  /* ④ 简介区在位（09-11 老曹：note 改为应用简介；手册见 verify_download_v4） */
  const intro = await p1.evaluate(() => (document.querySelector('.dl-intro-p') || {}).textContent || '');
  chk('④应用简介在位', intro.includes('轻量纯净'), intro.slice(0, 30));

  await p1.screenshot({ path: 'D:/360Downloads/deskbud/website/outputs/download_free.png', fullPage: true });
  await b.close();
  console.log('RESULT: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
