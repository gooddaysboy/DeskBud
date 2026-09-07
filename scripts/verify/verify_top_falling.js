/**
 * 取证脚本：① 顶部运动是否倒立（topwalk 应 inverted=true / transform 含 scaleY(-1)）
 *          ② 降落开始时帧序列是否"忽闪"（falling 帧循环轮数）
 * 依赖：引擎把实例挂在 window.__WM_CREATURES
 * 用法：NODE_PATH=<workspace>/node_modules node scripts/verify/verify_top_falling.js
 */
const { chromium } = require('playwright-core');

const CHROME = 'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const BASE = 'http://127.0.0.1:8080/index.html';

const ok = (name, cond, extra) =>
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  —— ' + extra : ''}`);

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForSelector('.webmeji-container img', { timeout: 20000 });
  await page.waitForFunction(() => window.__WM_CREATURES && window.__WM_CREATURES.length, { timeout: 20000 });
  await page.waitForTimeout(1200);

  const box = await page.locator('.webmeji-container').boundingBox();

  // ---- 拖到顶部 ----
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(box.x + box.width / 2, box.y + (0 - box.y) * (i / 12) + 5, { steps: 2 });
    await page.waitForTimeout(20);
  }
  await page.mouse.up();

  // ---- 采样 12s：action / inverted / transform ----
  const samples = await page.evaluate(() => new Promise(resolve => {
    const out = [];
    const t0 = Date.now();
    const timer = setInterval(() => {
      const c = (window.__WM_CREATURES || [])[0];
      if (!c) return;
      out.push({
        t: Date.now() - t0,
        act: c.currentAction,
        inv: !!c.inverted,
        tf: c.img.style.transform || '',
        y: Math.round(c.container.getBoundingClientRect().top),
        edge: c.currentEdge,
      });
      if (Date.now() - t0 > 12000) { clearInterval(timer); resolve(out); }
    }, 60);
  }));

  const segs = [];
  for (const s of samples) {
    const key = `${s.act} | ${s.inv ? '倒立' : '正立'} | ${s.edge}`;
    const last = segs[segs.length - 1];
    if (last && last.key === key) { last.n++; last.end = s.t; }
    else segs.push({ key, n: 1, start: s.t, end: s.t });
  }
  console.log('=== 顶部 12s 动作段 ===');
  segs.forEach(s => console.log(`  ${String(s.start).padStart(5)}~${String(s.end).padStart(5)}ms  ${String(s.end - s.start).padStart(5)}ms  ${s.key}`));

  const tw = segs.filter(s => s.key.startsWith('topwalk'));
  const twInv = tw.filter(s => s.key.includes('倒立'));
  console.log('');
  ok('① topwalk 出现', tw.length > 0, `${tw.length} 段`);
  ok('① topwalk 为倒立(inverted=true)', tw.length > 0 && twInv.length === tw.length,
    `倒立 ${twInv.length}/${tw.length} 段`);

  const hang = segs.filter(s => s.key.startsWith('hangstillTop'));
  ok('① hangstillTop 为正立(不倒置)', hang.every(s => s.key.includes('正立')),
    `${hang.length} 段，其中正立 ${hang.filter(s => s.key.includes('正立')).length}`);

  // ---- 强制触发一次下落，采样帧切换 ----
  console.log('\n--- 触发 fallToBottom，采样 3s ---');
  const fall = await page.evaluate(() => new Promise(resolve => {
    const c = window.__WM_CREATURES[0];
    const out = [];
    const t0 = Date.now();
    let lastSrc = '';
    c.fallToBottom();
    const timer = setInterval(() => {
      out.push({
        t: Date.now() - t0,
        act: c.currentAction,
        src: c.img.getAttribute('src') || '',
        y: Math.round(c.container.getBoundingClientRect().top),
      });
      if (Date.now() - t0 > 3000) { clearInterval(timer); resolve(out); }
    }, 25);
  }));

  const fSegs = [];
  for (const s of fall) {
    const last = fSegs[fSegs.length - 1];
    if (last && last.act === s.act && last.src === s.src) { last.end = s.t; }
    else fSegs.push({ act: s.act, src: s.src, start: s.t, end: s.t });
  }
  console.log('=== 下落期帧段（每帧显示时长）===');
  fSegs.forEach(s => console.log(`  ${String(s.start).padStart(4)}~${String(s.end).padStart(4)}ms  ${String(s.end - s.start).padStart(4)}ms  ${s.act}  ${String(s.src).slice(0, 24)}`));

  const fallingSegs = fSegs.filter(s => s.act === 'falling');
  const uniqFall = [...new Set(fallingSegs.map(s => s.src))];
  const fallDur = fallingSegs.length ? fallingSegs[fallingSegs.length - 1].end - fallingSegs[0].start : 0;
  console.log(`\n② falling: ${fallingSegs.length} 个帧段 / 唯一帧 ${uniqFall.length} 个 / 持续 ${fallDur}ms`);
  if (fallingSegs.length) {
    console.log(`   平均每帧显示 ${Math.round(fallDur / fallingSegs.length)}ms（配置 interval=120ms）`);
    console.log(`   循环轮数 ≈ ${(fallingSegs.length / Math.max(uniqFall.length, 1)).toFixed(1)} 轮`);
  }

  ok('④ 无 JS 报错', errors.length === 0, errors.join(' ; ') || '无');
  await browser.close();
})().catch(e => { console.error('脚本异常:', e); process.exit(1); });
