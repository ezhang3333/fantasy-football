#!/usr/bin/env bash

set -euo pipefail

SKIP_PIPELINE=0
for arg in "$@"; do
  case "$arg" in
    --skip-pipeline) SKIP_PIPELINE=1 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

# virtual env
if [[ ! -f "venv311/Scripts/activate" && ! -f "venv311/bin/activate" ]]; then
  step "Creating Python venv at venv311"
  if command -v py >/dev/null 2>&1; then
    py -3.11 -m venv venv311
  elif command -v python3.11 >/dev/null 2>&1; then
    python3.11 -m venv venv311
  else
    echo "ERROR: Python 3.11 not found. Install it (https://www.python.org/downloads/) and re-run." >&2
    exit 1
  fi
fi

if [[ -f "venv311/Scripts/activate" ]]; then
  # shellcheck disable=SC1091
  source "venv311/Scripts/activate"
else
  # shellcheck disable=SC1091
  source "venv311/bin/activate"
fi
echo "Using python: $(command -v python)"
python --version

# Python dependencies
step "Installing Python requirements (dev)"
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt

step "Installing scrapling browser binaries (camoufox)"
# Required for the PFR defense-vs-position scraper
python -m camoufox fetch || echo "WARNING: camoufox fetch failed; PFR scraping may not work."
python -m scrapling install || true

# Node dependencies
if command -v npm >/dev/null 2>&1; then
  step "Installing npm packages"
  npm install
else
  echo "WARNING: npm not found; skipping frontend install. Install Node.js to run the Vite client." >&2
fi

# Database schema
step "Initializing database schema"
python -c "
from config import get_settings
from model.database import PredictionStore
settings = get_settings()
store = PredictionStore(settings.turso_database_url, settings.turso_auth_token)
store.ensure_schema()
print(f'Schema ready at {settings.turso_database_url}')
"

# Data pipeline
if [[ "$SKIP_PIPELINE" -eq 1 ]]; then
  step "Skipping data pipeline (--skip-pipeline)"
else
  step "Running NFL data pipeline (this can take several minutes)"
  python main.py
fi

step "Setup complete."
echo "  - DB: \$TURSO_DATABASE_URL (or local file:./model/outputs/predictions.sqlite3 if unset)"
echo "  - Final CSVs: pipeline_data/final/*_final_data.csv"
echo "  - Next: ./start.sh, then click 'Train' in the UI to train models + seed predictions."
