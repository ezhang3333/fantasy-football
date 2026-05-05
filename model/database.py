from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence
from uuid import uuid4

import libsql_client


SCHEMA_STATEMENTS: tuple[str, ...] = (
    """
    CREATE TABLE IF NOT EXISTS prediction_batches (
        batch_uuid TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        positions TEXT,
        val_season INTEGER,
        data_dir TEXT,
        model_dir TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS prediction_runs (
        run_uuid TEXT PRIMARY KEY,
        batch_uuid TEXT NOT NULL,
        created_at TEXT NOT NULL,
        position TEXT NOT NULL,
        season INTEGER,
        week INTEGER,
        data_dir TEXT,
        model_dir TEXT,
        meta_json TEXT,
        FOREIGN KEY (batch_uuid) REFERENCES prediction_batches(batch_uuid) ON DELETE CASCADE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS predictions (
        prediction_id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_uuid TEXT NOT NULL,
        batch_uuid TEXT NOT NULL,
        team TEXT,
        position TEXT,
        full_name TEXT,
        gsis_id TEXT,
        season INTEGER,
        week INTEGER,
        years_exp REAL,
        years_exp_filled REAL,
        draft_number INTEGER,
        draft_number_filled INTEGER,
        is_rookie INTEGER,
        is_second_year INTEGER,
        is_undrafted INTEGER,
        percent_rostered REAL,
        fantasy_prev_5wk_avg REAL,
        pred_next4 REAL,
        delta REAL,
        FOREIGN KEY (run_uuid) REFERENCES prediction_runs(run_uuid) ON DELETE CASCADE,
        FOREIGN KEY (batch_uuid) REFERENCES prediction_batches(batch_uuid) ON DELETE CASCADE
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_predictions_run_uuid ON predictions(run_uuid)",
    "CREATE INDEX IF NOT EXISTS idx_predictions_position_season_week ON predictions(position, season, week)",
    "CREATE INDEX IF NOT EXISTS idx_prediction_runs_batch_uuid ON prediction_runs(batch_uuid)",
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _is_nullish(value: Any) -> bool:
    try:
        if value is None:
            return True
        if isinstance(value, float) and value != value:
            return True
    except Exception:
        pass
    return False


def _jsonable(value: Any) -> Any:
    if _is_nullish(value):
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, dict):
        return {str(k): _jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_jsonable(v) for v in value]
    try:
        item = getattr(value, "item", None)
        if callable(item):
            return _jsonable(item())
    except Exception:
        pass
    return str(value)


def _to_records(rows: Any) -> list[Mapping[str, Any]]:
    try:
        import pandas as pd

        if isinstance(rows, pd.DataFrame):
            return list(rows.to_dict(orient="records"))
    except Exception:
        pass

    if isinstance(rows, Sequence):
        return list(rows)

    raise TypeError("rows must be a pandas DataFrame or a sequence of dict-like records")


def _to_int01(value: Any) -> int | None:
    if _is_nullish(value):
        return None
    if isinstance(value, bool):
        return 1 if value else 0
    try:
        return 1 if int(value) != 0 else 0
    except Exception:
        return None


def _to_float(value: Any) -> float | None:
    if _is_nullish(value):
        return None
    try:
        item = getattr(value, "item", None)
        if callable(item):
            value = item()
    except Exception:
        pass
    try:
        return float(value)
    except Exception:
        return None


def _to_int(value: Any) -> int | None:
    if _is_nullish(value):
        return None
    try:
        item = getattr(value, "item", None)
        if callable(item):
            value = item()
    except Exception:
        pass
    try:
        return int(value)
    except Exception:
        return None


def _rows_to_dicts(result: Any) -> list[dict[str, Any]]:
    columns = list(result.columns)
    return [{col: row[idx] for idx, col in enumerate(columns)} for row in result.rows]


@dataclass(frozen=True)
class PredictionRun:
    run_uuid: str
    created_at: str
    position: str
    season: int | None
    week: int | None
    data_dir: str | None
    model_dir: str | None
    meta: dict[str, Any]


class PredictionStore:
    def __init__(self, database_url: str, auth_token: str | None = None) -> None:
        self.database_url = database_url
        self.auth_token = auth_token
        self._client: libsql_client.Client | None = None

        if database_url.startswith("file:"):
            local_path = Path(database_url[len("file:") :].lstrip("/"))
            local_path.parent.mkdir(parents=True, exist_ok=True)

    def _get_client(self) -> libsql_client.Client:
        if self._client is None:
            kwargs: dict[str, Any] = {"url": self.database_url}
            if self.auth_token:
                kwargs["auth_token"] = self.auth_token
            self._client = libsql_client.create_client_sync(**kwargs)
        return self._client

    def _execute(self, sql: str, params: Sequence[Any] | Mapping[str, Any] | None = None):
        client = self._get_client()
        if params is None:
            return client.execute(sql)
        return client.execute(sql, params)

    def _batch(self, statements: Iterable[Any]) -> None:
        client = self._get_client()
        client.batch(list(statements))

    def close(self) -> None:
        if self._client is not None:
            try:
                self._client.close()
            finally:
                self._client = None

    def _existing_columns(self, table: str) -> set[str]:
        result = self._execute(f"PRAGMA table_info({table})")
        return {str(row[1]) for row in result.rows}

    def _ensure_columns(self, table: str, columns: Mapping[str, str]) -> None:
        existing = self._existing_columns(table)
        for name, col_type in columns.items():
            if name in existing:
                continue
            self._execute(f"ALTER TABLE {table} ADD COLUMN {name} {col_type}")

    def ensure_schema(self) -> None:
        self._execute("PRAGMA foreign_keys = ON")
        self._batch(SCHEMA_STATEMENTS)
        self._ensure_columns(
            "predictions",
            {
                "years_exp": "REAL",
                "years_exp_filled": "REAL",
                "draft_number": "INTEGER",
                "draft_number_filled": "INTEGER",
                "is_rookie": "INTEGER",
                "is_second_year": "INTEGER",
                "is_undrafted": "INTEGER",
                "percent_rostered": "REAL",
                "fantasy_prev_5wk_avg": "REAL",
            },
        )
        self._ensure_columns(
            "prediction_batches", {"positions": "TEXT", "val_season": "INTEGER"}
        )

    def create_run(
        self,
        *,
        batch_uuid: str,
        position: str,
        season: int | None,
        week: int | None,
        data_dir: str | None = None,
        model_dir: str | None = None,
        meta: Mapping[str, Any] | None = None,
    ) -> str:
        run_uuid = uuid4().hex
        created_at = _utc_now_iso()
        meta_json = json.dumps(_jsonable(dict(meta or {})))

        self._execute(
            """
            INSERT INTO prediction_runs (run_uuid, batch_uuid, created_at, position, season, week, data_dir, model_dir, meta_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (run_uuid, batch_uuid, created_at, position, season, week, data_dir, model_dir, meta_json),
        )
        return run_uuid

    def create_batch(
        self,
        *,
        positions: Sequence[str] | None = None,
        val_season: int | None = None,
        data_dir: str | None = None,
        model_dir: str | None = None,
    ) -> str:
        batch_uuid = uuid4().hex
        created_at = _utc_now_iso()
        positions_json = json.dumps(list(positions or []))

        self._execute(
            """
            INSERT INTO prediction_batches (batch_uuid, created_at, positions, val_season, data_dir, model_dir)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (batch_uuid, created_at, positions_json, val_season, data_dir, model_dir),
        )
        return batch_uuid

    def save_predictions(
        self,
        run_uuid: str,
        batch_uuid: str,
        rows: Any,
        *,
        payload_cols: Sequence[str] | None = None,
    ) -> int:
        records = _to_records(rows)

        insert_sql = """
            INSERT INTO predictions (
              run_uuid, batch_uuid, team, position, full_name, gsis_id, season, week,
              years_exp, years_exp_filled, draft_number, draft_number_filled, is_rookie, is_second_year, is_undrafted,
              percent_rostered, fantasy_prev_5wk_avg, pred_next4, delta
            )
            VALUES (?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?)
        """

        statements: list[tuple[str, tuple[Any, ...]]] = []
        for rec in records:
            team = rec.get("team")
            position = rec.get("position")
            full_name = rec.get("full_name")
            gsis_id = rec.get("gsis_id")
            season = rec.get("season")
            week = rec.get("week")
            years_exp = rec.get("years_exp_filled", rec.get("years_exp"))
            years_exp_filled = rec.get("years_exp_filled")
            draft_number = rec.get("draft_number_filled", rec.get("draft_number"))
            draft_number_filled = rec.get("draft_number_filled")
            is_rookie = rec.get("is_rookie")
            is_second_year = rec.get("is_second_year")
            is_undrafted = rec.get("is_undrafted")
            percent_rostered = rec.get("percent_rostered")
            fantasy_prev_5wk_avg = rec.get("fantasy_prev_5wk_avg")
            pred_next4 = rec.get("pred_next4")
            delta = rec.get("delta")

            params = (
                run_uuid,
                batch_uuid,
                None if _is_nullish(team) else str(team),
                None if _is_nullish(position) else str(position),
                None if _is_nullish(full_name) else str(full_name),
                None if _is_nullish(gsis_id) else str(gsis_id),
                _to_int(season),
                _to_int(week),
                _to_float(years_exp),
                _to_float(years_exp_filled),
                _to_int(draft_number),
                _to_int(draft_number_filled),
                _to_int01(is_rookie),
                _to_int01(is_second_year),
                _to_int01(is_undrafted),
                _to_float(percent_rostered),
                _to_float(fantasy_prev_5wk_avg),
                _to_float(pred_next4),
                _to_float(delta),
            )
            statements.append((insert_sql, params))

        if not statements:
            return 0

        self._batch(statements)
        return len(statements)

    def get_latest_run(self, *, position: str | None = None) -> PredictionRun | None:
        if position:
            result = self._execute(
                """
                SELECT run_uuid, created_at, position, season, week, data_dir, model_dir, meta_json
                FROM prediction_runs
                WHERE position = ?
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (position,),
            )
        else:
            result = self._execute(
                """
                SELECT run_uuid, created_at, position, season, week, data_dir, model_dir, meta_json
                FROM prediction_runs
                ORDER BY created_at DESC
                LIMIT 1
                """
            )

        rows = _rows_to_dicts(result)
        if not rows:
            return None
        row = rows[0]

        meta: dict[str, Any] = {}
        try:
            meta = json.loads(row["meta_json"] or "{}")
        except Exception:
            meta = {}

        return PredictionRun(
            run_uuid=str(row["run_uuid"]),
            created_at=str(row["created_at"]),
            position=str(row["position"]),
            season=None if row["season"] is None else int(row["season"]),
            week=None if row["week"] is None else int(row["week"]),
            data_dir=None if row["data_dir"] is None else str(row["data_dir"]),
            model_dir=None if row["model_dir"] is None else str(row["model_dir"]),
            meta=meta,
        )

    def get_past_runs_for_history_list(self, *, limit: int = 15) -> list[dict[str, Any]]:
        result = self._execute(
            """
            SELECT run_uuid, created_at, position, season, meta_json
            FROM prediction_runs
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (int(limit),),
        )
        return _rows_to_dicts(result)

    def get_predictions(self, *, run_uuid: str, limit: int | None = None) -> list[dict[str, Any]]:
        if limit is None:
            result = self._execute(
                """
                SELECT
                  team, position, full_name, gsis_id, season, week,
                  years_exp, years_exp_filled, draft_number, draft_number_filled, is_rookie, is_second_year, is_undrafted,
                  percent_rostered, fantasy_prev_5wk_avg, pred_next4, delta
                FROM predictions
                WHERE run_uuid = ?
                ORDER BY pred_next4 DESC
                """,
                (run_uuid,),
            )
        else:
            result = self._execute(
                """
                SELECT
                  team, position, full_name, gsis_id, season, week,
                  years_exp, years_exp_filled, draft_number, draft_number_filled, is_rookie, is_second_year, is_undrafted,
                  percent_rostered, fantasy_prev_5wk_avg, pred_next4, delta
                FROM predictions
                WHERE run_uuid = ?
                ORDER BY pred_next4 DESC
                LIMIT ?
                """,
                (run_uuid, int(limit)),
            )
        return _rows_to_dicts(result)

    def get_past_batch_predictions(self, limit: int = 30) -> list[dict[str, Any]]:
        result = self._execute(
            """
            SELECT
                team, position, full_name, gsis_id, season, week,
                years_exp, years_exp_filled, draft_number, draft_number_filled, is_rookie, is_second_year, is_undrafted,
                percent_rostered, fantasy_prev_5wk_avg, pred_next4, delta
            FROM predictions p
            WHERE batch_uuid IN (
                SELECT batch_uuid
                FROM prediction_batches
                ORDER BY created_at DESC
                LIMIT ?
                )
            ORDER BY pred_next4 DESC
            """,
            (limit,),
        )
        return _rows_to_dicts(result)

    def get_batch_runs(self, batch_uuid: str) -> list[dict[str, Any]]:
        result = self._execute(
            """
            SELECT r.position, r.meta_json, b.created_at, b.positions, b.val_season
            FROM prediction_runs r
            JOIN prediction_batches b ON r.batch_uuid = b.batch_uuid
            WHERE r.batch_uuid = ?
            ORDER BY r.position
            """,
            (batch_uuid,),
        )

        results = []
        for row in _rows_to_dicts(result):
            meta: dict[str, Any] = {}
            try:
                meta = json.loads(row["meta_json"] or "{}")
            except Exception:
                pass
            meta.pop("feature_cols", None)
            meta.pop("medians", None)
            results.append({
                "position": row["position"],
                "created_at": row["created_at"],
                "val_season": row["val_season"],
                "meta": meta,
            })
        return results

    def get_past_batches(self, days: int = 30) -> list[dict[str, Any]]:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        result = self._execute(
            """
            SELECT
                batch_uuid, created_at, positions, val_season, data_dir, model_dir
            FROM prediction_batches
            WHERE created_at >= ?
            ORDER BY created_at DESC
            """,
            (cutoff,),
        )
        return _rows_to_dicts(result)

    def get_batch_prediction(self, batch_uuid: str) -> list[dict[str, Any]]:
        result = self._execute(
            """
            SELECT
                team, position, full_name, gsis_id, season, week,
                years_exp, years_exp_filled, draft_number, draft_number_filled, is_rookie, is_second_year, is_undrafted,
                percent_rostered, fantasy_prev_5wk_avg, pred_next4, delta
            FROM predictions p
            WHERE batch_uuid = ?
            ORDER BY pred_next4 DESC
            """,
            (batch_uuid,),
        )
        return _rows_to_dicts(result)

    def get_top_predictions(
        self,
        *,
        position: str,
        season: int | None = None,
        week: int | None = None,
        limit: int = 25,
    ) -> list[dict[str, Any]]:
        where = ["p.position = ?"]
        params: list[Any] = [position]
        if season is not None:
            where.append("p.season = ?")
            params.append(int(season))
        if week is not None:
            where.append("p.week = ?")
            params.append(int(week))

        result = self._execute(
            f"""
            SELECT
              r.created_at, r.run_uuid,
              p.team, p.position, p.full_name, p.gsis_id, p.season, p.week,
              p.years_exp, p.draft_number, p.is_rookie, p.is_second_year, p.is_undrafted, p.percent_rostered,
              p.pred_next4, p.delta
            FROM predictions p
            JOIN prediction_runs r ON r.run_uuid = p.run_uuid
            WHERE {" AND ".join(where)}
            ORDER BY r.created_at DESC, p.pred_next4 DESC
            LIMIT ?
            """,
            (*params, int(limit)),
        )
        return _rows_to_dicts(result)
