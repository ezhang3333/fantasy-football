# Fantasy Football Predictions

A web app that predicts NFL fantasy football performance for the next 4 weeks using per-position XGBoost regression models. It pulls weekly player and defense data from nflverse and Pro Football Reference, trains separate models for QB, RB, WR, and TE, and dispalys outputs in locally hosted dev servers.

## Setup

Clone the repo, then from the project root run:

```
./setup.sh
```

This will:

1. Create a Python virtual environment at `venv311`
2. Install all relevant dependencies
5. Initialize the SQLite schema at `model/outputs/predictions.sqlite3`
6. Run the full data pipeline to produce CSVs in `pipeline_data/`

The data pipeline can take several minutes, so you can skip it `./setup.sh --skip-pipeline`

## Running Locally

After setup, start the dev servers with:

```
./start.sh
```

This launches:

- FastAPI backend on http://localhost:8000
- Vite frontend on http://localhost:5173

Open the frontend in your browser. The first time you load it, the predictions database is empty. Click the Train button in the UI to train models for all four positions and populate the predictions table. Subsequent training runs will appear in the history list.


## Manual Commands

If you want to run individual pieces without the UI:

```
python main.py
python -m model.train --earliest-train-season 2016 --max-train-season 2024 --val-season 2025
python -m model.evaluate --out model/outputs/eval_summary.json
```

Note that running `python -m model.train` from the CLI only writes model artifacts to `model/artifacts/`. It does not populate the predictions database. To do both, use the Train button in the UI or call `POST /train` on the API directly.
