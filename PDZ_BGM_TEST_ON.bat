@echo off
setlocal
set "ROOT=%~dp0"
set "SRC=%ROOT%ambience_music\music_config_test_all.txt"
set "DST=%ROOT%ambience_music\music_config.txt"
if not exist "%SRC%" (
  echo [ERROR] BGM test configuration was not found.
  pause
  exit /b 1
)
copy /y "%SRC%" "%DST%" >nul
if errorlevel 1 (
  echo [ERROR] Failed to enable BGM test mode.
  pause
  exit /b 1
)
echo BGM test mode enabled.
echo In game: press P to reload, Page Up for the next track, End to pause.
pause
