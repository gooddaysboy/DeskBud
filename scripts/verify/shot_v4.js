// 2026-09-10 四轮视觉调整截图：首页（间距+暖色）+ 伙伴页（3列墙+收窄姿态卡）
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ executablePath: chromeExe, headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  // 首页桌面
  const d = await browser.newContext({ viewport: { width: 1366, height: 1400 } });
  const dp = await d.newPage();
  await dp.goto('http://127.0.0.1:8081/index.html', { waitUntil: 'networkidle', timeout: 30000 });
  await dp.waitForTimeout(1500);
  await dp.screenshot({ path: 'D:/360Downloads/deskbud/website/outputs/home_v4_desktop.png' });
  // 伙伴页桌面
  const dp2 = await d.newPage();
  await dp2.goto('http://127.0.0.1:8081/buddies.html', { waitUntil: 'networkidle', timeout: 30000 });
  await dp2.waitForTimeout(2500);
  const g = await dp2.evaluate(() => {
    const wall = document.querySelector('#buddyWall').getBoundingClientRect();
    const anim = document.querySelector('.buddy-anim-card').getBoundingClientRect();
    return { wallW: Math.round(wall.width), wallH: Math.round(wall.height), animW: Math.round(anim.width),
      threeCol: [...new Set([...document.querySelectorAll('#buddyWall .buddy-tile')].map(t => Math.round(t.getBoundingClientRect().top)))].length,
      bodySW: document.body.scrollWidth, iw: innerWidth };
  });
  console.log('buddies desktop:', JSON.stringify(g));
  await dp2.screenshot({ path: 'D:/360Downloads/deskbud/website/outputs/buddies_v4_desktop.png', fullPage: true });
  // 伙伴页手机
  const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mp = await m.newPage();
  await mp.goto('http://127.0.0.1:8081/buddies.html', { waitUntil: 'networkidle', timeout: 30000 });
  await mp.waitForTimeout(2000);
  await mp.screenshot({ path: 'D:/360Downloads/deskbud/website/outputs/buddies_v4_mobile.png', fullPage: true });
  await browser.close();
  console.log('OK screenshots');
})().catch(e => { console.error('ERR', e); process.exit(1); });
