// 手机宽度模拟截图首页——取证「切换标签无限长/只显示熊猫」问题
const { chromeExe } = require('./_env.js');
const { spawnSync } = require('child_process');
const fs = require('fs');

const out = 'D:/360Downloads/deskbud/website/outputs/mobile_home_check.png';
const tmp = 'D:/360Downloads/deskbud/website/outputs/_mobile_home_tmp.png';
const args = [
  '--headless=new', '--disable-gpu', '--no-sandbox',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  '--window-size=390,3800', '--force-device-scale-factor=1',
  '--virtual-time-budget=9000',
  '--screenshot=' + tmp,
  'http://127.0.0.1:8081/index.html',
];
const r = spawnSync(chromeExe, args, { encoding: 'buffer', timeout: 60000 });
if (r.status !== 0 || !fs.existsSync(tmp)) {
  console.error('ERR screenshot failed', r.stderr && r.stderr.toString().slice(0, 300));
  process.exit(1);
}
fs.copyFileSync(tmp, out);
console.log('OK', out);
