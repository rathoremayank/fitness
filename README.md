# Rewire

A browser-based six-month fitness plan and daily journal for workouts, nutrition, lifting loads, and weekly measurements.

## Run it

Open `index.html` in a modern browser. No install or build step is needed.

## What you can track

- Meals and snacks, including calories, protein, carbs, and fat
- Workouts, duration, effort, and optional estimated calories burned
- Weight, water, steps, sleep, and heart-rate check-ins
- Daily calorie, macro, and water guideposts
- A 26-week progress log, six-month load tracker, and rolling seven-day overview
- Body measurements, derived metrics, maintenance estimates, and improvement priorities

Use **Program** to review the workout stages, meal targets, load progression, body analysis, and weekly log. Actual lifting loads and weekly check-ins are saved in this browser on this device.

Use the date controls on **Today** to view the workout and nutrition guidance for a weekday or to log entries for another day. Tick completed plan items to save daily progress and view four weeks of completion history in **Insights**. Your journal and training progress stay on this device. Use **Goals & settings** to export a JSON backup, clear saved entries, or switch themes.

The supplied CSV plans are bundled in `program-data.js` so the app also works when opened directly as a local file. After editing a source CSV, run `powershell -NoProfile -ExecutionPolicy Bypass -File .\Update-ProgramData.ps1` to refresh the bundle. Nutrition, calorie, and body-composition values are estimates, not medical advice.