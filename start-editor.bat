@echo off
chcp 65001 >nul
set "LOG=%~dp0start-editor.log"
echo [%date% %time%] begin > "%LOG%"

set PY=
where py >nul 2>nul && set PY=py
if not defined PY ( where python >nul 2>nul && set PY=python )
if not defined PY ( where python3 >nul 2>nul && set PY=python3 )
if not defined PY (
  for %%P in (
    "%LOCALAPPDATA%\Programs\Python\Python*\python.exe"
    "%ProgramFiles%\Python\Python*\python.exe"
    "%ProgramFiles(x86)%\Python\Python*\python.exe"
    "%USERPROFILE%\AppData\Local\Programs\Python\Python*\python.exe"
    "%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe"
    "%USERPROFILE%\AppData\Local\Microsoft\WindowsApps\python.exe"
  ) do ( if not defined PY if exist %%~P set PY=%%~P )
)
echo [%date% %time%] PY=%PY% >> "%LOG%"
if not defined PY (
  echo Python not found. >> "%LOG%"
  echo Python not found. Please install Python and add to PATH.
  pause
  exit /b 1
)
"%PY%" --version >nul 2>nul
if errorlevel 1 (
  echo Python cannot run: %PY% >> "%LOG%"
  echo Python cannot run: %PY%
  pause
  exit /b 1
)

set PORT=8080
echo [%date% %time%] starting server port %PORT% >> "%LOG%"
echo Starting local server http://localhost:%PORT% ...
start /min "" "%PY%" -m http.server %PORT%
echo [%date% %time%] server launched >> "%LOG%"

set READY=0
for /L %%i in (1,1,25) do (
  if not defined READY (
    curl -s -o nul http://localhost:%PORT%/ 2>nul
    if not errorlevel 1 (
      echo [%date% %time%] ready via curl try %%i >> "%LOG%"
      set READY=1
    )
  )
  if not defined READY (
    powershell -Command "try{(Invoke-WebRequest http://localhost:%PORT%/ -UseBasicParsing -TimeoutSec 1).StatusCode}catch{exit 1}" >nul 2>nul
    if not errorlevel 1 (
      echo [%date% %time%] ready via powershell try %%i >> "%LOG%"
      set READY=1
    )
  )
  if defined READY goto :open
  echo [%date% %time%] waiting try %%i >> "%LOG%"
  timeout /t 1 >nul
)
:open
echo [%date% %time%] opening browser >> "%LOG%"

timeout /t 1 >nul
start "" http://localhost:%PORT%/index.html
echo [%date% %time%] done >> "%LOG%"
echo.
echo Opened: http://localhost:%PORT%/index.html
echo Server window is minimized. To stop: taskkill /f /im python.exe
echo If browser still does not open, send me %LOG%.
