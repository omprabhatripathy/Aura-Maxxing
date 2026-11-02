import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Modal } from '../ui';
import { useUserData } from '../../../context/useUserData';
import { ScoreHistoryContext, type ScoreHistoryRequest } from '../../../context/useScoreHistory';
import { habitIcon } from '../../../lib/habitEmoji';
import { MOOD_META } from '../../../icons/moodMeta';
import { AREA_HOW_TO, AREA_LABELS, AREAS, RADAR_RULE } from '../../../../backend/analytics/radar';
import { XP_RULES, activeDays, totalXp, type XpSource } from '../../../../backend/services/progressionService';
import { addDays, formatDate, formatDateTime } from '../../../../backend/core/dates';
import { MOOD_SCORE } from '../../../../backend/models';
import './ScoreHistory.css';

interface Entry {
  id: string;
  icon?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  value: ReactNode;
  tone?: 'up' | 'down' | 'gold' | 'muted';
}

interface Group {
  label: string;
  total?: ReactNode;
  entries: Entry[];
}

interface View {
  eyebrow: string;
  title: string;
  rule: ReactNode;
  summary?: { label: string; value: ReactNode }[];
  groups: Group[];
  empty: string;
}

const MAX_GROUPS = 60;

function groupByDate(entries: (Entry & { date: string; points?: number })[]): Group[] {
  const map = new Map<string, (Entry & { points?: number })[]>();
  for (const e of entries) (map.get(e.date) ?? map.set(e.date, []).get(e.date)!).push(e);
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, MAX_GROUPS)
    .map(([date, list]) => {
      const sum = list.reduce((s, e) => s + (e.points ?? 0), 0);
      return { label: formatDate(date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }), total: sum ? `+${sum}` : undefined, entries: list };
    });
}

