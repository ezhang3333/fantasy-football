export default function ParametersPage({ params, selectedTrainPositions, earliestTrainSeason, maxTrainSeason, valSeason }) {
  const paramEntries = Object.entries(params ?? {});

  return (
    <div className="output-container">
      <div className="output-title">Model Parameters</div>
      <div className="output-subtitle">Current Training Configuration</div>
      <div className="page-panel">
        <div className="page-panel-title">Positions</div>
        <div className="page-panel-copy">{selectedTrainPositions?.length ? selectedTrainPositions.join(", ") : "None selected"}</div>
      </div>
      <div className="page-panel">
        <div className="page-panel-title">Season Window</div>
        <div className="page-panel-copy">
          Earliest train: {earliestTrainSeason || "-"} | Latest train: {maxTrainSeason || "-"} | Validation: {valSeason || "-"}
        </div>
      </div>
      <div className="page-panel">
        <div className="page-panel-title">Hyperparameters</div>
        <div className="params-grid">
          {paramEntries.map(([key, value]) => (
            <div className="param-item" key={key}>
              <div className="param-key">{key}</div>
              <div className="param-value">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
