import { useEffect, useState } from "react";
import { BarChart3, Database, Rocket, Zap } from "lucide-react";
import { getBatchRuns } from "../api/prediction.ts";
import type { BatchRunInfo } from "../types.ts";

interface InfoPageProps {
  selectedBatchId: string | null;
}

const PARAM_LABELS: Record<string, string> = {
  n_estimators: "Estimators",
  learning_rate: "Learning Rate",
  max_depth: "Max Depth",
  subsample: "Subsample",
  colsample_bytree: "Col Sample",
  reg_lambda: "Lambda",
  reg_alpha: "Alpha",
};

function formatMetric(value: number | undefined, decimals = 3): string {
  if (value == null) return "N/A";
  return value.toFixed(decimals);
}

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function InfoPage({ selectedBatchId }: InfoPageProps) {
  const [batchRuns, setBatchRuns] = useState<BatchRunInfo[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!selectedBatchId) {
      setBatchRuns(null);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    getBatchRuns(selectedBatchId)
      .then((runs) => {
        if (!cancelled) setBatchRuns(runs);
      })
      .catch(() => {
        if (!cancelled) setBatchRuns(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedBatchId]);

  const firstRun = batchRuns?.[0] ?? null;
  const meta = firstRun?.meta ?? null;
  const trainParams = meta?.train_params ?? null;

  return (
    <div className="output-container info-page-scroll">
      <div className="output-header">
        <div>
          <div className="output-title">Info</div>
          <div className="output-subtitle">Model details and how the app works</div>
        </div>
      </div>

      <div className="info-model-card">
        <div className="info-model-header">
          <span className="info-model-header-title">Selected Model</span>
          {firstRun && (
            <span className="info-model-header-time">
              {formatTimestamp(firstRun.created_at)}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="info-empty-state">
            <span className="info-empty-text">Loading model details...</span>
          </div>
        ) : !batchRuns || batchRuns.length === 0 ? (
          <div className="info-empty-state">
            <span aria-hidden="true"><BarChart3 size={28} /></span>
            <span className="info-empty-text">
              Select a training batch from the sidebar to view model details.
            </span>
          </div>
        ) : (
          <>
            <div className="info-stat-row">
              <div className="info-stat-box">
                <span className="info-stat-label">Positions</span>
                <span className="info-stat-value">
                  {batchRuns.map((run) => (
                    <span key={run.position} className="info-position-pill">
                      {run.position}
                    </span>
                  ))}
                </span>
              </div>
              <div className="info-stat-box">
                <span className="info-stat-label">Training Window</span>
                <span className="info-stat-value">
                  {meta?.earliest_train_season ?? "?"} &ndash; {meta?.max_train_season ?? "?"}
                </span>
              </div>
              <div className="info-stat-box">
                <span className="info-stat-label">Validation Season</span>
                <span className="info-stat-value">{meta?.val_season ?? "?"}</span>
              </div>
              {meta?.best_iteration != null && (
                <div className="info-stat-box">
                  <span className="info-stat-label">Best Iteration</span>
                  <span className="info-stat-value">{meta.best_iteration}</span>
                </div>
              )}
            </div>

            {trainParams && (
              <div className="info-section">
                <div className="info-section-label">Hyperparameters</div>
                <div className="info-params-grid">
                  {Object.entries(trainParams).map(([key, value]) => (
                    <div key={key} className="info-param-item">
                      <span className="info-param-key">{PARAM_LABELS[key] ?? key}</span>
                      <span className="info-param-value">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="info-section">
              <div className="info-section-label">Validation Metrics</div>
              <div className="info-metrics-grid">
                <span className="info-metrics-header">Position</span>
                <span className="info-metrics-header">MAE</span>
                <span className="info-metrics-header">RMSE</span>
                <span className="info-metrics-header">R&sup2;</span>
                {batchRuns.map((run) => {
                  const vm = run.meta?.validation_metrics;
                  const r2 = vm?.r2;
                  const r2Good = r2 != null && r2 >= 0.5;
                  return (
                    <div key={run.position} className="info-metrics-row">
                      <span className="info-position-pill">{run.position}</span>
                      <span className="info-metrics-value">{formatMetric(vm?.mae)}</span>
                      <span className="info-metrics-value">{formatMetric(vm?.rmse)}</span>
                      <span
                        className="info-metrics-value"
                        style={r2Good ? { color: "#78d6c6" } : undefined}
                      >
                        {formatMetric(r2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="info-about-cards">
        <div className="info-about-card">
          <span className="info-about-icon" aria-hidden="true"><Zap size={18} /></span>
          <div>
            <div className="info-about-title">How It Works</div>
            <div className="info-about-body">
              The app trains per-position XGBoost models on historical NFL data to predict each
              player's average PPR fantasy points over the next 4 weeks. A delta score highlights
              players expected to outperform their recent baseline, surfacing breakout candidates.
            </div>
          </div>
        </div>

        <div className="info-about-card">
          <span className="info-about-icon" aria-hidden="true"><Database size={18} /></span>
          <div>
            <div className="info-about-title">Data Sources</div>
            <div className="info-about-body">
              Training data combines nflverse play-by-play stats, Next Gen Stats, snap counts, and
              roster data with defensive matchup rankings scraped from Pro Football Reference. All
              data is merged per-player, per-week from 2016 onward.
            </div>
          </div>
        </div>

        <div className="info-about-card">
          <span className="info-about-icon" aria-hidden="true"><Rocket size={18} /></span>
          <div>
            <div className="info-about-title">Getting Started</div>
            <div className="info-about-body">
              1. Configure positions, season window, and hyperparameters on the Parameters page.<br />
              2. Click Train Model to run the pipeline and generate predictions.<br />
              3. View scored player rankings on the Home page, sorted by projection or delta.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
