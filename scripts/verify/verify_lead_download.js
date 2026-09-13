// 2026-09-13 网站定位整改验证：网站不再下单 —— 所有「购买」入口 → 「下载客户端 · 领养宠物」引导
//   ① 伙伴页：出现 a.lead-dl → download.html；勾选框 .buddy-check 已撤；引导小字含「客户端」
//   ② 首页：详情区 .hd-buy 同样只有下载引导
//   ③ 详情页：buy-block 只有下载引导
//   ④ 全站不再出现收银台链接（pay.deskbud.xyz / checkout）
//   ⑤ 英文态：引导文案切英文
const path = require('path');
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');
const BASE = 'http://127.0.0.1:8081';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const chk = (n, c, x) => { c ? (pass++, console.log('PASS', n)) : (fail++, console.log('FAIL', n, x || '')); };

const UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const ARGS = ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];

const probe = sel => `(() => {
  const box = document.querySelector(${JSON.stringify(sel)});
  if (!box) return null;
  const a = box.querySelector('a.lead-dl');
  return {
    html: box.innerHTML.slice(0, 400),
    btnHref: a ? a.getAttribute('href') : null,
    btnText: a ? a.textContent.trim() : '',
    hint: (box.querySelector('.lead-hint') || {}).textContent || '',
    checks: box.querySelectorAll('.buddy-check').length,
    owned: box.querySelectorAll('.buddy-owned').length,
  };
})()`;

