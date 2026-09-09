// verify 脚本共享环境探测——换机免改路径，无硬编码盘符。
// Chrome 可执行文件优先级：
//   1. 环境变量 CHROME_PATH（存在才用）
//   2. %LOCALAPPDATA%\ms-playwright\chromium-* 里版本号最大的 chrome-win64/chrome.exe
// 都没找到时返回空串，verify 脚本会报「未找到 Chrome，请设置 CHROME_PATH」。
const fs = require('fs');
const path = require('path');

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
    } catch (_) { /* ms-playwright 目录不存在 */ }
  }
  return '';
}

const chromeExe = findChromeExe();
if (!chromeExe) {
  console.error('ERR 未找到 Chrome/Chromium，请设置环境变量 CHROME_PATH 指向 chrome.exe');
  process.exit(1);
}

module.exports = { chromeExe };
