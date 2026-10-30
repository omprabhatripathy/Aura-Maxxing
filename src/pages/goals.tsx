import Card from '../components/Card';
import ProgressRing from '../components/ProgressRing';
import './Goals.css';

interface Goal {
  id: string;
  title: string;
  detail: string;
  progress: number;
}

const goals: Goal[] = [
  { id: '1', title: 'Run a 10k', detail: 'Training block, week 5 of 8.', progress: 62 },
  { id: '2', title: 'Ship side project', detail: 'Design system is done. Build next.', progress: 40 },
  { id: '3', title: 'Read 12 books', detail: '3 finished so far this year.', progress: 25 },
];

export default function Goals() {
  return (
    <div className="goals-page">
      <header>
        <p className="text-label-sm">Feature</p>
        <h1 className="text-headline-lg">Goals</h1>
        <p className="text-body-lg text-muted">
          Longer arcs, tracked quietly in the background.
        </p>
      </header>

      <div className="goals-page__list">
        {goals.map((g) => (
          <Card key={g.id} className="goals-page__card">
            <div className="goals-page__card-row">
              <div>
                <h3 className="text-headline-md">{g.title}</h3>
                <p className="text-muted">{g.detail}</p>
              </div>
              <ProgressRing value={g.progress} size={64} strokeWidth={3} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
