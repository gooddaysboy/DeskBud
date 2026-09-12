// 2026-09-10 伙伴页 device_id 购买链路验证 → 2026-09-12 晚更新（宠物模型变了，断言跟着改）：
//   ①线咪(linekit) 是唯一在售宠物，pet_id 不再写死 panda（原来首位是织熊猫）
//   ②织熊猫/织兔子 = 内置免费（w.builtin）→ 任何页面都不得出现收银台，只能引导下载客户端
// ①URL 带合法 device_id → 收银台链接 + 存 localStorage ②切到内置宠物 → 无收银台、走下载引导
// ③无参新页从 localStorage 恢复 ④非法 device_id 不污染 ⑤干净环境 → 先下载桌宠 ⑥首页一致 ⑦详情页一致
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');

const BASE = 'http://127.0.0.1:8081';
const DID = 'dsk0123456789abcdef'; // dsk + 16hex = 19 字符，与 pyside6/kotlin 约定一致
const PAID = 'linekit';            // 当前唯一在售宠物
const pay = id => `https://pay.deskbud.xyz/checkout.html?device_id=${DID}&pet_id=${id}`;
let pass = 0, fail = 0;
function chk(name, cond, extra) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, extra || ''); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: chromeExe, headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });

  /* ① 带 device_id 打开 → 收银台链接 + localStorage 落盘 */
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/buddies.html?device_id=${DID}`, { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(2000);
  const b1 = await p.evaluate(() => ({
    href: (document.querySelector('#buddyBuy .btn') || {}).href || '',
    ls: localStorage.getItem('deskbud_device_id'),
    txt: document.getElementById('buddyBuy').textContent.trim(),
  }));
  chk('①URL带device_id→收银台链接', b1.href === pay(PAID), b1.href);
  chk('①localStorage已存', b1.ls === DID, b1.ls);

  /* ② 切到内置方块（第 2 个 = 织熊猫）→ 不得出现收银台，走下载引导 */
  await p.evaluate(() => { document.querySelectorAll('#buddyWall .buddy-tile')[1].click(); });
  await p.waitForTimeout(800);
  const b2 = await p.evaluate(() => {
    const a = document.querySelector('#buddyBuy a.buy-builtin');
    return { btn: (document.querySelector('#buddyBuy .btn') || {}).href || '', builtinHref: a ? a.getAttribute('href') : null, txt: document.getElementById('buddyBuy').textContent.trim() };
  });
  chk('②内置宠物无收银台', b2.btn === '', b2.btn);
  chk('②内置→下载引导', b2.builtinHref === 'download.html', JSON.stringify(b2));

  /* ③ 无参新页（同 context，localStorage 已有）→ 从 localStorage 恢复收银台链接 */
  const p2 = await ctx.newPage();
  await p2.goto(`${BASE}/buddies.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await p2.waitForTimeout(2000);
  const b3 = await p2.evaluate(() => (document.querySelector('#buddyBuy .btn') || {}).href || '');
  chk('③无参页localStorage恢复', b3 === pay(PAID), b3);

  /* ④ 非法 device_id → 不污染 localStorage，显示先下载桌宠 */
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p4 = await ctx2.newPage();
  await p4.goto(`${BASE}/buddies.html?device_id=evil<script>alert(1)</script>`, { waitUntil: 'networkidle', timeout: 30000 });
  await p4.waitForTimeout(1500);
  const b4 = await p4.evaluate(() => ({
    ls: localStorage.getItem('deskbud_device_id'),
    soon: !!document.querySelector('#buddyBuy .hd-soon'),
    txt: document.getElementById('buddyBuy').textContent.trim(),
    btn: !!document.querySelector('#buddyBuy .btn'),
  }));
  chk('④非法device_id不落盘', b4.ls === null, b4.ls);
  chk('④非法→先下载桌宠', !b4.soon && b4.btn && b4.txt.includes('先下载桌宠'), b4.txt);

  /* ⑤ 干净环境无参 → 同样显示先下载桌宠 */
  const p5 = await ctx2.newPage();
  await p5.goto(`${BASE}/buddies.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await p5.waitForTimeout(1500);
  const b5 = await p5.evaluate(() => document.getElementById('buddyBuy').textContent.trim());
  chk('⑤干净无参→先下载桌宠', b5.includes('先下载桌宠'), b5);
  await p5.screenshot({ path: 'D:/360Downloads/deskbud/website/outputs/buddies_nodid.png', fullPage: false });

  /* ⑥ 首页详情区：带 device_id → 收银台链接；干净环境 → 先下载桌宠 */
  const p6 = await ctx.newPage(); // ctx 的 localStorage 已有 DID
  await p6.goto(`${BASE}/index.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await p6.waitForTimeout(2000);
  const b6 = await p6.evaluate(() => (document.querySelector('#hdBuy .btn') || {}).href || '');
  chk('⑥首页带device_id→收银台', b6 === pay(PAID), b6);
  const p7 = await ctx2.newPage(); // 干净环境
  await p7.goto(`${BASE}/index.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await p7.waitForTimeout(2000);
  const b7 = await p7.evaluate(() => document.getElementById('hdBuy').textContent.trim());
  chk('⑥首页无device_id→先下载桌宠', b7.includes('先下载桌宠'), b7);

  /* ⑦ 详情页：在售宠物一致逻辑；内置宠物必须无收银台 */
  const p8 = await ctx.newPage();
  await p8.goto(`${BASE}/detail.html?id=${PAID}`, { waitUntil: 'networkidle', timeout: 30000 });
  await p8.waitForTimeout(2000);
  const b8 = await p8.evaluate(() => (document.querySelector('.buy-block .btn') || {}).href || '');
  chk('⑦详情页带device_id→收银台(在售宠物)', b8 === pay(PAID), b8);
  const p8b = await ctx.newPage();
  await p8b.goto(`${BASE}/detail.html?id=rabbit`, { waitUntil: 'networkidle', timeout: 30000 });
  await p8b.waitForTimeout(2000);
  const b8b = await p8b.evaluate(() => {
    const a = document.querySelector('.buy-block a.buy-builtin');
    return {
      btn: (document.querySelector('.buy-block .btn') || {}).href || '',
      builtinHref: a ? a.getAttribute('href') : null,
      txt: (document.querySelector('.buy-block') || {}).textContent || '',
    };
  });
  chk('⑦详情页内置无收银台', b8b.btn === '', b8b.btn);
  chk('⑦详情页内置→下载引导', b8b.builtinHref === 'download.html', JSON.stringify(b8b).slice(0, 200));
  const p9 = await ctx2.newPage();
  await p9.goto(`${BASE}/detail.html?id=${PAID}`, { waitUntil: 'networkidle', timeout: 30000 });
  await p9.waitForTimeout(2000);
  const b9 = await p9.evaluate(() => (document.querySelector('.buy-block') || {}).textContent || '');
  chk('⑦详情页无device_id→先下载桌宠', b9.includes('先下载桌宠'), b9);

  await browser.close();
  console.log('\nRESULT: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
