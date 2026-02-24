export default function InfoPage() {
  return (
    <div className="output-container">
      <div className="output-title">Project Info</div>
      <div className="output-subtitle">Fantasy Football Predictor</div>
      <div className="page-panel">
        <div className="page-panel-title">What This App Does</div>
        <div className="page-panel-copy">
          Trains per-position gradient-boosted tree models and scores players for projected next 4-week fantasy performance.
        </div>
      </div>
      <div className="page-panel">
        <div className="page-panel-title">Workflow</div>
        <div className="page-panel-copy">
          1. Choose model and training settings in the sidebar.
          <br />
          2. Train a batch and review outputs from history.
          <br />
          3. Filter and sort predictions on the main dashboard.
        </div>
      </div>
      <div className="page-panel">
        <div className="page-panel-title">Routing</div>
        <div className="page-panel-copy">
          This frontend now supports browser routes: /, /parameters, and /info.
        </div>
      </div>
    </div>
  );
}
