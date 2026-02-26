import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Funnel, History, Variable, LoaderPinwheel, User, SlidersHorizontal, CircleHelp } from "lucide-react";
import { Navigate, Route, Routes } from "react-router-dom";
import "./css/App.css";
import NumberFilter from "./NumberFilter.jsx";
import DropdownFilter from "./DropdownFilter.jsx";
import HistoryListItem from "./HistoryListItem.jsx";
import SidebarRouteItem from "./SidebarRouteItem.jsx";
import {
  getBatchPredictions,
  getRefreshOptions,
  getTrainRangeOptions,
  listBatches,
  refreshDataset,
  trainModel,
} from "./api/prediction.js";
import { MODEL_FILTERS, TRAINABLE_POSITIONS } from "./constants.js";
import AppShell from "./layouts/AppShell.jsx";
import HomePage from "./pages/HomePage.jsx";
import ParametersPage from "./pages/ParametersPage.jsx";
import InfoPage from "./pages/InfoPage.jsx";

const DEFAULT_SIDEBAR_SECTIONS = {
  model: false,
  training: false,
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
  const [availableSeasons, setAvailableSeasons] = useState([]);
  const [earliestTrainSeason, setEarliestTrainSeason] = useState("");
  const [maxTrainSeason, setMaxTrainSeason] = useState("");
  const [valSeason, setValSeason] = useState("");
  const [isRefreshModalOpen, setIsRefreshModalOpen] = useState(false);
  const [isRefreshingDataset, setIsRefreshingDataset] = useState(false);
  const [refreshAvailableSeasons, setRefreshAvailableSeasons] = useState([]);
  const [refreshEarliestSeason, setRefreshEarliestSeason] = useState("");
  const [refreshLatestSeason, setRefreshLatestSeason] = useState("");
  const [sidebarSections, setSidebarSections] = useState(DEFAULT_SIDEBAR_SECTIONS);

  useEffect(() => {
    const loadHistoryListOnStart = async () => {
      try {
        const batches = await listBatches(15);
        setListBatchPredictions(batches);
      } catch (e) {
        throw new Error(`Error on startup: ${e.message}`);
      }
    };
    loadHistoryListOnStart();
  }, []);

  const seasonOptionsForDropdown = useMemo(
    () => availableSeasons.map((season) => ({ value: season, label: season })),
    [availableSeasons]
  );
  const maxTrainAllowedSeason =
    availableSeasons.length > 1 ? availableSeasons[availableSeasons.length - 2] : "";

  const earliestTrainOptions =
    availableSeasons.length > 1
      ? seasonOptionsForDropdown.filter((option) => Number(option.value) <= Number(maxTrainAllowedSeason))
      : [{ value: "", label: "No seasons available" }];

  const latestTrainOptions =
    availableSeasons.length > 1 && earliestTrainSeason
      ? seasonOptionsForDropdown.filter(
          (option) =>
            Number(option.value) >= Number(earliestTrainSeason) &&
            Number(option.value) <= Number(maxTrainAllowedSeason)
        )
      : [{ value: "", label: "No seasons available" }];

  const valSeasonOptions =
    availableSeasons.length > 1 && maxTrainSeason
      ? seasonOptionsForDropdown.filter((option) => Number(option.value) > Number(maxTrainSeason))
      : [{ value: "", label: "No seasons available" }];

  const refreshSeasonOptions = refreshAvailableSeasons.map((season) => ({
    value: season,
    label: season,
  }));

  const loadTrainOptions = async () => {
    const selectedPositions = selectedTrainPositions.length > 0 ? selectedTrainPositions : undefined;
    const response = await getTrainRangeOptions(selectedPositions);
    const seasons = Array.isArray(response?.available_seasons)
      ? response.available_seasons.map((season) => String(season)).sort((a, b) => Number(a) - Number(b))
      : [];
    setAvailableSeasons(seasons);

    if (seasons.length < 2) {
      setEarliestTrainSeason("");
      setMaxTrainSeason("");
      setValSeason("");
      return;
    }

    const defaultEarliest = String(response?.min_available_season ?? seasons[0]);
    const defaultMaxTrain = String(response?.default_max_train_season ?? seasons[seasons.length - 2]);
    const defaultVal = String(response?.max_available_season ?? seasons[seasons.length - 1]);

    setEarliestTrainSeason(defaultEarliest);
    setMaxTrainSeason(defaultMaxTrain);
    setValSeason(defaultVal);
  };

  const loadRefreshOptions = async () => {
    const response = await getRefreshOptions();
    const seasons = Array.isArray(response?.configured_seasons)
      ? response.configured_seasons.map((season) => String(season)).sort((a, b) => Number(a) - Number(b))
      : [];
    setRefreshAvailableSeasons(seasons);
    setRefreshEarliestSeason(String(response?.default_earliest_season ?? seasons[0] ?? ""));
    setRefreshLatestSeason(String(response?.default_latest_season ?? seasons[seasons.length - 1] ?? ""));
  };

  useEffect(() => {
    loadTrainOptions().catch(() => {
      setAvailableSeasons([]);
      setEarliestTrainSeason("");
      setMaxTrainSeason("");
      setValSeason("");
    });
  }, [selectedTrainPositions]);

  useEffect(() => {
    loadRefreshOptions().catch(() => {
      setRefreshAvailableSeasons([]);
      setRefreshEarliestSeason("");
      setRefreshLatestSeason("");
    });
  }, []);

  const handleHistoryListItemClick = async (batch_uuid) => {
    try {
      setSelectedBatchId(batch_uuid);
      const playerData = await getBatchPredictions(batch_uuid);
      setModelOutputs(playerData);
    } catch (e) {
      throw new Error(`Error when clicking history list item: ${e.message}`);
    }
  };

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
    earliestTrainSeason !== "" &&
    maxTrainSeason !== "" &&
    valSeason !== "" &&
    valSeasonOptions.some((option) => option.value === valSeason) &&
    Number(earliestTrainSeason) <= Number(maxTrainSeason) &&
    Number(valSeason) > Number(maxTrainSeason);

  const handleEarliestTrainSeasonChange = (_, value) => {
    setEarliestTrainSeason(value);
    if (!maxTrainAllowedSeason) {
      setMaxTrainSeason("");
      setValSeason("");
      return;
    }

    let nextMaxTrain = maxTrainSeason;
    if (!nextMaxTrain || Number(nextMaxTrain) < Number(value)) {
      nextMaxTrain = value;
    }
    if (Number(nextMaxTrain) > Number(maxTrainAllowedSeason)) {
      nextMaxTrain = maxTrainAllowedSeason;
    }
    setMaxTrainSeason(nextMaxTrain);

    if (!valSeason || Number(valSeason) <= Number(nextMaxTrain)) {
      const highestVal = availableSeasons[availableSeasons.length - 1] ?? "";
      setValSeason(Number(highestVal) > Number(nextMaxTrain) ? highestVal : "");
    }
  };

  const handleMaxTrainSeasonChange = (_, value) => {
    setMaxTrainSeason(value);
    if (!valSeason || Number(valSeason) <= Number(value)) {
      const highestVal = availableSeasons[availableSeasons.length - 1] ?? "";
      setValSeason(Number(highestVal) > Number(value) ? highestVal : "");
    }
  };

  const handleTrain = async () => {
    if (!canTrain) {
      return;
    }

    setIsTraining(true);
    setTrainError("");

    const payload = {
      positions: selectedTrainPositions,
      earliest_train_season: Number(earliestTrainSeason),
      max_train_season: Number(maxTrainSeason),
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

  const handleRefreshEarliestChange = (_, value) => {
    setRefreshEarliestSeason(value);
    if (refreshLatestSeason && Number(value) > Number(refreshLatestSeason)) {
      setRefreshLatestSeason(value);
    }
  };

  const handleRefreshLatestChange = (_, value) => {
    setRefreshLatestSeason(value);
    if (refreshEarliestSeason && Number(value) < Number(refreshEarliestSeason)) {
      setRefreshEarliestSeason(value);
    }
  };

  const handleExtractDataset = async () => {
    if (!refreshEarliestSeason || !refreshLatestSeason) {
      return;
    }
    setIsRefreshingDataset(true);
    try {
      const response = await refreshDataset({
        earliest_season: Number(refreshEarliestSeason),
        latest_season: Number(refreshLatestSeason),
      });
      if (response?.status === "ok") {
        await loadTrainOptions();
      }
      setIsRefreshModalOpen(false);
    } catch (e) {
      setTrainError(e.message);
    } finally {
      setIsRefreshingDataset(false);
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
    <AppShell
      sidebar={
        <>
          <div className="sidebar-header">
            <User size={16} />
            Sign In
          </div>
          <nav className="sidebar-route-nav" aria-label="Pages">
            <SidebarRouteItem
              to="/"
              end
              label="Predictor"
              icon={<LoaderPinwheel size={14} />}
            />
            <SidebarRouteItem
              to="/parameters"
              label="Model Parameters"
              icon={<SlidersHorizontal size={14} />}
            />
            <SidebarRouteItem
              to="/info"
              label="Info"
              icon={<CircleHelp size={14} />}
            />
          </nav>
          <div className={`sidebar-panel sidebar-panel-history${sidebarSections.history ? "" : " is-collapsed"}`}>
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
            <div id="sidebar-section-history" className="sidebar-panel-body history">
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
        </>
      }
    >
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              viewMode={viewMode}
              setViewMode={setViewMode}
              positionFilter={positionFilter}
              setPositionFilter={setPositionFilter}
              minPred={minPred}
              setMinPred={setMinPred}
              minDelta={minDelta}
              setMinDelta={setMinDelta}
              sortConfig={sortConfig}
              handleSortSelection={handleSortSelection}
              handleSortToggle={handleSortToggle}
              sortedResults={sortedResults}
              hasOutputs={hasOutputs}
              hasFilteredResults={hasFilteredResults}
              isInitialEmptyState={isInitialEmptyState}
              listBatchPredictions={listBatchPredictions}
              isTraining={isTraining}
              canTrain={canTrain}
              handleLoadLatestBatch={handleLoadLatestBatch}
              handleTrain={handleTrain}
              handleResetFilters={handleResetFilters}
              isRefreshModalOpen={isRefreshModalOpen}
              setIsRefreshModalOpen={setIsRefreshModalOpen}
              isRefreshingDataset={isRefreshingDataset}
              refreshEarliestSeason={refreshEarliestSeason}
              refreshLatestSeason={refreshLatestSeason}
              refreshSeasonOptions={refreshSeasonOptions}
              handleRefreshEarliestChange={handleRefreshEarliestChange}
              handleRefreshLatestChange={handleRefreshLatestChange}
              handleExtractDataset={handleExtractDataset}
            />
          }
        />
        <Route
          path="/parameters"
          element={
            <ParametersPage
              params={params}
              selectedTrainPositions={selectedTrainPositions}
              earliestTrainSeason={earliestTrainSeason}
              maxTrainSeason={maxTrainSeason}
              valSeason={valSeason}
            />
          }
        />
        <Route path="/info" element={<InfoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
