/* 素材加载失败兜底（installMediaFallback）单测。
 * 做法与 test_bubble_query.js 一致：**从真实 site.js 抽源码**在 vm 里跑 + fake DOM，
 * 不复制一份实现（复制的那份会漂移）。
 * 跑法：node test_media_fallback.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FILE = path.resolve(__dirname, '..', 'assets', 'js', 'site.js');
const SRC = fs.readFileSync(FILE, 'utf8');

let PASS = 0, FAIL = 0;
function ok(name, cond, extra) {
  if (cond) { PASS++; console.log('  ✓ ' + name + (extra ? '   (' + extra + ')' : '')); }
  else { FAIL++; console.log('  ✗ ' + name + (extra ? '   (' + extra + ')' : '')); }
}

/* ---------- 从真实文件里把这段 IIFE 抽出来 ---------- */
const START = SRC.indexOf('(function installMediaFallback() {');
const END = START < 0 ? -1 : SRC.indexOf('})();', START);
if (START < 0 || END < 0) { console.log('✗ 抽不到 installMediaFallback 片段'); process.exit(1); }
const CODE = SRC.slice(START, END + 5);

/* ---------- fake DOM ---------- */
function makeImg(src, complete, naturalWidth) {
  const cls = new Set();
  const el = {
    tagName: 'IMG',
    dataset: {},
    complete: complete,
    naturalWidth: naturalWidth,
    getAttribute: (k) => (k === 'src' ? src : null),
    _cls: cls,
    parentElement: { classList: { add: (c) => cls.add(c) } },
  };
  return el;
}

function boot(readyState, imgs) {
  const events = {};                       // 事件 -> [handler]
  const docEvents = {};
  const sandbox = {
    document: {
      readyState: readyState,
      querySelectorAll: (sel) => (sel === 'img' ? imgs : []),
      addEventListener: (t, h) => { (docEvents[t] = docEvents[t] || []).push(h); },
    },
    window: {
      addEventListener: (t, h, cap) => {
        (events[t] = events[t] || []).push({ h, cap });
      },
    },
  };
  sandbox.window.document = sandbox.document;
  vm.createContext(sandbox);
  new vm.Script(CODE, { filename: 'installMediaFallback.js' }).runInContext(sandbox);
  return {
    fireError(target) {
      (events.error || []).forEach((x) => x.h({ target }));
    },
    fireDoc(t) { (docEvents[t] || []).forEach((h) => h()); },
    captureCount: (events.error || []).filter((x) => x.cap === true).length,
    hasErrorListener: !!events.error,
  };
}

console.log('-- A. readyState=complete：装监听时立即扫一遍 --');
{
  const good = makeImg('works/rabbit-lite/idle.webp?v=28', true, 320);
  const dead = makeImg('works/cat-nap/cover.gif?v=28', true, 0);
  const pending = makeImg('works/star-fox/cover.gif?v=28', false, 0);
  const notPet = makeImg('assets/img/qr-android.svg?v=28', true, 0);
  const b = boot('complete', [good, dead, pending, notPet]);

  ok('A1 已失败且是 works/ 素材 -> 容器加 .media-missing', dead._cls.has('media-missing'));
  ok('A2 加载成功的图不动', !good._cls.has('media-missing'));
  ok('A3 还没加载完（complete=false）不误判', !pending._cls.has('media-missing'));
  ok('A4 非 works/ 资源（二维码）不接管', !notPet._cls.has('media-missing'));
  ok('A5 error 用 capture 监听（否则收不到资源错误）', b.captureCount === 1, 'capture handlers=' + b.captureCount);
  ok('A6 只处理 1 张，别的没被顺带标记',
    [good, pending, notPet].every((x) => !x._cls.has('media-missing')));
}

console.log('-- B. 之后的失败走 error 事件 --');
{
  const img = makeImg('works/pixel-slime/cover.gif?v=28', false, 0);
  const other = makeImg('assets/img/logo.png', false, 0);
  const b = boot('complete', [img, other]);
  ok('B1 挂载时未失败 -> 暂不标记', !img._cls.has('media-missing'));
  b.fireError(img);
  ok('B2 error 后标记', img._cls.has('media-missing'));
  ok('B3 非 works/ 的 error 不标记', (b.fireError(other), !other._cls.has('media-missing')));
}

console.log('-- C. 幂等（error 可能被重复派发） --');
{
  const img = makeImg('works/clock-bot/cover.gif?v=28', false, 0);
  const b = boot('complete', [img]);
  let adds = 0;
  img.parentElement.classList.add = (c) => { adds++; img._cls.add(c); };
  b.fireError(img); b.fireError(img); b.fireError(img);
  ok('C1 连发 3 次 error 只加 1 次 class', adds === 1, 'adds=' + adds);
  ok('C2 dataset 打了标记（防重入）', img.dataset.mediaMissing === '1');
}

console.log('-- D. readyState=loading：等 DOMContentLoaded 再扫 --');
{
  const dead = makeImg('works/cat-nap/cover.gif?v=28', true, 0);
  const b = boot('loading', [dead]);
  ok('D1 loading 时不扫描（此时 DOM 还没完）', !dead._cls.has('media-missing'));
  b.fireDoc('DOMContentLoaded');
  ok('D2 DOMContentLoaded 后扫到并标记', dead._cls.has('media-missing'));
}

console.log('-- E. 源码契约 --');
{
  // ⚠️ 必须同时认「相对路径 works/...」和「绝对 /works/...」—— 页面里 img 的 src 由
  //    assetUrl() 生成的是**相对路径**（无前导斜杠），早先写成 /\/works\// 线上根本不匹配。
  ok('E1 只认 works/ 路径（相对或绝对），不误伤 logo/二维码', CODE.includes('(^|\\/)works\\/'));
  ok('E2 不做任何重试（离线重试无意义）', !/\bfetch\s*\(|new Image\(|\.src\s*=/.test(CODE));
  ok('E3 不改图片本身尺寸（只隐藏，尺寸交给容器）', !/style\.(width|height|display)/.test(CODE));
  ok('E4 挂在 window capture 上（三端 WebView 通用）', CODE.includes("window.addEventListener('error'"));
}

console.log('\n== %d 通过 / %d 失败 ==', PASS, FAIL);
process.exit(FAIL ? 1 : 0);
