"""DeskBud 本地预览服务（带 no-cache 头的静态服务器）。

用法: python serve.py [端口]   默认 8080
作用: 解决浏览器缓存旧页面的问题——所有响应都带
      Cache-Control: no-store，浏览器每次都拉最新文件。
"""
import http.server
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
os.chdir(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    """在默认静态处理器基础上追加禁缓存响应头。"""

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    try:
        httpd = Server(("127.0.0.1", PORT), NoCacheHandler)
    except OSError:
        print(f"[serve] 端口 {PORT} 已被占用——预览服务可能已在运行，请勿重复启动。")
        sys.exit(1)
    print(f"[serve] 预览服务已启动: http://127.0.0.1:{PORT}/index.html")
    print("[serve] 已启用 no-cache，浏览器不会再显示旧内容。按 Ctrl+C 停止。")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[serve] 已停止。")


if __name__ == "__main__":
    main()
