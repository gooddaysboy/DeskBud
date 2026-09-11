// 2026-09-11 全站宣传语条验证（形态：双轨接力·一次一条·无空档）
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');
const BASE = 'http://127.0.0.1:8081';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const chk = (n, c, x) => { c ? (pass++, console.log('PASS', n)) : (fail++, console.log('FAIL', n, x || '')); };

(async () => {
  const b = await chromium.launch({ executablePath: chromeExe, headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });

  /* ① 全站 8 页都有宣传语条（含极简页：首页/伙伴/下载/隐私） */
  const pages = ['index.html','buddies.html','download.html','privacy.html','detail.html','list.html','pets.html','usage.html'];
  let all = true, missing = [];
  for (const pg of pages) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage();
    try {
      await p.goto(BASE + '/' + pg, { waitUntil: 'networkidle', timeout: 25000 });
      await sleep(1000);
      const ok = await p.evaluate(() => {
        const bar = document.querySelector('.slogan-bar');
        return !!bar && bar.textContent.trim().length > 4;
      });
      if (!ok) { all = false; missing.push(pg); }
    } catch (e) { all = false; missing.push(pg + ':' + e.message.slice(0, 20)); }
    await ctx.close();
  }
  chk('①8 页全部有宣传语条', all, missing.join(', '));

  /* ② 形态：双轨接力（照语录条 quote-bar）——屏上至多一条、无空档、背景透明 */
  const ctx2 = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p2 = await ctx2.newPage();
  await p2.goto(BASE + '/index.html', { waitUntil: 'networkidle', timeout: 25000 });
  await sleep(1200);
  const sb = await p2.evaluate(() => {
    const bar = document.querySelector('.slogan-bar');
    const items = [...bar.querySelectorAll('.slogan-item')];
    return {
      n: items.length,
      texts: items.map(e => e.textContent),
      anim: getComputedStyle(items[0]).animationName,
      d1: getComputedStyle(items[0]).animationDelay,
      d2: getComputedStyle(items[1]).animationDelay,
      bg: getComputedStyle(bar).backgroundColor,
      color: getComputedStyle(bar).color,
      dur: parseFloat(getComputedStyle(items[0]).animationDuration),
      navColor: getComputedStyle(document.querySelector('.nav a.active') || document.querySelector('.nav a')).color,
    };
  });
  chk('②双轨 2 条 + 错开半周期', sb.n === 2 && sb.d1 !== sb.d2, JSON.stringify({ n: sb.n, d1: sb.d1, d2: sb.d2 }));
  chk('②滑动中(quoteScroll)', sb.anim === 'quoteScroll', sb.anim);
  chk('②背景透明', sb.bg === 'rgba(0, 0, 0, 0)', sb.bg);
  chk('②字色=亮橙且与导航一致', sb.color === 'rgb(232, 114, 43)' && sb.color === sb.navColor, sb.color + ' vs nav ' + sb.navColor);
  chk('②速度慢悠悠(周期≥24s)', sb.dur >= 24, 'dur=' + sb.dur + 's');

  /* ②b 采样 4 个周期：至多一条完全在屏内 + 无空档（周期压到 3s 快测） */
  await p2.evaluate(() => { document.querySelector('.slogan-bar').style.setProperty('--slogan-dur', '3s'); });
  await sleep(400);
  const tr1 = await p2.evaluate(() => getComputedStyle(document.querySelectorAll('.slogan-item')[0]).transform);
  await sleep(600);
  const tr2 = await p2.evaluate(() => getComputedStyle(document.querySelectorAll('.slogan-item')[0]).transform);
  chk('②b transform 在推进', tr1 !== tr2, tr1.slice(0, 20) + ' -> ' + tr2.slice(0, 20));

  let maxFull = 0, maxAny = 0, gap = 0, total = 0;
  for (let i = 0; i < 55; i++) {
    const s = await p2.evaluate(() => {
      const vw = innerWidth;
      let full = 0, any = 0;
      document.querySelectorAll('.slogan-item').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.right > 0 && r.left < vw) any++;
        if (r.left >= 0 && r.right <= vw) full++;
      });
      return { full, any };
    });
    total++;
    if (s.full > maxFull) maxFull = s.full;
    if (s.any > maxAny) maxAny = s.any;
    if (s.any === 0) gap++;
    await sleep(200);
  }
  chk('②b 至多一条完全在屏内', maxFull <= 1, 'maxFull=' + maxFull);
  chk('②b 不断档(采样 55 次无空屏)', gap === 0, 'gap=' + gap + '/' + total + ' maxAny=' + maxAny);

  /* ②c 跑完一轮换句（周期已压到 3s；轮询采样文本——首尾对比会因 4 条绕回而假阴） */
  const seq = [];
  for (let i = 0; i < 14; i++) {
    await sleep(500);
    const ts = await p2.evaluate(() => [...document.querySelectorAll('.slogan-item')].map(e => e.textContent));
    ts.forEach(t => { if (!seq.includes(t)) seq.push(t); });
  }
  await p2.evaluate(() => { document.querySelector('.slogan-bar').style.removeProperty('--slogan-dur'); });
  chk('②c 轮播换句(采样到多句)', seq.length >= 3, 'seq=' + seq.length + ' | ' + seq.map(s => s.slice(0, 8)).join(' / '));

  /* ③ 与顶栏位置关系（在 topbar 之后） */
  const pos = await p2.evaluate(() => {
    const tb = document.querySelector('.topbar').getBoundingClientRect();
    const sb = document.querySelector('.slogan-bar').getBoundingClientRect();
    return { tbBottom: Math.round(tb.bottom), sbTop: Math.round(sb.top), h: Math.round(sb.height) };
  });
  chk('③紧贴顶栏下方', Math.abs(pos.sbTop - pos.tbBottom) < 3 && pos.h > 20 && pos.h < 60, JSON.stringify(pos));

  /* ④ embed 模式不注入 */
  const ctx4 = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p4 = await ctx4.newPage();
  await p4.goto(BASE + '/buddies.html?embed=1&lang=zh&device_id=dsk0123456789abcdef', { waitUntil: 'networkidle', timeout: 25000 });
  await sleep(1500);
  const emb = await p4.evaluate(() => ({ bar: !!document.querySelector('.slogan-bar'), display: document.querySelector('.slogan-bar') ? getComputedStyle(document.querySelector('.slogan-bar')).display : 'none' }));
  chk('④embed 模式无宣传语条', emb.display === 'none', JSON.stringify(emb));

  /* ⑤ 语言联动（切 EN） */
  const ctx5 = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p5 = await ctx5.newPage();
  await p5.goto(BASE + '/index.html?lang=zh', { waitUntil: 'networkidle', timeout: 25000 });
  await sleep(1200);
  const zhTxt = await p5.evaluate(() => document.querySelector('.slogan-bar').textContent.trim());
  await p5.evaluate(() => document.getElementById('langSwitch').click());
  await sleep(1500);
  const enTxt = await p5.evaluate(() => document.querySelector('.slogan-bar').textContent.trim());
  chk('⑤切英文后文案变英文', /[\u4e00-\u9fa5]/.test(zhTxt) && !/[\u4e00-\u9fa5]/.test(enTxt), `zh=${zhTxt.slice(0,20)} en=${enTxt.slice(0,30)}`);

  /* ⑥ 合规：全站不含极限词 */
  const all4 = await p5.evaluate(() => document.body.innerText);
  chk('⑥文案无极限词（最/第一/国家级）', !/最良心|第一|国家级|最优/.test(all4));

  await p5.screenshot({ path: 'D:/360Downloads/deskbud/website/outputs/slogan_bar.png', clip: { x: 0, y: 0, width: 1280, height: 240 } });
  await b.close();
  console.log('RESULT: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
