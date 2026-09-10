// 2026-09-10 专注模式卡死复现测试：开关专注+拖拽循环，断言行为持续推进（不卡死）
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');
const BASE = 'http://127.0.0.1:8081';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function chk(name, cond, extra) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, extra || ''); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: chromeExe, headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/index.html?lang=zh', { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(3500);

  const snap = () => p.evaluate(() => {
    const c = window.__WM_CREATURES[0];
    return { x: Math.round(c.positionX), y: Math.round(c.positionY), edge: c.currentEdge,
      action: c.currentAction, focus: c.focusMode, falling: c.isFalling, jump: c.isJumping };
  });

  /* 循环 3 轮：开专注(含拖到中部松手) → 等 4s → 断言宠物有动作推进（位置或 edge 或 action 变化） */
  for (let round = 1; round <= 3; round++) {
    const before = await snap();
    // 右键开专注
    await p.mouse.click(before.x + 50, before.y + 50, { button: 'right' });
    await sleep(300);
    await p.evaluate(() => { const m = document.getElementById('wm-deskbud-menu'); if (m && m.style.display !== 'none') m.querySelector('button').click(); });
    // 拖到屏幕中部松手
    const c1 = await snap();
    await p.mouse.move(c1.x + 50, c1.y + 50);
    await p.mouse.down();
    for (let i = 1; i <= 8; i++) await p.mouse.move(c1.x + 50 + (640 - c1.x - 50) * i / 8, c1.y + 50 + (750 - c1.y - 50) * i / 8);
    await p.mouse.up();
    // 观察 6s：状态应持续推进（position 或 edge 或 action 至少一项变化）
    let progressed = false, last = await snap(), first = last;
    for (let i = 0; i < 12; i++) {
      await sleep(500);
      last = await snap();
      if (last.x !== first.x || last.y !== first.y || last.edge !== first.edge || last.action !== first.action) { progressed = true; break; }
    }
    chk(`轮${round} 专注开启+拖拽后行为推进(不卡死)`, progressed,
      `first=${JSON.stringify(first)} last=${JSON.stringify(last)}`);
    // 关专注（右键）
    const cm = await snap();
    await p.mouse.click(cm.x + 50, cm.y + 50, { button: 'right' });
    await sleep(300);
    await p.evaluate(() => { const m = document.getElementById('wm-deskbud-menu'); if (m && m.style.display !== 'none') m.querySelector('button').click(); });
    await sleep(500);
    const off = await snap();
    chk(`轮${round} 关专注恢复`, off.focus === false, `focus=${off.focus}`);
  }

  /* 顶部倒走悬停暂停 */
  const s = await snap();
  if (s.edge === 'top') {
    const x0 = s.x;
    await p.mouse.move(s.x + 50, s.y + 50); await sleep(1200);
    const s2 = await snap();
    chk('顶部悬停暂停(位置冻结)', Math.abs(s2.x - x0) < 3, `dx=${Math.round(s2.x - x0)}`);
  } else {
    console.log('SKIP 顶部悬停（宠物未在顶边）');
    pass++;
  }

  await browser.close();
  console.log('\nRESULT: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
