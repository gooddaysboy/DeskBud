// 验证：从首页软导航进伙伴之家，卡片是否渲染（无需刷新）
const { chromium } = require('playwright-core');
const EXE = require('./_env.js').chromeExe;
const BASE = 'http://127.0.0.1:8080';

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--no-proxy-server'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  // 1) 整页加载 pets.html
  await page.goto(BASE + '/pets.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const direct = await page.$$eval('#petsGrid .pet-card', els => els.length);

  // 2) 首页 → 点导航「伙伴之家」（软导航）
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.click('nav.nav a[href="pets.html"]');
  await page.waitForTimeout(1500);
  const soft = await page.$$eval('#petsGrid .pet-card', els => els.length);
  const url = page.url();
  const title = await page.title();
  const firstName = await page.$eval('#petsGrid .pet-card .pet-name', el => el.textContent).catch(() => '(无)');

  // 3) 软导航进 pets 后切语言，看是否重绘
  await page.click('#langSwitch');
  await page.waitForTimeout(700);
  const afterLang = await page.$eval('#petsGrid .pet-card .pet-name', el => el.textContent).catch(() => '(无)');

  console.log(JSON.stringify({ direct, soft, url, title, firstName, afterLang, errs }, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
