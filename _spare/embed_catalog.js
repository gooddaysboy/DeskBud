// 把 catalog.json 核心数据内联进 pets.html（方案A根治首屏空白）
// 幂等：内联块不存在则插入，已存在则整体替换（改 catalog 后直接重跑即可）
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

const cat = JSON.parse(fs.readFileSync(path.join(root, 'data', 'catalog.json'), 'utf8'));
// 剔除纯维护字段，只留程序消费的核心数据
delete cat.note;
delete cat.updated;

const inlineHtml = '\n  <script type="application/json" id="catalogData">\n' +
  JSON.stringify(cat, null, 2) +
  '\n  </script>\n';

let html = fs.readFileSync(path.join(root, 'pets.html'), 'utf8');

// 已存在的内联块：整体替换（非贪婪匹配到最近的 </script>）
const blockRe = /[ \t]*<script type="application\/json" id="catalogData">[\s\S]*?<\/script>\n?/;
if (blockRe.test(html)) {
  html = html.replace(blockRe, inlineHtml.trimEnd() + '\n');
  fs.writeFileSync(path.join(root, 'pets.html'), html, 'utf8');
  console.log('inline 已更新，JSON bytes:', Buffer.byteLength(JSON.stringify(cat)));
  process.exit(0);
}

// 否则：插到 bubble.js 引用之后
const anchor = 'assets/js/bubble.js?v=20"></script>';
const at = html.indexOf(anchor);
if (at === -1) { console.error('锚点未找到: ' + anchor); process.exit(1); }
const insertAt = at + anchor.length;
html = html.slice(0, insertAt) + inlineHtml + html.slice(insertAt);
fs.writeFileSync(path.join(root, 'pets.html'), html, 'utf8');
console.log('inline 已嵌入，JSON bytes:', Buffer.byteLength(JSON.stringify(cat)));
