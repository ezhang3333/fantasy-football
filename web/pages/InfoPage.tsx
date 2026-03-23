export default function InfoPage() {
  return (
    <div className="output-container info-page-scroll">
      <div className="output-title">Project Info</div>
      <div className="output-subtitle">Fantasy Football Predictor</div>

      <div className="page-panel">
        <div className="page-panel-title">What This App Does</div>
        <div className="page-panel-copy">
          This app uses historical NFL data and machine learning to predict how many fantasy points a
          player is likely to score over the next four weeks. Separate prediction models are trained
          for each position — QB, RB, WR, and TE — so that each model learns patterns specific to
          how that position scores.
        </div>
      </div>

      <div className="page-panel">
        <div className="page-panel-title">How We Collect the Data</div>
        <div className="page-panel-copy">
          The dataset is assembled from two sources that are combined into a single week-by-week
          record for every active skill-position player going back to 2016.
          <br />
          <br />
          <strong>NFL Play-by-Play &amp; Roster Data (nflverse)</strong>
          <br />
          The bulk of the data comes from the open-source nflverse project, which publishes
          regularly updated NFL datasets. We pull:
          <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: "1.8" }}>
            <li>
              <strong>Weekly player stats</strong> — passing yards, completions, rushing yards,
              targets, receptions, receiving yards, touchdowns, fumbles, fantasy points, and more.
            </li>
            <li>
              <strong>Next Gen Stats</strong> — advanced tracking data such as average separation
              from defenders, time to throw, air yards, and yards after contact that go beyond the
              traditional box score.
            </li>
            <li>
              <strong>Fantasy opportunity data</strong> — how many passing/rushing/receiving
              opportunities a player received compared to what was statistically expected, revealing
              how much of a role they play in their offense.
            </li>
            <li>
              <strong>Snap counts</strong> — the percentage of offensive plays a player was on the
              field, a strong indicator of their involvement.
            </li>
            <li>
              <strong>Roster &amp; player info</strong> — experience level, draft round, team, and
              active roster status.
            </li>
            <li>
              <strong>Game schedules</strong> — game location, weather conditions (temp, wind,
              roof), and Vegas spread lines.
            </li>
          </ul>
          <br />
          <strong>Defensive Matchup Data (Pro Football Reference)</strong>
          <br />
          A player's performance also depends on who they are playing against. We scrape Pro
          Football Reference to get how many fantasy points each NFL defense has allowed to each
          position throughout the season. This tells the model whether a player is facing a
          weak or strong defense at their position.
          <br />
          <br />
          All of this data is merged together on a per-player, per-week basis, cleaned, and
          engineered into the feature set the model trains on.
        </div>
      </div>

      <div className="page-panel">
        <div className="page-panel-title">What the Model is Predicting</div>
        <div className="page-panel-copy">
          The target variable — the thing each model is trying to predict — is a player's{" "}
          <strong>average PPR fantasy points over the next four weeks</strong> from any given week.
          Using a four-week average rather than a single week smooths out the noise that comes with
          individual games (a fluky touchdown, a garbage-time stat line, etc.) and gives a better
          picture of a player's expected near-term value.
          <br />
          <br />
          Alongside the raw prediction, the app also computes a <strong>delta</strong> — the
          difference between the model's projected output and the player's previous five-week
          average. A positive delta flags players the model expects to outperform their recent
          baseline, which can surface breakout candidates.
        </div>
      </div>

      <div className="page-panel">
        <div className="page-panel-title">The Model: XGBoost Gradient Boosted Trees</div>
        <div className="page-panel-copy">
          We use a machine learning model called <strong>XGBoost</strong>, which is a type of
          gradient boosted decision tree. Here is what that means in plain terms.
          <br />
          <br />
          <strong>Decision Trees</strong>
          <br />
          A decision tree is essentially a flowchart of yes/no questions about a player's stats.
          For example: "Did this running back have more than 15 carries last week? If yes, go left.
          If no, go right." It keeps branching until it reaches a prediction at the end. A single
          tree is fast but not very accurate on its own — it tends to oversimplify patterns in the
          data.
          <br />
          <br />
          <strong>Gradient Boosting</strong>
          <br />
          Gradient boosting solves this by building hundreds or thousands of small, shallow trees
          one after another. Each new tree focuses specifically on the mistakes the previous trees
          made — it looks at which players were predicted poorly and tries to correct those errors.
          The final prediction is the combined output of all those trees added together, with each
          tree contributing only a small amount. This "wisdom of the crowd" approach produces a
          much more accurate model than any single tree could on its own.
          <br />
          <br />
          The word "gradient" refers to the mathematical technique used to figure out how to
          correct errors each round — the model uses calculus to point each new tree in the
          direction that reduces prediction error the most.
          <br />
          <br />
          <strong>Why XGBoost for Fantasy Football?</strong>
          <br />
          XGBoost is a particularly well-suited choice for this kind of problem because:
          <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: "1.8" }}>
            <li>
              It handles dozens of different types of stats at once without needing them all to be
              on the same scale.
            </li>
            <li>
              It deals gracefully with missing data, which is common when players miss games or when
              certain stats are not tracked for a position.
            </li>
            <li>
              It captures non-linear relationships — for example, that a slight increase in snap
              count matters a lot more when a player already has a high target share.
            </li>
            <li>
              It is less likely to overfit (memorize the training data without generalizing) compared
              to deeper neural network approaches, which matters when working with a relatively small
              number of NFL seasons.
            </li>
          </ul>
        </div>
      </div>

      <div className="page-panel">
        <div className="page-panel-title">Training &amp; Validation</div>
        <div className="page-panel-copy">
          The model is trained using a <strong>time-based split</strong>: you select which seasons
          to train on and which single season to hold out as a validation set. The validation season
          must always be more recent than the training seasons — this mimics the real-world
          scenario of predicting a future season from past data and prevents the model from
          accidentally learning from the future.
          <br />
          <br />
          After training, the model is evaluated on the held-out validation season using three
          metrics: <strong>MAE</strong> (mean absolute error — how many fantasy points off the
          prediction is on average), <strong>RMSE</strong> (similar but penalizes large errors
          more heavily), and <strong>R²</strong> (how much of the variation in fantasy scores the
          model explains, from 0 to 1).
        </div>
      </div>

      <div className="page-panel">
        <div className="page-panel-title">How to Use This App</div>
        <div className="page-panel-copy">
          1. Go to the <strong>Parameters</strong> page to configure your training season range,
          validation season, and XGBoost hyperparameters.
          <br />
          2. Click <strong>Train</strong> to run the pipeline and generate predictions for the most
          recent week in the dataset.
          <br />
          3. Return to the <strong>Home</strong> page to browse and filter the scored player
          rankings, sorted by projected output or delta.
        </div>
      </div>
    </div>
  );
}
