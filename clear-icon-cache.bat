@echo off
echo Clearing Windows icon cache...

REM Stop Windows Explorer
taskkill /f /im explorer.exe

REM Clear icon cache files
del /a /q "%localappdata%\IconCache.db"
del /a /q "%localappdata%\Microsoft\Windows\Explorer\iconcache*"

REM Restart Windows Explorer
start explorer.exe

echo Icon cache cleared! Please rebuild the application.
pause