// 2026-09-10 导航 ↓ 图标验证：桌面中文/英文态 + 手机宽度
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');
const BASE = 'http://127.0.0.1:8081';
let pass = 0, fail = 0;
function chk(name, cond, extra) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, extra || ''); }
}
(async () => {
  const browser = await chromium.launch({ executablePath: chromeExe, headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/index.html', { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(1500);
  const c1 = await p.evaluate(() => {
    const a = document.querySelector('.nav .nav-dl');
    return { txt: a.textContent.trim(), weight: getComputedStyle(a).fontWeight,
      aria: a.getAttribute('aria-label'), title: a.getAttribute('title'), visible: a.getBoundingClientRect().right <= innerWidth };
  });
  chk('①中文态 ↓ 粗体', c1.txt === '↓' && +c1.weight >= 700, JSON.stringify(c1));
  chk('①aria/title=下载', c1.aria === '下载' && c1.title === '下载');
  chk('①桌面可见', c1.visible);
  // 英文态
  await p.evaluate(() => document.getElementById('langSwitch').click());
  await p.waitForTimeout(1200);
  const c2 = await p.evaluate(() => ({ aria: document.querySelector('.nav .nav-dl').getAttribute('aria-label'),
    title: document.querySelector('.nav .nav-dl').getAttribute('title') }));
  chk('②英文态 aria/title=Download', c2.aria === 'Download' && c2.title === 'Download', JSON.stringify(c2));
  await p.screenshot({ path: 'D:/360Downloads/deskbud/website/outputs/nav_dl_desktop.png', clip: { x: 0, y: 0, width: 1366, height: 200 } });
  // 手机宽度
  const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mp = await m.newPage();
  await mp.goto(BASE + '/buddies.html', { waitUntil: 'networkidle', timeout: 30000 });
  await mp.waitForTimeout(1200);
  const c3 = await mp.evaluate(() => {
    const a = document.querySelector('.nav .nav-dl');
    const r = a.getBoundingClientRect();
    return { txt: a.textContent.trim(), inView: r.right <= innerWidth + 1 && r.width > 0 };
  });
  chk('③手机 ↓ 可见省地方', c3.txt === '↓' && c3.inView, JSON.stringify(c3));
  await mp.screenshot({ path: 'D:/360Downloads/deskbud/website/outputs/nav_dl_mobile.png', clip: { x: 0, y: 0, width: 390, height: 140 } });
  await browser.close();
  console.log('\nRESULT: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
