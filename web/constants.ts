import type { ModelParamKey } from './types.ts';

export interface ModelFilter {
  name: ModelParamKey;
  label: string;
  min: number;
  max?: number;
  step: number;
}

export const MODEL_FILTERS: ModelFilter[] = [
  { name: "n_estimators", label: "num estimators", min: 1, step: 1 },
  { name: "learning_rate", label: "learning rate", min: 0, max: 1, step: 0.01 },
  { name: "max_depth", label: "max depth", min: 1, step: 1 },
  { name: "subsample", label: "subsample", min: 0, max: 1, step: 0.01 },
  { name: "colsample_bytree", label: "colsample", min: 0, max: 1, step: 0.01 },
  { name: "reg_lambda", label: "lambda", min: 0, step: 0.1 },
  { name: "reg_alpha", label: "alpha", min: 0, step: 0.1 },
];

export const TRAINABLE_POSITIONS: string[] = ["QB", "RB", "WR", "TE"];
