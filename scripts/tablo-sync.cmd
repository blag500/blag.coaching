@echo off
rem Пуска scripts/tablo-sync.mjs от корена на repo-то — оттам supabase CLI
rem знае към кой проект пише. За Task Scheduler: един ред, без път на ръка.
cd /d "%~dp0.."
node scripts\tablo-sync.mjs >> "%TEMP%\tablo-sync.log" 2>&1
