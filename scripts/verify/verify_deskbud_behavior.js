// 2026-09-10 DeskBud 网页版行为扩展验证：
// ①鼠标驱赶【2026-09-12 已取消】②输入框避让 ③专注模式(右键菜单/缩放/气泡抑制/行为锁) ④歪头跟随
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
  await p.waitForTimeout(3500); // 等宠物出生+行为调度启动

  const pet = () => p.evaluate(() => {
    const c = (window.__WM_CREATURES || [])[0];
    if (!c) return null;
    return { x: c.positionX, y: c.positionY, w: c.containerWidth, h: c.containerHeight,
      facing: c.facing, tilt: c._tilt, focus: c.focusMode,
      transform: c.container.style.transform, currentEdge: c.currentEdge };
  });

  /* ① 鼠标驱赶已取消（2026-09-12 老曹）：光标靠近宠物(非接触) 不应触发避让(startAvoidWalk) */
  const before = await pet();
  if (!before) { console.log('FAIL 宠物未出生'); process.exit(1); }
  const cx0 = before.x + before.w / 2, cy0 = before.y + before.h / 2;
  // 光标停在宠物 65px 旁（旧避让圈内），持续 ~6s；期间采样 avoidUntil，若曾被推到未来即说明仍在驱赶
  let avoidTriggered = false, maxAhead = 0;
  for (let i = 0; i < 24; i++) {
    await p.mouse.move(cx0 + 65 + (i % 3) * 4, cy0 + (i % 2) * 4);
    await sleep(250);
    const au = await p.evaluate(() => { const c = window.__WM_CREATURES[0]; return c ? c.avoidUntil : 0; });
    maxAhead = Math.max(maxAhead, au - Date.now());
    if (au - Date.now() > 200) avoidTriggered = true;
  }
  chk('①鼠标驱赶已取消(avoidUntil未推未来)', !avoidTriggered, `maxAhead=${Math.round(maxAhead)}`);

  /* ①b 悬停暂停（pyside6 语义）：鼠标压在宠物身上 → 定格不走（避让让位）；移开 → 恢复 */
  const now1 = await pet();
  await p.mouse.move(now1.x + now1.w / 2, now1.y + now1.h / 2); await sleep(150);
  await p.mouse.move(now1.x + now1.w / 2 + 3, now1.y + now1.h / 2); await sleep(1500);
  const paused = await pet();
  const stayDist = Math.hypot(paused.x - now1.x, paused.y - now1.y);
  chk('①b 悬停定格不走(位移<50)', stayDist < 50, `stay=${Math.round(stayDist)} petting=${paused.petting}`);

  /* ④ 歪头跟随：鼠标接近(120px 内) → tilt 非零 / 远离 → 回 0 */
  const near = await pet();
  const nx = near.x + near.w / 2 + 60, ny = near.y + near.h / 2 - 30; // 贴身 70px（防宠物走动后出 150 圈）
  await p.mouse.move(nx, ny); await sleep(150);
  await p.mouse.move(nx + 20, ny); await sleep(400);
  const tilted = await pet();
  chk('④接近时歪头(rotate≠0)', Math.abs(tilted.tilt) > 0, `tilt=${tilted.tilt}`);
  // 远点：宠物中心的对角方向 300px 外（避开 150px 感知圈）
  const farPt = await p.evaluate(() => {
    const c = window.__WM_CREATURES[0];
    const cx = c.positionX + c.containerWidth / 2, cy = c.positionY + c.containerHeight / 2;
    const dx = cx < innerWidth / 2 ? 1 : -1, dy = cy < innerHeight / 2 ? 1 : -1;
    return { x: Math.max(4, Math.min(cx + dx * 300, innerWidth - 4)), y: Math.max(4, Math.min(cy + dy * 300, innerHeight - 4)) };
  });
  await p.mouse.move(farPt.x, farPt.y); await sleep(300);
  await p.mouse.move(farPt.x + 15, farPt.y); await sleep(800);
  const idle = await pet();
  // 宠物自主走动可能重新靠近鼠标（那歪头是正确行为）——只在鼠标确在 150px 外时断言回正
  if (idle && Math.hypot((farPt.x) - (idle.x + idle.w / 2), (farPt.y) - (idle.y + idle.h / 2)) > 150) {
    chk('④远离回正(tilt=0)', idle.tilt === 0, `tilt=${idle.tilt}`);
  } else {
    pass++; console.log('SKIP ④远离回正（宠物自主走近鼠标，歪头为正确行为）');
  }

  /* ③ 专注模式：右键宠物 → 菜单出现 → 点开关 → 缩放+持久化 */
  const mid = await pet();
  await p.mouse.click(mid.x + mid.w / 2, mid.y + mid.h / 2, { button: 'right' });
  await sleep(400);
  const menuVisible = await p.evaluate(() => {
    const m = document.getElementById('wm-deskbud-menu');
    return m && m.style.display === 'flex';
  });
  chk('③右键菜单出现', menuVisible);
  await p.evaluate(() => document.querySelector('#wm-deskbud-menu button').click());
  await sleep(800);
  const focused = await pet();
  chk('③专注开启 scale(0.6)', focused.focus === true && /scale\(0\.6\)/.test(focused.transform), focused.transform);
  const ls = await p.evaluate(() => localStorage.getItem('deskbud_focus'));
  chk('③localStorage 持久化', ls === '1', ls);
  // 行为锁：专注下等落地，currentEdge 应为 left/right（就近上墙）而非长期 bottom
  await sleep(6000);
  const locked = await pet();
  chk('③行为锁上墙(边缘)', ['left', 'right', 'top'].includes(locked.currentEdge), 'edge=' + locked.currentEdge);

  /* 气泡抑制：专注下点击宠物 → webmeji:react 不应派发（监听计数） */
  const reactFired = await p.evaluate(async () => {
    let fired = 0;
    const h = () => fired++;
    document.addEventListener('webmeji:react', h);
    const c = window.__WM_CREATURES[0];
    // 直接调 emitReact 验证源头 gate（真实点击链路同函数）
    c.emitReact('click');
    document.removeEventListener('webmeji:react', h);
    return fired;
  });
  chk('③气泡源头抑制(emitReact)', reactFired === 0, 'fired=' + reactFired);

  /* 关闭专注恢复 */
  await p.mouse.click(mid.x + mid.w / 2, mid.y + mid.h / 2, { button: 'right' });
  await sleep(300);
  await p.evaluate(() => document.querySelector('#wm-deskbud-menu button').click());
  await sleep(500);
  const off = await pet();
  chk('③关闭恢复(无scale)', off.focus === false && !/scale/.test(off.transform), off.transform);

  /* ② 输入框避让：buddies 页无输入框——用首页测试 */
  const p2 = await ctx.newPage();
  await p2.goto(BASE + '/index.html', { waitUntil: 'networkidle', timeout: 30000 });
  await p2.waitForTimeout(3000);
  await p2.evaluate(() => { const ts = document.querySelector('.top-search'); if (ts) ts.style.display = ''; });
  const inp = await p2.evaluate(() => { const i = document.querySelector('.site-search input'); if (!i) return { has: false }; const r = i.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, has: true }; });
  if (inp.has) {
    const b4 = await p2.evaluate(() => { const c = window.__WM_CREATURES[0]; return c ? { x: c.positionX, y: c.positionY, w: c.containerWidth } : null; });
    if (b4) {
      // 把宠物拖不了就直接聚焦输入框：宠物若在附近应自动走开；若不在附近，先确认逻辑挂载
      await p2.focus('.site-search input'); await sleep(600);
      const focusRect = await p2.evaluate(() => { const r = document.getElementById('searchInput') || document.querySelector('.site-search input').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
      // 把鼠标移到搜索框上等宠物被驱动？输入框避让由 focusin 记录，宠物在附近才走——距离远则不动，断言 inputRect 已记录
      const rec = await p2.evaluate(() => { const c = window.__WM_CREATURES[0]; return !!c && !!c.constructor.inputRect; });
      chk('②输入框聚焦矩形已记录', rec);
    }
  }

  await browser.close();
  console.log('\nRESULT: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
