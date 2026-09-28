@echo off
cd /d "%~dp0"
echo MineWater Ledger - starting on http://localhost:8080  (close this window to stop)
where py >nul 2>nul && (start "" http://localhost:8080 & py -3 -m http.server 8080 & goto :eof)
where python >nul 2>nul && (start "" http://localhost:8080 & python -m http.server 8080 & goto :eof)
echo Python 3 was not found. Install it from https://www.python.org/downloads/ or open index.html directly (file upload still works).
pause
