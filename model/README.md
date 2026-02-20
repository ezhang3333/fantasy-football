# Models

This folder trains a per-position gradient-boosted tree **regression** model to predict `fantasy_next_4wk_avg`.

## Install

From your venv:

```powershell
pip install -r model/requirements.txt
scrapling install
```

Notes:
- This repo already uses `pandas`/`numpy` elsewhere; `model/requirements.txt` intentionally doesn’t pin them to avoid dependency conflicts.
- `scrapling install` is required for browser/fetcher assets used by the PFR web scraper in the data pipeline.

## Train

Uses `pipeline_data/final/*_final_data.csv` and a time-based split (all seasons `< val_season` train, `val_season` validate).

```powershell
python -m model.train
```

Optional:

```powershell
python -m model.train --positions QB,RB --val-season 2025
```

Models + metadata are saved to `model/artifacts/<pos>/`.

## Evaluate

Evaluates each position model on the validation season (from `model/artifacts/<pos>/metadata.json`) and prints a compact summary, plus optional JSON output.

```powershell
python -m model.evaluate --out model/outputs/eval_summary.json
```
