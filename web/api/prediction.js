import { fetchApi } from './fetchApi.js'
const apiBase = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

// GET /predictions/top?position=_&season=_&week=_&limit=_
export const topPredictions = ({ position, season, week, limit } = {}) => {
    const params = new URLSearchParams();

    if (position) params.set("position", position);
    if (season != null) params.set("season", String(season));
    if (week != null) params.set("week", String(week));
    if (limit != null) params.set("limit", String(limit));

    return fetchApi(`${apiBase}/predictions/top?${params.toString()}`);
}

// GET /predictions/runs/list?limit=15
export const listRuns = (limit = 15) => {
  return fetchApi(`${apiBase}/predictions/runs/list?limit=${limit}`);
};

// GET /predictions/runs/{run_uuid}
export const getRunPredictions = (run_uuid) => {
  return fetchApi(`${apiBase}/predictions/runs/${run_uuid}`);
};

// GET /predictions/batch/past
export const listBatches = (limit) => {
  return fetchApi(`${apiBase}/predictions/batch/past?limit=${limit}`);
}

// GET /predictions/batch/{batch_uuid}
export const getBatchPredictions = (batch_uuid) => {
  return fetchApi(`${apiBase}/predictions/batch/${batch_uuid}`);
};

// GET /predictions/latest/{position}
export const latestPredictions = (position) => {
  return fetchApi(`${apiBase}/predictions/latest/${position}`);
};

// GET /train/options/range?positions=QB,RB
export const getTrainRangeOptions = (positions) => {
  const params = new URLSearchParams();
  if (Array.isArray(positions) && positions.length > 0) {
    params.set("positions", positions.join(","));
  }
  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  return fetchApi(`${apiBase}/train/options/range${suffix}`);
};

// POST /train
export const trainModel = (payload) => {
  return fetchApi(`${apiBase}/train`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
};
