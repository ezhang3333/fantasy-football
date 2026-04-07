import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  History,
  LoaderPinwheel,
  User,
  SlidersHorizontal,
  CircleHelp,
} from "lucide-react";
import type { ReactNode } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import "./css/App.css";
import NumberFilter from "./NumberFilter.tsx";
import DropdownFilter from "./DropdownFilter.tsx";
import HistoryListItem from "./HistoryListItem.tsx";
import SidebarRouteItem from "./SidebarRouteItem.tsx";
import {
  getBatchPredictions,
  getTrainRangeOptions,
  listBatches,
  trainModel,
} from "./api/prediction.ts";
import { TRAINABLE_POSITIONS } from "./constants.ts";
import AppShell from "./layouts/AppShell.tsx";
import HomePage from "./pages/HomePage.tsx";
import ParametersPage from "./pages/ParametersPage.tsx";
import InfoPage from "./pages/InfoPage.tsx";
import type {
  BatchInfo,
  ModelParamKey,
  ModelParams,
  PlayerPrediction,
  SeasonOption,
  SortConfig,
  TrainPayload,
} from "./types.ts";

const DEFAULT_SIDEBAR_SECTIONS = {
  model: false,
  training: false,
  history: true,
};

type SidebarSections = typeof DEFAULT_SIDEBAR_SECTIONS;

export const DEFAULT_PARAMS: ModelParams = {
  n_estimators: "300",
  learning_rate: "0.1",
  max_depth: "6",
  subsample: "0.8",
  colsample_bytree: "0.8",
  reg_lambda: "1",
  reg_alpha: "0",
};

