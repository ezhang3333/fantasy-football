// Shared domain types for the Fantasy Football Predictor frontend

export type ModelParamKey =
  | 'n_estimators'
  | 'learning_rate'
  | 'max_depth'
  | 'subsample'
  | 'colsample_bytree'
  | 'reg_lambda'
  | 'reg_alpha';

export type ModelParams = Record<ModelParamKey, string>;

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string | null;
  direction: SortDirection | null;
}

export interface PlayerPrediction {
  gsis_id?: string;
  full_name: string;
  team: string;
  position: string;
  pred_next4: number;
  delta: number;
  fantasy_prev_5wk_avg: number;
  season?: number;
  week?: number;
}

export interface BatchInfo {
  batch_uuid: string;
  created_at: string;
  /** JSON-encoded string[] of positions, e.g. '["QB","RB"]' */
  positions: string;
}

export interface SeasonOption {
  value: string;
  label: string;
}

export interface TrainRangeOptions {
  available_seasons: number[];
  min_available_season: number;
  default_max_train_season: number;
  max_available_season: number;
}

export interface TrainPayload {
  positions: string[];
  earliest_train_season: number;
  max_train_season: number;
  val_season: number;
  n_estimators: number;
  learning_rate: number;
  max_depth: number;
  subsample: number;
  colsample_bytree: number;
  reg_lambda: number;
  reg_alpha: number;
}

export interface TrainResponse {
  batch_uuid: string;
}

export interface ValidationMetrics {
  mae: number;
  rmse: number;
  r2: number;
}

export interface BatchRunMeta {
  train_params: Record<string, number>;
  earliest_train_season: number;
  max_train_season: number;
  val_season: number;
  validation_metrics: ValidationMetrics;
  best_iteration: number;
  position: string;
}

export interface BatchRunInfo {
  position: string;
  created_at: string;
  val_season: number;
  meta: BatchRunMeta;
}
