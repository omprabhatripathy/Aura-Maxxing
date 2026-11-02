import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import IconButton from '../ui/IconButton';
import { addDays, formatDate, fromIso, toIso } from '../../../../backend/core/dates';
import { FLOW_LEVEL, type DailyLog } from '../../../../backend/period/types';
import './period.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface PeriodCalendarProps {
  today: string;
  selected: string;
  onSelect: (date: string) => void;
  onOpen: (date: string) => void;
  logsByDate: Map<string, DailyLog>;
  predicted: Set<string>;
  fertile: Set<string>;
  ovulation: Set<string>;
}

function describe(date: string, log: DailyLog | undefined, flags: { predicted: boolean; fertile: boolean; ovulation: boolean; today: boolean }): string {
  const parts = [formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })];
  if (flags.today) parts.push('today');
  if (log?.period?.isPeriodDay) parts.push(`period day, ${log.period.flow} flow`);
  else if (flags.predicted) parts.push('predicted period (estimate)');
  if (flags.ovulation) parts.push('estimated ovulation');
  else if (flags.fertile) parts.push('estimated fertile window');
  if (log && (log.moods.length || log.symptoms.length || log.notes)) parts.push('has logged entries');
  return parts.join(', ');
}

export default function PeriodCalendar({ today, selected, onSelect, onOpen, logsByDate, predicted, fertile, ovulation }: PeriodCalendarProps) {
  const [month, setMonth] = useState(() => selected.slice(0, 7));
  const [prevSelected, setPrevSelected] = useState(selected);
  const gridRef = useRef<HTMLDivElement>(null);

  // Follow the selected date into its month (adjusting state during render, per React docs).
  if (selected !== prevSelected) {
    setPrevSelected(selected);
    setMonth(selected.slice(0, 7));
  }

  const cells = useMemo(() => {
    const first = fromIso(`${month}-01`);
    const start = addDays(toIso(first), -first.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [month]);

  function shiftMonth(delta: number) {
    const d = fromIso(`${month}-01`);
    d.setMonth(d.getMonth() + delta);
    setMonth(toIso(d).slice(0, 7));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    onSelect(addDays(selected, step));
  }

  useEffect(() => {
    if (gridRef.current?.contains(document.activeElement)) {
      gridRef.current.querySelector<HTMLButtonElement>(`[data-date="${selected}"]`)?.focus();
    }
  }, [selected, month]);

  const monthLabel = fromIso(`${month}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="period-cal">
      <div className="period-cal__nav">
        <IconButton label="Previous month" onClick={() => shiftMonth(-1)}>
          ‹
        </IconButton>
        <h3 className="period-cal__month" aria-live="polite">
          {monthLabel}
        </h3>
        <IconButton label="Next month" onClick={() => shiftMonth(1)}>
          ›
        </IconButton>
      </div>

      <div className="period-cal__weekdays" aria-hidden="true">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="period-cal__grid" ref={gridRef} role="grid" aria-label={`Cycle calendar, ${monthLabel}`} onKeyDown={handleKeyDown}>
        {cells.map((date) => {
          const log = logsByDate.get(date);
          const isPeriod = Boolean(log?.period?.isPeriodDay);
          const flags = {
            predicted: !isPeriod && predicted.has(date),
            fertile: fertile.has(date),
            ovulation: ovulation.has(date),
            today: date === today,
          };
          const hasEntries = Boolean(log && (log.moods.length || log.symptoms.length || log.notes || log.energyLevel || log.stressLevel));
          const classes = [
            'period-cal__day',
            date.slice(0, 7) !== month && 'period-cal__day--outside',
            isPeriod && `period-cal__day--period period-cal__day--flow-${FLOW_LEVEL[log!.period!.flow]}`,
            flags.predicted && 'period-cal__day--predicted',
            !isPeriod && flags.fertile && 'period-cal__day--fertile',
            flags.ovulation && 'period-cal__day--ovulation',
            flags.today && 'period-cal__day--today',
            date === selected && 'period-cal__day--selected',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={date}
              type="button"
              role="gridcell"
              data-date={date}
              tabIndex={date === selected ? 0 : -1}
              aria-selected={date === selected}
              aria-label={describe(date, log, flags)}
              className={classes}
              onClick={() => {
                onSelect(date);
                onOpen(date);
              }}
            >
              <span>{fromIso(date).getDate()}</span>
              {hasEntries && <span className="period-cal__dot" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <ul className="period-cal__legend">
        <li><span className="period-cal__swatch period-cal__swatch--period" /> Logged period</li>
        <li><span className="period-cal__swatch period-cal__swatch--predicted" /> Predicted period (estimate)</li>
        <li><span className="period-cal__swatch period-cal__swatch--fertile" /> Fertile window (estimate)</li>
        <li><span className="period-cal__swatch period-cal__swatch--ovulation" /> Ovulation (estimate)</li>
        <li><span className="period-cal__dot period-cal__dot--legend" /> Mood / symptoms logged</li>
      </ul>
    </div>
  );
}
