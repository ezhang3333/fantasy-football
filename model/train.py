from __future__ import annotations

import argparse
from pathlib import Path

from model.gbt_regression import load_final_dataset, train_xgb_regressor


def _parse_positions(value: str) -> list[str]:
    positions = [p.strip().upper() for p in value.split(",") if p.strip()]
    return positions


def main() -> None:
    parser = argparse.ArgumentParser(description="Train per-position XGBoost regression models.")
    parser.add_argument("--positions", default="QB,RB,WR,TE", help="Comma-separated: QB,RB,WR,TE")
    parser.add_argument("--data-dir", default="pipeline_data/final", help="Path to finalized CSVs")
    parser.add_argument("--out-dir", default="model/artifacts", help="Where to save models and metadata")
    parser.add_argument("--earliest-train-season", type=int, required=True, help="Earliest season to include in training")
    parser.add_argument("--max-train-season", type=int, required=True, help="Latest season to include in training")
    parser.add_argument("--val-season", type=int, required=True, help="Season to use as validation")
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    for position in _parse_positions(args.positions):
        df = load_final_dataset(args.data_dir, position)
        trained = train_xgb_regressor(
            position,
            df,
            out_dir,
            earliest_train_season=args.earliest_train_season,
            max_train_season=args.max_train_season,
            val_season=args.val_season,
        )
        print(f"[{position}] saved: {trained.model_path} ({trained.metadata_path})")


if __name__ == "__main__":
    main()
