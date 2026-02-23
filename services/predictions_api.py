from __future__ import annotations
import asyncio
import threading
from dataclasses import asdict
from enum import Enum
from functools import lru_cache
import pandas as pd
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from constants import ALL_POSITIONS, DB_PATH, SEASONS_TO_EXTRACT
from model.database import PredictionStore
from model.gbt_regression import XGBHyperParams, load_final_dataset, train_xgb_regressor
from model.predict import _default_output_columns, predict_position
from nfl_pipeline import NFLDataPipeline


class Position(str, Enum):
    QB = "QB"
    RB = "RB"
    WR = "WR"
    TE = "TE"

app = FastAPI(title="FantasyFootball Predictions API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://localhost:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

_refresh_state_lock = threading.Lock()
_refresh_in_progress = False

@lru_cache(maxsize=1)
def _store() -> PredictionStore:
    db_path = DB_PATH
    store = PredictionStore(db_path)
    store.ensure_schema()
    return store


def get_store() -> PredictionStore:
    return _store()


def _positions_from_query(positions: str | None) -> list[Position]:
    all_positions = [Position(value) for value in ALL_POSITIONS]
    if positions is None or not positions.strip():
        return all_positions

    parsed_positions: list[Position] = []
    invalid_positions: list[str] = []
    seen: set[Position] = set()

    for raw_value in positions.split(","):
        value = raw_value.strip().upper()
        if not value:
            continue
        try:
            position = Position(value)
        except ValueError:
            invalid_positions.append(value)
            continue
        if position in seen:
            continue
        seen.add(position)
        parsed_positions.append(position)

    if invalid_positions:
        valid_values = ", ".join(ALL_POSITIONS)
        raise HTTPException(
            status_code=400,
            detail=f"Invalid positions: {invalid_positions}. Valid values: {valid_values}",
        )
    if not parsed_positions:
        raise HTTPException(status_code=400, detail="No valid positions were provided.")

    return parsed_positions


def _load_position_seasons(data_dir: str, position: Position) -> set[int]:
    try:
        df = load_final_dataset(data_dir, position.value)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to load dataset for {position.value} from {data_dir}: {exc}",
        ) from exc
    if "season" not in df.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Dataset for {position.value} is missing the `season` column.",
        )

    season_values = (
        pd.to_numeric(df["season"], errors="coerce")
        .dropna()
        .astype(int)
        .unique()
        .tolist()
    )
    return {int(season) for season in season_values}


def _compute_shared_available_seasons(data_dir: str, positions: list[Position]) -> list[int]:
    if not positions:
        raise HTTPException(status_code=400, detail="At least one position is required.")

    shared_seasons: set[int] | None = None
    for position in positions:
        seasons = _load_position_seasons(data_dir, position)
        current_set = set(seasons)
        shared_seasons = current_set if shared_seasons is None else shared_seasons & current_set

    result = sorted(shared_seasons or [])
    if not result:
        raise HTTPException(
            status_code=400,
            detail=f"No shared seasons found for positions {[p.value for p in positions]}.",
        )
    return result


def _parse_extract_seasons() -> list[int]:
    parsed: list[int] = []
    for season in SEASONS_TO_EXTRACT:
        try:
            parsed.append(int(season))
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Invalid season in SEASONS_TO_EXTRACT: {season}",
            ) from exc
    if not parsed:
        raise HTTPException(status_code=500, detail="SEASONS_TO_EXTRACT is empty.")
    return sorted(set(parsed))


class TrainRequest(BaseModel):
    positions: list[Position] = Field(default_factory=lambda: [Position.QB, Position.RB, Position.WR, Position.TE])
    data_dir: str = "pipeline_data/final"
    model_dir: str = "model/artifacts"
    earliest_train_season: int = Field(ge=1)
    max_train_season: int = Field(ge=1)
    val_season: int = Field(ge=1)
    n_estimators: int = Field(default=300, ge=1)
    learning_rate: float = Field(default=0.1, gt=0, le=1)
    max_depth: int = Field(default=6, ge=1)
    subsample: float = Field(default=0.8, gt=0, le=1)
    colsample_bytree: float = Field(default=0.8, gt=0, le=1)
    reg_lambda: float = Field(default=1.0, ge=0)
    reg_alpha: float = Field(default=0.0, ge=0)


class RefreshDatasetRequest(BaseModel):
    earliest_season: int = Field(ge=1)
    latest_season: int = Field(ge=1)


@app.get("/train/options/range")
async def get_train_range_options(
    positions: str | None = Query(default=None, description="Comma-separated positions (e.g. QB,RB)"),
    data_dir: str = Query(default="pipeline_data/final"),
):
    selected_positions = _positions_from_query(positions)
    seasons = _compute_shared_available_seasons(data_dir, selected_positions)
    min_available = seasons[0]
    max_available = seasons[-1]
    max_train_allowed = max_available - 1
    return {
        "available_seasons": seasons,
        "min_available_season": min_available,
        "max_available_season": max_available,
        "max_train_season_allowed": max_train_allowed,
        "default_max_train_season": max_train_allowed,
    }


