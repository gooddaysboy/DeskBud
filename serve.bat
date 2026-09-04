@echo off
chcp 65001 >nul
title DeskBud 预览服务 (http://127.0.0.1:8080)
cd /d "%~dp0"

rem ---- 按优先级探测可用的 Python ----
set "PY="
py -3 --version >nul 2>nul && set "PY=py -3"
if not defined PY (
  python --version >nul 2>nul && set "PY=python"
)
if not defined PY (
  if exist "C:\Python314\python.exe" set "PY=C:\Python314\python.exe"
)
if not defined PY (
  if exist "%USERPROFILE%\.workbuddy\binaries\python\versions\3.13.12\python.exe" set "PY=%USERPROFILE%\.workbuddy\binaries\python\versions\3.13.12\python.exe"
)

if not defined PY (
  echo [错误] 没找到可用的 Python，请先安装 Python 或检查 PATH。
  pause
  exit /b 1
)

echo [serve] 使用解释器: %PY%
%PY% serve.py 8080
pause
