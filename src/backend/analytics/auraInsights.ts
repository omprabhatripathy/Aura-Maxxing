/**
 * Aura insights: per-area breakdown, plain-language explanations, ranked recommendations, a health summary,
 * historical trends and benchmarks. Everything is derived from `calculateRadarScore`, so it always matches the radar.
 */
import { addDays, formatDate, fromIso, toIso } from '../core/dates';
import type { RadarScores } from '../models';
import { groupLogs, type LogsByHabit } from './habits';
import { activeDays, AREAS, auraScore, calculateRadarScore, type RadarResult, type UserDataSet } from '../services/progressionService';
import { AREA_HOW_TO, AREA_LABELS, type AnalyticsReport } from './radar';
import type { RadarFactor } from './factors';

type Area = keyof RadarScores;
export type Trend = 'up' | 'down' | 'flat';

/** Points of change (over 30 days) below which an area counts as unchanged. */
const FLAT_THRESHOLD = 3;

export interface AreaBreakdown {
  area: Area;
  label: string;
  covered: boolean;
  current: number;
  previous: number | null;
  delta: number | null;
  /** Change vs. 30 days ago in %, one decimal; null without a non-zero baseline. */
  changePct: number | null;
  trend: Trend;
  /** True when the last 15 days moved faster (upwards) than the 15 before. */
  accelerating: boolean;
  reason: string;
  factors: RadarFactor[];
  quality: number;
  maturity: number;
  evidenceDays: number;
}

export interface Recommendation {
  area: Area;
  factorKey: string;
  title: string;
  text: string;
  /** Estimated points this area could gain if the factor were maxed out (at today's experience level). */
  gain: number;
}

