@echo off
setlocal
chcp 65001 >nul
set "ROOT=%~1"
if not defined ROOT set "ROOT=%CD%"
if not exist "%ROOT%\options.txt" (
  echo [ERROR] Minecraftインスタンスのフォルダを指定してください。
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0apply_keymap.ps1" -InstanceRoot "%ROOT%"
if errorlevel 1 (
  echo [ERROR] キー設定の更新に失敗しました。
  pause
  exit /b 1
)
echo [OK] PROJECT DEADZONE推奨キー設定を適用しました。
pause
