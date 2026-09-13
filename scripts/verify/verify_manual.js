// 手册投递约定落地验证：官网手册区加载的是各端最新版
const { chromium } = require('playwright-core');
const { chromeExe } = require('./_env.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const chk = (n, c, x) => { c ? (pass++, console.log('PASS', n)) : (fail++, console.log('FAIL', n, x || '')); };
(async () => {
  const b = await chromium.launch({ executablePath: chromeExe, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await p.goto('http://127.0.0.1:8081/download.html?lang=zh', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);

  const frameText = async () => {
    const f = p.frames().find(fr => /\/(manual\/.*\.html)/.test(fr.url()));
    return f ? await f.evaluate(() => document.body.innerText) : '';
  };
  const frameSrc = async () => p.evaluate(() => (document.getElementById('dlHmFrame') || {}).getAttribute ? document.getElementById('dlHmFrame').getAttribute('src') : '');

  // ① win-zh（默认）
  let src = await frameSrc();
  let txt = await frameText();
  chk('①默认加载 Win 中文手册', src === 'manual/win-zh.html', src);
  // 2026-09-14 改：手册新口径 = 不带价格/商业用语（老曹 00:08 定），
  // 原断言找「免费」已失效（pyside6 23:35 把「内置小兔熊猫免费」一并删了）
  chk('①win 中文手册=新口径(更多伙伴陆续赶来·无价格)', txt.includes('更多伙伴陆续赶来') && !/\d+\s*元|一次买断|收银台/.test(txt), 'len=' + txt.length);

  // ② 切 Android
  await p.evaluate(() => [...document.querySelectorAll('#dlHmTabs .vtab')].find(b => b.textContent === 'Android').click());
  await sleep(1200);
  src = await frameSrc(); txt = await frameText();
  chk('②切 Android → android-zh.html', src === 'manual/android-zh.html', src);
  chk('②安卓手册内容在位', txt.includes('安卓') || txt.includes('Android') || txt.length > 300, 'len=' + txt.length);

  // ③ 切 macOS
  await p.evaluate(() => [...document.querySelectorAll('#dlHmTabs .vtab')].find(b => b.textContent === 'macOS').click());
  await sleep(1200);
  src = await frameSrc(); txt = await frameText();
  chk('③切 macOS → mac-zh.html', src === 'manual/mac-zh.html', src);

  // ④ 切英文 → 语言联动
  await p.evaluate(() => document.getElementById('langSwitch').click());
  await sleep(1800);
  src = await frameSrc();
  txt = await frameText();
  chk('④切英文 → mac-en.html', src === 'manual/mac-en.html', src);
  chk('④英文手册内容(无中文正文)', !/[\u4e00-\u9fa5]{6,}/.test(txt), 'len=' + txt.length);

  // ⑤ 六件套文件齐全（直接请求）
  const need = ['win-zh', 'win-en', 'mac-zh', 'mac-en', 'android-zh', 'android-en'];
  let allOk = true, bad = [];
  for (const n of need) {
    const r = await p.request.get(`http://127.0.0.1:8081/manual/${n}.html`);
    if (!r.ok()) { allOk = false; bad.push(n + ':' + r.status()); }
  }
  chk('⑤六件套齐全(200)', allOk, bad.join(','));

  // ⑥ 六件套正文：零价格 / 零商业用语（老曹 2026-09-14 00:08 口径）
  //    覆盖本轮清掉的：android 手册「会打开一个收银台…付完自动回来」+「一次多挑几只更划算（2 只 9 折、3 只 8 折）」
  const dirty = [];
  for (const n of need) {
    const t = await (await p.request.get(`http://127.0.0.1:8081/manual/${n}.html`)).text();
    const m = t.match(/(\d+\s*元|\d+\s*折|收银台|付完|购买|付费|定价|折扣|一次买断|永久使用|解锁新伙伴|checkout|\d+% off)/);
    if (m) dirty.push(n + ':' + m[0]);
  }
  chk('⑥六件套零价格/零商业用语', dirty.length === 0, dirty.join(','));

  await p.evaluate(() => document.getElementById('langSwitch').click());
  await sleep(1500);
  await p.screenshot({ path: __dirname + '/../../outputs/manual_v2.png', fullPage: false });
  await b.close();
  console.log('RESULT: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
