@echo off
rem ============================================================
rem  DeskBud local preview server  ->  http://127.0.0.1:8081/
rem  Double-click to start. Close the window to stop the server.
rem  2026-09-12: single-instance guard (fast).
rem  !! NEVER use "tasklist /v" for this -- it takes ~26s on this
rem  machine and makes the launcher look frozen. The guard is ONE
rem  python call (socket connect + FindWindowW), measured ~0.4s.
rem ============================================================
chcp 65001 >nul
cd /d "%~dp0"

set "WINTITLE=DeskBud Preview 8081"

rem ---- find python FIRST (the guard needs it). Known paths cost 0 ms ----
set "PY="
if exist "%USERPROFILE%\.workbuddy\binaries\python\versions\3.13.12\python.exe" set "PY=%USERPROFILE%\.workbuddy\binaries\python\versions\3.13.12\python.exe"
if not defined PY if exist "C:\Python314\python.exe" set "PY=C:\Python314\python.exe"
if not defined PY ( py -3 --version >nul 2>nul && set "PY=py -3" )
if not defined PY ( python --version >nul 2>nul && set "PY=python" )

if not defined PY (
  echo [ERROR] No Python found. Please install Python or check PATH.
  pause
  exit /b 1
)

rem ---- guard: port 8081 already listening, or this window already open? ----
set "ALIVE="
%PY% -c "import socket,ctypes,sys;p=socket.socket();p.settimeout(0.25);sys.exit(0 if (p.connect_ex(('127.0.0.1',8081))==0 or ctypes.windll.user32.FindWindowW(0,'DeskBud Preview 8081')) else 1)"
if not errorlevel 1 set "ALIVE=1"

if defined ALIVE (
  echo [serve] Preview is already running - no new window opened.
  echo [serve] Opening browser at http://127.0.0.1:8081/ ...
  start "" "http://127.0.0.1:8081/index.html"
  echo [serve] This launcher closes in 1 second.
  ping -n 2 127.0.0.1 >nul
  exit /b 0
)

title %WINTITLE%

echo [serve] Python: %PY%
echo [serve] Starting preview at http://127.0.0.1:8081/
echo [serve] Close this window to stop the server.
start "" "http://127.0.0.1:8081/index.html"
%PY% serve.py 8081
pause
