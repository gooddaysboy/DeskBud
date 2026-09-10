// 2026-09-10 kotlin 手机端三处 CSS 修复验证
// ①≤680px 导航四链接全部可见可点 ②≤620px 视频窗 220px ③footer 安全区
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');

const BASE = 'http://127.0.0.1:8081';
const DID = 'dsk0123456789abcdef';
let pass = 0, fail = 0;
function chk(name, cond, extra) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, extra || ''); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: chromeExe, headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  // 手机宽度 + Android UA（buddies 直达，不触发首页跳转逻辑的页面用桌面 UA 也行，但 buddies 页用手机 UA 更贴真机）
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36' });

  /* ① 伙伴页：导航四链接全部可见 */
  const p = await ctx.newPage();
  await p.goto(BASE + '/buddies.html', { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(1500);
  const n1 = await p.evaluate(() => {
    const links = [...document.querySelectorAll('.nav a')];
    const vw = innerWidth;
    const vis = links.filter(a => { const r = a.getBoundingClientRect(); return r.width > 0 && r.right <= vw + 1 && r.left >= -1; });
    return { total: links.length, visCount: vis.length, names: vis.map(a => a.textContent.trim()),
      bodySW: document.body.scrollWidth, iw: vw,
      navRow: Math.round(document.querySelector('.nav').getBoundingClientRect().top) };
  });
  chk('①导航四链接全部可见', n1.total === 4 && n1.visCount === 4, JSON.stringify(n1));
  chk('①无横向溢出', n1.bodySW <= n1.iw + 1, JSON.stringify({ s: n1.bodySW, i: n1.iw }));

  /* ② 桌面 UA 手机宽度首页（不跳转）：视频窗 220px */
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await ctx2.newPage();
  await p2.goto(BASE + '/index.html', { waitUntil: 'networkidle', timeout: 30000 });
  await p2.waitForTimeout(2000);
  const v1 = await p2.evaluate(() => ({ h: Math.round(document.getElementById('vdStage').getBoundingClientRect().height) }));
  chk('②首页视频窗手机220px', v1.h >= 215 && v1.h <= 225, 'h=' + v1.h);
  const n2 = await p2.evaluate(() => {
    const links = [...document.querySelectorAll('.nav a')];
    const vw = innerWidth;
    return links.filter(a => { const r = a.getBoundingClientRect(); return r.width > 0 && r.right <= vw + 1; }).length;
  });
  chk('②首页导航四链接可见', n2 === 4, 'vis=' + n2);

  /* ③ 伙伴页：视频已移除，断言墙+姿态窗仍在 */
  const p3 = await ctx.newPage();
  await p3.goto(BASE + '/buddies.html', { waitUntil: 'networkidle', timeout: 30000 });
  await p3.waitForTimeout(1500);
  const v2 = await p3.evaluate(() => ({ wall: document.querySelectorAll('#buddyWall .buddy-tile').length, anim: !!document.getElementById('buddyAnimImg'), videoGone: !document.getElementById('buddyVideo') }));
  chk('③伙伴页墙+姿态窗在、视频已移除', v2.wall === 2 && v2.anim && v2.videoGone, JSON.stringify(v2));

  /* ④ footer 安全区：computed padding-bottom ≥ 32px（无刘海环境 env=0 仍 32px） */
  const f1 = await p3.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.footer')).paddingBottom));
  chk('④footer含安全区padding', f1 >= 32, 'pb=' + f1);

  /* 截图 */
  await p3.screenshot({ path: 'D:/360Downloads/deskbud/website/outputs/mobile_fix_buddies.png', fullPage: true });
  await p2.screenshot({ path: 'D:/360Downloads/deskbud/website/outputs/mobile_fix_home.png', fullPage: false });

  /* ⑤ embed 模式：?embed=1 隐藏顶栏/页脚，只留内容 */
  const pe = await ctx.newPage();
  await pe.goto(BASE + '/buddies.html?embed=1&device_id=' + DID + '&lang=zh', { waitUntil: 'networkidle', timeout: 30000 });
  await pe.waitForTimeout(2000);
  const e1 = await pe.evaluate(() => ({
    htmlCls: document.documentElement.classList.contains('embed-mode'),
    topbarHidden: getComputedStyle(document.querySelector('.topbar')).display === 'none',
    footerHidden: getComputedStyle(document.querySelector('.footer')).display === 'none',
    wallVisible: document.querySelectorAll('#buddyWall .buddy-tile').length === 2,
    buyHref: (document.querySelector('#buddyBuy .btn') || {}).href || '',
    navLang: document.documentElement.lang,
    title: document.getElementById('buddyName') ? document.getElementById('buddyName').textContent : '',
  }));
  chk('⑤embed-mode class 生效', e1.htmlCls);
  chk('⑤顶栏隐藏', e1.topbarHidden);
  chk('⑤页脚隐藏', e1.footerHidden);
  chk('⑤内容仍在（选择墙）', e1.wallVisible);
  chk('⑤embed收银台链接+device_id', e1.buyHref === `https://pay.deskbud.xyz/checkout.html?device_id=${DID}&pet_id=panda`, e1.buyHref);
  chk('⑤?lang=zh 中文生效', e1.navLang === 'zh-CN' && e1.title === '织熊猫', e1.navLang + '/' + e1.title);
  await pe.screenshot({ path: 'D:/360Downloads/deskbud/website/outputs/mobile_embed_mode.png', fullPage: true });

  /* ⑥ lang 记忆：embed 页读过 ?lang=zh 后，无参页仍中文（localStorage 记住） */
  const pe2 = await ctx.newPage();
  await pe2.goto(BASE + '/buddies.html', { waitUntil: 'networkidle', timeout: 30000 });
  await pe2.waitForTimeout(1500);
  const e2 = await pe2.evaluate(() => ({ lang: document.documentElement.lang, ls: localStorage.getItem('deskbud_lang') }));
  chk('⑥lang=zh 记忆到 localStorage', e2.ls === 'zh' && e2.lang === 'zh-CN', JSON.stringify(e2));

  await browser.close();
  console.log('\nRESULT: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
