// 2026-09-10 导航下载入口验证 → 2026-09-12 晚更新：入口已从「↓ 图标」改成「下载」文字 + 橙色胶囊 CTA
// 断言：①桌面中文态 = 文字「下载」+ 胶囊（有底色）②英文态 aria/title=Download ③手机宽度可见不溢出
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
    const cs = getComputedStyle(a);
    return { txt: a.textContent.trim(), weight: cs.fontWeight, radius: cs.borderRadius,
      bg: cs.backgroundColor, aria: a.getAttribute('aria-label'), title: a.getAttribute('title'),
      visible: a.getBoundingClientRect().right <= innerWidth };
  });
  const pill = c1.bg && c1.bg !== 'rgba(0, 0, 0, 0)' && c1.bg !== 'transparent';
  chk('①中文态=「下载」文字+胶囊底色', c1.txt === '下载' && pill, JSON.stringify(c1));
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
    return { txt: a.textContent.trim(), inView: r.right <= innerWidth + 1 && r.width > 0,
      bodySW: document.body.scrollWidth, iw: innerWidth };
  });
  chk('③手机下载可见、无横向溢出', c3.inView && c3.txt.length > 0 && c3.bodySW <= c3.iw + 1, JSON.stringify(c3));
  await mp.screenshot({ path: 'D:/360Downloads/deskbud/website/outputs/nav_dl_mobile.png', clip: { x: 0, y: 0, width: 390, height: 140 } });
  await browser.close();
  console.log('\nRESULT: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
