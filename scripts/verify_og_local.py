# -*- coding: utf-8 -*-
"""verify_og_local.py  --  本地一键校验分享标签（起服务 + 真抓取 + 自动收服）。

为什么单独有它：`verify_og_meta.py --base http://127.0.0.1:PORT` 需要一个**已在跑**的静态服务。
   手动起服务容易**留下孤儿后台进程**（本机 09-17 实测：后台任务被 kill 时报 failed 通知、
   端口残留 TIME_WAIT，还得再去 taskkill 一遍）。
   本脚本在**同一进程内**起 `ThreadingHTTPServer`（directory = 站点根），跑完 verify 立即 shutdown
   —— 前台一条命令、零残留，且默认用 8099，**不会占 8081 / 8100 那两个开发端口**。

用法：
  python scripts/verify_og_local.py                  # 默认 8099，校验 apply_og_meta.PAGES 全部页面
  python scripts/verify_og_local.py --port 8101

⚠️ 用**装了 Pillow 的那个 python**（verify_og_meta.py 要读图尺寸；managed 3.13.12 没装 ⇒ 用 venv）。

退出码直通 verify_og_meta.py。
"""
import argparse
import http.server
import os
import subprocess
import sys
import threading

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, '..'))


class _Handler(http.server.SimpleHTTPRequestHandler):
    """钉死目录到站点根，并静音每请求一行日志（输出只留校验结果）。"""

    def __init__(self, *a, **k):
        super().__init__(*a, directory=SITE, **k)

    def log_message(self, *a, **k):
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--port', type=int, default=8099)
    args = ap.parse_args()

    srv = http.server.ThreadingHTTPServer(('127.0.0.1', args.port), _Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    print('本地服务 http://127.0.0.1:%d  (dir=%s)' % (args.port, SITE))

    try:
        r = subprocess.run(
            [sys.executable, os.path.join(HERE, 'verify_og_meta.py'),
             '--base', 'http://127.0.0.1:%d' % args.port],
            capture_output=True, text=True, encoding='utf-8', errors='replace')
        sys.stdout.write(r.stdout)
        if r.stderr.strip():
            sys.stderr.write(r.stderr)
        return r.returncode
    finally:
        srv.shutdown()
        srv.server_close()
        print('本地服务已停（端口 %d 释放）' % args.port)


if __name__ == '__main__':
    sys.exit(main())
