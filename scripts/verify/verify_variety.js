/**
 * 验证"随机性改进"三件事：
 * ① 泡泡洗牌袋：L2/L3/L1 各池连抽 40 次，断言相邻两条不重复
 * ② 双宠动作分布差异：直接连调 pickWeighted() 统计分布，熊猫 sit 占比应明显高于兔子、
 *    兔子 spin+dance 占比应明显高于熊猫
 * ③ 防连播：模拟 recentActions，连续抽取中非 walk 动作不应连续 3 次出现
 *
 * 前置：本地预览 8080 已起。跑法：NODE_PATH=<managed node workspace>/node_modules node scripts/verify/verify_variety.js
 */
const { chromium } = require('playwright-core');
const { chromeExe: EXE } = require('./_env.js');

const BASE = 'http://127.0.0.1:8080';

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--no-proxy-server'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__WM_CREATURES && window.__WM_CREATURES.length >= 2, { timeout: 20000 });
  await page.waitForTimeout(1500);

  const results = [];
  const ok = (name, pass, detail) => {
    results.push({ name, pass });
    console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
  };

  // ① 洗牌袋相邻不重复（L2 click / L3 sleep / L1 合并池）
  const bagTest = await page.evaluate(() => {
    const B = window.BUBBLE;
    const run = (fn, n) => {
      const seq = [];
      for (let i = 0; i < n; i++) seq.push(fn());
      return seq;
    };
    return {
      react: run(() => B.pickReaction('click', 'panda'), 40),
      state: run(() => B.pickState('sleep', 'rabbit'), 40),
      l1: run(() => B.pickBag('l1:rabbit', B.linesFor('rabbit')), 40),
    };
  });
  const adjDup = (arr) => {
    let n = 0;
    for (let i = 1; i < arr.length; i++) if (arr[i] === arr[i - 1]) n++;
    return n;
  };
  const uniq = (arr) => new Set(arr).size;
  ok('①a L2 click 洗牌袋相邻不重复', adjDup(bagTest.react) === 0, `40 抽 / 去重 ${uniq(bagTest.react)} 种 / 相邻重复 ${adjDup(bagTest.react)} 次`);
  ok('①b L3 sleep 洗牌袋相邻不重复', adjDup(bagTest.state) === 0, `40 抽 / 去重 ${uniq(bagTest.state)} 种 / 相邻重复 ${adjDup(bagTest.state)} 次`);
  ok('①c L1 合并池洗牌袋相邻不重复', adjDup(bagTest.l1) === 0, `40 抽 / 去重 ${uniq(bagTest.l1)} 种 / 相邻重复 ${adjDup(bagTest.l1)} 次`);

  // ② 双宠动作分布差异（连调 pickWeighted 600 次纯分布统计）
  const dist = await page.evaluate(() => {
    const stat = (c, n) => {
      const m = {};
      for (let i = 0; i < n; i++) { const a = c.pickWeighted(); if (a) m[a] = (m[a] || 0) + 1; }
      return m;
    };
    const N = 600;
    return { rabbit: stat(window.__WM_CREATURES[0], N), panda: stat(window.__WM_CREATURES[1], N), N };
  });
  const pct = (m, k) => ((m[k] || 0) / dist.N * 100).toFixed(1);
  const rSpinDance = (+pct(dist.rabbit, 'spin')) + (+pct(dist.rabbit, 'dance'));
  const pSpinDance = (+pct(dist.panda, 'spin')) + (+pct(dist.panda, 'dance'));
  console.log(`   兔子分布: walk=${pct(dist.rabbit,'walk')}% spin=${pct(dist.rabbit,'spin')}% sit=${pct(dist.rabbit,'sit')}% dance=${pct(dist.rabbit,'dance')}% trip=${pct(dist.rabbit,'trip')}%`);
  console.log(`   熊猫分布: walk=${pct(dist.panda,'walk')}% spin=${pct(dist.panda,'spin')}% sit=${pct(dist.panda,'sit')}% dance=${pct(dist.panda,'dance')}% trip=${pct(dist.panda,'trip')}%`);
  ok('②a 熊猫 sit 占比 > 兔子（憨态）', +pct(dist.panda, 'sit') > +pct(dist.rabbit, 'sit'));
  ok('②b 兔子 spin+dance 占比 > 熊猫（活泼）', rSpinDance > pSpinDance, `兔 ${rSpinDance.toFixed(1)}% vs 熊 ${pSpinDance.toFixed(1)}%`);

  // ③ 防连播：模拟 recentActions 真实调度（抽中→记住→再抽）
  const streak = await page.evaluate(() => {
    const c = window.__WM_CREATURES[0];
    c.recentActions = [];
    let maxStreak = 0, cur = 0, prev = null;
    for (let i = 0; i < 400; i++) {
      const a = c.pickWeighted();
      if (!a) continue;
      if (a !== 'walk' && a === prev) { cur++; maxStreak = Math.max(maxStreak, cur); }
      else cur = a !== 'walk' ? 1 : 0;
      prev = a;
      c.rememberAction(a);
    }
    c.recentActions = [];
    return maxStreak;
  });
  ok('③ 非 walk 动作最大连播 ≤2（防连播抑制生效）', streak <= 2, `400 次抽签中最大连播 ${streak}`);

  await browser.close();
  const fails = results.filter(r => !r.pass).length;
  console.log(fails ? `\n结论: ❌ ${fails} 项未过` : '\n结论: ✅ 全部通过');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
