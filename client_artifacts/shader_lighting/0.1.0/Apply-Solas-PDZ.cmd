@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Apply-PdzSolas.ps1" -Activate -InstallPrismHook
if errorlevel 1 pause
