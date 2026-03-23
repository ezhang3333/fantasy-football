import { ChevronDown, ChevronUp, LayoutGrid } from "lucide-react";
import { LoaderPinwheel } from "lucide-react";
import DropdownFilter from "../DropdownFilter.tsx";
import NumberFilter from "../NumberFilter.tsx";
import { formatOneDecimal, getRowKey } from "../util.ts";
import type { PlayerPrediction, SortConfig, BatchInfo } from "../types.ts";

interface HomePageProps {
  viewMode: string;
  setViewMode: React.Dispatch<React.SetStateAction<string>>;
  positionFilter: string;
  setPositionFilter: (value: string) => void;
  minPred: string;
  setMinPred: (value: string) => void;
  minDelta: string;
  setMinDelta: (value: string) => void;
  sortConfig: SortConfig;
  handleSortSelection: (name: string, value: string) => void;
  handleSortToggle: (key: string) => void;
  sortedResults: PlayerPrediction[];
  hasOutputs: boolean;
  hasFilteredResults: boolean;
  isInitialEmptyState: boolean;
  listBatchPredictions: BatchInfo[];
  isTraining: boolean;
  canTrain: boolean;
  handleLoadLatestBatch: () => void;
  handleTrain: () => void;
  handleResetFilters: () => void;
}

