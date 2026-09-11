// 2026-09-11 13:56 下载页内容改版验证：标题/副标题/简介/手册/footer 文案
const { chromeExe } = require('./_env.js');
const { chromium } = require('playwright-core');
const BASE = 'http://127.0.0.1:8081';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const chk = (n, c, x) => { c ? (pass++, console.log('PASS', n)) : (fail++, console.log('FAIL', n, x || '')); };

(async () => {
  const b = await chromium.launch({ executablePath: chromeExe, headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await p.goto(BASE + '/download.html', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2500);

  const s = await p.evaluate(() => ({
    title: document.querySelector('.dl-title').textContent.trim(),
    sub: document.querySelector('.dl-sub').textContent.trim(),
    noteGone: !document.querySelector('.dl-note'),
    introTitle: (document.querySelector('.dl-h2') || {}).textContent || '',
    intro: (document.querySelector('.dl-intro-p') || {}).textContent || '',
    feats: [...document.querySelectorAll('.dl-feats li')].map(e => e.textContent.trim()),
    manualTabs: [...document.querySelectorAll('#dlHmTabs .vtab')].map(e => e.textContent.trim()),
    manualSrc: (document.getElementById('dlHmFrame') || {}).getAttribute ? document.getElementById('dlHmFrame').getAttribute('src') : '',
    manualH: Math.round((document.getElementById('dlHmFrame') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height),
    footer: (document.querySelector('.footer-dl-link') || {}).textContent || '',
  }));

  chk('①标题=DeskBud 桌宠伙伴', s.title === 'DeskBud 桌宠伙伴', s.title);
  chk('②副标题去掉"按需选购/买断"', !s.sub.includes('选购') && !s.sub.includes('买断') && s.sub.includes('免费'), s.sub);
  chk('③旧 note 已删除', s.noteGone);
  chk('④简介标题+正文', s.introTitle.includes('简介') && s.intro.includes('轻量纯净') && s.intro.includes('无任何弹窗广告'), s.introTitle);
  chk('⑤四条卖点', s.feats.length === 4 && s.feats[0].includes('2 款免费') && s.feats[3].includes('16+'), JSON.stringify(s.feats));
  chk('⑥手册三平台标签', JSON.stringify(s.manualTabs) === JSON.stringify(['Windows', 'Android', 'macOS']), JSON.stringify(s.manualTabs));
  chk('⑦手册 iframe 已加载且有高度', s.manualSrc === 'manual/win-zh.html' && s.manualH > 300, `${s.manualSrc} h=${s.manualH}`);
  chk('⑧footer=免费客户端下载', s.footer.trim() === '免费客户端下载', s.footer);

  // 手册切平台 + 切英文
  await p.evaluate(() => { document.querySelector('#dlHmTabs .vtab[data-p="mac"]').click(); });
  await sleep(1200);
  const s2 = await p.evaluate(() => (document.getElementById('dlHmFrame') || {}).getAttribute ? document.getElementById('dlHmFrame').getAttribute('src') : '');
  chk('⑨切 macOS→手册换 mac-zh', s2 === 'manual/mac-zh.html', s2);
  // 切英文（点 EN）
  await p.evaluate(() => { document.getElementById('langSwitch').click(); });
  await sleep(1800);
  const s3 = await p.evaluate(() => ({
    src: document.getElementById('dlHmFrame').getAttribute('src'),
    title: document.querySelector('.dl-title').textContent.trim(),
    btn: (document.querySelector('#dlGrid .dl-action a') || {}).textContent || '',
  }));
  chk('⑩英文模式：标题/按钮/手册联动', s3.src === 'manual/mac-en.html' && s3.title === 'DeskBud Pets' && s3.btn.includes('Download free'), JSON.stringify(s3));

  await p.screenshot({ path: 'D:/360Downloads/deskbud/website/outputs/download_v4.png', fullPage: true });
  await b.close();
  console.log('RESULT: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
