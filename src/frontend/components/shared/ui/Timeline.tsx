import type { ReactNode } from 'react';
import './ui.css';

export interface TimelineItem {
  id: string;
  title: ReactNode;
  time: ReactNode;
}

export default function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ul className="ui-timeline">
      {items.map((item) => (
        <li key={item.id} className="ui-timeline__item">
          <span className="ui-timeline__dot" />
          <div>
            <p className="ui-timeline__title">{item.title}</p>
            <span className="ui-timeline__time">{item.time}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
