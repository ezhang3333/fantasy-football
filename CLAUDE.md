# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Start Full Dev Environment
```bash
./start.sh   # Activates venv311, starts FastAPI on :8000 and Vite on :5173
```

### Frontend Only
```bash
npm run dev      # Vite dev server on :5173
npm run build    # Production build
```

### Backend Only
```bash
source venv311/Scripts/activate
uvicorn services.predictions_api:app --reload --port 8000
```

### Data Pipeline
```bash
python main.py                               # Full extraction pipeline
python -m model.train                        # Train models
python -m model.evaluate --out <path>        # Evaluate models
```

## Architecture

### Tech Stack
- **Frontend**: React 19 + React Router 7 + Vite 7, TypeScript
- **Backend**: FastAPI + Uvicorn (Python)
- **ML**: XGBoost (per-position regressors), SQLite for prediction storage
- **Data**: Pandas/NumPy, scrapling for web scraping

### Data Flow
```
nflreadpy library (nflverse-data, ffopportunity, dynastyprocess GitHub releases) + Pro Football Reference (scraping)
    ↓ nfl_pipeline.py
pipeline_data/{extracted,cleaned,final}/*.csv
    ↓ model/train.py (XGBoost, per position: QB/RB/WR/TE)
model/artifacts/{position}/   +   model/outputs/predictions.sqlite3
    ↓ services/predictions_api.py (FastAPI)
    ↓ web/api/prediction.js (fetchApi wrapper)
React frontend (pages: Home, Parameters, Info)
```

### Key Modules

**`services/predictions_api.py`** — All REST endpoints: `POST /train`, `GET /predictions/batch/{uuid}`, `GET /predictions/batch/past`, `POST /data/refresh`, `GET /train/options/range`, `GET /data/refresh/options`.

**`nfl_pipeline.py`** — Orchestrates: `NFLReadExtractor` (NFL.com API) → `NFLReadCleaner` → `NFLWebScraper` (Pro Football Reference defense stats) → position-specific cleaners → position-specific finalizers.

**`model/`** — `train.py` calls `train_xgb_regressor`. Target variable is `fantasy_next_4wk_avg`. One model artifact per position stored under `model/artifacts/{QB,RB,WR,TE}/`.

**`web/src/`** — `App.jsx` owns top-level state (model params, training state, filters). Pages live in `web/src/pages/`, reusable UI in `web/src/components/`. All backend calls go through `web/api/prediction.js`.

**`constants.py`** — Single source of truth for supported seasons (2016–2025), positions (`QB`, `RB`, `WR`, `TE`), and team mappings used across pipeline and model code.
