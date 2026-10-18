' Runs tablo-sync.cmd with no window. Task Scheduler starting the .cmd
' directly opens a C:\Windows\System32\cmd.exe console every hour;
' wscript.exe has no console, and Run(..., 0) keeps the child hidden.
' ASCII only: wscript reads this file in the ANSI code page.
Set sh = CreateObject("WScript.Shell")
cmd = Replace(WScript.ScriptFullName, ".vbs", ".cmd")
sh.Run """" & cmd & """", 0, True