@app.get("/data/refresh/options")
async def get_data_refresh_options():
    seasons = _parse_extract_seasons()
    default_earliest = min(seasons)
    default_latest = max(seasons)
    return {
        "allowed_earliest_season": default_earliest,
        "allowed_latest_season": default_latest,
        "default_earliest_season": default_earliest,
        "default_latest_season": default_latest,
        "configured_seasons": seasons,
    }


@app.post("/data/refresh")
async def refresh_dataset(payload: RefreshDatasetRequest):
    global _refresh_in_progress
    seasons = _parse_extract_seasons()
    min_allowed = min(seasons)
    max_allowed = max(seasons)

    if payload.earliest_season > payload.latest_season:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid season range: earliest_season={payload.earliest_season} "
                f"is greater than latest_season={payload.latest_season}."
            ),
        )
    if payload.earliest_season < min_allowed or payload.latest_season > max_allowed:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Season range must be within configured extract bounds "
                f"[{min_allowed}, {max_allowed}]. Received "
                f"[{payload.earliest_season}, {payload.latest_season}]."
            ),
        )

    requested_seasons = [str(season) for season in range(payload.earliest_season, payload.latest_season + 1)]

    with _refresh_state_lock:
        if _refresh_in_progress:
            raise HTTPException(
                status_code=409,
                detail="A dataset refresh is already in progress.",
            )
        _refresh_in_progress = True

    pipeline = NFLDataPipeline(requested_seasons)
    try:
        await asyncio.to_thread(
            pipeline.run_pipeline,
            save_extracted=True,
            save_cleaned=True,
            save_final=True,
            out_dir="pipeline_data",
        )
    finally:
        with _refresh_state_lock:
            _refresh_in_progress = False

    return {
        "status": "ok",
        "message": "Dataset refresh completed.",
        "seasons_extracted": requested_seasons,
    }


@app.get("/predictions/top")
async def get_top_predictions(
    position: Position,
    season: int | None = None,
    week: int | None = None,
    limit: int = Query(default=25, ge=1, le=500),
    store: PredictionStore = Depends(get_store),
):
    return store.get_top_predictions(position=position.value, season=season, week=week, limit=limit)


@app.get("/predictions/runs/list")
async def get_list_of_runs(
    limit: int = 15,
    store: PredictionStore = Depends(get_store),
):
    return store.get_past_runs_for_history_list(limit=limit)


@app.get("/predictions/runs/{run_uuid}")
async def get_predictions_for_run(run_uuid: str, store: PredictionStore = Depends(get_store)):
    return store.get_predictions(run_uuid=run_uuid)


@app.get("/predictions/batch/past")
async def get_past_batch_predictions(limit: int, store: PredictionStore = Depends(get_store)):
    return store.get_past_batches(limit)


@app.get("/predictions/batch/{batch_uuid}")
async def get_batch_prediction(batch_uuid: str, store: PredictionStore = Depends(get_store)):
    return store.get_batch_prediction(batch_uuid)


@app.get("/predictions/latest/{position}")
async def get_latest_predictions(position: Position, store: PredictionStore = Depends(get_store)):
    run = store.get_latest_run(position=position.value)
    if run is None:
        raise HTTPException(status_code=404, detail=f"No runs found for position={position.value}")
    return store.get_predictions(run_uuid=run.run_uuid)


@app.post("/train")
async def train_models(payload: TrainRequest, store: PredictionStore = Depends(get_store)):
    params = XGBHyperParams(
        n_estimators=payload.n_estimators,
        learning_rate=payload.learning_rate,
        max_depth=payload.max_depth,
        subsample=payload.subsample,
        colsample_bytree=payload.colsample_bytree,
        reg_lambda=payload.reg_lambda,
        reg_alpha=payload.reg_alpha,
    )

    batch_uuid = store.create_batch(
        positions=[p.value for p in payload.positions],
        data_dir=str(payload.data_dir),
        model_dir=str(payload.model_dir),
        val_season=payload.val_season,
    )

    for position in payload.positions:
        df = load_final_dataset(payload.data_dir, position.value)
        train_xgb_regressor(
            position.value,
            df,
            payload.model_dir,
            earliest_train_season=payload.earliest_train_season,
            max_train_season=payload.max_train_season,
            val_season=payload.val_season,
            params=params,
        )

        result = predict_position(position.value, data_dir=payload.data_dir, model_dir=payload.model_dir)
        run_uuid = store.create_run(
            batch_uuid=batch_uuid,
            position=position.value,
            season=result.season,
            week=result.week,
            data_dir=str(payload.data_dir),
            model_dir=str(payload.model_dir),
            meta={
                **result.model_metadata,
                "train_params": asdict(params),
                "earliest_train_season": payload.earliest_train_season,
                "max_train_season": payload.max_train_season,
                "val_season": payload.val_season,
            },
        )
        store.save_predictions(
            run_uuid,
            batch_uuid,
            result.scored,
            payload_cols=_default_output_columns(result.scored),
        )

    return store.get_batch_prediction(batch_uuid)