export interface AuraInsights {
  breakdown: AreaBreakdown[];
  recommendations: Recommendation[];
  summary: string[];
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const listJoin = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Why an area scores what it does, from its strongest and weakest factors plus its experience level. */
export function explainArea(area: Area, result: RadarResult): string {
  if (!result.coverage[area]) return `No data yet. ${AREA_HOW_TO[area]}`;
  const present = result.factors[area].filter((f) => f.value !== null).sort((a, b) => (b.value as number) - (a.value as number));
  const strong = present.filter((f) => (f.value as number) >= 0.7).slice(0, 2);
  const shown = strong.length ? strong : present.slice(0, 1);
  const weak = present.filter((f) => (f.value as number) < 0.4 && !shown.includes(f)).slice(-2).reverse();
  const parts: string[] = [];
  if (strong.length) parts.push(`Strong ${listJoin(strong.map((f) => `${lower(f.label)}${f.detail ? ` (${f.detail})` : ''}`))}.`);
  else if (present.length) parts.push(`Best factor so far: ${lower(present[0].label)}${present[0].detail ? ` (${present[0].detail})` : ''}.`);
  if (weak.length) parts.push(`Held back by ${listJoin(weak.map((f) => `${lower(f.label)}${f.detail ? ` (${f.detail})` : ''}`))}.`);
  const m = result.maturity[area];
  if (m < 0.6) parts.push(`Only ${plural(result.evidenceDays[area], 'active day')} in the last 90, so experience caps the score at ${Math.round(m * 100)}% of its quality — it rises as your history builds.`);
  return parts.join(' ');
}

/** Extra sessions per week toward the target, capped so the advice stays achievable. */
const perWeek = (f: RadarFactor) => Math.min(5, Math.max(1, Math.ceil(((f.target ?? 0) - (f.current ?? 0)) / 4.3)));

/** Concrete next step for each factor (falls back to the area's how-to text). */
const ACTIONS: Record<string, (f: RadarFactor) => string> = {
  'focus.sessions': (f) => `Complete ${plural(perWeek(f), 'additional Pomodoro session')} per week (${f.current ?? 0}/${f.target} in the last 30 days).`,
  'focus.length': (f) => `Switch to Deep Work (50/10) sessions — your average is ${f.current ?? 0} min and 50-minute sessions max this factor out.`,
  'focus.consistency': (f) => `Focus on more days: aim for at least 5 days a week (${f.current ?? 0} of ${f.target} days so far).`,
  'focus.deepWork': () => 'Block two 50-minute deep-work sessions in your Daily Schedule each week.',
  'focus.calm': () => 'Silence notifications during sessions — distraction-free sessions in a row lift this factor.',
  'discipline.habits': (f) => `Complete your habits on schedule — completion is ${f.detail ? lower(f.detail) : 'low'}. Archive habits you no longer want so they stop counting as missed.`,
  'discipline.streak': (f) => `Do at least one meaningful action every day to grow your streak (${f.current ?? 0} of ${f.target} days).`,
  'discipline.weekly': (f) => `Be active at least 6 days a week (currently ${f.current ?? 0}).`,
  'growth.goalsDone': () => 'Finish a goal: split one into milestones you can close this month.',
  'growth.goalProgress': () => 'Log progress on your open goals at least once a week.',
  'growth.learning': () => 'Add or keep a learning habit such as reading or a course, and tick it off on schedule.',
  'growth.productivity': () => 'Keep your productivity habits going on schedule.',
  'growth.reflection': (f) => `Journal about 3 times a week (${f.current ?? 0} of ${f.target} days this month).`,
  'wellness.health': () => 'Complete your health habits (sleep, exercise, water) on schedule.',
  'wellness.moodTracking': (f) => `Check in on your mood most days (${f.current ?? 0} of ${f.target} days this month).`,
  'wellness.moodLevel': () => 'Your mood has been low — prioritise sleep, movement and time with people you like.',
  'wellness.checkIns': (f) => `Log a mood or health habit every day (${f.current ?? 0} of 14 recent days).`,
  'wellness.social': () => 'Keep your social habits (calls, meet-ups) going on schedule.',
  'mindfulness.journalFreq': (f) => `Journal on more days (${f.current ?? 0} of ${f.target} this month).`,
  'mindfulness.journalDepth': (f) => `Write longer reflections — about 150 words per entry (currently ${f.current ?? 0}).`,
  'mindfulness.gratitude': () => 'Write about something you are grateful for twice a week.',
  'mindfulness.moodAwareness': () => 'Log your mood daily to build awareness.',
  'mindfulness.mindset': () => 'Keep your mindset habits (meditation, affirmations) going on schedule.',
  'finance.savings': (f) => (f.current === undefined ? 'Log your income so your savings rate can be measured.' : `Save at least 20% of your income (currently ${f.current}%).`),
  'finance.budget': (f) => (f.value === null ? 'Set a monthly budget and category limits in Expenses.' : 'Stay within your monthly budget and category limits.'),
  'finance.tracking': (f) => `Log expenses on more days (${f.current ?? 0} of ${f.target} so far).`,
  'finance.goals': (f) => (f.value === null ? 'Create a saving goal in Expenses.' : 'Add money to your saving goals.'),
};

/** Recommendations ranked by how many points they could add; at most one per area. */
export function recommendations(report: AnalyticsReport, limit = 4): Recommendation[] {
  const { current } = report;
  const strongest = report.strongest;
  const out: Recommendation[] = [];
  for (const area of AREAS) {
    const label = AREA_LABELS[area];
    if (!current.coverage[area]) {
      out.push({ area, factorKey: 'start', title: `Start tracking ${label}`, text: AREA_HOW_TO[area], gain: 0 });
      continue;
    }
    const factors = current.factors[area];
    const present = factors.filter((f) => f.value !== null);
    const totalWeight = present.reduce((s, f) => s + f.weight, 0);
    const scored = present.map((f) => ({ f, gain: Math.round(100 * current.maturity[area] * (f.weight / totalWeight) * (1 - (f.value as number))) }));
    const best = scored.sort((a, b) => b.gain - a.gain)[0];
    if (!best || best.gain < 1) continue;
    const action = ACTIONS[`${area}.${best.f.key}`]?.(best.f) ?? AREA_HOW_TO[area];
    const title =
      strongest && strongest !== area && current.scores[area] < current.scores[strongest]
        ? `${label} (${current.scores[area]}) is lower than ${AREA_LABELS[strongest]} (${current.scores[strongest]})`
        : `${label}: improve ${lower(best.f.label)}`;
    out.push({ area, factorKey: best.f.key, title, text: action, gain: best.gain });
  }
  // Untracked areas go last: they can't be quantified until there is data.
  return out.sort((a, b) => (a.gain === 0 ? 1 : 0) - (b.gain === 0 ? 1 : 0) || b.gain - a.gain).slice(0, limit);
}

export function areaBreakdown(report: AnalyticsReport, midpoint: RadarResult): AreaBreakdown[] {
  const { current, previous } = report;
  return AREAS.map((area) => {
    const covered = current.coverage[area];
    const prevCovered = previous.coverage[area];
    const cur = current.scores[area];
    const prev = prevCovered ? previous.scores[area] : null;
    const delta = covered && prev !== null ? cur - prev : null;
    const changePct = delta !== null && prev ? Math.round((delta / prev) * 1000) / 10 : null;
    const trend: Trend = delta === null || Math.abs(delta) < FLAT_THRESHOLD ? (covered && prev === null && cur > 0 ? 'up' : 'flat') : delta > 0 ? 'up' : 'down';
    const mid = midpoint.coverage[area] ? midpoint.scores[area] : null;
    const recent = mid === null ? null : cur - mid;
    const earlier = mid === null || prev === null ? null : mid - prev;
    return {
      area,
      label: AREA_LABELS[area],
      covered,
      current: cur,
      previous: prev,
      delta,
      changePct,
      trend,
      accelerating: recent !== null && earlier !== null && recent > 0 && recent > earlier + 2,
      reason: explainArea(area, current),
      factors: current.factors[area],
      quality: current.quality[area],
      maturity: current.maturity[area],
      evidenceDays: current.evidenceDays[area],
    };
  });
}

/** Human-readable summary of the radar's overall health. */
export function healthSummary(report: AnalyticsReport, breakdown: AreaBreakdown[]): string[] {
  const lines: string[] = [];
  const covered = breakdown.filter((b) => b.covered);
  if (!covered.length) return ['Start logging habits, moods, focus sessions or expenses — your Aura appears as soon as there is data.'];
  const overallDelta = report.overall - report.previousOverall;
  lines.push(`Your overall Aura is ${report.overall}/100${overallDelta ? `, ${overallDelta > 0 ? 'up' : 'down'} ${Math.abs(overallDelta)} from 30 days ago` : ', unchanged from 30 days ago'}.`);
  if (report.strongest) lines.push(`Your strongest area is ${AREA_LABELS[report.strongest]} (${report.current.scores[report.strongest]}).`);
  for (const b of covered) {
    if (b.trend === 'up' && b.accelerating) lines.push(`${b.label} is accelerating${b.delta !== null ? ` (+${b.delta} in 30 days, most of it in the last two weeks)` : ''}.`);
    else if (b.trend === 'up') lines.push(b.previous === null ? `${b.label} is new on your radar and climbing.` : `${b.label} is improving steadily (+${b.delta}).`);
    else if (b.trend === 'down') lines.push(`${b.label} is slipping (${b.delta} over 30 days). ${AREA_HOW_TO[b.area]}`);
  }
  const flat = covered.filter((b) => b.trend === 'flat').map((b) => b.label);
  if (flat.length) lines.push(`${listJoin(flat)} ${flat.length === 1 ? 'has' : 'have'} remained unchanged.`);
  if (report.weakest && report.weakest !== report.strongest) lines.push(`${AREA_LABELS[report.weakest]} has the most room to grow (${report.current.scores[report.weakest]}).`);
  const scores = covered.map((b) => b.current);
  if (covered.length >= 3 && Math.max(...scores) - Math.min(...scores) >= 40) lines.push('Your Aura is lopsided — lifting your weakest areas raises the overall score faster than pushing your best one.');
  const missing = breakdown.filter((b) => !b.covered).map((b) => b.label);
  if (missing.length) lines.push(`${listJoin(missing)} ${missing.length === 1 ? 'has' : 'have'} no data yet; a balanced Aura needs every area.`);
  return lines;
}

export function buildAuraInsights(data: UserDataSet, today: string, report: AnalyticsReport, logs: LogsByHabit = groupLogs(data.habitLogs)): AuraInsights {
  const midpoint = calculateRadarScore(data, addDays(today, -15), logs);
  const breakdown = areaBreakdown(report, midpoint);
  return { breakdown, recommendations: recommendations(report), summary: healthSummary(report, breakdown) };
}

/* ================================================================ TRENDS ================================================================ */

export type TrendPeriod = 'week' | 'month' | 'year';

export interface TrendPoint {
  date: string;
  label: string;
  overall: number;
  scores: RadarScores;
  coverage: Record<Area, boolean>;
}

const POINTS: Record<TrendPeriod, number> = { week: 12, month: 12, year: 5 };

function sampleDates(today: string, period: TrendPeriod): string[] {
  const n = POINTS[period];
  const t = fromIso(today);
  return Array.from({ length: n }, (_, k) => {
    const i = n - 1 - k;
    if (period === 'week') return addDays(today, -7 * i);
    const end = period === 'month' ? new Date(t.getFullYear(), t.getMonth() - i + 1, 0) : new Date(t.getFullYear() - i, 11, 31);
    const iso = toIso(end);
    return iso > today ? today : iso;
  });
}

const pointLabel = (date: string, period: TrendPeriod) =>
  period === 'week' ? formatDate(date) : period === 'month' ? formatDate(date, { month: 'short', year: '2-digit' }) : date.slice(0, 4);

/** Aura at the end of each week / month / year, from the first active day onwards (oldest first). */
export function auraTrend(data: UserDataSet, today: string, period: TrendPeriod, logs: LogsByHabit = groupLogs(data.habitLogs)): TrendPoint[] {
  const first = [...activeDays(data)].sort()[0] ?? today;
  const dates = sampleDates(today, period);
  // Keep the period that contains the first active day so a new user still sees a starting point.
  const startIdx = Math.max(0, dates.findIndex((d) => d >= first));
  return dates.slice(startIdx).map((date) => {
    const r = calculateRadarScore(data, date, logs);
    return { date, label: pointLabel(date, period), overall: auraScore(r), scores: r.scores, coverage: r.coverage };
  });
}

/** The month-end (before the current month) with the highest overall Aura, if any. */
export function bestMonth(monthly: TrendPoint[]): TrendPoint | null {
  const past = monthly.slice(0, -1).filter((p) => p.overall > 0);
  return past.length ? past.reduce((best, p) => (p.overall > best.overall ? p : best)) : null;
}

/** Change between the last two points of a trend (overall and per area). */
export function compareLastPeriods(points: TrendPoint[]): { overall: number; areas: Record<Area, number | null> } | null {
  if (points.length < 2) return null;
  const [prev, cur] = points.slice(-2);
  const areas = {} as Record<Area, number | null>;
  AREAS.forEach((a) => (areas[a] = cur.coverage[a] && prev.coverage[a] ? cur.scores[a] - prev.scores[a] : null));
  return { overall: cur.overall - prev.overall, areas };
}
