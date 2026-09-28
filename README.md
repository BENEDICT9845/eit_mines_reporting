# MineWater Ledger

Water reporting for mining companies: a company's sustainability report becomes a checked, site-by-site water account.
Worked example: Newcrest Mining, FY20.

## Run on localhost
Double-click `run_local.bat` → http://localhost:8080 (needs Python 3). You can also open `index.html` directly.

## Pages
- `index.html` — landing page: the problem, how it works (read → report → look ahead), who uses it.
- `dashboard.html` — Newcrest dashboard. Filter by site (All, Lihir, Telfer, Cadia, Gosowong, Red Chris) and switch between
  Overview · Water in · Water out · Balance check · Efficiency · Outlook.

Data: `data/newcrest.js` (Newcrest 2020 GRI data file, GRI 200 + 300 sheets) and `data/lutter.js` (Lutter et al. 2025).
Forecasts and the recycling option are projections.

## Deploy
Hosted on Netlify from this repository (no build step, `netlify.toml` publishes the repo root).
Push to `main` and Netlify redeploys the live site; pushes to other branches get their own preview URL.

## Pages
- `index.html` landing · `dashboard.html` company page · `risk.html` Water-at-Risk engine

Data: Newcrest Mining 2020 GRI data file (example company), Lutter et al. (2025) WU Wien copper-mine dataset. Forecasts, costs and risk parameters are labelled assumptions.
