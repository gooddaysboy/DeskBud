// 一次性取证：安卓手册第 4 段「领新伙伴」清理后截图（zh/en）
const { chromium } = require('playwright-core');
const { chromeExe } = require('./_env.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: chromeExe, headless: true });
  const ctx = await b.newContext({ viewport: { width: 900, height: 1100 }, deviceScaleFactor: 2 });
  for (const [lang, out] of [['zh', 'manual_android_sec4_zh.png'], ['en', 'manual_android_sec4_en.png']]) {
    const p = await ctx.newPage();
    await p.goto(`http://127.0.0.1:8081/manual/android-${lang}.html`, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(600);
    const sec = p.locator('section', { has: p.locator('h2') }).nth(3); // 第 4 段 = 领新伙伴
    await sec.screenshot({ path: __dirname + '/../../outputs/' + out });
    const txt = await sec.innerText();
    console.log('[' + lang + ']', JSON.stringify(txt.replace(/\s+/g, ' ').slice(0, 200)));
    await p.close();
  }
  await b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
