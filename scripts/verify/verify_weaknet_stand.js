/**
 * 验证：弱网 8s 兜底出生后"静帧站立等待"，绝不滑行；帧就绪后自动开跑
 *
 * 场景：每个 webp 请求人为延迟 RTT=5000ms（模拟单位网络首次访问，零缓存）
 * 时间线：walk 13 帧/8 并发 → 2 批 ≈ 10s 就绪 > 8s 兜底
 *   t≈8s   兜底 spawn，此时 walk 未就绪 → 必须静帧站立（positionX 不变）
 *   t≈10s  walk 就绪 → bootPoll 唤醒，开始正常行为（positionX 开始变化）
 * 断言：
 *   ① 兜底出生后至 walk 就绪前，positionX 位移 == 0（不滑行）
 *   ② walk 就绪后 3s 内 positionX 位移 > 0（自动开跑，无需刷新）
 *   ③ 无 JS 报错
 *
 * 跑法：
 * NODE_PATH=<WorkBuddy node workspace>/node_modules node scripts/verify/verify_weaknet_stand.js
 */
const { chromium } = require('playwright-core');
const EXE = require('./_env.js').chromeExe;
const URL = 'http://127.0.0.1:8080/index.html';
const RTT = parseInt(process.env.WM_RTT || '5000', 10);

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  console.log(`${cond ? '✅' : '❌'} ${name}${extra !== undefined ? '  → ' + extra : ''}`);
  cond ? pass++ : fail++;
};

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--no-proxy-server'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.route('**/assets/webmeji/**/*.webp', async (route) => {
    await new Promise(r => setTimeout(r, RTT));
    route.continue();
  });

  const t0 = Date.now();
  await page.goto(URL, { waitUntil: 'load' });

  // 等 spawn（8s 兜底或帧就绪，取先到）
  await page.waitForFunction(() => window.__WM_CREATURES && window.__WM_CREATURES.length > 0, { timeout: 20000 });
  const spawnAt = Date.now() - t0;
  console.log(`[时序] 宠物出生 @ ${spawnAt}ms`);

  // 采样：每 200ms 记录 (isActionReady('walk'), positionX)；就绪后再多采 9s（覆盖 8s 开跑窗口）
  const samples = [];
  let readySeenAt = -1;
  const deadline = t0 + 20000;
  while (Date.now() < deadline) {
    const s = await page.evaluate(() => {
      const c = window.__WM_CREATURES && window.__WM_CREATURES[0];
      if (!c) return null;
      return { ready: c.isActionReady('walk'), x: c.positionX, action: c.currentAction };
    });
    if (s) {
      samples.push({ t: Date.now() - t0, ...s });
      if (s.ready && readySeenAt < 0) readySeenAt = Date.now() - t0;
    }
    if (readySeenAt > 0 && Date.now() - t0 > readySeenAt + 9000) break;
    await new Promise(r => setTimeout(r, 200));
  }

  // ① walk 就绪前：positionX 必须纹丝不动
  const before = samples.filter(s => !s.ready);
  const beforeMaxDx = before.length > 1
    ? Math.max(...before.map(s => Math.abs(s.x - before[0].x)))
    : 0;
  ok('① 帧就绪前零位移（静帧站立，不滑行）',
     before.length === 0 || beforeMaxDx < 1,
     `就绪前采样 ${before.length} 次, 最大位移 ${beforeMaxDx.toFixed(2)}px`);
  if (beforeMaxDx >= 1) {
    // 诊断：dump 位移发生的采样（t / action / x）
    const moved = before.filter(s => Math.abs(s.x - before[0].x) > 1).slice(0, 10);
    console.log('  [诊断] 就绪前位移采样:', moved.map(s => `t=${s.t} action=${s.action} x=${s.x.toFixed(0)} ready=${s.ready}`).join(' | '));
    const acts = [...new Set(before.map(s => s.action))];
    console.log('  [诊断] 就绪前出现过的动作:', acts.join(','));
  }

  // ② walk 就绪后 8s 内开始位移（就绪瞬间可能正在播 stand 等动作，播完才轮到走）
  const firstReady = samples.find(s => s.ready);
  let moved = false, movedAt = -1;
  if (firstReady) {
    const x0 = firstReady.x;
    const after = samples.filter(s => s.t >= firstReady.t && s.t <= firstReady.t + 8000);
    moved = after.some(s => Math.abs(s.x - x0) > 2);
    movedAt = after.find(s => Math.abs(s.x - x0) > 2)?.t ?? -1;
  }
  ok('② walk 就绪后自动开跑（无需刷新）', moved,
     firstReady ? `就绪 @ ${firstReady.t}ms, 首次位移 @ ${movedAt}ms` : '从未就绪（异常）');

  // ③ 无 JS 报错
  ok('③ 无 JS 报错', errs.length === 0, errs.join(' | ') || 'clean');

  const readyAt = firstReady ? firstReady.t : '?';
  console.log(`\n[结论] 出生@${spawnAt}ms 就绪@${readyAt}ms → ${fail === 0 ? 'PASS' : 'FAIL'} (${pass}过/${fail}败)`);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
