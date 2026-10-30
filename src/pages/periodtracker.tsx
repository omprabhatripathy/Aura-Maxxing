import { useState } from "react";
import Card from "../components/Card";
import "./PeriodTracker.css";

export default function PeriodTracker() {
  const [lastPeriod, setLastPeriod] = useState<string>("");
  const [cycleLength, setCycleLength] = useState<number>(28);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: Save to backend (user profile / tracker collection)
    console.log("Period data:", { lastPeriod, cycleLength });
  }

  return (
    <div className="period">
      <header className="period__header">
        <h1 className="text-headline-lg">Period Tracker</h1>
        <p className="text-body-lg text-muted">
          Track your cycle and predict upcoming dates.
        </p>
      </header>

      <Card eyebrow="Cycle" title="Enter your details" glow>
        <form onSubmit={handleSubmit} className="period__form">
          <label>
            Last period date:
            <input
              type="date"
              value={lastPeriod}
              onChange={(e) => setLastPeriod(e.target.value)}
            />
          </label>
          <label>
            Average cycle length (days):
            <input
              type="number"
              value={cycleLength}
              onChange={(e) => setCycleLength(Number(e.target.value))}
              min={20}
              max={40}
            />
          </label>
          <button type="submit" className="period__button">
            Save
          </button>
        </form>
      </Card>

      <Card eyebrow="Prediction" title="Next cycle">
        {lastPeriod ? (
          <p>
            Based on your last period ({lastPeriod}) and cycle length of{" "}
            {cycleLength} days, your next period is expected around{" "}
            <strong>
              {new Date(
                new Date(lastPeriod).getTime() + cycleLength * 24 * 60 * 60 * 1000
              ).toLocaleDateString()}
            </strong>.
          </p>
        ) : (
          <p>Please enter your last period date to see predictions.</p>
        )}
      </Card>
    </div>
  );
}
