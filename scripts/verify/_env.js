// verify 脚本共享环境探测——换机免改路径。
// Chrome 可执行文件优先级：
//   1. 环境变量 CHROME_PATH（存在才用）
//   2. %LOCALAPPDATA%\ms-playwright\chromium-* 里版本号最大的 chrome-win64/chrome.exe
//   3. 旧硬编码路径保底（原 Administrator 机器）
// 都没有时返回 FALLBACK，chromium.launch 会自己报可读的错误。
const fs = require('fs');
const path = require('path');

const FALLBACK = 'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';

function findChromeExe() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const root = path.join(localAppData, 'ms-playwright');
    try {
      const dirs = fs.readdirSync(root)
        .filter(d => /^chromium-\d+$/.test(d))
        .sort((a, b) => parseInt(b.slice(9), 10) - parseInt(a.slice(9), 10));
      for (const d of dirs) {
        const exe = path.join(root, d, 'chrome-win64', 'chrome.exe');
        if (fs.existsSync(exe)) return exe;
      }
    } catch (_) { /* ms-playwright 目录不存在，走保底 */ }
  }
  return FALLBACK;
}

module.exports = { chromeExe: findChromeExe() };
