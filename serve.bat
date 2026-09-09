@echo off
chcp 65001 >nul
title DeskBud Preview (http://127.0.0.1:8081)
cd /d "%~dp0"

rem ---- Find a usable Python ----
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
  echo [ERROR] No Python found. Please install Python or check PATH.
  pause
  exit /b 1
)

echo [serve] Python: %PY%
echo [serve] Starting preview at http://127.0.0.1:8081/usage.html
echo [serve] Close this window to stop the server.
%PY% serve.py 8081
pause
