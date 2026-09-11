// 2026-09-10 下载页验证：三平台卡/device_id 状态机/导航指向/隐私文案
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');
const BASE = 'http://127.0.0.1:8081';
let pass = 0, fail = 0;
const chk = (n, c, x) => { c ? (pass++, console.log('PASS', n)) : (fail++, console.log('FAIL', n, x || '')); };
(async () => {
  const b = await chromium.launch({ executablePath: chromeExe, headless: true });
  const DID = 'dsk0123456789abcdef';
  // 干净环境：无 did → 客户端提示
  const p1 = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await p1.goto(BASE + '/download.html', { waitUntil: 'networkidle', timeout: 30000 });
  await p1.waitForTimeout(1200);
  const c1 = await p1.evaluate(() => ({ cards: document.querySelectorAll('.dl-card').length, buy: (document.querySelector('#dlGrid .btn') || {}).getAttribute ? document.querySelector('#dlGrid .btn').getAttribute('href') : '' }));
  // 09-11 13:30 客户端免费（协同板已定 #8）：安装包静态直链，无购买态
  chk('①无did→三卡直链(客户端免费)', c1.cards === 3 && c1.buy.startsWith('https://deskbudpacks-'), JSON.stringify(c1));
  // 带 did → 购买按钮指 checkout
  const p2 = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await p2.goto(BASE + '/download.html?device_id=' + DID, { waitUntil: 'networkidle', timeout: 30000 });
  await p2.waitForTimeout(1200);
  const c2 = await p2.evaluate(() => { const a = document.querySelector('#dlGrid .btn'); return { href: a ? a.href : '', n: document.querySelectorAll('#dlGrid .btn').length }; });
  chk('②有did→仍为直链(无鉴权/购买)', c2.n === 3 && c2.href.startsWith('https://deskbudpacks-'), c2.href);
  // 导航 ↓ 与 footer 链
  const nav = await p2.evaluate(() => ({ dl: document.querySelector('.nav .nav-dl').getAttribute('href'), foot: (document.querySelector('.footer-dl-link') || {}).getAttribute ? document.querySelector('.footer-dl-link').getAttribute('href') : '' }));
  chk('③导航↓/footer 都指 download.html', nav.dl === 'download.html' && nav.foot === 'download.html', JSON.stringify(nav));
  // 隐私页文案
  const p3 = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await p3.goto(BASE + '/privacy.html', { waitUntil: 'networkidle', timeout: 30000 });
  await p3.waitForTimeout(1000);
  const t = await p3.evaluate(() => document.body.innerText);
  chk('④隐私：定稿五段/无爱发电/有自动激活表述', !t.includes('爱发电') && !t.includes('不会开机自联网') && t.includes('五、数据安全与本地存储') && t.includes('自动完成下载、安装与激活'));
  await p2.screenshot({ path: 'D:/360Downloads/deskbud/website/outputs/download_page_v2.png', fullPage: true });
  await b.close();
  console.log('RESULT: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
