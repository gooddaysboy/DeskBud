// 2026-09-11 购物车二轮验证：选1只也显示提示 + 付款后自动清除已购项
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');
const BASE = 'http://127.0.0.1:8081';
const DID = 'dsk0123456789abcdef';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const chk = (n, c, x) => { c ? (pass++, console.log('PASS', n)) : (fail++, console.log('FAIL', n, x || '')); };

(async () => {
  const b = await chromium.launch({ executablePath: chromeExe, headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/buddies.html?device_id=' + DID, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2200);

  // ① 选 1 只 → 显示「已选 1 只」
  await p.evaluate(() => { [...document.querySelectorAll('#buddyWall .buddy-check')][1]?.click(); });
  await sleep(600);
  const s1 = await p.evaluate(() => document.getElementById('buddyBuy').textContent.replace(/\s+/g, ' ').trim());
  chk('①选1只也显示提示', s1.includes('已选 1 只'), s1);

  // ② 模拟付款完成（entitlement 返回 rabbit 已购）→ 重载后购物车里的 rabbit 自动清除
  await ctx.route('**/api/entitlement*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ pets: ['rabbit'] }) }));
  await p.reload({ waitUntil: 'networkidle' });
  await sleep(2500);
  const s2 = await p.evaluate(() => ({
    checked: document.querySelectorAll('#buddyWall .buddy-check.on').length,
    tip: !!document.querySelector('.buy-tip'),
    owned: document.querySelectorAll('#buddyWall .buddy-tile.owned').length,
    ls: localStorage.getItem('deskbud_picked'),
  }));
  chk('②已购的自动移出购物车', s2.checked === 0 && !s2.tip, JSON.stringify(s2));
  chk('②已购标记「已拥有」', s2.owned === 1, JSON.stringify(s2));

  // ③ 未购的另一只仍可勾选，提示正常
  await p.evaluate(() => { [...document.querySelectorAll('#buddyWall .buddy-check')][0]?.click(); });
  await sleep(600);
  const s3 = await p.evaluate(() => ({ tip: document.getElementById('buddyBuy').textContent.replace(/\s+/g, ' ').trim(), checked: document.querySelectorAll('#buddyWall .buddy-check.on').length }));
  chk('③未购仍可勾选+提示', s3.checked === 1 && s3.tip.includes('已选 1 只'), JSON.stringify(s3));

  await b.close();
  console.log('RESULT: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