export default function App() {
  const navigate = useNavigate();
  const [params, setParams] = useState<ModelParams>(DEFAULT_PARAMS);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainError, setTrainError] = useState<string>("");
  const [listBatchPredictions, setListBatchPredictions] = useState<BatchInfo[]>([]);
  const [viewMode, setViewMode] = useState<string>("list");
  const [positionFilter, setPositionFilter] = useState<string>("All");
  const [minPred, setMinPred] = useState<string>("0");
  const [minDelta, setMinDelta] = useState<string>("-30");
  const [modelOutputs, setModelOutputs] = useState<PlayerPrediction[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });
  const [selectedTrainPositions, setSelectedTrainPositions] = useState<string[]>(TRAINABLE_POSITIONS);
  const [availableSeasons, setAvailableSeasons] = useState<string[]>([]);
  const [earliestTrainSeason, setEarliestTrainSeason] = useState<string>("");
  const [maxTrainSeason, setMaxTrainSeason] = useState<string>("");
  const [valSeason, setValSeason] = useState<string>("");
  const [sidebarSections, setSidebarSections] = useState<SidebarSections>(DEFAULT_SIDEBAR_SECTIONS);

  useEffect(() => {
    const loadHistoryListOnStart = async () => {
      try {
        const batches = await listBatches(30);
        setListBatchPredictions(batches);
      } catch (e) {
        throw new Error(`Error on startup: ${(e as Error).message}`);
      }
    };
    loadHistoryListOnStart();
  }, []);

  const seasonOptionsForDropdown = useMemo<SeasonOption[]>(
    () => availableSeasons.map((season) => ({ value: season, label: season })),
    [availableSeasons]
  );
  const maxTrainAllowedSeason =
    availableSeasons.length > 1 ? availableSeasons[availableSeasons.length - 2] : "";

  const earliestTrainOptions: SeasonOption[] =
    availableSeasons.length > 1
      ? seasonOptionsForDropdown.filter((option) => Number(option.value) <= Number(maxTrainAllowedSeason))
      : [{ value: "", label: "No seasons available" }];

  const latestTrainOptions: SeasonOption[] =
    availableSeasons.length > 1 && earliestTrainSeason
      ? seasonOptionsForDropdown
          .filter(
            (option) =>
              Number(option.value) >= Number(earliestTrainSeason) &&
              Number(option.value) <= Number(maxTrainAllowedSeason)
          )
          .reverse()
      : [{ value: "", label: "No seasons available" }];

  const valSeasonOptions: SeasonOption[] =
    availableSeasons.length > 1 && maxTrainSeason
      ? seasonOptionsForDropdown
          .filter((option) => Number(option.value) > Number(maxTrainSeason))
          .reverse()
      : [{ value: "", label: "No seasons available" }];

  const loadTrainOptions = async () => {
    const selectedPositions = selectedTrainPositions.length > 0 ? selectedTrainPositions : undefined;
    const response = await getTrainRangeOptions(selectedPositions);
    const seasons: string[] = Array.isArray(response?.available_seasons)
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

  useEffect(() => {
    loadTrainOptions().catch(() => {
      setAvailableSeasons([]);
      setEarliestTrainSeason("");
      setMaxTrainSeason("");
      setValSeason("");
    });
  }, [selectedTrainPositions]);

  const handleHistoryListItemClick = async (batch_uuid: string) => {
    try {
      setSelectedBatchId(batch_uuid);
      const playerData = await getBatchPredictions(batch_uuid);
      setModelOutputs(playerData);
    } catch (e) {
      throw new Error(`Error when clicking history list item: ${(e as Error).message}`);
    }
  };

  const handleParamChange = (name: ModelParamKey, rawValue: string) => {
    setParams((prev) => ({ ...prev, [name]: rawValue }));
  };

  const handleResetParams = () => {
    setParams(DEFAULT_PARAMS);
  };

  const toggleTrainPosition = (position: string) => {
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

  const handleEarliestTrainSeasonChange = (_name: string, value: string) => {
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

  const handleMaxTrainSeasonChange = (_name: string, value: string) => {
    setMaxTrainSeason(value);
    if (!valSeason || Number(valSeason) <= Number(value)) {
      const highestVal = availableSeasons[availableSeasons.length - 1] ?? "";
      setValSeason(Number(highestVal) > Number(value) ? highestVal : "");
    }
  };

  const handleValSeasonChange = (_name: string, value: string) => {
    setValSeason(value);
  };

  const handleTrain = async () => {
    if (!canTrain) {
      return;
    }

    setIsTraining(true);
    setTrainError("");

    const payload: TrainPayload = {
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
      const batches = await listBatches(30);
      setListBatchPredictions(batches);
      if (batches.length > 0) {
        const newest = batches[0];
        setSelectedBatchId(newest.batch_uuid);
        const playerData = await getBatchPredictions(newest.batch_uuid);
        setModelOutputs(playerData);
        navigate("/");
      }
    } catch (e) {
      setTrainError((e as Error).message);
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
        const key = sortConfig.key as keyof PlayerPrediction;
        const aValue = Number(a[key] ?? 0);
        const bValue = Number(b[key] ?? 0);
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

  const handleSortSelection = (_name: string, value: string) => {
    if (value === "none") {
      setSortConfig({ key: null, direction: null });
      return;
    }
    setSortConfig((prev) => ({
      key: value,
      direction: prev.key === value && prev.direction ? prev.direction : "asc",
    }));
  };

  const handleSortToggle = (key: string) => {
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

  const toggleSidebarSection = (sectionKey: keyof SidebarSections) => {
    setSidebarSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const getChevronForSection = (isOpen: boolean): ReactNode =>
    isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />;

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
              label="Model Info"
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
            />
          }
        />
        <Route
          path="/parameters"
          element={
            <ParametersPage
              params={params}
              handleParamChange={handleParamChange}
              handleResetParams={handleResetParams}
              selectedTrainPositions={selectedTrainPositions}
              toggleTrainPosition={toggleTrainPosition}
              earliestTrainSeason={earliestTrainSeason}
              maxTrainSeason={maxTrainSeason}
              valSeason={valSeason}
              earliestTrainOptions={earliestTrainOptions}
              latestTrainOptions={latestTrainOptions}
              valSeasonOptions={valSeasonOptions}
              handleEarliestTrainSeasonChange={handleEarliestTrainSeasonChange}
              handleMaxTrainSeasonChange={handleMaxTrainSeasonChange}
              handleValSeasonChange={handleValSeasonChange}
            />
          }
        />
        <Route path="/info" element={<InfoPage selectedBatchId={selectedBatchId} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {isTraining && (
        <div className="training-overlay">
          <div className="loading-state">
            <div className="loading-orbit" aria-hidden="true">
              <span className="orbit-ring" />
              <span className="orbit-dot" />
            </div>
            <div className="loading-title">Training your model</div>
            <div className="loading-subtitle">Optimizing features and scoring outputs.</div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
