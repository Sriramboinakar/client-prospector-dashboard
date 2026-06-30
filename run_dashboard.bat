@echo off
cd /d "%~dp0"
echo == AI Content Agent Dashboard ==
echo.
echo Step 1: Scrape Instagram data first
python scripts\scraper.py
echo.
echo Step 2: Test agents
python scripts\agents.py
echo.
echo Step 3: Start dashboard
echo Open http://127.0.0.1:5000 in your browser
python dashboard\app.py
pause
