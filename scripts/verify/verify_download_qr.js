// 2026-09-13 下载页「安卓扫码 + 引导页」验证（协同板 09-13 19:15 kotlin 方案 B）
//   ① 桌面 UA：安卓卡展示二维码（不再给"下到电脑上白下"的直链）+ 手册区新增「打开完整手册」
//   ② 安卓 UA：安卓卡保留按钮，直链 = 同源清单里的 v0.1.8
//   ③ 微信 / iOS UA：安卓卡按钮改指固定引导页 get.html
//   ④ get.html 四态：微信提示 / 安卓自动下载 / iOS 不支持 / 桌面展示二维码
const path = require('path');
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');
const BASE = 'http://127.0.0.1:8081';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const chk = (n, c, x) => { c ? (pass++, console.log('PASS', n)) : (fail++, console.log('FAIL', n, x || '')); };

const UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const UA_WECHAT = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0.40.2440(0x28002837) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64';
const UA_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const ARGS = ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];

async function cardInfo(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('#dlGrid .dl-card')];
    const find = kw => cards.find(c => (c.querySelector('.dl-name') || {}).textContent && c.querySelector('.dl-name').textContent.includes(kw));
    const dump = c => c ? {
      desc: c.querySelector('.dl-desc').textContent.trim(),
      btnHref: (c.querySelector('.dl-action .btn') || {}).getAttribute ? c.querySelector('.dl-action .btn').getAttribute('href') : null,
      qrSrc: (c.querySelector('.dl-qr img') || {}).getAttribute ? c.querySelector('.dl-qr img').getAttribute('src') : null,
      qrText: (c.querySelector('.dl-qr span') || {}).textContent || '',
    } : null;
    return { android: dump(find('Android')), win: dump(find('Windows')) };
  });
}