export default function HomePage({
  viewMode,
  setViewMode,
  positionFilter,
  setPositionFilter,
  minPred,
  setMinPred,
  minDelta,
  setMinDelta,
  sortConfig,
  handleSortSelection,
  handleSortToggle,
  sortedResults,
  hasOutputs,
  hasFilteredResults,
  isInitialEmptyState,
  listBatchPredictions,
  isTraining,
  canTrain,
  handleLoadLatestBatch,
  handleTrain,
  handleResetFilters,
}: HomePageProps) {
  return (
    <div className="output-container">
      <div className="output-header">
        <div>
          <div className="output-title">
            <span className="output-title-icon" aria-hidden="true">
              <LoaderPinwheel size={20} />
            </span>
            <span>Fantasy Football Predictor</span>
          </div>
          <div className="output-subtitle">Gradient Boosted Tree Model</div>
        </div>
        <div className="output-header-actions">
          <div className="view-toggle">
            <button
              className={`view-mode-button ${viewMode === "grid" ? "active" : ""}`}
              type="button"
              onClick={() =>
                setViewMode((currentMode) => currentMode === "grid" ? "list" : "grid")
              }
              aria-pressed={viewMode === "grid"}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      <>
        <div className="output-filters">
          <DropdownFilter
            id="position-filter"
            name="position"
            label="Position"
            value={positionFilter}
            onChange={(_name, value) => setPositionFilter(value)}
            options={["All", "QB", "RB", "WR", "TE"]}
            containerClassName="filter-container position-filter-container"
          />
          <DropdownFilter
            id="sort-filter"
            name="sort"
            label="Sort by"
            containerClassName="filter-container sort-filter-container"
            value={sortConfig.key ?? "none"}
            onChange={handleSortSelection}
            options={[
              { value: "none", label: "None" },
              { value: "pred_next4", label: "Prediction" },
              { value: "delta", label: "Delta" },
              { value: "fantasy_prev_5wk_avg", label: "Previous" },
            ]}
            renderOption={(option, { isSelected }) => {
              if (option.value === "none") {
                return <span className="sort-option-label">None</span>;
              }
              const isActive = isSelected && sortConfig.direction;
              const direction = isActive ? sortConfig.direction : "asc";
              return (
                <span className="sort-option-row">
                  <span className="sort-option-label">{option.label}:</span>
                  <button
                    type="button"
                    className={`sort-option-toggle${isActive ? " is-active" : ""}`}
                    aria-label={`Toggle ${option.label} sort`}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleSortToggle(option.value);
                    }}
                  >
                    {direction === "asc" ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </button>
                </span>
              );
            }}
          />
          <NumberFilter
            id="min-pred"
            name="minPred"
            label="Min pred"
            value={minPred}
            onChange={(_name, value) => setMinPred(value)}
            step={0.1}
            stacked={true}
          />
          <NumberFilter
            id="min-delta"
            name="minDelta"
            label="Min delta"
            value={minDelta}
            onChange={(_name, value) => setMinDelta(value)}
            step={0.1}
            stacked={true}
          />
        </div>

        {viewMode === "list" ? (
          <div className="results-table">
            {hasOutputs ? (
              <div className="results-row results-header">
                <div>Player</div>
                <div>Team</div>
                <div>Pos</div>
                <div>Pred</div>
                <div>Delta</div>
                <div>Prev</div>
              </div>
            ) : null}
            <div className="results-table-output-container scroll-container">
              {hasFilteredResults ? (
                sortedResults.map((row, index) => (
                  <div key={getRowKey(row, index)} className="results-row">
                    <div className="player-cell">{row.full_name}</div>
                    <div>{row.team}</div>
                    <div>{row.position}</div>
                    <div>{formatOneDecimal(row.pred_next4)}</div>
                    <div className={row.delta >= 0 ? "delta up" : "delta down"}>
                      {formatOneDecimal(row.delta)}
                    </div>
                    <div>{formatOneDecimal(row.fantasy_prev_5wk_avg)}</div>
                  </div>
                ))
              ) : (
                <div className="results-empty-state">
                  {isInitialEmptyState ? (
                    <>
                      <div className="empty-title">No predictions yet</div>
                      <div className="empty-body">
                        Select a batch from training history or train a new model.
                      </div>
                      <div className="empty-actions">
                        <button
                          className="empty-button primary"
                          type="button"
                          onClick={handleLoadLatestBatch}
                          disabled={listBatchPredictions.length === 0 || isTraining}
                        >
                          Load latest Batch
                        </button>
                        <button
                          className="empty-button secondary"
                          type="button"
                          onClick={handleTrain}
                          disabled={!canTrain}
                        >
                          {isTraining ? "Training..." : "Train model"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="empty-title">
                        No results match these filters
                      </div>
                      <div className="empty-body">
                        Try resetting filters or loosening your thresholds.
                      </div>
                      <div className="empty-actions">
                        <button
                          className="empty-button secondary"
                          type="button"
                          onClick={handleResetFilters}
                        >
                          Reset filters
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="results-table-output-container scroll-container">
            {hasFilteredResults ? (
              <div className="results-grid">
                {sortedResults.map((row, index) => (
                  <div key={getRowKey(row, index)} className="result-card">
                    <div className="card-header">
                      <div className="card-name">{row.full_name}</div>
                      <div className="card-meta">
                        {row.team} - {row.position}
                      </div>
                    </div>
                    <div className="card-stats">
                      <div>
                        <div className="stat-label">Pred</div>
                        <div className="stat-value">
                          {formatOneDecimal(row.pred_next4)}
                        </div>
                      </div>
                      <div>
                        <div className="stat-label">Delta</div>
                        <div className={`stat-value ${row.delta >= 0 ? "up" : "down"}`}>
                          {formatOneDecimal(row.delta)}
                        </div>
                      </div>
                      <div>
                        <div className="stat-label">Prev</div>
                        <div className="stat-value">
                          {formatOneDecimal(row.fantasy_prev_5wk_avg)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="results-empty-state">
                {isInitialEmptyState ? (
                  <>
                    <div className="empty-title">No predictions yet</div>
                    <div className="empty-body">
                      Select a Batch from training history or train a new model.
                    </div>
                    <div className="empty-actions">
                      <button
                        className="empty-button primary"
                        type="button"
                        onClick={handleLoadLatestBatch}
                        disabled={listBatchPredictions.length === 0 || isTraining}
                      >
                        Load latest Batch
                      </button>
                      <button
                        className="empty-button secondary"
                        type="button"
                        onClick={handleTrain}
                        disabled={!canTrain}
                      >
                        {isTraining ? "Training..." : "Train model"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="empty-title">
                      No results match these filters
                    </div>
                    <div className="empty-body">
                      Try resetting filters or loosening your thresholds.
                    </div>
                    <div className="empty-actions">
                      <button
                        className="empty-button secondary"
                        type="button"
                        onClick={handleResetFilters}
                      >
                        Reset filters
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </>
    </div>
  );
}
