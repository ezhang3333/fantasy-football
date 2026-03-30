import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { BarChart3, Database, Rocket, Zap } from "lucide-react";
import { getBatchRuns } from "../api/prediction.ts";
import type { BatchRunInfo } from "../types.ts";

interface InfoPageProps {
  selectedBatchId: string | null;
}

const PARAM_LABELS: Record<string, string> = {
  n_estimators: "Estimators",
  learning_rate: "Learn Rate",
  max_depth: "Depth",
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

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

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
            <span aria-hidden="true"><BarChart3 size={24} strokeWidth={1.5} /></span>
            <span className="info-empty-text">
              Select a training batch from the sidebar to view model details.
            </span>
          </div>
        ) : (
          <>
            <motion.div
              className="info-stat-row"
              {...fadeUp}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
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
            </motion.div>

            {trainParams && (
              <motion.div
                className="info-section"
                {...fadeUp}
                transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
              >
                <hr className="info-divider" />
                <div className="info-section-label">Hyperparameters</div>
                <div className="info-params-grid">
                  {Object.entries(trainParams).map(([key, value]) => (
                    <div key={key} className="info-param-chip">
                      <span className="info-param-key">{PARAM_LABELS[key] ?? key}</span>
                      <span className="info-param-value">{value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            <motion.div
              className="info-section"
              {...fadeUp}
              transition={{ duration: 0.35, delay: 0.16, ease: "easeOut" }}
            >
              <hr className="info-divider" />
              <div className="info-section-label">Validation Metrics</div>
              <table className="info-metrics-table">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>MAE</th>
                    <th>RMSE</th>
                    <th>R&sup2;</th>
                  </tr>
                </thead>
                <tbody>
                  {batchRuns.map((run) => {
                    const vm = run.meta?.validation_metrics;
                    const r2 = vm?.r2;
                    const r2Good = r2 != null && r2 >= 0.5;
                    return (
                      <tr key={run.position}>
                        <td>
                          <span className="info-position-pill">{run.position}</span>
                        </td>
                        <td>{formatMetric(vm?.mae)}</td>
                        <td>{formatMetric(vm?.rmse)}</td>
                        <td style={r2Good ? { color: "#78d6c6" } : undefined}>
                          {formatMetric(r2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>
          </>
        )}
      </div>

      <motion.div
        className="info-about-cards"
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.24, ease: "easeOut" }}
      >
        <div className="info-about-item">
          <span className="info-about-icon" aria-hidden="true"><Zap size={16} strokeWidth={1.5} /></span>
          <div>
            <div className="info-about-title">How It Works</div>
            <div className="info-about-body">
              The app trains per-position XGBoost models on historical NFL data to predict each
              player's average PPR fantasy points over the next 4 weeks. A delta score highlights
              players expected to outperform their recent baseline, surfacing breakout candidates.
            </div>
          </div>
        </div>

        <div className="info-about-item">
          <span className="info-about-icon" aria-hidden="true"><Database size={16} strokeWidth={1.5} /></span>
          <div>
            <div className="info-about-title">Data Sources</div>
            <div className="info-about-body">
              Training data combines nflverse play-by-play stats, Next Gen Stats, snap counts, and
              roster data with defensive matchup rankings scraped from Pro Football Reference. All
              data is merged per-player, per-week from 2016 onward.
            </div>
          </div>
        </div>

        <div className="info-about-item">
          <span className="info-about-icon" aria-hidden="true"><Rocket size={16} strokeWidth={1.5} /></span>
          <div>
            <div className="info-about-title">Getting Started</div>
            <div className="info-about-body">
              1. Configure positions, season window, and hyperparameters on the Parameters page.<br />
              2. Click Train Model to run the pipeline and generate predictions.<br />
              3. View scored player rankings on the Home page, sorted by projection or delta.
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
