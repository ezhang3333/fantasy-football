from __future__ import annotations
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Literal
import numpy as np
import pandas as pd
import constants

Position = Literal["QB", "RB", "WR", "TE"]
IDENTIFIER_COLS = ["team", "position", "full_name", "gsis_id", "week", "season"]

def _stats_for_position(position: Position):
    if position == "QB":
        return constants.qb_calculated_stats
    if position == "RB":
        return constants.rb_calculated_stats
    if position == "WR":
        return constants.wr_calculated_stats
    if position == "TE":
        return list(constants.te_calculated_stats)
    raise ValueError(f"Unknown position: {position}")


def load_final_dataset(data_dir: str | Path, position: Position) -> pd.DataFrame:
    data_dir = Path(data_dir)
    path = data_dir / f"{position.lower()}_final_data.csv"
    df = pd.read_csv(path)
    if "season" in df.columns:
        df["season"] = pd.to_numeric(df["season"], errors="coerce")
    if "week" in df.columns:
        df["week"] = pd.to_numeric(df["week"], errors="coerce")
    return df


def time_split_by_season(df: pd.DataFrame, val_season: int) -> tuple[pd.DataFrame, pd.DataFrame, int]:
    season_num = pd.to_numeric(df["season"], errors="coerce")
    seasons = season_num.dropna().astype(int)
    if seasons.empty:
        raise ValueError("No valid `season` values found for time-based split.")

    val_season = int(val_season)

    season_int = season_num.astype("Int64")
    train_mask = (season_int < val_season).fillna(False)
    val_mask = (season_int == val_season).fillna(False)

    train_df = df[train_mask].copy()
    val_df = df[val_mask].copy()

    if train_df.empty:
        raise ValueError(
            f"Training split is empty (val_season={val_season}). "
            "Provide more seasons or set a different `val_season`."
        )
    if val_df.empty:
        raise ValueError(
            f"Validation split is empty (val_season={val_season}). "
            "Provide more seasons or set a different `val_season`."
        )

    return train_df, val_df, val_season


def split_by_train_range_and_val_season(
    df: pd.DataFrame,
    *,
    earliest_train_season: int,
    max_train_season: int,
    val_season: int,
) -> tuple[pd.DataFrame, pd.DataFrame, int]:
    season_num = pd.to_numeric(df["season"], errors="coerce")
    seasons = season_num.dropna().astype(int)
    if seasons.empty:
        raise ValueError("No valid `season` values found for time-based split.")

    earliest_train_season = int(earliest_train_season)
    max_train_season = int(max_train_season)
    val_season = int(val_season)

    if earliest_train_season > max_train_season:
        raise ValueError(
            "Invalid train season range: "
            f"earliest_train_season={earliest_train_season} is greater than "
            f"max_train_season={max_train_season}."
        )
    if val_season <= max_train_season:
        raise ValueError(
            f"Invalid val_season={val_season}. Validation season must be greater than "
            f"max_train_season={max_train_season}."
        )
    if val_season not in set(seasons.tolist()):
        raise ValueError(
            f"Validation season is unavailable: val_season={val_season}. "
            f"Available seasons: {sorted(set(seasons.tolist()))}"
        )

    season_int = season_num.astype("Int64")
    train_mask = (
        (season_int >= earliest_train_season) &
        (season_int <= max_train_season)
    ).fillna(False)
    val_mask = (season_int == val_season).fillna(False)

    train_df = df[train_mask].copy()
    val_df = df[val_mask].copy()

    if train_df.empty:
        raise ValueError(
            "Training split is empty "
            f"(earliest_train_season={earliest_train_season}, "
            f"max_train_season={max_train_season})."
        )
    if val_df.empty:
        raise ValueError(
            f"Validation split is empty (val_season={val_season})."
        )

    return train_df, val_df, val_season


def make_feature_set(position: Position, target_col: str = "fantasy_next_4wk_avg") -> tuple[list[str], str]:
    stats = _stats_for_position(position)
    if target_col not in stats:
        raise ValueError(f"Expected target `{target_col}` to exist in stats for {position}.")
    feature_cols = [c for c in stats if c != target_col]
    return feature_cols, target_col


def _to_numeric_frame(df: pd.DataFrame, cols: Iterable[str]) -> pd.DataFrame:
    x = df.loc[:, list(cols)].copy()
    for c in x.columns:
        x[c] = pd.to_numeric(x[c], errors="coerce")
    return x


def fit_median_imputer(x_train: pd.DataFrame) -> dict[str, float]:
    medians: dict[str, float] = {}
    for col in x_train.columns:
        median = float(np.nanmedian(x_train[col].to_numpy(dtype=float)))
        if np.isnan(median):
            median = 0.0
        medians[col] = median
    return medians


def apply_median_imputer(x: pd.DataFrame, medians: dict[str, float]) -> pd.DataFrame:
    x = x.copy()
    for col, median in medians.items():
        if col in x.columns:
            x[col] = x[col].fillna(median)
    return x


def regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    err = y_true - y_pred
    mae = float(np.mean(np.abs(err)))
    rmse = float(np.sqrt(np.mean(err**2)))
    denom = float(np.sum((y_true - float(np.mean(y_true))) ** 2))
    r2 = float(1.0 - (float(np.sum(err**2)) / denom)) if denom > 0 else float("nan")
    return {"mae": mae, "rmse": rmse, "r2": r2}


