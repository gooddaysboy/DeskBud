// 验证网页版气泡三层体系（对齐桌宠 v6）
// 用例：①点击→click 反应 ②拖拽→drag 反应 ③爬墙→climb 状态（含兔子专属）④同状态冷却生效
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const EXE = 'C:\\Users\\Administrator\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const URL = 'http://127.0.0.1:8080/index.html';

const b = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'bubble.json'), 'utf8'));
const txt = e => e.zh || e;
const poolClick = [...b.reactions.click.public, ...(b.reactions.click.pets.rabbit || [])].map(txt);
const poolDrag = [...b.reactions.drag.public, ...(b.reactions.drag.pets.rabbit || [])].map(txt);
const poolClimb = [...b.states.climb.public, ...(b.states.climb.pets.rabbit || [])].map(txt);
const poolSlip = [...b.states.slip.public, ...(b.states.slip.pets.rabbit || [])].map(txt);

const results = [];
const ok = (name, pass, info) => { results.push({ name, pass, info }); console.log((pass ? '  PASS ' : '  FAIL ') + name + (info ? ' | ' + info : '')); };

const readBubble = (page) => page.evaluate(() => {
  const el = document.querySelector('.wm-bubble .wm-bbl');
  return el ? el.textContent : '';
});
const clearBubbles = (page) => page.evaluate(() => {
  document.querySelectorAll('.wm-bubble').forEach(e => e.remove());
  const wm = window.SITE && window.SITE.webmeji;
  (wm._wmContainers || []).forEach(c => { c._wmBubbleEl = null; });
  if (wm) wm._wmLastAny = 0;
});

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(URL, { waitUntil: 'load' });

  await page.waitForSelector('.webmeji-container', { timeout: 20000 });
  await page.waitForTimeout(1200);
  console.log('宠物容器已出现');

  // ---- ① 单击 → click 反应（100% 触发） ----
  await clearBubbles(page);
  const box = await page.locator('.webmeji-container').first().boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(400);
  let t = await readBubble(page);
  ok('① 单击 → L2 click 反应气泡', poolClick.includes(t), JSON.stringify(t));

  // ---- ② 拖拽松手 → drag 反应 ----
  await page.waitForTimeout(2600);   // 等反应气泡散掉
  await clearBubbles(page);
  const box2 = await page.locator('.webmeji-container').first().boundingBox();
  await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);
  await page.mouse.down();
  await page.mouse.move(box2.x + 200, box2.y + 120, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  t = await readBubble(page);
  ok('② 拖拽 → L2 drag 反应气泡', poolDrag.includes(t), JSON.stringify(t));

  // ---- ③ 爬墙 → climb 状态（概率置 1、清冷却，验证状态链路可用） ----
  await page.waitForTimeout(2600);
  await clearBubbles(page);
  await page.evaluate(() => {
    const c = window.SITE.webmeji._BUBBLE_CFG;
    c.prob.climb = 1; c.minGap = 0; c.sameCd = 0;
    document.dispatchEvent(new CustomEvent('webmeji:action', { detail: { action: 'climbSide', edge: 'left' } }));
  });
  await page.waitForTimeout(300);
  t = await readBubble(page);
  ok('③ 爬墙 → L3 climb 状态气泡', poolClimb.includes(t), JSON.stringify(t));

  // ---- ③b 滑落 → slip 状态（概率 0.8 最高，直接置 1 验证链路） ----
  await clearBubbles(page);
  await page.evaluate(() => {
    const c = window.SITE.webmeji._BUBBLE_CFG;
    c.prob.slip = 1;
    document.dispatchEvent(new CustomEvent('webmeji:action', { detail: { action: 'slip', edge: 'left' } }));
  });
  await page.waitForTimeout(300);
  t = await readBubble(page);
  ok('③b 脱落 → L3 slip 状态气泡', poolSlip.includes(t), JSON.stringify(t));

  // ---- ④ 同状态冷却 30s：再发一次 climb 不应冒 ----
  await clearBubbles(page);
  await page.evaluate(() => {
    const wm = window.SITE.webmeji;
    const c = wm._BUBBLE_CFG;
    c.sameCd = 30000; c.minGap = 0; c.prob.climb = 1;
    wm._wmStateLast['climb'] = Date.now();      // 假装刚冒过
    wm._wmLastAny = 0;
    document.dispatchEvent(new CustomEvent('webmeji:action', { detail: { action: 'climbSide', edge: 'left' } }));
  });
  await page.waitForTimeout(300);
  t = await readBubble(page);
  ok('④ 同状态 30s 冷却生效（不重复冒）', t === '', t === '' ? '无气泡' : JSON.stringify(t));

  // ---- ⑤ 最小间隔 5s（任意两条） ----
  await clearBubbles(page);
  await page.evaluate(() => {
    const wm = window.SITE.webmeji;
    const c = wm._BUBBLE_CFG;
    c.sameCd = 0; c.minGap = 5000; c.prob.land = 1;
    wm._wmStateLast = {};
    wm._wmLastAny = Date.now();                 // 刚冒过任意一条
    document.dispatchEvent(new CustomEvent('webmeji:action', { detail: { action: 'fallen', edge: 'bottom' } }));
  });
  await page.waitForTimeout(300);
  t = await readBubble(page);
  ok('⑤ 任意两条最小间隔 5s 生效', t === '', t === '' ? '无气泡' : JSON.stringify(t));

  // ---- ⑦ 采样：状态池应把 public + pets.rabbit 合并（能抽到兔子专属） ----
  const hits = await page.evaluate(() => {
    const set = new Set();
    for (let i = 0; i < 300; i++) set.add(window.BUBBLE.pickState('climb', 'rabbit'));
    return Array.from(set);
  });
  const rabbitClimb = (b.states.climb.pets.rabbit || []).map(txt);
  ok('⑦ climb 池合并兔子专属（public + pets.rabbit）',
    rabbitClimb.some(x => hits.includes(x)),
    '抽到 ' + hits.length + ' 种，含兔子专属 ' + rabbitClimb.filter(x => hits.includes(x)).length + '/' + rabbitClimb.length);

  ok('⑥ 无 JS 报错', errors.length === 0, errors.join(' ; ') || '无');

  await browser.close();
  const failed = results.filter(r => !r.pass);
  console.log('\n=== ' + (results.length - failed.length) + '/' + results.length + ' 通过 ===');
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('脚本异常:', e); process.exit(2); });
