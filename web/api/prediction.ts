import { fetchApi } from './fetchApi.ts';
import type {
  BatchInfo,
  BatchRunInfo,
  PlayerPrediction,
  TrainPayload,
  TrainRangeOptions,
  TrainResponse,
} from '../types.ts';

const apiBase = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

interface TopPredictionsParams {
  position?: string;
  season?: number;
  week?: number;
  limit?: number;
}

// GET /predictions/top?position=_&season=_&week=_&limit=_
export const topPredictions = ({
  position,
  season,
  week,
  limit,
}: TopPredictionsParams = {}): Promise<PlayerPrediction[]> => {
  const params = new URLSearchParams();

  if (position) params.set("position", position);
  if (season != null) params.set("season", String(season));
  if (week != null) params.set("week", String(week));
  if (limit != null) params.set("limit", String(limit));

  return fetchApi<PlayerPrediction[]>(`${apiBase}/predictions/top?${params.toString()}`);
};

// GET /predictions/runs/list?limit=15
export const listRuns = (limit = 15): Promise<unknown[]> => {
  return fetchApi<unknown[]>(`${apiBase}/predictions/runs/list?limit=${limit}`);
};

// GET /predictions/runs/{run_uuid}
export const getRunPredictions = (run_uuid: string): Promise<PlayerPrediction[]> => {
  return fetchApi<PlayerPrediction[]>(`${apiBase}/predictions/runs/${run_uuid}`);
};

// GET /predictions/batch/past
export const listBatches = (limit: number): Promise<BatchInfo[]> => {
  return fetchApi<BatchInfo[]>(`${apiBase}/predictions/batch/past?limit=${limit}`);
};

// GET /predictions/batch/{batch_uuid}
export const getBatchPredictions = (batch_uuid: string): Promise<PlayerPrediction[]> => {
  return fetchApi<PlayerPrediction[]>(`${apiBase}/predictions/batch/${batch_uuid}`);
};

// GET /predictions/batch/{batch_uuid}/runs
export const getBatchRuns = (batch_uuid: string): Promise<BatchRunInfo[]> => {
  return fetchApi<BatchRunInfo[]>(`${apiBase}/predictions/batch/${batch_uuid}/runs`);
};

// GET /predictions/latest/{position}
export const latestPredictions = (position: string): Promise<PlayerPrediction[]> => {
  return fetchApi<PlayerPrediction[]>(`${apiBase}/predictions/latest/${position}`);
};

// GET /train/options/range?positions=QB,RB
export const getTrainRangeOptions = (positions?: string[]): Promise<TrainRangeOptions> => {
  const params = new URLSearchParams();
  if (Array.isArray(positions) && positions.length > 0) {
    params.set("positions", positions.join(","));
  }
  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  return fetchApi<TrainRangeOptions>(`${apiBase}/train/options/range${suffix}`);
};

// POST /train
export const trainModel = (payload: TrainPayload): Promise<TrainResponse> => {
  return fetchApi<TrainResponse>(`${apiBase}/train`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
};
