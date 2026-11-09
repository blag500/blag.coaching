@echo off
rem Пуска scripts/tablo-sync.mjs от корена на repo-то — оттам supabase CLI
rem знае към кой проект пише. Task Scheduler пуска tablo-sync.vbs, не този
rem файл — иначе всеки час изскача прозорец на cmd.exe от System32.
cd /d "%~dp0.."
node scripts\tablo-sync.mjs >> "%TEMP%\tablo-sync.log" 2>&1
rem Раздел „Пари": числата не са в repo-то (то е публично) — скриптът и
rem ръчните данни са в D:\blag-ai\pari. Тегли Trading 212 от базата и пише tablo_money.
set PYTHONIOENCODING=utf-8
if exist "D:\blag-ai\pari\build.py" python "D:\blag-ai\pari\build.py" --push >> "%TEMP%\pari-sync.log" 2>&1
