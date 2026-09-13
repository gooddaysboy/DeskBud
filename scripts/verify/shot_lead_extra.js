// 2026-09-13 补拍：详情页页脚手册链接 / get.html 桌面态 / 下载页手册锚点
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');

(async () => {
  const OUT = __dirname + '/../../outputs';
  const browser = await chromium.launch({ executablePath: chromeExe, headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // 1) 详情页页脚（手册链接 → download.html#manual）
  await page.goto('http://127.0.0.1:8081/detail.html?pet=rabbit', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(900);
  const href = await page.evaluate(() => {
    const a = document.querySelector('a[data-i18n="footer.manual"]');
    return a ? a.getAttribute('href') : 'MISSING';
  });
  console.log('footer.manual href =', href);
  const f = await page.$('footer');
  if (f) await f.screenshot({ path: OUT + '/lead_footer_manual.png' });

  // 2) get.html 桌面态（Win/Mac 直下 + 二维码）
  await page.goto('http://127.0.0.1:8081/get.html', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: OUT + '/lead_get_desktop.png' });

  // 3) download.html#manual 锚点落位
  await page.goto('http://127.0.0.1:8081/download.html#manual', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1800);
  const y = await page.evaluate(() => Math.round(window.scrollY));
  console.log('manual anchor scrollY =', y);
  await page.screenshot({ path: OUT + '/lead_manual_anchor.png' });

  await browser.close();
  console.log('OK');
})();