(async () => {
  const b = await chromium.launch({ executablePath: chromeExe, headless: true, args: ARGS });

  /* ---------- ① 桌面 ---------- */
  let ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, userAgent: UA_DESKTOP });
  let p = await ctx.newPage();
  await p.goto(BASE + '/download.html', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);
  let ci = await cardInfo(p);
  chk('①桌面·安卓卡无直链按钮', ci.android && ci.android.btnHref === null, JSON.stringify(ci.android));
  chk('①桌面·安卓卡有二维码(同源清单已生效→v0.1.8)', !!(ci.android && ci.android.qrSrc && ci.android.qrSrc.includes('assets/img/qr-android.svg') && ci.android.desc.includes('v0.1.8')), JSON.stringify(ci.android));
  chk('①桌面·二维码提示文案', ci.android && ci.android.qrText.includes('扫码'), JSON.stringify(ci.android));
  chk('①桌面·Win 卡仍是直链', !!(ci.win && ci.win.btnHref && ci.win.btnHref.includes('DeskBud_Win_v0124.exe')), JSON.stringify(ci.win));

  const man = await p.evaluate(() => ({
    open: (document.querySelector('a.dl-manual-open') || {}).textContent || '',
    openHref: (document.querySelector('a.dl-manual-open') || {}).getAttribute ? document.querySelector('a.dl-manual-open').getAttribute('href') : '',
    footerManualHref: ([...document.querySelectorAll('footer a')].find(a => a.getAttribute('data-i18n') === 'footer.manual') || {}).getAttribute
      ? [...document.querySelectorAll('footer a')].find(a => a.getAttribute('data-i18n') === 'footer.manual').getAttribute('href') : null,
    tabs: [...document.querySelectorAll('#dlHmTabs .vtab')].map(e => e.textContent.trim()),
  }));
  chk('①手册区有「打开完整手册」→usage.html', man.open.includes('打开完整手册') && man.openHref === 'usage.html', JSON.stringify(man));
  chk('①页脚「用户手册」→ 下载页手册段(download.html#manual)', man.footerManualHref === 'download.html#manual', JSON.stringify(man));
  chk('①手册平台标签仍在', JSON.stringify(man.tabs) === JSON.stringify(['Windows', 'Android', 'macOS']), JSON.stringify(man.tabs));

  const sameOrigin = await p.evaluate(async () => {
    const r = await fetch('data/download-latest.json', { cache: 'no-cache' });
    const d = await r.json();
    return { ok: r.ok, ver: d.android && d.android.version, url: d.android && d.android.url };
  });
  chk('①同源清单可取且 android=v0.1.8', sameOrigin.ok && sameOrigin.ver === '0.1.8' && /DeskBud_Android_v018\.apk$/.test(sameOrigin.url), JSON.stringify(sameOrigin));
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'outputs', 'download_qr_desktop.png'), fullPage: true });
  await ctx.close();

  /* ---------- ② 安卓 ---------- */
  ctx = await b.newContext({ viewport: { width: 420, height: 900 }, userAgent: UA_ANDROID, isMobile: true, hasTouch: true });
  p = await ctx.newPage();
  await p.goto(BASE + '/download.html', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);
  ci = await cardInfo(p);
  chk('②安卓·保留按钮', !!(ci.android && ci.android.btnHref && ci.android.qrSrc === null), JSON.stringify(ci.android));
  chk('②安卓·直链为 v0.1.8', !!(ci.android && /android-v0\.1\.8\/DeskBud_Android_v018\.apk$/.test(ci.android.btnHref)), ci.android && ci.android.btnHref);
  await ctx.close();

  /* ---------- ③ 微信 / iOS ---------- */
  for (const [label, ua] of [['微信', UA_WECHAT], ['iOS', UA_IOS]]) {
    ctx = await b.newContext({ viewport: { width: 420, height: 900 }, userAgent: ua, isMobile: true, hasTouch: true });
    p = await ctx.newPage();
    await p.goto(BASE + '/download.html', { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(1800);
    ci = await cardInfo(p);
    chk(`③${label}·安卓按钮改指 get.html`, !!(ci.android && ci.android.btnHref === 'get.html'), JSON.stringify(ci.android));
    await ctx.close();
  }

  /* ---------- ④ get.html 四态 ---------- */
  const states = [
    ['桌面', UA_DESKTOP, 'v-desktop'],
    ['微信', UA_WECHAT, 'v-wechat'],
    ['安卓', UA_ANDROID, 'v-android'],
    ['iOS', UA_IOS, 'v-ios'],
  ];
  for (const [label, ua, want] of states) {
    ctx = await b.newContext({ viewport: { width: 420, height: 900 }, userAgent: ua, isMobile: ua !== UA_DESKTOP, hasTouch: ua !== UA_DESKTOP });
    p = await ctx.newPage();
    // 用 204 顶掉真正的 APK 导航：浏览器收到 204 会保持当前文档，页面不会被顶走
    await p.route('**/releases/download/**', r => r.fulfill({ status: 204, body: '' }));
    await p.goto(BASE + '/get.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(1800);
    const st = await p.evaluate(() => {
      const ids = ['v-wechat', 'v-android', 'v-ios', 'v-desktop'];
      const vis = {};
      ids.forEach(i => { vis[i] = !document.getElementById(i).hidden; });
      const btn = document.getElementById('dlBtn');
      return { vis: vis, btnHref: btn ? btn.getAttribute('href') : null, qr: !!(document.querySelector('#v-desktop img.qr')), title: (document.querySelector('#v-' + ids.find(i => !document.getElementById(i).hidden).slice(2) + ' h1') || {}).textContent || '' };
    });
    const others = ['v-wechat', 'v-android', 'v-ios', 'v-desktop'].filter(i => i !== want);
    chk(`④get.html ${label}·只显示 ${want}`, st.vis[want] === true && others.every(o => st.vis[o] === false), JSON.stringify(st.vis));
    if (label === '安卓') chk('④get.html 安卓·按钮= v0.1.8 直链', !!(st.btnHref && /DeskBud_Android_v018\.apk$/.test(st.btnHref)), st.btnHref);
    if (label === '桌面') chk('④get.html 桌面·有二维码图', st.qr === true, JSON.stringify(st));
    if (label === '微信') chk('④get.html 微信·提示"在浏览器中打开"', st.title.includes('浏览器'), st.title);
    await p.screenshot({ path: path.join(__dirname, '..', '..', 'outputs', `get_${want}.png`), fullPage: true });
    await ctx.close();
  }

  await b.close();
  console.log('RESULT: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
