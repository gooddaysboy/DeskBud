@echo off
chcp 65001 >nul
cd /d "%~dp0"

REM 找 python 解释器（兼容 python / python3）
set PY=
where python >nul 2>nul && set PY=python
if not defined PY ( where python3 >nul 2>nul && set PY=python3 )
if not defined PY (
  echo 未找到 python，请先安装 Python 并勾选“Add to PATH”。
  pause
  exit /b 1
)

echo 正在启动本地服务 http://localhost:8080 ...
start "" %PY% -m http.server 8080

REM 等 1 秒让服务起来，再打开浏览器到语录录入页
timeout /t 1 >nul
start "" http://localhost:8080/editor.html

echo.
echo 编辑器已打开：http://localhost:8080/editor.html
echo 同目录下其它页面也可访问：bubble.html（泡泡墙） / index.html / list.html / detail.html
echo.
echo 提示：关闭本窗口不会停止服务；停止服务请在任务管理器结束 python 进程，
echo       或再开一个命令行执行：taskkill /f /im python.exe
echo.
pause