function useView(req: ScoreHistoryRequest | null): View | null {
  const data = useUserData();
  const { habits, moodLogs, report, snapshots, today, progression } = data;

  return (() => {
    if (!req) return null;
    switch (req.kind) {
      case 'aura-points': {
        const byId = new Map(habits.map((h) => [h.id, h]));
        const ledger = progression.xp.ledger.filter((e) => !req.habitId || e.habitId === req.habitId);
        const icons: Record<XpSource, string> = {
          habit: '✅',
          'perfect-day': '🌟',
          goal: '🎯',
          journal: '📔',
          mood: '🌈',
          todo: '☑️',
          focus: '🍅',
          schedule: '🗓️',
          weekly: '📅',
          monthly: '🏆',
          badge: '🏅',
        };
        const entries = ledger.map((e) => {
          const h = e.habitId ? byId.get(e.habitId) : undefined;
          return {
            id: e.id,
            date: e.date,
            points: e.xp,
            icon: h ? habitIcon(h) : icons[e.source],
            title: e.label,
            sub: e.detail,
            value: e.xp ? `+${e.xp}` : '0',
            tone: e.xp ? ('gold' as const) : ('muted' as const),
          };
        });
        const total = totalXp(ledger);
        const sumBy = (...sources: XpSource[]) => totalXp(ledger.filter((e) => sources.includes(e.source)));
        const habit = req.habitId ? byId.get(req.habitId) : undefined;
        const { level } = progression;
        return {
          eyebrow: 'Experience (XP)',
          title: habit ? `${habit.label}: ${total} XP` : `Level ${level.level} · ${total.toLocaleString('en-US')} XP`,
          rule: (
            <>
              Habit +{XP_RULES.habit} · all daily habits done +{XP_RULES.perfectDay} · short/long goal +{XP_RULES.goalShort}/+{XP_RULES.goalLong} · journal +{XP_RULES.journal} (detailed +{XP_RULES.journalDetailed}) · mood +{XP_RULES.mood} · task +{XP_RULES.todo} · focus session +{XP_RULES.focus} ·
              6 active days in a week +{XP_RULES.weeklyConsistency} · 25 active days in a month +{XP_RULES.monthlyConsistency}. Repeats in one day earn less, duplicates and instant completions earn nothing —
              consistency beats volume.
            </>
          ),
          summary: habit
            ? [
                { label: 'Completions', value: entries.length },
                { label: 'XP', value: `+${total}` },
              ]
            : [
                { label: 'Today', value: `+${progression.xp.today}` },
                { label: 'Habits', value: `+${sumBy('habit', 'perfect-day')}` },
                { label: 'Consistency', value: `+${sumBy('weekly', 'monthly')}` },
                { label: 'Next level', value: `${(level.nextLevel - level.xp).toLocaleString('en-US')} XP` },
              ],
          groups: groupByDate(entries),
          empty: 'Complete a habit, journal or task to earn your first XP.',
        };
      }

      case 'aura-score': {
        const areaEntries: Entry[] = AREAS.map((a) => {
          const covered = report.current.coverage[a];
          const prev = report.previous.coverage[a] ? report.previous.scores[a] : null;
          const delta = covered && prev !== null ? report.current.scores[a] - prev : null;
          return {
            id: a,
            title: AREA_LABELS[a],
            sub: covered
              ? `Quality ${Math.round(report.current.quality[a] * 100)}% × experience ${Math.round(report.current.maturity[a] * 100)}% — ${AREA_HOW_TO[a]}`
              : `No data yet — ${AREA_HOW_TO[a]}`,
            value: (
              <>
                {covered ? `${report.current.scores[a]}/100` : '—'}
                {delta !== null && delta !== 0 && <small className={delta > 0 ? 'is-up' : 'is-down'}>{delta > 0 ? ` ▲${delta}` : ` ▼${Math.abs(delta)}`}</small>}
              </>
            ),
            tone: covered ? undefined : 'muted',
          };
        });
        const history: Entry[] = snapshots.slice(0, 30).map((s, i, all) => {
          const prev = all[i + 1];
          const delta = prev ? s.overall - prev.overall : 0;
          return {
            id: s.date,
            title: formatDate(s.date, { weekday: 'short', month: 'short', day: 'numeric' }),
            sub: delta ? `${delta > 0 ? '+' : ''}${delta} vs previous snapshot` : 'Daily snapshot',
            value: `${s.overall}/100`,
            tone: delta > 0 ? 'up' : delta < 0 ? 'down' : undefined,
          };
        });
        return {
          eyebrow: 'Aura score',
          title: `${report.overall}/100 overall`,
          rule: RADAR_RULE,
          summary: [
            { label: 'Previous 30 days', value: `${report.previousOverall}/100` },
            { label: 'Change', value: `${report.overall - report.previousOverall >= 0 ? '+' : ''}${report.overall - report.previousOverall}` },
            { label: 'Areas tracked', value: `${AREAS.filter((a) => report.current.coverage[a]).length}/${AREAS.length}` },
          ],
          groups: [
            { label: 'Where it comes from', entries: areaEntries },
            ...(history.length ? [{ label: 'Score history', entries: history }] : []),
          ],
          empty: 'Log habits, moods and journal entries to build your score.',
        };
      }

      case 'streak': {
        const days = activeDays(data);
        const { streaks } = report;
        const entries: Entry[] = Array.from({ length: 30 }, (_, i) => addDays(today, -i)).map((d) => {
          const active = days.has(d);
          return {
            id: d,
            icon: active ? '🔥' : '·',
            title: formatDate(d, { weekday: 'short', month: 'short', day: 'numeric' }),
            sub: active ? 'Active day' : d === today ? 'Not yet — any meaningful action keeps the streak' : 'Missed day',
            value: active ? '+1 day' : '—',
            tone: active ? 'gold' : 'muted',
          };
        });
        const streakRows: Entry[] = [
          { id: 'activity', icon: '🔥', title: 'Daily activity', sub: `Any habit, journal, mood, task, focus session or milestone · best ${streaks.activity.longest} d${streaks.activity.shieldUsed ? ' · streak shield used this week' : ''}`, value: `${streaks.activity.current} d`, tone: 'gold' },
          { id: 'habit', icon: '✅', title: 'Habit streak', sub: `${streaks.habit.habitLabel ? `Best running habit: ${streaks.habit.habitLabel}` : 'No habit streak yet'} · best ${streaks.habit.longest}`, value: `${streaks.habit.current}` },
          { id: 'goal', icon: '🎯', title: 'Goal streak', sub: `Weeks in a row with goal progress · best ${streaks.goal.longest} wk`, value: `${streaks.goal.current} wk` },
          { id: 'journal', icon: '📔', title: 'Journal streak', sub: `Days in a row writing · best ${streaks.journal.longest} d`, value: `${streaks.journal.current} d` },
        ];
        return {
          eyebrow: 'Streaks',
          title: `${streaks.activity.current}-day activity streak`,
          rule: 'Any meaningful action keeps your daily streak alive, and one missed day per week is forgiven by a streak shield. Habit, goal and journal streaks are tracked separately.',
          summary: [
            { label: 'Current', value: `${streaks.activity.current} d` },
            { label: 'Best', value: `${streaks.activity.longest} d` },
            { label: 'Active days', value: days.size },
          ],
          groups: [
            { label: 'Your streaks', entries: streakRows },
            { label: 'Last 30 days', entries },
          ],
          empty: 'Do anything meaningful today to start a streak.',
        };
      }

      case 'wellbeing': {
        const from = addDays(today, -13);
        const recent = moodLogs.filter((m) => m.date >= from);
        const entries = recent.map((m) => ({
          id: m.id,
          date: m.date,
          icon: (() => {
            const Icon = MOOD_META[m.mood].Icon;
            return <Icon size={22} aria-hidden="true" />;
          })(),
          title: MOOD_META[m.mood].label,
          sub: `${formatDateTime(m.createdAt)}${m.source === 'journal' ? ' · from journal' : ''}${m.note ? ` · ${m.note}` : ''}`,
          value: `${MOOD_SCORE[m.mood] * 10}/100`,
          tone: MOOD_SCORE[m.mood] >= 7 ? ('up' as const) : MOOD_SCORE[m.mood] <= 3 ? ('down' as const) : undefined,
        }));
        return {
          eyebrow: 'Wellbeing',
          title: report.wellbeing === null ? 'No wellbeing score yet' : `${report.wellbeing}/100 wellbeing`,
          rule: 'Average of every mood check-in and journal mood from the last 14 days (happy 90 … stressed 20).',
          summary: [
            { label: 'Check-ins (14d)', value: recent.length },
            { label: 'All time', value: moodLogs.length },
          ],
          groups: groupByDate(entries).map((g) => ({ ...g, total: undefined })),
          empty: 'Log your mood to build a wellbeing score.',
        };
      }

    }
  })();
}

