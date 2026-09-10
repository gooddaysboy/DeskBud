// 2026-09-10 伙伴页二轮改版验证：选择墙 / 聚合动图小窗 / 购买入口 / 视频大窗三平台
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');

const BASE = 'http://127.0.0.1:8081';
let pass = 0, fail = 0;
function chk(name, cond, extra) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, extra || ''); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: chromeExe, headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/buddies.html', { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(2500);
  const b = await p.evaluate(() => ({
    tiles: document.querySelectorAll('#buddyWall .buddy-tile').length,
    tileSrcs: [...document.querySelectorAll('#buddyWall .buddy-tile img')].map(i => i.getAttribute('src')),
    onIdx: [...document.querySelectorAll('#buddyWall .buddy-tile')].findIndex(e => e.classList.contains('on')),
    animSrc: document.getElementById('buddyAnimImg').getAttribute('src'),
    name: document.getElementById('buddyName').textContent,
    buy: document.getElementById('buddyBuy').textContent.trim(),
    buyHref: (document.querySelector('#buddyBuy .btn') || {}).getAttribute ? document.querySelector('#buddyBuy .btn').getAttribute('href') : '',
    buyBtn: !!document.querySelector('#buddyBuy .hd-soon'),
    videoGone: !document.getElementById('buddyVideo'),
    animW: Math.round(document.querySelector('.buddy-anim-stage').getBoundingClientRect().width),
    bodySW: document.body.scrollWidth, iw: innerWidth,
  }));
  chk('①选择墙方块数=2', b.tiles === 2, 'tiles=' + b.tiles);
  chk('①方块用idle动图', b.tileSrcs.join(',').includes('panda-anim/panda_idle.webp') && b.tileSrcs.join(',').includes('rabbit-anim/rabbit_idle.webp'), b.tileSrcs.join(','));
  chk('①默认选中第0个', b.onIdx === 0);
  chk('②姿态小窗用聚合动图', b.animSrc.includes('panda_all.webp'), b.animSrc);
  chk('②姿态窗是小的(≤240)', b.animW > 0 && b.animW <= 240, 'animW=' + b.animW);
  chk('②显示宠物名', b.name === '织熊猫', b.name);
  chk('②购买按钮(先下载桌宠→download)', b.buy.includes('先下载桌宠') && (b.buyHref === 'download.html'), b.buy + '|' + (b.buyHref||''));
  chk('③宣传视频已移除(2026-09-10 老曹拍板)', b.videoGone);
  chk('③无横向溢出', b.bodySW <= b.iw + 1, JSON.stringify({ s: b.bodySW, i: b.iw }));

  /* 切兔子：聚合图/视频占位/购买联动 */
  await p.evaluate(() => { document.querySelectorAll('#buddyWall .buddy-tile')[1].click(); });
  await p.waitForTimeout(1000);
  const b2 = await p.evaluate(() => ({
    onIdx: [...document.querySelectorAll('#buddyWall .buddy-tile')].findIndex(e => e.classList.contains('on')),
    animSrc: document.getElementById('buddyAnimImg').getAttribute('src'),
    name: document.getElementById('buddyName').textContent,
  }));
  chk('①b切兔子选中', b2.onIdx === 1);
  chk('②b聚合图切兔子', b2.animSrc.includes('rabbit_all.webp'), b2.animSrc);
  chk('②b名字切兔子', b2.name === '织兔子', b2.name);
  await p.screenshot({ path: 'D:/360Downloads/deskbud/website/outputs/buddies_v2_mobile.png', fullPage: true });

  /* 桌面宽度：墙左竖排布局 */
  const dCtx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const dp = await dCtx.newPage();
  await dp.goto(BASE + '/buddies.html', { waitUntil: 'networkidle', timeout: 30000 });
  await dp.waitForTimeout(2000);
  const d = await dp.evaluate(() => {
    const wall = document.querySelector('#buddyWall').getBoundingClientRect();
    const anim = document.querySelector('.buddy-anim-card').getBoundingClientRect();
    return { wallLeft: Math.round(wall.x), animX: Math.round(anim.x), sideBySide: anim.x > wall.x + wall.width - 1, bodySW: document.body.scrollWidth, iw: innerWidth };
  });
  chk('④桌面墙在左姿态窗在右', d.sideBySide, JSON.stringify(d));
  chk('④桌面无溢出', d.bodySW <= d.iw + 1);
  await dp.screenshot({ path: 'D:/360Downloads/deskbud/website/outputs/buddies_v2_desktop.png', fullPage: true });

  await browser.close();
  console.log('\nRESULT: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
