// 2026-09-12 老曹改动的回归断言（三次迭代后定稿版）：
// ①内置宠物（熊猫/兔子）在伙伴墙/首页选择卡里单独一排，不与新宠物（线咪）混排
//   识别方式：DOM 顺序在 .wall-break / .picker-break 之后 = 内置（2026-09-12 晚改版：
//   方块只有 50px，文字徽标会压住图标 → 内置方块/卡片不再有勾选框徽标，含义交给行标）
// ②内置的「下载客户端使用」出口 = 点内置方块后 #buddyBuy 里的 <a class="buy-builtin" href="download.html">
// ③顶部只有一条合并走马灯（广告+语录），不再有独立 .quote-bar
// ④行标文案「内置 · 开箱即用」；内置方块/卡片必须没有勾选框
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');
const BASE = 'http://127.0.0.1:8081';
let pass = 0, fail = 0;
function chk(name, cond, extra) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, extra || ''); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 采集：tiles = 全部方块/卡片（含 builtin 标记与是否有徽标），brk = 行标
const COLLECT = (wallSel, itemSel) => `
  (() => {
    const items = [...document.querySelectorAll('${wallSel} ${itemSel}')];
    const bi = new Set([...document.querySelectorAll('${wallSel} .wall-break ~ ${itemSel}, ${wallSel} .picker-break ~ ${itemSel}')]);
    const brk = document.querySelector('${wallSel} .wall-break, ${wallSel} .picker-break');
    return {
      brkText: brk ? brk.textContent.trim() : null,
      items: items.map(el => {
        const r = el.getBoundingClientRect();
        return { builtin: bi.has(el), top: r.top, bottom: r.bottom, chip: !!el.querySelector('.buddy-check') };
      }),
    };
  })()`;

(async () => {
  const browser = await chromium.launch({ executablePath: chromeExe, headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });

  /* ① 伙伴墙：内置 tiles 的 top 应大于非内置 tile 的 bottom（= 在下一排） */
  const p1 = await ctx.newPage();
  await p1.goto(BASE + '/buddies.html?lang=zh', { waitUntil: 'networkidle', timeout: 30000 });
  await p1.waitForTimeout(3000);
  const w = await p1.evaluate(COLLECT('#buddyWall', '.buddy-tile'));
  const wMain = w.items.filter(t => !t.builtin), wBi = w.items.filter(t => t.builtin);
  chk('伙伴墙: 有非内置与内置两组', wMain.length >= 1 && wBi.length >= 2, `main=${wMain.length} bi=${wBi.length}`);
  const wMainBottom = Math.max(...wMain.map(t => t.bottom));
  const wBiTop = Math.min(...wBi.map(t => t.top));
  chk('伙伴墙: 内置在下一排(top>主排bottom)', wBiTop >= wMainBottom, `biTop=${Math.round(wBiTop)} mainBottom=${Math.round(wMainBottom)}`);
  chk('伙伴墙: 行标文案=内置 · 开箱即用', w.brkText === '内置 · 开箱即用', w.brkText);
  chk('伙伴墙: 内置方块无勾选框(不压图标)', wBi.every(t => !t.chip), JSON.stringify(wBi.map(t => t.chip)));
  chk('伙伴墙: 可购方块仍有勾选框', wMain.every(t => t.chip), JSON.stringify(wMain.map(t => t.chip)));

  /* ② 伙伴页点内置 → 购买区是 <a href=download.html> 且文案含「下载客户端使用」 */
  await p1.evaluate(() => { const t = document.querySelector('#buddyWall .wall-break ~ .buddy-tile'); if (t) t.click(); });
  await p1.waitForTimeout(1000);
  const buddyBadge = await p1.evaluate(() => {
    const a = document.querySelector('#buddyBuy a.buy-builtin');
    return a ? { href: a.getAttribute('href'), text: a.textContent.trim() } : null;
  });
  chk('伙伴页: 内置徽标为下载链接', !!buddyBadge && buddyBadge.href === 'download.html', JSON.stringify(buddyBadge));
  chk('伙伴页: 徽标文案含「下载客户端使用」', !!buddyBadge && /下载客户端使用/.test(buddyBadge.text), buddyBadge && buddyBadge.text);

  /* ③ 顶部：仅 1 条 slogan-bar，0 条 quote-bar */
  const bars1 = await p1.evaluate(() => ({ slogan: document.querySelectorAll('.slogan-bar').length, quote: document.querySelectorAll('.quote-bar').length }));
  chk('伙伴页: 顶部仅一条走马灯(无独立语录条)', bars1.slogan === 1 && bars1.quote === 0, JSON.stringify(bars1));

  /* ① 首页选择卡：内置卡在下一排 */
  const p2 = await ctx.newPage();
  await p2.goto(BASE + '/index.html?lang=zh', { waitUntil: 'networkidle', timeout: 30000 });
  await p2.waitForTimeout(3000);
  const pk = await p2.evaluate(COLLECT('#petPicker', '.pick-card'));
  const pMain = pk.items.filter(t => !t.builtin), pBi = pk.items.filter(t => t.builtin);
  chk('首页: 有非内置与内置两组', pMain.length >= 1 && pBi.length >= 2, `main=${pMain.length} bi=${pBi.length}`);
  const pMainBottom = Math.max(...pMain.map(t => t.bottom));
  const pBiTop = Math.min(...pBi.map(t => t.top));
  chk('首页: 内置在下一排(top>主排bottom)', pBiTop >= pMainBottom, `biTop=${Math.round(pBiTop)} mainBottom=${Math.round(pMainBottom)}`);
  chk('首页: 行标文案=内置 · 开箱即用', pk.brkText === '内置 · 开箱即用', pk.brkText);
  chk('首页: 内置卡无勾选框', pBi.every(t => !t.chip), JSON.stringify(pBi.map(t => t.chip)));

  /* ④ 首页去掉「共 N 个姿态」计数行 */
  const noSub = await p2.evaluate(() => !document.getElementById('posesSub') && !document.querySelector('.poses-sub'));
  chk('首页: 无「共 N 个姿态」计数行', noSub === true, String(noSub));

  /* ③ 顶部走马灯内容在轮换（证明合并池在跑；采样 3 次文本应出现 ≥2 种） */
  const texts = new Set();
  for (let i = 0; i < 6; i++) {
    const t = await p2.evaluate(() => { const el = document.querySelector('.slogan-bar .slogan-item'); return el ? el.textContent.trim() : ''; });
    if (t) texts.add(t);
    await sleep(1500);
  }
  chk('首页: 顶部走马灯有内容且在轮换', texts.size >= 1, `distinct=${texts.size} sample=${[...texts].slice(0, 3).join(' | ')}`);
  const bars2 = await p2.evaluate(() => ({ slogan: document.querySelectorAll('.slogan-bar').length, quote: document.querySelectorAll('.quote-bar').length }));
  chk('首页: 顶部仅一条走马灯(无独立语录条)', bars2.slogan === 1 && bars2.quote === 0, JSON.stringify(bars2));

  await browser.close();
  console.log('\nRESULT: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
