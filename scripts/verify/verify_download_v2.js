// 2026-09-11 下载页改造验证（exe-full + Web DID + 鉴权下载 API）
// 覆盖：①无 did 也生成 Web DID 并给购买按钮 ②已购 → 点下载 → 请求 /api/download 并跳转签名 URL
//       ③403 未购 → 回落购买提示 ④409 平台清单提示 ⑤商品 id = exe-full
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');
const BASE = 'http://127.0.0.1:8081';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const chk = (n, c, x) => { c ? (pass++, console.log('PASS', n)) : (fail++, console.log('FAIL', n, x || '')); };

(async () => {
  const b = await chromium.launch({ executablePath: chromeExe, headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });

  /* ① 纯浏览器访客（无 device_id）：应生成 Web DID + 显示购买按钮（指向 exe-full） */
  const ctx1 = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p1 = await ctx1.newPage();
  let dlCalls = [];
  await ctx1.route('**/api/entitlement*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ pets: [] }) }));
  await ctx1.route('**/api/download*', r => { dlCalls.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://cos.example/signed-win', expires_in: 600 }) }); });
  await p1.goto(BASE + '/download.html', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);
  const c1 = await p1.evaluate(() => ({
    webDid: localStorage.getItem('deskbud_web_device_id') || '',
    buy: (document.querySelector('#dlGrid .btn') || {}).getAttribute ? document.querySelector('#dlGrid .btn').getAttribute('href') : '',
    cards: document.querySelectorAll('.dl-card').length,
  }));
  chk('①访客生成 Web DID(dsk+16hex)', /^dsk[0-9a-f]{16}$/.test(c1.webDid), c1.webDid);
  chk('①未购→购买按钮指 exe-full', c1.buy.includes('pet_id=exe-full') && c1.cards === 3, c1.buy);

  /* ② 已购（entitlement 返回 exe-full）→ 按钮变下载 → 点击 → 请求带 platform 并跳转签名 URL */
  const ctx2 = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p2 = await ctx2.newPage();
  const calls2 = [];
  let navigated = '';
  await ctx2.route('**/api/entitlement*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ pets: ['exe-full'] }) }));
  await ctx2.route('**/api/download*', r => { calls2.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://cos.example/signed-win', expires_in: 600 }) }); });
  await p2.goto(BASE + '/download.html?device_id=dsk0123456789abcdef', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2200);
  const c2 = await p2.evaluate(() => ({ btns: document.querySelectorAll('#dlGrid .dl-btn').length, tip: (document.getElementById('dlTip') || {}).textContent || '' }));
  chk('②已购→三个下载按钮', c2.btns === 3, JSON.stringify(c2));
  // 点 Windows 下载（拦截跳转避免真导航）
  await p2.route('https://cos.example/**', r => r.fulfill({ status: 200, contentType: 'text/plain', body: 'ok' }));
  p2.on('framenavigated', f => { if (f === p2.mainFrame()) navigated = f.url(); });
  await p2.evaluate(() => { document.querySelector('#dlGrid .dl-btn[data-plat="win"]').click(); });
  await sleep(1500);
  chk('②点击下载→调 /api/download 带 exe-full+platform', calls2.length === 1 && calls2[0].includes('pet_id=exe-full') && calls2[0].includes('platform=win'), calls2.join(' | '));
  chk('②跳转到签名 URL 开始下载', navigated.includes('cos.example/signed-win'), navigated);

  /* ③ 403 未购 → 回落购买提示 */
  const ctx3 = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p3 = await ctx3.newPage();
  await ctx3.route('**/api/entitlement*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ pets: ['exe-full'] }) }));
  await ctx3.route('**/api/download*', r => r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'not entitled' }) }));
  await p3.goto(BASE + '/download.html?device_id=dsk0123456789abcdef', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2200);
  await p3.evaluate(() => { document.querySelector('#dlGrid .dl-btn[data-plat="win"]').click(); });
  await sleep(1200);
  const c3 = await p3.evaluate(() => ({ tip: document.getElementById('dlTip').textContent, buy: (document.querySelector('#dlGrid .btn') || {}).getAttribute ? document.querySelector('#dlGrid .btn').getAttribute('href') : '' }));
  chk('③403→提示去购买+按钮回落', c3.tip.includes('还没购买') && c3.buy.includes('pet_id=exe-full'), JSON.stringify(c3));

  /* ④ 409 平台清单提示 */
  const ctx4 = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p4 = await ctx4.newPage();
  await ctx4.route('**/api/entitlement*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ pets: ['exe-full'] }) }));
  await ctx4.route('**/api/download*', r => r.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'platform required', platforms: ['win', 'mac'] }) }));
  await p4.goto(BASE + '/download.html?device_id=dsk0123456789abcdef', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2200);
  await p4.evaluate(() => { document.querySelector('#dlGrid .dl-btn[data-plat="android"]').click(); });
  await sleep(1200);
  const c4 = await p4.evaluate(() => document.getElementById('dlTip').textContent);
  chk('④409→提示可选平台清单', c4.includes('win') && c4.includes('mac'), c4);

  await b.close();
  console.log('RESULT: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
