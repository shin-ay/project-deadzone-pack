@echo off
setlocal
set "ROOT=%~dp0"
set "SRC=%ROOT%ambience_music\music_config_production.txt"
set "DST=%ROOT%ambience_music\music_config.txt"
if not exist "%SRC%" (
  echo [ERROR] Production BGM configuration was not found.
  pause
  exit /b 1
)
copy /y "%SRC%" "%DST%" >nul
if errorlevel 1 (
  echo [ERROR] Failed to restore production BGM mode.
  pause
  exit /b 1
)
echo Production BGM mode restored.
echo In game: press P to reload.
pause