(async () => {
  const b = await chromium.launch({ executablePath: chromeExe, headless: true, args: ARGS });

  /* ---------- ① 伙伴页 ---------- */
  let ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, userAgent: UA_DESKTOP });
  let p = await ctx.newPage();
  const bad = [];
  p.on('request', r => { if (/pay\.deskbud\.xyz|checkout/.test(r.url())) bad.push(r.url()); });
  await p.goto(BASE + '/buddies.html', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);
  let s = await p.evaluate(probe('#buddyBuy'));
  chk('①伙伴页·有下载引导按钮→download.html', !!s && s.btnHref === 'download.html', JSON.stringify(s));
  chk('①伙伴页·按钮文案=下载客户端', !!s && s.btnText.includes('下载客户端'), s && s.btnText);
  chk('①伙伴页·引导小字提到客户端', !!s && s.hint.includes('客户端'), s && s.hint);
  chk('①伙伴页·多选勾选框已撤', !!s && s.checks === 0, JSON.stringify(s));
  const wall = await p.evaluate(() => ({
    tiles: document.querySelectorAll('#buddyWall .buddy-tile').length,
    checks: document.querySelectorAll('#buddyWall .buddy-check').length,
    breaks: document.querySelectorAll('#buddyWall .wall-break').length,
  }));
  chk('①伙伴页·方块仍在且无勾选框', wall.tiles >= 3 && wall.checks === 0, JSON.stringify(wall));
  chk('①伙伴页·无收银台请求', bad.length === 0, bad.join(' | '));
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'outputs', 'lead_buddies.png'), fullPage: true });

  // 切到第二只宠物，引导按钮仍在（用 evaluate 点，避免 locator 可见性判定干扰）
  await p.evaluate(() => { const t = document.querySelectorAll('#buddyWall .buddy-tile'); if (t[1]) t[1].click(); });
  await sleep(600);
  s = await p.evaluate(probe('#buddyBuy'));
  chk('①伙伴页·切换伙伴后引导仍在', !!s && s.btnHref === 'download.html', JSON.stringify(s));
  await ctx.close();

  /* ---------- ② 首页 ---------- */
  ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, userAgent: UA_DESKTOP });
  p = await ctx.newPage();
  await p.goto(BASE + '/index.html', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2500);
  s = await p.evaluate(probe('#hdBuy'));
  chk('②首页·详情区有下载引导', !!s && s.btnHref === 'download.html', JSON.stringify(s));
  chk('②首页·引导小字提到客户端', !!s && s.hint.includes('客户端'), s && s.hint);
  const homePick = await p.evaluate(() => ({
    cards: document.querySelectorAll('#petPicker .pick-card').length,
    checks: document.querySelectorAll('#petPicker .buddy-check').length,
  }));
  chk('②首页·选择卡无勾选框', homePick.cards >= 3 && homePick.checks === 0, JSON.stringify(homePick));
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'outputs', 'lead_home.png'), fullPage: true });
  await ctx.close();

  /* ---------- ③ 详情页 ---------- */
  for (const id of ['linekit', 'panda', 'rabbit']) {
    ctx = await b.newContext({ viewport: { width: 1280, height: 1000 }, userAgent: UA_DESKTOP });
    p = await ctx.newPage();
    const bad2 = [];
    p.on('request', r => { if (/pay\.deskbud\.xyz|checkout/.test(r.url())) bad2.push(r.url()); });
    await p.goto(BASE + '/detail.html?id=' + id, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2200);
    s = await p.evaluate(probe('.buy-block'));
    chk(`③详情页(${id})·只有下载引导`, !!s && s.btnHref === 'download.html', JSON.stringify(s));
    chk(`③详情页(${id})·无收银台请求`, bad2.length === 0, bad2.join(' | '));
    if (id === 'linekit') await p.screenshot({ path: path.join(__dirname, '..', '..', 'outputs', 'lead_detail.png'), fullPage: true });
    await ctx.close();
  }

  /* ---------- ④ 英文态 ---------- */
  ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, userAgent: UA_DESKTOP });
  p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.setItem('deskbud_lang', 'en'); } catch (e) {} });
  await p.goto(BASE + '/buddies.html', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);
  s = await p.evaluate(probe('#buddyBuy'));
  chk('④英文态·按钮文案切英文', !!s && /Download the app/i.test(s.btnText), s && s.btnText);
  chk('④英文态·小字切英文', !!s && /app|install/i.test(s.hint), s && s.hint);
  await ctx.close();

  /* ---------- ⑤ 一层保险（老曹 2026-09-13 22:44 定）：localStorage 残留 did → 仍是下载皮肤 ---------- */
  ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, userAgent: UA_DESKTOP });
  const pay5 = [];
  await ctx.route('**://pay.deskbud.xyz/**', r => { pay5.push(r.request().url()); r.fulfill({ status: 200, contentType: 'application/json', body: '{"pets":[]}' }); });
  p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.setItem('deskbud_device_id', 'dsk0123456789abcdef'); } catch (e) {} });
  await p.goto(BASE + '/buddies.html', { waitUntil: 'load', timeout: 30000 });
  await sleep(2200);
  s = await p.evaluate(probe('#buddyBuy'));
  chk('⑤保险·did 残留时仍是下载引导', !!s && s.btnHref === 'download.html', JSON.stringify(s));
  chk('⑤保险·did 残留时无勾选框（结算区）', !!s && s.checks === 0, JSON.stringify(s));
  const wall5 = await p.evaluate(() => document.querySelectorAll('#buddyWall .buddy-check').length);
  chk('⑤保险·did 残留时方块无勾选框', wall5 === 0, String(wall5));
  chk('⑤保险·did 残留时不请求收银台', pay5.filter(u => /checkout/.test(u)).length === 0, pay5.join(' | '));
  await ctx.close();

  /* ---------- ⑥ App 内皮肤：?device_id=<did>&embed=1 → 勾选 +「已选 N 只」+「🐾 领养」→ 收银台 ---------- */
  const DID = 'dsk0123456789abcdef';
  ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, userAgent: UA_DESKTOP });
  const pay6 = [];
  await ctx.route('**://pay.deskbud.xyz/**', r => { pay6.push(r.request().url()); r.fulfill({ status: 200, contentType: 'application/json', body: '{"pets":[]}' }); });
  p = await ctx.newPage();
  await p.goto(BASE + '/buddies.html?device_id=' + DID + '&embed=1', { waitUntil: 'load', timeout: 30000 });
  await sleep(2200);
  let buy = await p.evaluate(() => {
    const box = document.querySelector('#buddyBuy');
    const a = box && box.querySelector('a.btn');
    return {
      checks: document.querySelectorAll('#buddyWall .buddy-check').length,
      tiles: document.querySelectorAll('#buddyWall .buddy-tile').length,
      btnHref: a ? a.getAttribute('href') : null,
      btnText: a ? a.textContent.trim() : '',
      tip: (box && box.querySelector('.buy-tip') || {}).textContent || '',
    };
  });
  chk('⑥App内·出现勾选框', buy.checks >= 1, JSON.stringify(buy));
  chk('⑥App内·按钮文案=🐾 领养', /领养/.test(buy.btnText), buy.btnText);
  chk('⑥App内·收银台带 device_id', /checkout\.html\?device_id=/.test(buy.btnHref || ''), buy.btnHref);
  chk('⑥App内·收银台带 embed=1（老曹定：一律带）', /[?&]embed=1/.test(buy.btnHref || ''), buy.btnHref);
  // 勾一只（非内置、未拥有）→ 出现「已选 N 只」+ 选中态
  await p.evaluate(() => {
    const t = [...document.querySelectorAll('#buddyWall .buddy-tile')]
      .find(x => x.querySelector('.buddy-check') && !x.classList.contains('owned'));
    if (t) t.querySelector('.buddy-check').click();
  });
  await sleep(700);
  buy = await p.evaluate(() => {
    const box = document.querySelector('#buddyBuy');
    const a = box && box.querySelector('a.btn');
    return {
      tip: (box && box.querySelector('.buy-tip') || {}).textContent || '',
      btnHref: a ? a.getAttribute('href') : null,
      btnText: a ? a.textContent.trim() : '',
      on: document.querySelectorAll('#buddyWall .buddy-check.on').length,
    };
  });
  chk('⑥App内·勾选后出现「已选 N 只」', /已选\s*\d+\s*只/.test(buy.tip), JSON.stringify(buy));
  chk('⑥App内·勾选后按钮仍是「🐾 领养」（老曹定：统一文案）', /领养/.test(buy.btnText), buy.btnText);
  chk('⑥App内·勾选后收银台链接生效', /checkout\.html\?device_id=/.test(buy.btnHref || ''), buy.btnHref);
  chk('⑥App内·会请求授权接口（预期，非收银台）', pay6.some(u => /entitlement/.test(u)), pay6.join(' | '));
  chk('⑥App内·页面本身不等于发起结算', pay6.filter(u => /checkout/.test(u)).length === 0, pay6.join(' | '));
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'outputs', 'buy_skin_buddies.png'), fullPage: true });
  await ctx.close();

  /* ---------- ⑦ 页脚「用户手册」软导航后要停在手册段（2026-09-13 老曹反馈：只到页顶很困惑） ---------- */
  ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, userAgent: UA_DESKTOP });
  p = await ctx.newPage();
  await p.goto(BASE + '/index.html', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2200);
  const hrefManual = await p.evaluate(() => {
    const a = document.querySelector('a[data-i18n="footer.manual"]');
    return a ? a.getAttribute('href') : 'MISSING';
  });
  chk('⑦页脚·手册链接指向 download.html#manual', hrefManual === 'download.html#manual', hrefManual);
  await p.evaluate(() => { const a = document.querySelector('a[data-i18n="footer.manual"]'); if (a) a.click(); });
  await sleep(2200);
  const anchor = await p.evaluate(() => {
    const el = document.getElementById('manual');
    const r = el && el.getBoundingClientRect();
    return {
      url: location.pathname + location.hash,
      hasEl: !!el,
      top: r ? Math.round(r.top) : null,
      inView: r ? (r.top < innerHeight * 0.6 && r.bottom > 0) : false,
      scrollY: Math.round(window.scrollY),
      isDownload: !!document.querySelector('#dlGrid'),
    };
  });
  chk('⑦软导航后仍是下载页', anchor.isDownload, JSON.stringify(anchor));
  chk('⑦软导航后 URL 保留 #manual', /#manual$/.test(anchor.url), anchor.url);
  chk('⑦软导航后确实停在手册段（在视口上半）', anchor.hasEl && anchor.inView, JSON.stringify(anchor));
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'outputs', 'lead_manual_anchor.png') });
  await ctx.close();

  await b.close();
  console.log('RESULT: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
