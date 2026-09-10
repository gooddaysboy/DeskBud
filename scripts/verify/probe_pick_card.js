// 手机宽度下检查首页 pick-card 溢出根因（playwright-core + 本机 chromium）
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ executablePath: chromeExe, headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://127.0.0.1:8081/index.html', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const out = {};
    const q = sel => document.querySelector(sel);
    const w = el => el ? { w: Math.round(el.getBoundingClientRect().width), sw: el.scrollWidth, cw: el.clientWidth } : null;
    out.viewport = { iw: innerWidth, dw: document.documentElement.clientWidth };
    out.wrap = w(q('.hero-split .wrap') || q('.wrap'));
    out.heroSplit = w(q('.hero-split'));
    out.heroLeft = w(q('.hero-left'));
    out.picker = w(q('#petPicker'));
    out.cards = [...document.querySelectorAll('#petPicker .pick-card')].map(c => ({
      cls: c.className, w: Math.round(c.getBoundingClientRect().width), sw: c.scrollWidth,
      smallW: Math.round(c.querySelector('.pick-txt small') ? c.querySelector('.pick-txt small').getBoundingClientRect().width : -1),
      smallWS: c.querySelector('.pick-txt small') ? getComputedStyle(c.querySelector('.pick-txt small')).whiteSpace : 'N/A',
    }));
    const cs = q('#petPicker') ? getComputedStyle(q('#petPicker')) : null;
    out.pickerDisplay = cs ? cs.display + ' / cols=' + cs.gridTemplateColumns : 'N/A';
    out.bodyScrollW = document.body.scrollWidth;
    return out;
  });
  console.log(JSON.stringify(info, null, 1));
  await browser.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
