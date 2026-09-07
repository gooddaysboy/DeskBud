// 校验素材预览 HTML：相对路径是否解析正确（图片能否加载）
const { chromium } = require('playwright-core');
const path = require('path');
const EXE = 'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const files = ['素材预览_webmeji.html', '素材预览_kotlin.html'];

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  for (const f of files) {
    const p = path.resolve(__dirname, '..', f);
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto('file:///' + p.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/'), { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    const stat = await page.evaluate(() => {
      const imgs = [...document.images];
      const ok = imgs.filter(i => i.complete && i.naturalWidth > 0).length;
      const vids = [...document.querySelectorAll('video')].length;
      return { title: document.title, imgTotal: imgs.length, imgLoaded: ok, vids, text: (document.body.innerText || '').slice(0, 120).replace(/\s+/g, ' ') };
    });
    console.log(f, JSON.stringify(stat), errs.length ? 'ERR:' + errs[0] : '');
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