/** Hosts the score-history modal; any scoreboard can open it via useScoreHistory(). */
export default function ScoreHistoryProvider({ children }: { children: ReactNode }) {
  const [req, setReq] = useState<ScoreHistoryRequest | null>(null);
  const view = useView(req);
  const close = () => setReq(null);

  return (
    <ScoreHistoryContext.Provider value={setReq}>
      {children}
      {view && (
        <Modal eyebrow={view.eyebrow} title={view.title} size="md" onClose={close} actions={<Button onClick={close}>Close</Button>}>
          <p className="score-history__rule">{view.rule}</p>
          {view.summary && (
            <dl className="score-history__summary">
              {view.summary.map((s) => (
                <div key={s.label}>
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {view.groups.every((g) => g.entries.length === 0) ? (
            <p className="score-history__empty">{view.empty}</p>
          ) : (
            <div className="score-history__groups">
              {view.groups.map((g) => (
                <section key={g.label} className="score-history__group">
                  <header>
                    <h4>{g.label}</h4>
                    {g.total && <span>{g.total}</span>}
                  </header>
                  <ol>
                    {g.entries.map((e) => (
                      <li key={e.id} className={e.tone ? `is-${e.tone}` : ''}>
                        {e.icon !== undefined && <span className="score-history__icon">{e.icon}</span>}
                        <div className="score-history__text">
                          <strong>{e.title}</strong>
                          {e.sub && <span>{e.sub}</span>}
                        </div>
                        <span className="score-history__value">{e.value}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </Modal>
      )}
    </ScoreHistoryContext.Provider>
  );
}