def _require_xgboost():
    try:
        import xgboost as xgb

        return xgb
    except ModuleNotFoundError as e:
        raise ModuleNotFoundError(
            "xgboost is not installed. Install it with `pip install -r model/requirements.txt`."
        ) from e


@dataclass(frozen=True)
class TrainedModel:
    position: Position
    feature_cols: list[str]
    target_col: str
    val_season: int
    medians: dict[str, float]
    model_path: Path
    metadata_path: Path


@dataclass(frozen=True)
class XGBHyperParams:
    n_estimators: int = 5000
    learning_rate: float = 0.02
    max_depth: int = 4
    min_child_weight: float = 10.0
    subsample: float = 0.8
    colsample_bytree: float = 0.8
    reg_lambda: float = 1.0
    reg_alpha: float = 0.0
    early_stopping_rounds: int = 100


def build_xgb_regressor(
    params: XGBHyperParams,
    *,
    random_state: int,
    n_jobs: int = 0,
):
    xgb = _require_xgboost()
    return xgb.XGBRegressor(
        objective="reg:squarederror",
        eval_metric="mae",
        n_estimators=params.n_estimators,
        learning_rate=params.learning_rate,
        max_depth=params.max_depth,
        min_child_weight=params.min_child_weight,
        subsample=params.subsample,
        colsample_bytree=params.colsample_bytree,
        reg_lambda=params.reg_lambda,
        reg_alpha=params.reg_alpha,
        early_stopping_rounds=params.early_stopping_rounds,
        random_state=random_state,
        n_jobs=n_jobs,
    )


def train_xgb_regressor(
    position: Position,
    df: pd.DataFrame,
    out_dir: str | Path,
    *,
    earliest_train_season: int,
    max_train_season: int,
    val_season: int,
    random_state: int = 7,
    params: XGBHyperParams | None = None,
) -> TrainedModel:
    params = params or XGBHyperParams()

    feature_cols, target_col = make_feature_set(position)
    train_df, val_df, val_season = split_by_train_range_and_val_season(
        df,
        earliest_train_season=earliest_train_season,
        max_train_season=max_train_season,
        val_season=val_season,
    )

    x_train_raw = _to_numeric_frame(train_df, feature_cols)
    y_train = pd.to_numeric(train_df[target_col], errors="coerce")
    x_val_raw = _to_numeric_frame(val_df, feature_cols)
    y_val = pd.to_numeric(val_df[target_col], errors="coerce")

    train_mask = ~y_train.isna()
    val_mask = ~y_val.isna()
    x_train_raw = x_train_raw.loc[train_mask]
    y_train = y_train.loc[train_mask]
    x_val_raw = x_val_raw.loc[val_mask]
    y_val = y_val.loc[val_mask]

    medians = fit_median_imputer(x_train_raw)
    x_train = apply_median_imputer(x_train_raw, medians)
    x_val = apply_median_imputer(x_val_raw, medians)

    model = build_xgb_regressor(params, random_state=random_state)

    model.fit(x_train, y_train, eval_set=[(x_val, y_val)], verbose=False)

    y_val_pred = model.predict(x_val)
    metrics = regression_metrics(y_val.to_numpy(dtype=float), y_val_pred)

    out_dir = Path(out_dir) / position.lower()
    out_dir.mkdir(parents=True, exist_ok=True)
    model_path = out_dir / "xgb_model.json"
    metadata_path = out_dir / "metadata.json"

    model.get_booster().save_model(model_path)
    metadata = {
        "position": position,
        "feature_cols": feature_cols,
        "target_col": target_col,
        "val_season": val_season,
        "medians": medians,
        "validation_metrics": metrics,
        "best_iteration": int(getattr(model, "best_iteration", -1)),
    }
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    return TrainedModel(
        position=position,
        feature_cols=feature_cols,
        target_col=target_col,
        val_season=val_season,
        medians=medians,
        model_path=model_path,
        metadata_path=metadata_path,
    )


def load_trained_xgb(model_dir: str | Path, position: Position):
    xgb = _require_xgboost()
    model_dir = Path(model_dir) / position.lower()
    metadata = json.loads((model_dir / "metadata.json").read_text(encoding="utf-8"))

    model = xgb.XGBRegressor()
    model.load_model(model_dir / "xgb_model.json")
    return model, metadata


def latest_week_slice(df: pd.DataFrame) -> tuple[int, int, pd.DataFrame]:
    df = df.copy()
    df["season"] = pd.to_numeric(df["season"], errors="coerce")
    df["week"] = pd.to_numeric(df["week"], errors="coerce")
    df = df.dropna(subset=["season", "week"])
    if df.empty:
        raise ValueError("No valid rows with season/week found.")
    season = int(df["season"].max())
    season_df = df[df["season"].astype(int) == season]
    week = int(season_df["week"].max())
    latest_df = season_df[season_df["week"].astype(int) == week].copy()
    return season, week, latest_df


def score_candidates(df_latest: pd.DataFrame, position: Position) -> pd.DataFrame:
    df = df_latest.copy()

    prev5_col = "fantasy_prev_5wk_avg"
    if prev5_col not in df.columns:
        df[prev5_col] = np.nan

    df["delta"] = df["pred_next4"] - pd.to_numeric(df[prev5_col], errors="coerce")
    return df
