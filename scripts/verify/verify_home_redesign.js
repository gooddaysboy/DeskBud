// 首页改版第七轮冒烟（2026-09-09）：左选择卡 + 右横滚姿态走马灯 + 下部详情区 + 手册大卡 + 三行页脚
// 覆盖：选择卡、横滚走马灯、徽标、详情区、视频三卡、手册卡、双向同步、首页极简、
//       中英重绘（含时光 hl）、nav 文案/footer 三行、视频 stage 与 showcase 同高
const { chromium } = require('playwright-core');
const { chromeExe } = require('./_env.js');

(async () => {
  const base = 'http://127.0.0.1:8081';
  const b = await chromium.launch({
    executablePath: chromeExe,
    args: ['--no-sandbox', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
  });
  const page = await b.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  const results = [];
  const check = (name, ok, extra) => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' | ' + extra : ''}`);
  // 2026-09-12：宠物增多（线咪/熊猫/兔子），按名字点选，别再用下标硬编码
  const clickPet = async (name) => {
    await page.evaluate((n) => {
      const c = [...document.querySelectorAll('.pick-card')].find(x => {
        const b = x.querySelector('.pick-txt b');
        return b && b.textContent.trim() === n;
      });
      if (c) c.click();
    }, name);
  };

  await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  // 1. 零 JS 报错
  check('无 JS 报错', errors.length === 0, errors.slice(0, 3).join(' ; '));

  // 2. 选择卡渲染
  const pickCount = await page.locator('.pick-card').count();
  check('选择卡渲染 3 张', pickCount === 3, `实际 ${pickCount}`);

  // 3. 展示卡横滚走马灯：spose-item 渲染 = 2*states（无缝循环复制），首屏窗口可见 ~3 个
  const sposeTotal = await page.locator('#showcaseTrack .spose-item').count();
  // 2026-09-12：首宠改为线咪（19 帧）→ 19*2=38；熊猫/兔子切换后另行断言
  check('首页横滚走马灯 38 项(线咪19*2)', sposeTotal === 38, `实际 ${sposeTotal}`);
  const sposeVisible = await page.evaluate(() => {
    const wrap = document.querySelector('.showcase-track-wrap');
    if (!wrap) return 0;
    const wrapR = wrap.getBoundingClientRect();
    return [...document.querySelectorAll('#showcaseTrack .spose-item')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.right > wrapR.left && r.left < wrapR.right;
    }).length;
  });
  check('首屏可见 ≥3 个姿态', sposeVisible >= 3, `可见 ${sposeVisible}`);

  // 4. showcase track-wrap 高度 400 = video stage 高度 400（老曹 2026-09-09 拍板同尺寸）
  const heights = await page.evaluate(() => {
    const a = document.querySelector('.showcase-track-wrap');
    const v = document.querySelector('.video-stage');
    return { showcase: a ? a.offsetHeight : 0, video: v ? v.offsetHeight : 0 };
  });
  check('展示卡与视频卡同高 400', heights.showcase === 400 && heights.video === 400, JSON.stringify(heights));

  // 5. 徽标 = 线咪 · 姿态名（2026-09-12：线咪为首宠）
  const badge1 = await page.textContent('#showcaseBadge');
  check('徽标含「线咪 ·」', /线咪\s*·/.test(badge1 || ''), badge1);

  // 6. 切换伙伴(织兔子) → 走马灯重渲染
  await clickPet('织兔子');
  await page.waitForTimeout(500);
  const spose2 = await page.locator('#showcaseTrack .spose-item').count();
  const hdTitle2 = await page.textContent('#hdTitle');
  check('切伙伴后走马灯重建 22', spose2 === 22, `实际 ${spose2}`);
  check('切伙伴→详情标题=织兔子', /织兔子/.test(hdTitle2 || ''), hdTitle2);
  const badge2 = await page.textContent('#showcaseBadge');
  check('切伙伴→徽标=织兔子', /织兔子\s*·/.test(badge2 || ''), badge2);

  // 7. 切到织熊猫
  await clickPet('织熊猫');
  await page.waitForTimeout(500);

  // 8. 视频三平台标签常驻；兔子无视频→占位
  const vtabCount = await page.locator('#vdTabs .vtab').count();
  check('视频三平台标签', vtabCount === 3, `实际 ${vtabCount}`);
  await clickPet('织兔子');
  await page.waitForTimeout(400);
  const rabbitPh = await page.locator('#vdStage .video-ph').count();
  check('兔子无视频→占位卡', rabbitPh === 1, `实际 ${rabbitPh}`);

  // 9. 首页已无用户手册卡（2026-09-12 老曹：手册卡移出首页，仅下载页保留）
  const hmGone = await page.locator('#hmFrame, #hmTabs').count();
  check('首页无手册卡', hmGone === 0, `实际 ${hmGone}`);
  // 视频平台标签自身可切换（点 android → 该标签高亮）
  await page.locator('#vdTabs .vtab').nth(1).click();
  await page.waitForTimeout(400);
  const vtabOn = await page.locator('#vdTabs .vtab.on').textContent();
  check('视频标签自切换', /Android/i.test(vtabOn || ''), vtabOn);

  // 10. 切到织熊猫 → 默认 win 视频渲染
  await clickPet('织熊猫');
  await page.waitForTimeout(700);
  const pandaVid = await page.locator('#vdStage video').count();
  const pandaSrc = await page.getAttribute('#vdStage video', 'src');
  check('熊猫默认 win 视频', pandaVid === 1, `实际 ${pandaVid}`);
  check('视频 src 指向 works', /works\//.test(pandaSrc || ''), pandaSrc);

  // 11. 首页极简：隐藏搜索栏+无走马灯
  const chromeState = await page.evaluate(() => ({
    searchHidden: !document.querySelector('.top-search') || document.querySelector('.top-search').style.display === 'none',
    announce: document.querySelectorAll('.announce-bar').length,
    quote: document.querySelectorAll('.quote-bar').length
  }));
  check('首页隐藏搜索栏', chromeState.searchHidden);
  check('首页无走马灯', chromeState.announce === 0 && chromeState.quote === 0, `ann=${chromeState.announce} q=${chromeState.quote}`);

  // 12. 软导航进出：list.html 搜索栏恢复+走马灯补建；回首页再移除
  await page.goto(base + '/list.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  const listState = await page.evaluate(() => ({
    searchShown: !!document.querySelector('.top-search') && document.querySelector('.top-search').style.display !== 'none',
    announce: document.querySelectorAll('.announce-bar').length
  }));
  check('list 搜索栏恢复', listState.searchShown);
  check('list 公告走马灯补建', listState.announce === 1, `实际 ${listState.announce}`);
  await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  const backHome = await page.evaluate(() => document.querySelectorAll('.announce-bar, .quote-bar').length);
  check('回首页走马灯再移除', backHome === 0, `实际 ${backHome}`);

  // 13. 中文态 heroLead 时光高亮（静态 HTML 含 span.hl）
  const leadHtml = await page.innerHTML('#heroLead');
  check('中文 heroLead 含时光 hl', /时光/.test(leadHtml) && /<span class="hl">/.test(leadHtml), leadHtml.slice(0, 80));

  // 14. 切英文 → heroBig roaming、kicker JOY、手册 iframe 切 -en
  await page.click('#langSwitch');
  await page.waitForTimeout(600);
  const heroEn = await page.textContent('#heroBig');
  const kickerEn = await page.textContent('#heroKickerText');
  check('英文 hero 重绘', /roaming/i.test(heroEn || ''), (heroEn || '').slice(0, 60));
  check('英文 kicker 重绘', /JOY/i.test(kickerEn || ''), kickerEn);
  const leadEnHtml = await page.innerHTML('#heroLead');
  check('英文 heroLead 含 moment hl', /moment/i.test(leadEnHtml) && /<span class="hl">/.test(leadEnHtml), leadEnHtml.slice(0, 80));
  const posesTitleEn = await page.textContent('#posesTitle');
  check('英文态姿态宫格重绘', /all poses/i.test(posesTitleEn || ''), posesTitleEn);

  // 14. 切回中文
  await page.click('#langSwitch');
  await page.waitForTimeout(600);

  // 14b. footer 切英文后再切回中文，验证 footer.download 双向可替换
  await page.click('#langSwitch');
  await page.waitForTimeout(600);
  const dlEn = await page.locator('.footer-dl-link').textContent();
  check('footer-dl 英文态含 download', /download/i.test(dlEn || ''), dlEn);
  await page.click('#langSwitch');
  await page.waitForTimeout(600);
  const dlZh = await page.locator('.footer-dl-link').textContent();
  check('footer-dl 中文态 = 客户端下载', /客户端下载/.test(dlZh || ''), dlZh);

  // 16. nav 下载入口（2026-09-11 起为橙色胶囊「下载」+图标，非「客户端下载」）
  const navText = await page.textContent('.nav');
  check('nav 下载入口', /下载/.test(navText || '') && ! /下载客户端/.test(navText || ''), navText);

  // 17. footer 行2 三件同行：客户端下载 / 联系我们·邮箱 / tagline（v8 合并 footer-dl 到 footer-bottom-left）
  const footerInfo = await page.evaluate(() => {
    const bot = document.querySelector('.footer-bottom');
    const top = document.querySelector('.footer-top');
    const left = document.querySelector('.footer-bottom-left');
    return {
      leftHref: left ? left.querySelector('a.footer-dl-link')?.getAttribute('href') : null,
      leftMailto: left ? !!left.querySelector('a[href^="mailto:"]') : false,
      botHasTagline: bot ? /趣味桌面宠物伙伴|always on your screen/.test(bot.textContent) : false,
      topHasCopy: top ? /©|保留所有权利|all rights/i.test(top.textContent) : false,
      topHasPv: top ? !!top.querySelector('.site-pv') : false
    };
  });
  check('footer-bottom-left 客户端下载链 download.html', footerInfo.leftHref === 'download.html', footerInfo.leftHref);
  check('footer-bottom-left 含 mailto', footerInfo.leftMailto);
  check('footer-bottom 含 tagline', footerInfo.botHasTagline);
  check('footer-top 含版权字符', footerInfo.topHasCopy);
  check('footer-top 含 PV（v7 对调）', footerInfo.topHasPv);

  // 18. 姿态速览宫格已渲染（2026-09-12 新增；当前伙伴=织熊猫 → 11 格）
  const poseN = await page.locator('#posesGrid .pose-card').count();
  check('首页姿态宫格已渲染', poseN >= 11, `实际 ${poseN}`);

  // 19. 隐私页：暖米背景+大立体卡+极简
  await page.goto(base + '/privacy.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  const pv = await page.evaluate(() => ({
    warm: document.body.classList.contains('privacy-warm'),
    card: !!document.querySelector('.privacy-card'),
    searchHidden: !document.querySelector('.top-search') || document.querySelector('.top-search').style.display === 'none',
    bars: document.querySelectorAll('.announce-bar, .quote-bar').length,
    dl: !!document.querySelector('.footer-dl')
  }));
  check('隐私页暖米背景类', pv.warm);
  check('隐私页大立体卡', pv.card);
  check('隐私页无搜索栏', pv.searchHidden);
  check('隐私页无走马灯', pv.bars === 0, `实际 ${pv.bars}`);
  check('隐私页 footer 含客户端下载链', await page.locator('.footer-bottom-left a.footer-dl-link').count() === 1);

  // 20. 6 页 nav 文案统一（list/detail/usage/privacy 抽检）
  for (const p of ['list', 'detail', 'usage', 'privacy']) {
    await page.goto(base + '/' + p + '.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(400);
    const t = await page.textContent('.nav');
    check(`${p} nav=下载`, /下载/.test(t || '') && ! /下载客户端/.test(t || ''), t.slice(0, 60));
  }

  const pass = results.filter(r => r.startsWith('PASS')).length;
  const fail = results.length - pass;
  console.log(results.join('\n'));
  console.log(`\n结果: ${pass} PASS / ${fail} FAIL`);
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('脚本异常:', e); process.exit(2); });