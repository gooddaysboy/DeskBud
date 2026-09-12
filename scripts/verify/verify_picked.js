// 2026-09-12 老曹报"点击线咪却显示 已选 2 只"的回归断言。
// 根因：内置宠物（熊猫/兔子）的历史购物车残留只做了内存过滤，没写回 localStorage，
//       下一次 getPicked() 又把它读回来 → 计数虚高。修复= SITE.sanitizePicked() 统一清洗并持久化。
// 断言：
//  ①残留 [panda,rabbit] → localStorage 被清空、无"已选 2 只"、内置勾选框不亮
//  ②残留 [linekit,panda] → 只留 linekit、"已选 1 只"
//  ③干净环境点线咪勾选框 → "已选 1 只"
//  ④点内置宠物的「内置」标 → 不进购物车（不可选）
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');
const BASE = 'http://127.0.0.1:8081';
const DID = 'dsk0123456789abcdef';
let pass = 0, fail = 0;
function chk(name, cond, extra) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, extra || ''); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

const READ = () => {
  const btn = document.querySelector('#hdBuy') || document.querySelector('#buddyBuy');
  return {
    tip: (document.querySelector('.buy-tip') || {}).textContent || '',
    btn: btn ? btn.textContent.trim() : '',
    ls: localStorage.getItem('deskbud_picked') || '[]',
    onChecks: [...document.querySelectorAll('.buddy-check.on')].length,
  };
};

(async () => {
  const browser = await chromium.launch({ executablePath: chromeExe, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage();

  const load = async (picked, did) => {
    await p.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.evaluate(([pk, d]) => {
      localStorage.setItem('deskbud_picked', pk);
      if (d) localStorage.setItem('deskbud_device_id', d);
      else localStorage.removeItem('deskbud_device_id');
    }, [picked, did || null]);
    await p.reload({ waitUntil: 'domcontentloaded' });
    await sleep(2200);
  };

  /* ① 残留内置宠物（无设备号）→ 必须被清干净 */
  await load('["panda","rabbit"]', null);
  let s = await p.evaluate(READ);
  chk('①残留内置被清出 localStorage', !/panda|rabbit/.test(s.ls), s.ls);
  chk('①无「已选 2 只」', !/已选\s*2\s*只/.test(s.tip + s.btn), `tip="${s.tip}" btn="${s.btn}"`);
  chk('①内置勾选框不亮', s.onChecks === 0, 'on=' + s.onChecks);

  /* ②残留 = 线咪 + 内置 → 只留线咪，计数 1 */
  await load('["linekit","panda"]', DID);
  s = await p.evaluate(READ);
  chk('②只保留 linekit', s.ls === '["linekit"]', s.ls);
  chk('②计数=1 只', /已选\s*1\s*只/.test(s.tip), `tip="${s.tip}"`);

  /* ③干净环境点线咪勾选框 → 已选 1 只（老曹主诉场景） */
  await load('[]', DID);
  await p.evaluate(() => {
    const c = [...document.querySelectorAll('.pick-card')].find(x => /线咪/.test(x.textContent || ''));
    if (c) { const cb = c.querySelector('.buddy-check'); if (cb) cb.click(); }
  });
  await sleep(800);
  s = await p.evaluate(READ);
  chk('③点线咪后计数=1 只', /已选\s*1\s*只/.test(s.tip), `tip="${s.tip}"`);
  chk('③localStorage=linekit', s.ls === '["linekit"]', s.ls);

  /* ④内置卡没有勾选框（2026-09-12 晚改版：徽标会压住 50px 图标）→ 结构上就加不进购物车 */
  const biInfo = await p.evaluate(() => {
    const c = [...document.querySelectorAll('.pick-card')].find(x => /织熊猫/.test(x.textContent || ''));
    if (!c) return { found: false };
    const hasChip = !!c.querySelector('.buddy-check');
    c.click();                       // 点卡片 = 切展示，不是加购
    return { found: true, hasChip };
  });
  await sleep(900);
  s = await p.evaluate(READ);
  chk('④内置卡无勾选框', biInfo.found && biInfo.hasChip === false, JSON.stringify(biInfo));
  chk('④内置不可加购(仍只有 linekit)', s.ls === '["linekit"]', s.ls);

  /* ⑤伙伴页同样清洗 */
  const p2 = await ctx.newPage();
  await p2.goto(BASE + '/buddies.html', { waitUntil: 'domcontentloaded' });
  await p2.evaluate(() => localStorage.setItem('deskbud_picked', '["panda","rabbit"]'));
  await p2.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2200);
  const s2 = await p2.evaluate(READ);
  chk('⑤伙伴页残留也被清', !/panda|rabbit/.test(s2.ls), s2.ls);

  await browser.close();
  console.log(`\nRESULT pass=${pass} fail=${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e.message); process.exit(2); });
