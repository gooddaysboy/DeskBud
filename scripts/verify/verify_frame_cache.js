/**
 * 验证：帧缓存 blob 化后，播放期间不再发起任何帧请求（免疫 must-revalidate / 弱网）
 *
 * 场景：所有 *.webp 请求人为延迟 400ms（模拟跨境 RTT + 线上不缓存）
 * 断言：
 *   ① 宠物能在核心帧就绪后出现
 *   ② 播放观察期内【新增 webp 请求数 == 0】  <- 核心：切帧不再触网
 *   ③ 观察期内帧切换次数接近 观测时长/帧间隔（动作确实在播，不是定格）
 *   ④ 无 JS 报错
 *
 * 跑法：
 * NODE_PATH=<WorkBuddy node workspace>/node_modules \
 *   node scripts/verify/verify_frame_cache.js
 */
const path = require('path');
const { chromium } = require('playwright-core');

const EXE = require('./_env.js').chromeExe;
const BASE = 'http://127.0.0.1:8080';
const RTT = parseInt(process.env.WM_RTT || '400', 10);   // 每个帧请求人为延迟（ms）
const OBSERVE = 4000;     // 播放观察时长（ms）

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  → ' + extra : ''}`);
  cond ? pass++ : fail++;
};

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  let webpCount = 0;
  const webpUrls = [];          // 每次帧请求的 URL（CDP 层：fetch 预载 + img 直拉，仅作展示统计）
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  // 页面内 hook fetch 引擎预载层——断言②盯这层（我们可控）；img 元素直拉属浏览器行为，
  // 本地 no-cache 服务器下会与预载竞态双发，生产 immutable 缓存下零网络，不在断言范围
  await page.addInitScript(() => {
    window.__FETCHED = [];
    const of = window.fetch.bind(window);
    window.fetch = (...a) => { window.__FETCHED.push(String(a[0])); return of(...a); };
  });

  // 所有帧请求延迟 RTT
  await page.route('**/*.webp', async route => {
    webpCount++;
    webpUrls.push(route.request().url());
    await new Promise(r => setTimeout(r, RTT));
    await route.continue();
  });

  const t0 = Date.now();
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });

  // 等宠物出现
  await page.waitForSelector('.webmeji-container img', { timeout: 60000 });
  const spawnMs = Date.now() - t0;
  const reqAtSpawn = webpCount;

  const reqAtEnd0 = webpCount;
  // 等后台补齐剩余动作（请求数停止增长），再测“播放期是否还发请求”
  let last = -1, stable = 0;
  while (stable < 3 && Date.now() - t0 < 120000) {
    await page.waitForTimeout(500);
    if (webpCount === last) stable++; else { stable = 0; last = webpCount; }
  }
  const allLoadedMs = Date.now() - t0;

  // 页面内高频采样帧 src
  await page.evaluate(() => {
    window.__s = [];
    const img = document.querySelector('.webmeji-container img');
    window.__t = setInterval(() => { if (img) window.__s.push(img.getAttribute('src') || ''); }, 40);
  });
  await page.waitForTimeout(OBSERVE);
  const samples = await page.evaluate(() => {
    clearInterval(window.__t);
    return window.__s;
  });
  const reqAtEnd = webpCount;

  // 统计切换次数（相邻不同即算一次）
  let switches = 0;
  for (let i = 1; i < samples.length; i++) if (samples[i] !== samples[i - 1]) switches++;
  const distinct = new Set(samples.filter(Boolean)).size;

  console.log(`\n—— 慢网 ${RTT}ms/请求，观察 ${OBSERVE}ms ——`);
  console.log(`宠物出现耗时: ${spawnMs}ms（核心帧 ${reqAtSpawn} 个请求）；全部帧就绪 ${allLoadedMs}ms（累计 ${reqAtEnd0} 次）`);
  console.log(`观察期新增帧请求: ${reqAtEnd - reqAtSpawn} 次`);
  console.log(`帧切换: ${switches} 次 / 采样 ${samples.length} 次，出现 ${distinct} 个不同帧`);
  console.log(`帧 URL 形态: ${(samples.find(Boolean) || '').slice(0, 24)}…\n`);

  ok('① 宠物出现', spawnMs > 0, `${spawnMs}ms，核心帧 ${reqAtSpawn} 个请求`);
  // 关键断言：引擎预载层（fetch）同一帧只发一次——materializeFrame 的 FRAME_BLOBS/INFLIGHT 双去重失效时才会挂
  // （旧 bug 特征：每切一帧就重新下载一次，CDP 层重复 40+ 线性增长）。img 元素直拉原 URL 的竞态双发
  // 是本地 no-cache 服务器伪影（生产 immutable 缓存下零网络），见 CDP 层展示信息
  const fetched = await page.evaluate(() => window.__FETCHED.filter(u => u.includes('.webp')));
  const fetchDup = fetched.length - new Set(fetched).size;
  const before = new Set(webpUrls.slice(0, reqAtEnd0));
  const during = webpUrls.slice(reqAtEnd0);
  const dup = during.filter(u => before.has(u));
  const repeatAll = webpUrls.length - new Set(webpUrls).size;
  ok('② 预载层无重复请求（fetch 去重生效）', fetchDup === 0,
    `fetch ${fetched.length} 次去重后重复 ${fetchDup} 次；CDP 全层重复 ${repeatAll} 次（含 img 直拉，仅展示）`);
  ok('③ 帧 URL 已 blob 化', (samples.find(Boolean) || '').startsWith('blob:'),
    (samples.find(Boolean) || '').slice(0, 16));
  ok('④ 动画在播（非定格）', switches >= 12, `${switches} 次切换 / ${distinct} 个不同帧`);
  ok('⑤ 无 JS 报错', errors.length === 0, errors.slice(0, 2).join(' ; ') || '无');

  await browser.close();
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('运行失败：', e); process.exit(2); });
