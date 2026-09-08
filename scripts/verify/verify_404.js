const { chromium } = require('playwright-core');
const EXE = require('./_env.js').chromeExe;
const BASE = 'http://127.0.0.1:8080';
(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--no-proxy-server'] });
  const page = await browser.newPage();
  const bad = [];
  page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await page.click('nav.nav a[href="pets.html"]');
  await page.waitForTimeout(1500);
  console.log(bad.length ? bad.join('\n') : 'no 4xx/5xx');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
