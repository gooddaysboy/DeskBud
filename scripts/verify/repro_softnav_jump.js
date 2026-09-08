/**
 * 复现：软导航"再点首页"后宠物位置跳变（老曹：宠物走到中间/左边被回退到右边）
 * 采样 creature.positionX 与容器实际 left/top，跨 4 步：首页 → 伙伴之家 → 首页 → 再点首页
 */
const { chromium } = require('playwright-core');
const EXE = require('./_env.js').chromeExe;
const BASE = 'http://127.0.0.1:8080';

const snap = (page) => page.evaluate(() => {
  const c = window.__WM_CREATURES && window.__WM_CREATURES[0];
  if (!c) return null;
  const el = c.container;
  return { x: c.positionX, left: el.style.left, top: el.style.top,
           rect: el.getBoundingClientRect().left, action: c.currentAction,
           n: (window.__WM_CREATURES || []).length };
});

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--no-proxy-server'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const navs = [], errs = [], cons = [];
  page.on('framenavigated', f => { if (f === page.mainFrame()) navs.push(`${Date.now() % 100000} ${f.url()}`); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') cons.push(m.type() + ': ' + m.text().slice(0, 120)); });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__WM_CREATURES && window.__WM_CREATURES.length > 0, { timeout: 20000 });
  await page.waitForTimeout(2500);  // 让宠物走一段

  const step = async (label) => {
    const s = await snap(page);
    if (!s) {
      console.log(`[${label}] ⚠️ 宠物实例消失（__WM_CREATURES 空或未生成 → 疑似整页重载）`);
      return null;
    }
    console.log(`[${label}] n=${s.n} positionX=${s.x.toFixed(0)} styleLeft=${s.left} rectLeft=${s.rect.toFixed(0)} top=${s.top} action=${s.action}`);
    return s;
  };

  await step('① 首页走 2.5s 后');
  await page.click('nav.nav a[href="pets.html"]');
  await page.waitForTimeout(2000);
  await step('② 软导航到伙伴之家');
  await page.click('nav.nav a[href="index.html"]');
  await page.waitForTimeout(2000);
  const a = await step('③ 软导航回首页');
  // 再点首页（老曹出问题的操作）
  await page.click('nav.nav a[href="index.html"]');
  await page.waitForTimeout(1500);
  const b = await step('④ 再点首页 +1.5s');
  await page.waitForTimeout(2000);
  const c = await step('⑤ 再点首页 +3.5s');

  console.log('\n—— 导航事件（整页加载才会出现）——');
  navs.forEach(n => console.log('  ' + n));
  if (errs.length) { console.log('—— 页面报错 ——'); errs.slice(0, 5).forEach(e => console.log('  ' + e)); }
  if (cons.length) { console.log('—— console warn/error ——'); cons.slice(0, 8).forEach(e => console.log('  ' + e)); }

  if (!b || !c) {
    console.log('\n>>> 复现：宠物实例在"再点首页"后消失/更换 → 整页重载，宠物随机重生');
  } else if (b.n !== a.n || c.top === 'auto') {
    console.log('\n>>> 复现：宠物被重新生成（数量/初始态变化）→ 整页重载');
  } else {
    console.log('\n>>> 未复现：同一批宠物连续存活，无整页重载 ✅');
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
