// 2026-09-10 伙伴页 device_id 购买链路验证
// ①URL 带合法 device_id → 收银台链接 + 存 localStorage ②无参新页从 localStorage 恢复
// ③无痕无参 → 「请在客户端内购买」④非法 device_id 不污染 ⑤切换宠物 pet_id 联动
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');

const BASE = 'http://127.0.0.1:8081';
let pass = 0, fail = 0;
function chk(name, cond, extra) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, extra || ''); }
}
const DID = 'dsk0123456789abcdef'; // dsk + 16hex = 19 字符，与 pyside6/kotlin 约定一致

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
  chk('①URL带device_id→收银台链接', b1.href === `https://pay.deskbud.xyz/checkout.html?device_id=${DID}&pet_id=panda`, b1.href);
  chk('①localStorage已存', b1.ls === DID, b1.ls);

  /* ② 切兔子 → pet_id 联动 */
  await p.evaluate(() => { document.querySelectorAll('#buddyWall .buddy-tile')[1].click(); });
  await p.waitForTimeout(600);
  const b2 = await p.evaluate(() => (document.querySelector('#buddyBuy .btn') || {}).href || '');
  chk('②切兔子pet_id联动', b2 === `https://pay.deskbud.xyz/checkout.html?device_id=${DID}&pet_id=rabbit`, b2);

  /* ③ 无参新页（同 context，localStorage 已有）→ 从 localStorage 恢复收银台链接 */
  const p2 = await ctx.newPage();
  await p2.goto(`${BASE}/buddies.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await p2.waitForTimeout(2000);
  const b3 = await p2.evaluate(() => (document.querySelector('#buddyBuy .btn') || {}).href || '');
  chk('③无参页localStorage恢复', b3 === `https://pay.deskbud.xyz/checkout.html?device_id=${DID}&pet_id=panda`, b3);

  /* ④ 非法 device_id → 不污染 localStorage，显示客户端内购买 */
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

  /* ⑤ 干净环境无参 → 同样显示客户端内购买 */
  const p5 = await ctx2.newPage();
  await p5.goto(`${BASE}/buddies.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await p5.waitForTimeout(1500);
  const b5 = await p5.evaluate(() => document.getElementById('buddyBuy').textContent.trim());
  chk('⑤干净无参→先下载桌宠', b5.includes('先下载桌宠'), b5);
  await p5.screenshot({ path: 'D:/360Downloads/deskbud/website/outputs/buddies_nodid.png', fullPage: false });

  /* ⑥ 首页详情区：带 device_id → 收银台链接；干净环境 → 占位 */
  const p6 = await ctx.newPage(); // ctx 的 localStorage 已有 DID
  await p6.goto(`${BASE}/index.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await p6.waitForTimeout(2000);
  const b6 = await p6.evaluate(() => (document.querySelector('#hdBuy .btn') || {}).href || '');
  chk('⑥首页带device_id→收银台', b6 === `https://pay.deskbud.xyz/checkout.html?device_id=${DID}&pet_id=panda`, b6);
  const p7 = await ctx2.newPage(); // 干净环境
  await p7.goto(`${BASE}/index.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await p7.waitForTimeout(2000);
  const b7 = await p7.evaluate(() => document.getElementById('hdBuy').textContent.trim());
  chk('⑥首页无device_id→先下载桌宠', b7.includes('先下载桌宠'), b7);

  /* ⑦ 详情页：一致逻辑 */
  const p8 = await ctx.newPage();
  await p8.goto(`${BASE}/detail.html?id=rabbit`, { waitUntil: 'networkidle', timeout: 30000 });
  await p8.waitForTimeout(2000);
  const b8 = await p8.evaluate(() => (document.querySelector('.buy-block .btn') || {}).href || '');
  chk('⑦详情页带device_id→收银台(rabbit)', b8 === `https://pay.deskbud.xyz/checkout.html?device_id=${DID}&pet_id=rabbit`, b8);
  const p9 = await ctx2.newPage();
  await p9.goto(`${BASE}/detail.html?id=rabbit`, { waitUntil: 'networkidle', timeout: 30000 });
  await p9.waitForTimeout(2000);
  const b9 = await p9.evaluate(() => (document.querySelector('.buy-block') || {}).textContent || '');
  chk('⑦详情页无device_id→先下载桌宠', b9.includes('先下载桌宠'), b9);

  await browser.close();
  console.log('\nRESULT: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
