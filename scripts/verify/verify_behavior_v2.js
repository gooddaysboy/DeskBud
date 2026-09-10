// 2026-09-10 二轮行为验证：避让到墙边 / 专注禁摸头 / 专注立即赶墙 / 绕圈跟跑
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');
const BASE = 'http://127.0.0.1:8081';
let pass = 0, fail = 0;
function chk(name, cond, extra) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, extra || ''); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ executablePath: chromeExe, headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/index.html?lang=zh', { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(3500);

  const pet = () => p.evaluate(() => {
    const c = window.__WM_CREATURES[0];
    return c ? { x: c.positionX, y: c.positionY, w: c.containerWidth, h: c.containerHeight,
      facing: c.facing, tilt: c._tilt, focus: c.focusMode, edge: c.currentEdge,
      petting: c.isPetting, transform: c.container.style.transform } : null;
  });

  /* ① 避让走远：鼠标压住 → 宠物应走到就近墙边（贴墙 ≤60px） */
  let c0 = await pet();
  const mx = c0.x + c0.w / 2, my = c0.y + c0.h / 2;
  for (let i = 0; i < 8; i++) { await p.mouse.move(mx + 65 + (i % 3) * 4, my + (i % 2) * 4); await sleep(150); }
  // 轮询 9s 断言"曾经走远"（宠物自主走动可能又靠近鼠标——避让是反复驱离，单点采样 flaky）
  let ok1 = false, lastS = null;
  for (let i = 0; i < 18; i++) {
    await sleep(500);
    lastS = await pet();
    const d = Math.hypot(lastS.x + lastS.w / 2 - mx, lastS.y + lastS.h / 2 - my);
    const nw = Math.min(lastS.x, 1280 - lastS.x - lastS.w);
    if (d > 150 || nw < 60) { ok1 = true; break; }
  }
  chk('①避让走远(曾>150 或贴墙)', ok1, `d=${lastS ? Math.round(Math.hypot(lastS.x + lastS.w / 2 - mx, lastS.y + lastS.h / 2 - my)) : '?'}`);

  /* ③ 专注：禁摸头 + 立即赶墙 */
  c0 = await pet();
  await p.mouse.click(c0.x + c0.w / 2, c0.y + c0.h / 2, { button: 'right' });
  await sleep(350);
  await p.evaluate(() => document.querySelector('#wm-deskbud-menu button').click());
  // 立即性：轮询 2s 内应动身（宠物恰在 fall/jump 动作中会等动作完，但比旧行为链快得多）
  let ok3 = false, s2 = null;
  for (let i = 0; i < 8; i++) {
    await sleep(250);
    s2 = await pet();
    if (s2.focus && (Math.abs(s2.x - c0.x) > 8 || s2.edge !== 'bottom')) { ok3 = true; break; }
  }
  chk('③专注立即赶墙(2s 内动身)', ok3, `dx=${s2 ? Math.round(Math.abs(s2.x - c0.x)) : '?'} edge=${s2 ? s2.edge : '?'}`);
  await sleep(4000);
  const s3 = await pet();
  const wall = Math.min(s3.x, 1280 - s3.x - s3.w);
  chk('③专注最终在墙边(贴墙<40 或已抓边)', wall < 40 || s3.edge !== 'bottom', `wall=${Math.round(wall)} edge=${s3.edge}`);
  // 禁摸头：鼠标悬停宠物中心 → isPetting 应为 false
  await p.mouse.move(s3.x + s3.w / 2, s3.y + s3.h / 2); await sleep(500);
  await p.mouse.move(s3.x + s3.w / 2 + 3, s3.y + s3.h / 2); await sleep(400);
  const hover = await pet();
  chk('③专注禁摸头', !hover.petting, `petting=${hover.petting}`);

  /* ④ 专注下拖到中部松手 → 落地后应回墙（不再"挂在鼠标上"） */
  const c4 = await pet();
  const midX = 1280 / 2, midY = 800 - c4.h / 2;
  await p.mouse.move(c4.x + c4.w / 2, c4.y + c4.h / 2);
  await p.mouse.down();
  for (let i = 1; i <= 10; i++) await p.mouse.move(c4.x + c4.w / 2 + (midX - c4.x - c4.w / 2) * i / 10, c4.y + c4.h / 2 + (midY - c4.y - c4.h / 2) * i / 10);
  await p.mouse.up();
  // 轮询 8s：宠物应回到墙边/抓边（fall+resume+jump 链路时序有波动，单点断言 flaky）
  let ok4 = false, s4 = null;
  for (let i = 0; i < 16; i++) {
    await sleep(500);
    s4 = await pet();
    const wallNow = Math.min(s4.x, 1280 - s4.x - s4.w);
    if (wallNow < 40 || s4.edge !== 'bottom') { ok4 = true; break; }
  }
  chk('④专注拖后回墙(贴墙<40 或抓边)', ok4, `wall=${s4 ? Math.round(Math.min(s4.x, 1280 - s4.x - s4.w)) : '?'} edge=${s4 ? s4.edge : '?'}`);

  /* 关闭专注恢复 */
  await p.mouse.click(s4.x + s4.w / 2, s4.y + s4.h / 2, { button: 'right' });
  await sleep(300);
  await p.evaluate(() => document.querySelector('#wm-deskbud-menu button').click());
  await sleep(400);
  const s5 = await pet();
  chk('④关闭专注恢复', s5.focus === false && !/scale/.test(s5.transform), s5.transform);

  await browser.close();
  console.log('\nRESULT: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
