import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
import ProgressRing from '../components/ProgressRing';
import HabitChip from '../components/HabitChip';
//import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

import { Radar } from "react-chartjs-2";
import './Home.css';

interface Habit {
  id: string;
  label: string;
  complete: boolean;
}
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);
const initialHabits: Habit[] = [
  { id: '1', label: 'Morning walk', complete: true },
  { id: '2', label: 'Read 20 min', complete: true },
  { id: '3', label: 'Deep work block', complete: false },
  { id: '4', label: 'Hydrate', complete: false },
];

const radarData = {
  labels: ["Mind", "Body", "Social", "Productivity", "Creativity"],
  datasets: [
    {
      label: "Aura Points",
      data: [65, 59, 80, 81, 56], // TODO: fetch from backend
      backgroundColor: "rgba(128, 90, 213, 0.2)",
      borderColor: "rgba(128, 90, 213, 1)",
      borderWidth: 2,
    },
  ],
};

const moods = [
  { label: "Happy", icon: "🌅" },
  { label: "Energetic", icon: "⚡" },
  { label: "Heavy", icon: "☁️" },
  { label: "Grounded", icon: "⛰️" },
  { label: "Lost", icon: "❓" },
  { label: "Sick", icon: "🌡️" },
  { label: "Angry", icon: "🔥" },
  { label: "Burst Out", icon: "🌧️" },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const [habits, setHabits] = useState(initialHabits);

  const completion = useMemo(() => {
    const done = habits.filter((h) => h.complete).length;
    return Math.round((done / habits.length) * 100);
  }, [habits]);

  function toggleHabit(id: string) {
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, complete: !h.complete } : h))
    );
  }

  return (
    <div className="home">
      <header className="home__header">
        <div>
          <p className="text-label-sm">Today</p>
          <h1 className="text-headline-lg">{getGreeting()}.</h1>
          <p className="text-body-lg text-muted">
            Here&apos;s where your day stands.
          </p>
        </div>
        <ProgressRing value={completion} label="Today" />
      </header>

      <section className="home__grid">
        <Card eyebrow="Habits" title="Today's rhythm" className="home__habits-card" glow>
          <div className="home__chips">
            {habits.map((h) => (
              <HabitChip
                key={h.id}
                label={h.label}
                complete={h.complete}
                onToggle={() => toggleHabit(h.id)}
              />
            ))}
          </div>
          <Link to="/habits" className="home__card-link text-label-md">
            View all habits →
          </Link>
        </Card>

        <Card eyebrow="Goals" title="In motion">
          <p>2 goals are on track this month, 1 needs attention.</p>
          <Link to="/goals" className="home__card-link text-label-md">
            Review goals →
          </Link>
        </Card>

        <Card eyebrow="Journal" title="Reflection">
          <p>You last wrote 2 days ago. A short entry keeps the streak alive.</p>
          <Link to="/journal" className="home__card-link text-label-md">
            Write an entry →
          </Link>
        </Card>

        <Card eyebrow="Analytics" title="Aura Radar">
          <Radar data={radarData} />
        </Card>

        <Card eyebrow="Mood" title="How are you feeling today?">
          <div className="home__mood-grid">
            {moods.map(m => (
              <button key={m.label} className="home__mood-button">
                <span className="home__mood-icon">{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
