import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Funnel, History, LoaderPinwheel, Variable } from "lucide-react";
import "./css/App.css";
import NumberFilter from "./NumberFilter.jsx";
import DropdownFilter from "./DropdownFilter.jsx";
import HistoryListItem from "./HistoryListItem.jsx";
import {
  trainModel,
  listBatches,
  getBatchPredictions,
  listValidValSeasons,
} from "./api/prediction.js";
import { MODEL_FILTERS, TRAINABLE_POSITIONS } from "./constants.js";
import { formatOneDecimal, getRowKey } from "./util.js";

const SIDEBAR_SECTIONS_STORAGE_KEY = "ff.sidebar.sections.v1";
const DEFAULT_SIDEBAR_SECTIONS = {
  model: true,
  training: true,
  history: true,
};

export default function App() {
  const [params, setParams] = useState({
    n_estimators: "300",
    learning_rate: "0.1",
    max_depth: "6",
    subsample: "0.8",
    colsample_bytree: "0.8",
    reg_lambda: "1",
    reg_alpha: "0",
  });
  const [isTraining, setIsTraining] = useState(false);
  const [trainError, setTrainError] = useState("");
  const [listBatchPredictions, setListBatchPredictions] = useState([]);
  const [viewMode, setViewMode] = useState("list");
  const [positionFilter, setPositionFilter] = useState("All");
  const [minPred, setMinPred] = useState("0");
  const [minDelta, setMinDelta] = useState("-30");
  const [modelOutputs, setModelOutputs] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [selectedTrainPositions, setSelectedTrainPositions] = useState(TRAINABLE_POSITIONS);
  const [availableValSeasons, setAvailableValSeasons] = useState([]);
  const [valSeason, setValSeason] = useState("");
  const [sidebarSections, setSidebarSections] = useState(() => {
    try {
      const raw = window.localStorage.getItem(SIDEBAR_SECTIONS_STORAGE_KEY);
      if (!raw) {
        return DEFAULT_SIDEBAR_SECTIONS;
      }
      const parsed = JSON.parse(raw);
      return {
        model:
          typeof parsed?.model === "boolean" ? parsed.model : DEFAULT_SIDEBAR_SECTIONS.model,
        training:
          typeof parsed?.training === "boolean"
            ? parsed.training
            : DEFAULT_SIDEBAR_SECTIONS.training,
        history:
          typeof parsed?.history === "boolean"
            ? parsed.history
            : DEFAULT_SIDEBAR_SECTIONS.history,
      };
    } catch {
      return DEFAULT_SIDEBAR_SECTIONS;
    }
  });

  useEffect(() => {
    const loadHistoryListOnStart = async () => {
      try {
        const batches = await listBatches(15);
        setListBatchPredictions(batches);
      } catch (e) {
        throw new Error(`Error on startup: ${e.message}`);
      }
    }
    loadHistoryListOnStart();
  }, []);

  useEffect(() => {
    const loadValidationSeasons = async () => {
      const selectedPositions = selectedTrainPositions.length > 0 ? selectedTrainPositions : undefined;
      const response = await listValidValSeasons(selectedPositions);
      const seasons = Array.isArray(response?.seasons)
        ? response.seasons.map((season) => String(season))
        : [];
      const sortedSeasons = seasons.sort((a, b) => Number(a) - Number(b));
      setAvailableValSeasons(sortedSeasons);
      setValSeason((previousValue) => {
        if (sortedSeasons.length === 0) {
          return "";
        }
        if (previousValue && sortedSeasons.includes(previousValue)) {
          return previousValue;
        }
        return sortedSeasons[sortedSeasons.length - 1];
      });
    };

    loadValidationSeasons().catch(() => {
      setAvailableValSeasons([]);
      setValSeason("");
    });
  }, [selectedTrainPositions]);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_SECTIONS_STORAGE_KEY, JSON.stringify(sidebarSections));
  }, [sidebarSections]);

  const handleHistoryListItemClick = async (batch_uuid) => {
    try {
      setSelectedBatchId(batch_uuid);
      const playerData = await getBatchPredictions(batch_uuid);
      setModelOutputs(playerData)
    } catch (e) {
      throw new Error(`Error when clicking history list item: ${e.message}`);
    }
  }

  const handleParamChange = (name, rawValue) => {
    setParams((prev) => ({ ...prev, [name]: rawValue }));
  };

  const toggleTrainPosition = (position) => {
    setSelectedTrainPositions((prev) =>
      prev.includes(position)
        ? prev.filter((p) => p !== position)
        : [...prev, position]
    );
  };

  const canTrain =
    !isTraining &&
    selectedTrainPositions.length > 0 &&
    availableValSeasons.includes(valSeason);

  const handleTrain = async () => {
    if (!canTrain) {
      return;
    }

    setIsTraining(true);
    setTrainError("");

    const payload = {
      positions: selectedTrainPositions,
      val_season: Number(valSeason),
      n_estimators: Number(params.n_estimators),
      learning_rate: Number(params.learning_rate),
      max_depth: Number(params.max_depth),
      subsample: Number(params.subsample),
      colsample_bytree: Number(params.colsample_bytree),
      reg_lambda: Number(params.reg_lambda),
      reg_alpha: Number(params.reg_alpha),
    };
    try {
      await trainModel(payload);
      const batches = await listBatches(15);
      setListBatchPredictions(batches);
    } catch (e) {
      setTrainError(e.message);
    } finally {
      setIsTraining(false);
    }
  };

  const parsedMinPred = Number.parseFloat(minPred);
  const parsedMinDelta = Number.parseFloat(minDelta);
  const minPredValue = Number.isNaN(parsedMinPred) ? 0 : parsedMinPred;
  const minDeltaValue = Number.isNaN(parsedMinDelta) ? 0 : parsedMinDelta;
  const filteredResults = modelOutputs.filter((row) => {
    if (positionFilter !== "All" && row.position !== positionFilter) {
      return false;
    }
    if (row.pred_next4 < minPredValue) {
      return false;
    }
    if (row.delta < minDeltaValue) {
      return false;
    }
    return true;
  });
  const sortedResults = sortConfig.key
    ? [...filteredResults].sort((a, b) => {
        const aValue = Number(a[sortConfig.key] ?? 0);
        const bValue = Number(b[sortConfig.key] ?? 0);
        if (aValue === bValue) return 0;
        const dir = sortConfig.direction === "asc" ? 1 : -1;
        return aValue > bValue ? dir : -dir;
      })
    : filteredResults;

  const hasOutputs = modelOutputs.length > 0;
  const hasFilteredResults = filteredResults.length > 0;
  const isInitialEmptyState = !hasOutputs;
  const valSeasonOptions =
    availableValSeasons.length > 0
      ? availableValSeasons.map((season) => ({ value: season, label: season }))
      : [{ value: "", label: "No seasons available" }];

  const handleLoadLatestBatch = async () => {
    if (listBatchPredictions.length === 0) {
      return;
    }
    const latestBatch = listBatchPredictions[0];
    await handleHistoryListItemClick(latestBatch.batch_uuid);
  };

  const handleResetFilters = () => {
    setPositionFilter("All");
    setMinPred("0");
    setMinDelta("0");
  };
  const handleSortSelection = (_, value) => {
    if (value === "none") {
      setSortConfig({ key: null, direction: null });
      return;
    }
    setSortConfig((prev) => ({
      key: value,
      direction: prev.key === value && prev.direction ? prev.direction : "asc",
    }));
  };

  const handleSortToggle = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) {
        return { key, direction: "asc" };
      }
      return {
        key,
        direction: prev.direction === "asc" ? "desc" : "asc",
      };
    });
  };

  const toggleSidebarSection = (sectionKey) => {
    setSidebarSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const getChevronForSection = (isOpen) => (isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />);

  return (
    <div className="base-container">
      <div className="filter-and-history-sidebar">
        <div className="sidebar-panel">
          <button
            type="button"
            className="sidebar-panel-header"
            aria-expanded={sidebarSections.model}
            aria-controls="sidebar-section-model"
            onClick={() => toggleSidebarSection("model")}
          >
            <span className="sidebar-panel-heading">
              <span className="sidebar-panel-icon" aria-hidden="true">
                <Variable size={14} />
              </span>
              <span className="sidebar-panel-title">Model Parameters</span>
            </span>
            <span className="sidebar-panel-chevron" aria-hidden="true">
              {getChevronForSection(sidebarSections.model)}
            </span>
          </button>
          <div
            id="sidebar-section-model"
            className={`sidebar-panel-body model${sidebarSections.model ? "" : " is-collapsed"}`}
          >
            {MODEL_FILTERS.map((f) => (
              <NumberFilter
                key={f.name}
                name={f.name}
                label={f.label}
                value={params[f.name]}
                onChange={handleParamChange}
                min={f.min}
                max={f.max}
                step={f.step}
                showIcons
              />
            ))}
          </div>
        </div>

        <div className="sidebar-panel">
          <button
            type="button"
            className="sidebar-panel-header"
            aria-expanded={sidebarSections.training}
            aria-controls="sidebar-section-training"
            onClick={() => toggleSidebarSection("training")}
          >
            <span className="sidebar-panel-heading">
              <span className="sidebar-panel-icon" aria-hidden="true">
                <Funnel size={14} />
              </span>
              <span className="sidebar-panel-title">Training Parameters</span>
            </span>
            <span className="sidebar-panel-chevron" aria-hidden="true">
              {getChevronForSection(sidebarSections.training)}
            </span>
          </button>
          <div
            id="sidebar-section-training"
            className={`sidebar-panel-body training${sidebarSections.training ? "" : " is-collapsed"}`}
          >
            <div className="sidebar-section">
              <div className="validation-season-title">Position</div>
              <div className="train-position-picker">
                {TRAINABLE_POSITIONS.map((position) => (
                  <button
                    key={position}
                    type="button"
                    className={`position-toggle${selectedTrainPositions.includes(position) ? " is-active" : ""}`}
                    onClick={() => toggleTrainPosition(position)}
                  >
                    {position}
                  </button>
                ))}
              </div>
            </div>
            <div className="sidebar-section validation-season-section">
              <div className="validation-season-title">Validation Season</div>
              <DropdownFilter
                id="validation-season"
                name="val_season"
                label=""
                value={valSeason}
                onChange={(_, value) => setValSeason(value)}
                options={valSeasonOptions}
                containerClassName="sidebar-dropdown-container"
                labelClassName="sidebar-dropdown-label"
                selectClassName="sidebar-dropdown-select"
              />
            </div>
          </div>
        </div>

        <div className="sidebar-panel sidebar-panel-history">
          <button
            type="button"
            className="sidebar-panel-header"
            aria-expanded={sidebarSections.history}
            aria-controls="sidebar-section-history"
            onClick={() => toggleSidebarSection("history")}
          >
            <span className="sidebar-panel-heading">
              <span className="sidebar-panel-icon" aria-hidden="true">
                <History size={14} />
              </span>
              <span className="sidebar-panel-title">Training History</span>
            </span>
            <span className="sidebar-panel-chevron" aria-hidden="true">
              {getChevronForSection(sidebarSections.history)}
            </span>
          </button>
          <div
            id="sidebar-section-history"
            className={`sidebar-panel-body history${sidebarSections.history ? "" : " is-collapsed"}`}
          >
            <div className="history-list scroll-container">
              {listBatchPredictions.map((prediction_batch) => (
                <HistoryListItem 
                  key={prediction_batch.batch_uuid} 
                  batchData={prediction_batch}
                  handleClick={handleHistoryListItemClick}
                  isSelected={prediction_batch.batch_uuid === selectedBatchId}
                />
              ))}
            </div>
            <div className="history-footer">
              {trainError ? <div className="history-time">{trainError}</div> : null}
              <button
                className="train-button"
                type="button"
                onClick={handleTrain}
                disabled={!canTrain}
              >
                {isTraining ? "Training..." : "Train Model"}
              </button>
            </div>
          </div>
        </div>
      </div>

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
          <div className="view-toggle">
            <button
              className={`toggle-button ${viewMode === "list" ? "active" : ""}`}
              type="button"
              onClick={() => setViewMode("list")}
            >
              List
            </button>
            <button
              className={`toggle-button ${viewMode === "grid" ? "active" : ""}`}
              type="button"
              onClick={() => setViewMode("grid")}
            >
              Grid
            </button>
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
                  { value: "fantasy_prev_5wk_avg", label: "Previous" }
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
                    <div>pred</div>
                    <div>delta</div>
                    <div>prev</div>
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
                            Select a batch from Training History or train a new model.
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
                            <div className="stat-label">pred</div>
                            <div className="stat-value">
                              {formatOneDecimal(row.pred_next4)}
                            </div>
                          </div>
                          <div>
                            <div className="stat-label">delta</div>
                            <div
                              className={`stat-value ${
                                row.delta >= 0 ? "up" : "down"
                              }`}
                            >
                              {formatOneDecimal(row.delta)}
                            </div>
                          </div>
                          <div>
                            <div className="stat-label">prev</div>
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
                          Select a Batch from Training History or train a new model.
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
      </div>
    </div>
  );
}
