// 一次性脚本：把 catalog.json 核心数据内联进 pets.html（方案A根治首屏空白）
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
const anchor = 'assets/js/bubble.js?v=19"></script>';
const at = html.indexOf(anchor);
if (at === -1) { console.error('锚点未找到: ' + anchor); process.exit(1); }
const insertAt = at + anchor.length;
if (html.indexOf('id="catalogData"') !== -1) { console.error('catalogData 已存在，跳过'); process.exit(2); }
html = html.slice(0, insertAt) + inlineHtml + html.slice(insertAt);
fs.writeFileSync(path.join(root, 'pets.html'), html, 'utf8');
console.log('inline 已嵌入，JSON bytes:', Buffer.byteLength(JSON.stringify(cat)));
