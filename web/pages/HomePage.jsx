import {
  ChevronDown,
  ChevronUp,
  Database,
  LayoutGrid,
  LoaderPinwheel,
} from "lucide-react";
import DropdownFilter from "../DropdownFilter.jsx";
import NumberFilter from "../NumberFilter.jsx";
import ModalDialog from "../ModalDialog.jsx";
import { formatOneDecimal, getRowKey } from "../util.js";

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
  isRefreshModalOpen,
  setIsRefreshModalOpen,
  isRefreshingDataset,
  refreshEarliestSeason,
  refreshLatestSeason,
  refreshSeasonOptions,
  handleRefreshEarliestChange,
  handleRefreshLatestChange,
  handleExtractDataset,
}) {
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
          <button
            className="dataset-refresh-button"
            type="button"
            onClick={() => {
              setIsRefreshModalOpen(true);
            }}
          >
            <Database size={14} />
            <span>Dataset Refresh</span>
          </button>
          <div className="view-toggle">
            <button
              className={`view-mode-button ${viewMode === "grid" ? "active" : ""}`}
              type="button"
              onClick={() =>
                setViewMode((currentMode) =>
                  currentMode === "grid" ? "list" : "grid",
                )
              }
              aria-pressed={viewMode === "grid"}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {isTraining ? (
        <div className="loading-state">
          <div className="loading-orbit" aria-hidden="true">
            <span className="orbit-ring" />
            <span className="orbit-dot" />
          </div>
          <div className="loading-title">Training your model</div>
          <div className="loading-subtitle">
            Optimizing features and scoring outputs.
          </div>
        </div>
      ) : (
        <>
          <div className="output-filters">
            <DropdownFilter
              id="position-filter"
              name="position"
              label="Position"
              value={positionFilter}
              onChange={(_, value) => setPositionFilter(value)}
              options={["All", "QB", "RB", "WR", "TE"]}
            />
            <DropdownFilter
              id="sort-filter"
              name="sort"
              label="Sort by"
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
                      className={`sort-option-toggle${
                        isActive ? " is-active" : ""
                      }`}
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
              onChange={(_, value) => setMinPred(value)}
              step="0.1"
              stacked={true}
            />
            <NumberFilter
              id="min-delta"
              name="minDelta"
              label="Min delta"
              value={minDelta}
              onChange={(_, value) => setMinDelta(value)}
              step="0.1"
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
                          <div
                            className={`stat-value ${
                              row.delta >= 0 ? "up" : "down"
                            }`}
                          >
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
      )}
      <ModalDialog
        open={isRefreshModalOpen}
        title="Dataset Refresh"
        onClose={() => setIsRefreshModalOpen(false)}
      >
        <div className="dataset-modal-copy">
          Training outputs may change after extraction completes.
        </div>
        <div className="dataset-modal-body">
          <div className="sidebar-section validation-season-section">
            <div className="validation-season-title">Earliest Season to Extract</div>
            <DropdownFilter
              id="refresh-earliest-season"
              name="refresh_earliest_season"
              label=""
              value={refreshEarliestSeason}
              onChange={handleRefreshEarliestChange}
              options={refreshSeasonOptions}
              containerClassName="sidebar-dropdown-container"
              labelClassName="sidebar-dropdown-label"
              selectClassName="sidebar-dropdown-select"
            />
          </div>
          <div className="sidebar-section validation-season-section">
            <div className="validation-season-title">Latest Season to Extract</div>
            <DropdownFilter
              id="refresh-latest-season"
              name="refresh_latest_season"
              label=""
              value={refreshLatestSeason}
              onChange={handleRefreshLatestChange}
              options={refreshSeasonOptions}
              containerClassName="sidebar-dropdown-container"
              labelClassName="sidebar-dropdown-label"
              selectClassName="sidebar-dropdown-select"
            />
          </div>
        </div>
        <div className="dataset-modal-footer">
          <button
            type="button"
            className="empty-button secondary"
            onClick={() => setIsRefreshModalOpen(false)}
            disabled={isRefreshingDataset}
          >
            Cancel
          </button>
          <button
            type="button"
            className="empty-button primary"
            onClick={handleExtractDataset}
            disabled={isRefreshingDataset || !refreshEarliestSeason || !refreshLatestSeason}
          >
            {isRefreshingDataset ? "Extracting..." : "Extract"}
          </button>
        </div>
      </ModalDialog>
    </div>
  );
}
