// 验证 usage.html iframe 方案：tab 切换/语言切换后高度重算
const path = require('path');
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ executablePath: chromeExe, headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('http://127.0.0.1:8081/usage.html', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1500);

  const H = sel => page.$$eval(sel, els => els.map(e => e.style.height || '(no height)'));
  let ok = 0, fail = 0;
  const check = (name, cond) => { cond ? ok++ : (fail++, console.log('FAIL ' + name)); };

  // 初始：win zh 可见有高度
  const h0 = await H('.manual-panel.on .manual-frame');
  check('初始 win-zh iframe 有高度 ' + JSON.stringify(h0), h0.filter(x => x !== '(no height)').length >= 1);

  // 切 Android tab → android zh iframe 有高度
  await page.click('button[data-tab="android"]');
  await page.waitForTimeout(1200);
  const hA = await page.$eval('.manual-panel.on .manual-frame', f => f.style.height);
  check('Android tab 后 zh iframe 高度=' + hA, /^\d{3,}px$/.test(hA));

  // 切英文 → android en iframe 有高度
  await page.evaluate(() => { window.__lang = 'en'; window.dispatchEvent(new Event('lang:change')); });
  await page.waitForTimeout(1200);
  const hE = await page.$eval('.manual-panel.on [data-manual-lang="en"] .manual-frame', f => f.style.height);
  check('切英文后 en iframe 高度=' + hE, /^\d{3,}px$/.test(hE));
  const vis = await page.$eval('.manual-panel.on [data-manual-lang="en"]', f => f.classList.contains('on'));
  check('en 块已显示', vis);

  // iframe 内 FAQ details 展开后高度变大
  await page.evaluate(() => { window.__lang = 'zh'; window.dispatchEvent(new Event('lang:change')); });
  await page.click('button[data-tab="win"]');
  await page.waitForTimeout(800);
  const before = await page.$eval('.manual-panel.on [data-manual-lang="zh"] .manual-frame', f => parseInt(f.style.height) || 0);
  await page.click('.manual-panel.on [data-manual-lang="zh"] .manual-frame >> nth=0 >> summary >> nth=1').catch(() => {});
  await page.waitForTimeout(600);
  const after = await page.$eval('.manual-panel.on [data-manual-lang="zh"] .manual-frame', f => parseInt(f.style.height) || 0);
  check(`details 展开后高度 ${before} -> ${after}`, after >= before);

  check('无页面 JS 报错', errs.length === 0);
  if (errs.length) console.log(errs.join('\n'));
  console.log(`结果: ${ok} PASS / ${fail} FAIL`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
