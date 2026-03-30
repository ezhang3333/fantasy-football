import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as Slider from "@radix-ui/react-slider";
import SelectButton from "../SelectButton.tsx";
import DropdownFilter from "../DropdownFilter.tsx";
import type { DropdownOption } from "../DropdownFilter.tsx";
import { TRAINABLE_POSITIONS } from "../constants.ts";
import type { ModelParams, ModelParamKey } from "../types.ts";
import "../css/HyperParamDetail.css";

interface ParamRange {
  min: number;
  max: number;
  step: number;
}

const PARAM_RANGES: Record<ModelParamKey, ParamRange> = {
  n_estimators:     { min: 10,    max: 2000, step: 10    },
  learning_rate:    { min: 0.001, max: 0.5,  step: 0.001 },
  max_depth:        { min: 1,     max: 20,   step: 1     },
  subsample:        { min: 0.1,   max: 1.0,  step: 0.05  },
  colsample_bytree: { min: 0.1,   max: 1.0,  step: 0.05  },
  reg_lambda:       { min: 0,     max: 10,   step: 0.1   },
  reg_alpha:        { min: 0,     max: 10,   step: 0.1   },
};

const PARAM_LABELS: Record<ModelParamKey, string> = {
  n_estimators: "Estimators",
  learning_rate: "Learning Rate",
  max_depth: "Max Depth",
  subsample: "Subsample",
  colsample_bytree: "Col Sample",
  reg_lambda: "Lambda (L2)",
  reg_alpha: "Alpha (L1)",
};

const PARAM_DESCRIPTIONS: Record<ModelParamKey, string> = {
  n_estimators:     "Number of boosting rounds (trees). More trees = stronger model but slower training. Too many risks overfitting.",
  learning_rate:    "Shrinks the contribution of each tree. Lower = more conservative, requires more trees.",
  max_depth:        "Maximum depth per tree. Deeper trees capture more complex patterns but overfit more easily. 3\u20138 is typical.",
  subsample:        "Fraction of training samples used per tree. Below 1.0 adds randomness to reduce overfitting.",
  colsample_bytree: "Fraction of features sampled per tree. Reduces correlation between trees. 0.6\u20130.9 is common.",
  reg_lambda:       "L2 (ridge) regularization. Higher values shrink weights toward zero, reducing complexity.",
  reg_alpha:        "L1 (lasso) regularization. Higher values push weights to exactly zero for sparse feature selection.",
};

interface ParametersPageProps {
  params: ModelParams;
  handleParamChange: (name: ModelParamKey, value: string) => void;
  selectedTrainPositions: string[];
  toggleTrainPosition: (position: string) => void;
  earliestTrainSeason: string;
  maxTrainSeason: string;
  valSeason: string;
  earliestTrainOptions: DropdownOption[];
  latestTrainOptions: DropdownOption[];
  valSeasonOptions: DropdownOption[];
  handleEarliestTrainSeasonChange: (name: string, value: string) => void;
  handleMaxTrainSeasonChange: (name: string, value: string) => void;
  handleValSeasonChange: (name: string, value: string) => void;
}

export default function ParametersPage({
  params,
  handleParamChange,
  selectedTrainPositions,
  toggleTrainPosition,
  earliestTrainSeason,
  maxTrainSeason,
  valSeason,
  earliestTrainOptions,
  latestTrainOptions,
  valSeasonOptions,
  handleEarliestTrainSeasonChange,
  handleMaxTrainSeasonChange,
  handleValSeasonChange,
}: ParametersPageProps) {
  const paramEntries = Object.entries(params) as [ModelParamKey, string][];
  const [activeParam, setActiveParam] = useState<ModelParamKey | null>(null);

  const handleParamSelect = (key: string) => {
    const paramKey = key as ModelParamKey;
    setActiveParam((prev) => (prev === paramKey ? null : paramKey));
  };

  return (
    <div className="output-container">
      <div>
        <div className="output-title">Model Parameters</div>
        <div className="output-subtitle">Training configuration</div>
      </div>

      <motion.div
        className="page-panel"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="page-panel-title">Positions</div>
        <div className="position-toggle-group">
          {TRAINABLE_POSITIONS.map((pos) => (
            <SelectButton
              key={pos}
              value={pos}
              selected={selectedTrainPositions?.includes(pos)}
              onClick={toggleTrainPosition}
            >
              {pos}
            </SelectButton>
          ))}
        </div>
      </motion.div>

      <motion.div
        className="page-panel"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.06, ease: "easeOut" }}
      >
        <div className="page-panel-title">Season Window</div>
        <div className="season-dropdowns-row">
          <DropdownFilter
            name="earliestTrainSeason"
            label="Earliest Train"
            value={earliestTrainSeason}
            onChange={handleEarliestTrainSeasonChange}
            options={earliestTrainOptions ?? []}
            containerClassName="filter-container season-filter-container"
          />
          <DropdownFilter
            name="maxTrainSeason"
            label="Latest Train"
            value={maxTrainSeason}
            onChange={handleMaxTrainSeasonChange}
            options={latestTrainOptions ?? []}
            containerClassName="filter-container season-filter-container"
          />
          <DropdownFilter
            name="valSeason"
            label="Validation"
            value={valSeason}
            onChange={handleValSeasonChange}
            options={valSeasonOptions ?? []}
            containerClassName="filter-container season-filter-container"
          />
        </div>
      </motion.div>

      <motion.div
        className="page-panel"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.12, ease: "easeOut" }}
      >
        <div className="page-panel-title">Hyperparameters</div>
        <div className="hyperparam-button-group">
          {paramEntries.map(([key, value]) => (
            <button
              key={key}
              type="button"
              className={`hyperparam-chip${activeParam === key ? " is-active" : ""}`}
              onClick={() => handleParamSelect(key)}
              aria-pressed={activeParam === key}
            >
              <span className="hyperparam-chip-label">{PARAM_LABELS[key]}</span>
              <span className="hyperparam-chip-value">{value}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeParam && PARAM_RANGES[activeParam] && (
            <motion.div
              key={activeParam}
              className="hyperparam-detail"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div className="hyperparam-detail-info">
                <span className="hyperparam-detail-description">
                  {PARAM_DESCRIPTIONS[activeParam]}
                </span>
              </div>
              <div className="hyperparam-detail-slider">
                <div className="hyperparam-slider-header">
                  <span className="hyperparam-slider-label">{PARAM_LABELS[activeParam]}</span>
                  <span className="hyperparam-slider-value">{params[activeParam]}</span>
                </div>
                <Slider.Root
                  className="slider-root"
                  value={[Number(params[activeParam])]}
                  min={PARAM_RANGES[activeParam].min}
                  max={PARAM_RANGES[activeParam].max}
                  step={PARAM_RANGES[activeParam].step}
                  onValueChange={([val]) => handleParamChange(activeParam, String(val))}
                >
                  <Slider.Track className="slider-track">
                    <Slider.Range className="slider-range" />
                  </Slider.Track>
                  <Slider.Thumb className="slider-thumb" aria-label={activeParam} />
                </Slider.Root>
                <div className="hyperparam-slider-bounds">
                  <span>{PARAM_RANGES[activeParam].min}</span>
                  <span>{PARAM_RANGES[activeParam].max}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
