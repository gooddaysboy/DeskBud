// 2026-09-11 多选购买链路验证（夥伴页 + 首页）
// 约定：pet_ids 逗号分隔、去重、最多 10；单只用 pet_id（向后兼容）
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');
const BASE = 'http://127.0.0.1:8081';
const DID = 'dsk0123456789abcdef';
let pass = 0, fail = 0;
const chk = (n, c, x) => { c ? (pass++, console.log('PASS', n)) : (fail++, console.log('FAIL', n, x || '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await chromium.launch({ executablePath: chromeExe, headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });

  /* ===== 伙伴页多选 ===== */
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await p.goto(BASE + '/buddies.html?device_id=' + DID, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);
  const s0 = await p.evaluate(() => ({
    checks: document.querySelectorAll('#buddyWall .buddy-check').length,
    cartGone: !document.getElementById('buddyCart'),   // 浮条已废弃（老曹：紧贴姿态窗用按钮）
    buyHref: (document.querySelector('#buddyBuy .btn') || {}).href || '',
    buyTxt: document.getElementById('buddyBuy').textContent.trim(),
  }));
  chk('①勾选框×2 + 无浮条(按钮即入口)', s0.checks === 2 && s0.cartGone, JSON.stringify(s0));
  chk('①未勾选→单只购买(pet_id)', s0.buyHref.endsWith('&pet_id=panda') && s0.buyTxt.includes('把伙伴领回家'), s0.buyHref);

  // 勾选第 1 只（rabbit）
  await p.evaluate(() => { document.querySelectorAll('#buddyWall .buddy-tile')[1].querySelector('.buddy-check').click(); });
  await sleep(600);
  const s1 = await p.evaluate(() => ({
    buyHref: (document.querySelector('#buddyBuy .btn') || {}).href || '',
    checked: document.querySelectorAll('#buddyWall .buddy-check.on').length,
  }));
  chk('②勾1只→选中态+按钮指单只', s1.checked === 1 && s1.buyHref.endsWith('&pet_id=rabbit'), JSON.stringify(s1));

  // 再勾第 0 只（panda）→ pet_ids=panda,rabbit
  await p.evaluate(() => { document.querySelectorAll('#buddyWall .buddy-tile')[0].querySelector('.buddy-check').click(); });
  await sleep(600);
  const s2 = await p.evaluate(() => ({
    buyTxt: document.getElementById('buddyBuy').textContent.trim(),
    buyHref: (document.querySelector('#buddyBuy .btn') || {}).href || '',
    tileChecks: document.querySelectorAll('#buddyWall .buddy-check.on').length,
  }));
  chk('③勾2只→按钮一起带回家·2只 pet_ids', s2.buyHref.includes('pet_ids=') && s2.buyTxt.includes('一起带回家') && s2.buyTxt.includes('2 只') && s2.tileChecks === 2, JSON.stringify(s2));

  // 取消勾选 → 浮条收起
  await p.evaluate(() => { document.querySelectorAll('#buddyWall .buddy-tile')[1].querySelector('.buddy-check').click(); });
  await sleep(400);
  await p.evaluate(() => { document.querySelectorAll('#buddyWall .buddy-tile')[0].querySelector('.buddy-check').click(); });
  await sleep(600);
  const s3 = await p.evaluate(() => ({ buyTxt: document.getElementById('buddyBuy').textContent.trim(), checked: document.querySelectorAll('#buddyWall .buddy-check.on').length }));
  chk('④全取消→回单只文案', s3.checked === 0 && s3.buyTxt.includes('把伙伴领回家'), JSON.stringify(s3));

  // 勾选框不触发姿态切换（cur 不变）
  const s4 = await p.evaluate(() => { const before = document.getElementById('buddyName').textContent; document.querySelectorAll('#buddyWall .buddy-tile')[1].querySelector('.buddy-check').click(); return { before, after: document.getElementById('buddyName').textContent }; });
  chk('⑤勾选不切换展示宠物', s4.before === s4.after, JSON.stringify(s4));

  /* ===== 无 device_id：浮条显示「先下载桌宠」 ===== */
  const p2 = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await p2.goto(BASE + '/buddies.html', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(1800);
  await p2.evaluate(() => { document.querySelectorAll('#buddyWall .buddy-tile')[1].querySelector('.buddy-check').click(); });
  await sleep(600);
  const s5 = await p2.evaluate(() => ({ href: (document.querySelector('#buddyBuy .btn') || {}).getAttribute ? document.querySelector('#buddyBuy .btn').getAttribute('href') : '', txt: document.getElementById('buddyBuy').textContent }));
  chk('⑥无did→按钮「先下载桌宠」→download', s5.href === 'download.html' && s5.txt.includes('先下载桌宠'), JSON.stringify(s5));

  /* ===== 选择跨页保持（老曹 09-11：切换页面后选择不丢，伙伴页/首页共享） ===== */
  const pKeep = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await pKeep.goto(BASE + '/buddies.html?device_id=' + DID, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);
  await pKeep.evaluate(() => { document.querySelectorAll('#buddyWall .buddy-tile')[1].querySelector('.buddy-check').click(); });
  await sleep(500);
  // 软导航去首页再回伙伴页
  await pKeep.evaluate(() => { document.querySelector('.nav a[href="index.html"]').click(); });
  await sleep(1800);
  const hk = await pKeep.evaluate(() => ({ checked: document.querySelectorAll('#petPicker .buddy-check.on').length }));
  chk('⑧首页显示伙伴页的选择(共享购物车)', hk.checked === 1, JSON.stringify(hk));
  await pKeep.evaluate(() => { document.querySelector('.nav a[href="buddies.html"]').click(); });
  await sleep(1800);
  const bk = await pKeep.evaluate(() => ({ checked: document.querySelectorAll('#buddyWall .buddy-check.on').length, buyHref: (document.querySelector('#buddyBuy .btn') || {}).href || '' }));
  chk('⑧返回伙伴页选择仍在', bk.checked === 1 && bk.buyHref.endsWith('&pet_id=rabbit'), JSON.stringify(bk));

  /* ===== 首页多选 ===== */
  const p3 = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  await p3.goto(BASE + '/index.html?device_id=' + DID, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2500);
  const h0 = await p3.evaluate(() => ({ checks: document.querySelectorAll('#petPicker .buddy-check').length }));
  chk('⑦首页选择卡勾选框×2', h0.checks === 2, JSON.stringify(h0));
  await p3.evaluate(() => { document.querySelectorAll('#petPicker .pick-card')[1].querySelector('.buddy-check').click(); });
  await sleep(400);
  await p3.evaluate(() => { document.querySelectorAll('#petPicker .pick-card')[0].querySelector('.buddy-check').click(); });
  await sleep(900);
  const h1 = await p3.evaluate(() => ({ href: (document.querySelector('#hdBuy .btn') || {}).href || '', txt: document.getElementById('hdBuy').textContent }));
  chk('⑦首页勾2只→hdBuy pet_ids 双只', (h1.href.includes('pet_ids=') && h1.txt.includes('2 只')), JSON.stringify(h1));

  await p.screenshot({ path: 'D:/360Downloads/deskbud/website/outputs/multi_pick_buddies.png', fullPage: true });
  await p3.screenshot({ path: 'D:/360Downloads/deskbud/website/outputs/multi_pick_home.png', fullPage: false });
  await b.close();
  console.log('\nRESULT: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
