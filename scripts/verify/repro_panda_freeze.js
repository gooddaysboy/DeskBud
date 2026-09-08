/**
 * 复现"熊猫卡死"：模拟普通刷新（用缓存）多轮，逐轮观察两只宠物的内部状态。
 * 判定卡死：宠物出现后 6s 内 positionX 与 img.src 均无变化（帧动画与位移全停）。
 * 关键诊断字段：bootPoll 是否还在轮询、isActionReady('walk')、currentAction。
 *
 * 前置：本地预览服务 8080 已起。
 * 跑法：NODE_PATH=<managed node workspace>/node_modules node scripts/verify/repro_panda_freeze.js
 */
const { chromium } = require('playwright-core');
const { chromeExe: EXE } = require('./_env.js');

const BASE = 'http://127.0.0.1:8080';
const ROUNDS = 4;
const WATCH_MS = 6000;

(async () => {
  const browser = await chromium.launch({
    executablePath: EXE, headless: true, args: ['--no-proxy-server',
      // 禁用后台定时器节流——headless 页被视为后台时 setInterval 会被压到 1s，造成"动作凝滞"假卡死
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  page.on('response', r => { if (r.status() === 404) errors.push(`404: ${r.url()}`); });
  page.on('pageerror', e => errors.push(`pageerror: ${String(e).slice(0, 160)}`));

  for (let round = 1; round <= ROUNDS; round++) {
    errors.length = 0;
    await page.goto(BASE + '/index.html', { waitUntil: 'load' });   // 普通加载（走缓存）
    // 等宠物出现（最多 12s）
    try {
      await page.waitForFunction(() => window.__WM_CREATURES && window.__WM_CREATURES.length >= 2, { timeout: 12000 });
    } catch (e) {
      const errs = [...new Set(errors)].slice(0, 3).join(' | ');
      console.log(`第${round}轮 ❌ 12s 内宠物未齐：${await page.evaluate(() => (window.__WM_CREATURES || []).length)} 错误: ${errs || '无'}`);
      continue;
    }
    await page.waitForTimeout(1200);  // 出生稳定

    // 采样 6s：每 500ms 读两只宠物状态；判定"冻结"= 连续 3 次（≥1.5s）x/y/src 全无变化
    //（bounce 蹦跳后有 1~4s 原地休息停顿属正常设计，靠 y 轴变化 + 3 连规则排除误报）
    const snap = () => page.evaluate(() => (window.__WM_CREATURES || []).map((c, i) => ({
      i,
      action: c.currentAction,
      x: Math.round(c.positionX),
      y: Math.round(c.positionY),
      src: (c.img && c.img.src || '').slice(-28),
      ready: c.isActionReady('walk'),
      bootPoll: !!c.bootPoll,
      ft: !!c.frameTimer,           // 帧计时器是否在跑
      ct: !!c.actionCompletionTimer, // 动作完成定时器是否在跑
      loops: (c.spriteConfig.forcethink || {}).loops,
      cfgFT: !!(c.spriteConfig.forcethink),
    })));
    let last = null, staticRun = null, frozen = null;
    const deadline = Date.now() + WATCH_MS;
    while (Date.now() < deadline) {
      await page.waitForTimeout(500);
      const s = await snap();
      if (last) {
        staticRun = {};
        for (const cur of s) {
          const prev = last.find(f => f.i === cur.i);
          if (!prev) continue;
          const still = cur.x === prev.x && cur.y === prev.y && cur.src === prev.src;
          staticRun[cur.i] = (still ? (staticRun[cur.i] || 0) : 0) + (still ? 1 : 0);
          if (staticRun[cur.i] >= 2 && !cur.bootPoll) {   // 连续 2 次相邻静止（累计 3 个静止点 ≈1.5s）
            frozen = { pet: cur.i === 0 ? '兔子' : '熊猫', ...cur };
            break;
          }
        }
      }
      last = s;
      if (frozen) break;
    }
    const first = last;
    const tag = r => r.map(c => `${c.i === 0 ? '兔' : '熊'}[action=${c.action} x=${c.x} ready=${c.ready} poll=${c.bootPoll}]`).join(' ');
    console.log(`第${round}轮 ${frozen ? `❌ 冻结 → ${frozen.pet} action=${frozen.action} ready=${frozen.ready}` : '✅ 两只都在动'}`);
    if (last.length) console.log(`   末态: ${tag(last)}`);
    if (frozen) {
      const cur = last.find(c => (c.i === 0) === (frozen.pet === '兔子'));
      if (cur) console.log(`   诊断: frameTimer=${cur.ft} completionTimer=${cur.ct} forcethink配置=${cur.cfgFT} forcethink.loops=${cur.loops}`);
      // 高频采样 1.5s：src 到底动不动 + 运行时 frames 长度
      const dense = await page.evaluate(async (idx) => {
        const c = window.__WM_CREATURES[idx];
        const ftLen = (c.spriteConfig.forcethink || {}).frames?.length;
        const seq = [];
        for (let i = 0; i < 15; i++) {
          seq.push((c.img.src || '').slice(-14));
          await new Promise(r => setTimeout(r, 100));
        }
        return { ftLen, unique: new Set(seq).size, sample: seq.slice(0, 4) };
      }, cur.i);
      console.log(`   高频采样: forcethink.frames.length=${dense.ftLen} 1.5s内src种类=${dense.unique} 样例=${dense.sample.join(' | ')}`);
      // 8s 动作时间线：看 force-think 是"永久驻留"还是"反复重入"
      const timeline = await page.evaluate(async () => {
        const c = window.__WM_CREATURES.find(x => x.currentAction === 'force-think') || window.__WM_CREATURES[1];
        const seq = [];
        const t0 = Date.now();
        while (Date.now() - t0 < 8000) {
          const a = c.currentAction;
          if (!seq.length || seq[seq.length - 1].a !== a) seq.push({ a, t: Date.now() - t0 });
          await new Promise(r => setTimeout(r, 120));
        }
        return seq.map(s => `${s.a}@${s.t}ms`).join(' → ');
      });
      console.log(`   时间线: ${timeline}`);
    }
    if (errors.length) console.log(`   console/网络: ${[...new Set(errors)].slice(0, 4).join(' | ')}`);
  }

  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
