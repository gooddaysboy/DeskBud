// 对照实验：模拟"境外 RTT + 不缓存"时，宠物跑动帧是否还能正常切换
// A 组：本地无延迟；B 组：每个 webp 请求 +250ms（模拟高 RTT 下每帧都要走网络）
const { chromium } = require('playwright-core');
const EXE = require('./_env.js').chromeExe;
const URL = 'http://127.0.0.1:8080/index.html';

async function run(delayMs) {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  let reqCount = 0;
  if (delayMs > 0) {
    await page.route('**/rabbit/**/*.webp', async (route) => {
      reqCount++;
      await new Promise(r => setTimeout(r, delayMs));
      route.continue();
    });
  } else {
    page.on('request', r => { if (r.url().includes('/rabbit/') && r.url().endsWith('.webp')) reqCount++; });
  }

  const t0 = Date.now();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForSelector('.webmeji-container', { timeout: 120000 });
  const spawnMs = Date.now() - t0;

  // 记录 3 秒内 <img src> 切换次数（帧是否真的在动）
  const flips = await page.evaluate(() => new Promise(resolve => {
    const img = document.querySelector('.webmeji-container img');
    let n = 0, first = img.src, last = img.src;
    const ob = new MutationObserver(() => { n++; last = img.src; });
    ob.observe(img, { attributes: true, attributeFilter: ['src'] });
    setTimeout(() => { ob.disconnect(); resolve({ n, first, last }); }, 3000);
  }));

  await browser.close();
  return { spawnMs, reqCount, flips: flips.n };
}

(async () => {
  console.log('--- A 组：本地无延迟（RTT≈0） ---');
  const a = await run(0);
  console.log(`  宠物出现耗时 ${a.spawnMs}ms | webp 请求 ${a.reqCount} 次 | 3s 内帧切换 ${a.flips} 次`);

  console.log('--- B 组：每个 webp +250ms（模拟境外 RTT，且不缓存→每次切帧都可能重发） ---');
  const b = await run(250);
  console.log(`  宠物出现耗时 ${b.spawnMs}ms | webp 请求 ${b.reqCount} 次 | 3s 内帧切换 ${b.flips} 次`);

  console.log('\n判定：walk 帧间隔 100ms → 3s 内正常应切换约 30 次；明显偏低即"跑动看着像定格一个动作"。');
})().catch(e => { console.error('脚本异常:', e); process.exit(2); });
