@echo off
rem Пуска scripts/tablo-sync.mjs от корена на repo-то — оттам supabase CLI
rem знае към кой проект пише. Task Scheduler пуска tablo-sync.vbs, не този
rem файл — иначе всеки час изскача прозорец на cmd.exe от System32.
cd /d "%~dp0.."
node scripts\tablo-sync.mjs >> "%TEMP%\tablo-sync.log" 2>&1
