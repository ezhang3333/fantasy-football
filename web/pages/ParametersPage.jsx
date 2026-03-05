import { useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import SelectButton from "../SelectButton.jsx";
import { TRAINABLE_POSITIONS } from "../constants.js";
import "../css/HyperParamDetail.css";

const PARAM_RANGES = {
  n_estimators:     { min: 10,    max: 2000, step: 10    },
  learning_rate:    { min: 0.001, max: 0.5,  step: 0.001 },
  max_depth:        { min: 1,     max: 20,   step: 1     },
  subsample:        { min: 0.1,   max: 1.0,  step: 0.05  },
  colsample_bytree: { min: 0.1,   max: 1.0,  step: 0.05  },
  reg_lambda:       { min: 0,     max: 10,   step: 0.1   },
  reg_alpha:        { min: 0,     max: 10,   step: 0.1   },
};

const PARAM_DESCRIPTIONS = {
  n_estimators:     "Number of boosting rounds (trees). More trees = stronger model but slower training. Too many risks overfitting — balance with learning_rate.",
  learning_rate:    "Shrinks the contribution of each tree. Lower = more conservative, requires more trees. Pair with higher n_estimators for best results.",
  max_depth:        "Maximum depth per tree. Deeper trees capture more complex patterns but overfit more easily. Values of 3–8 are typical.",
  subsample:        "Fraction of training samples used per tree. Below 1.0 introduces randomness that reduces overfitting. 0.7–0.9 is a common range.",
  colsample_bytree: "Fraction of features sampled per tree. Reduces correlation between trees. 0.6–0.9 is common for tabular data.",
  reg_lambda:       "L2 (ridge) regularization. Higher values shrink weights toward zero, reducing model complexity and variance.",
  reg_alpha:        "L1 (lasso) regularization. Higher values push weights to exactly zero, useful for sparse feature selection.",
};

export default function ParametersPage({
  params,
  handleParamChange,
  selectedTrainPositions,
  toggleTrainPosition,
  earliestTrainSeason,
  maxTrainSeason,
  valSeason,
}) {
  const paramEntries = Object.entries(params ?? {});
  const [activeParam, setActiveParam] = useState(null);

  const handleParamSelect = (key) =>
    setActiveParam((prev) => (prev === key ? null : key));

  return (
    <div className="output-container">
      <div>
        <div className="output-title">Model Parameters</div>
        <div className="output-subtitle">Current Training Configuration</div>
      </div>
      <div className="page-panel">
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
      </div>
      <div className="page-panel">
        <div className="page-panel-title">Season Window</div>
        <div className="page-panel-copy">
          Earliest train: {earliestTrainSeason || "-"} | Latest train: {maxTrainSeason || "-"} | Validation: {valSeason || "-"}
        </div>
      </div>
      <div className="page-panel">
        <div className="page-panel-title">Hyperparameters</div>
        <div className="hyperparam-button-group">
          {paramEntries.map(([key]) => (
            <SelectButton
              key={key}
              value={key}
              selected={activeParam === key}
              onClick={handleParamSelect}
              buttonClassName="select-button hyperparam-button"
            >
              {key}
            </SelectButton>
          ))}
        </div>
        {activeParam && PARAM_RANGES[activeParam] && (
          <div className="hyperparam-detail">
            <div className="hyperparam-detail-info">
              <span className="hyperparam-detail-description">
                {PARAM_DESCRIPTIONS[activeParam]}
              </span>
            </div>
            <div className="hyperparam-detail-slider">
              <div className="hyperparam-slider-header">
                <span className="hyperparam-slider-label">{activeParam}</span>
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
          </div>
        )}
      </div>
    </div>
  );
}
