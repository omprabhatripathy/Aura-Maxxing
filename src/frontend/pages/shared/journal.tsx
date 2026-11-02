import { useMemo, useState } from 'react';
import JournalEntryCard from '../../components/shared/JournalEntryCard';
import JournalForm from '../../components/shared/journal/JournalForm';
import TrendBars from '../../components/shared/charts/TrendBars';
import { ArrowLink, Button, Card, ConfirmDialog, EmptyState, Grid, Input, Modal, PageHeader, Select, StatCard, Toolbar } from '../../components/shared/ui';
import { ErrorState, PageSkeleton } from '../../components/shared/feedback/Feedback';
import { useUserData } from '../../context/useUserData';
import { useAction } from '../../hooks/useAction';
import { createJournalEntry, deleteJournalEntry, updateJournalEntry } from '../../../backend/services/journalService';
import { journalStats } from '../../../backend/analytics/metrics';
import { formatDate } from '../../../backend/core/dates';
import { MOODS, type Mood } from '../../../backend/models';
import { MOOD_META } from '../../icons/moodMeta';
import './journal.css';

const PAGE_SIZE = 20;
const MOOD_FILTER = [{ value: 'all' as const, label: 'Any mood' }, ...MOODS.map((m) => ({ value: m, label: MOOD_META[m].label }))];

export default function Journal() {
  const { uid, journalEntries, today, loading, error, retry } = useUserData();
  const { run } = useAction();
  const [search, setSearch] = useState('');
  const [moodFilter, setMoodFilter] = useState<Mood | 'all'>('all');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const stats = useMemo(() => journalStats(journalEntries, today), [journalEntries, today]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^#/, '');
    return journalEntries.filter(
      (e) => (moodFilter === 'all' || e.mood === moodFilter) && (!q || e.text.toLowerCase().includes(q) || e.tags.some((t) => t.includes(q)))
    );
  }, [journalEntries, search, moodFilter]);

  const editing = journalEntries.find((e) => e.id === editingId);
  const deleting = journalEntries.find((e) => e.id === deletingId);

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (loading) return <PageSkeleton />;

  return (
    <div className="journal-page">
      <PageHeader
        title="Journal"
        subtitle="Long-form reflection. Generous line height, no pressure to be brief."
        action={<ArrowLink to="/trackers?tab=journal">View Journal Timeline</ArrowLink>}
      />

      <Grid minItemWidth={140}>
        <StatCard label="Entries" value={stats.total} description={`${stats.last7} this week`} />
        <StatCard label="Writing streak" value={`${stats.writingStreak} d`} />
        <StatCard label="Words written" value={stats.totalWords.toLocaleString()} description={`avg ${stats.avgWords} per entry`} />
        <StatCard label="Most active day" value={stats.topWeekday ?? '—'} />
      </Grid>

      <Card eyebrow="New entry">
        <JournalForm submitLabel="Save entry" onSubmit={(input) => run('create', () => createJournalEntry(uid, input, today), { success: 'Entry saved.' })} />
      </Card>

      {stats.total > 0 && (
        <Card eyebrow="Trend" title="Entries per week">
          <TrendBars points={stats.weekly.map((w) => ({ label: formatDate(w.week), value: w.entries }))} valueLabel="Entries" ariaLabel="Bar chart of journal entries per week for the last 8 weeks" />
          {stats.topTags.length > 0 && (
            <div className="journal-page__tags">
              <span className="ui-field__label">Top tags</span>
              {stats.topTags.map((t) => (
                <Button key={t.tag} variant="ghost" onClick={() => setSearch(t.tag)}>
                  #{t.tag} ({t.count})
                </Button>
              ))}
            </div>
          )}
        </Card>
      )}

      <Toolbar>
        <Input type="search" placeholder="Search text or #tag…" value={search} onChange={(e) => { setSearch(e.target.value); setLimit(PAGE_SIZE); }} />
        <Select aria-label="Filter by mood" options={MOOD_FILTER} value={moodFilter} onChange={setMoodFilter} />
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState>{journalEntries.length === 0 ? 'No entries yet — write your first one above.' : 'No entries match your search.'}</EmptyState>
      ) : (
        <div className="journal-page__entries">
          <p className="text-muted">{filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'}</p>
          {filtered.slice(0, limit).map((entry) => (
            <JournalEntryCard key={entry.id} entry={entry} onEdit={() => setEditingId(entry.id)} onDelete={() => setDeletingId(entry.id)} onTag={setSearch} />
          ))}
          {filtered.length > limit && (
            <Button variant="ghost" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
              Show more
            </Button>
          )}
        </div>
      )}

      {editing && (
        <Modal title="Edit entry" size="lg" onClose={() => setEditingId(null)}>
          <JournalForm
            initial={{ text: editing.text, mood: editing.mood, tags: editing.tags }}
            submitLabel="Save changes"
            onSubmit={(input) => run('edit', () => updateJournalEntry(uid, editing, input), { success: 'Entry updated.' })}
            onDone={() => setEditingId(null)}
            onCancel={() => setEditingId(null)}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete entry?"
          message="This entry and its linked mood log will be permanently removed."
          confirmLabel="Delete"
          onConfirm={() => {
            setDeletingId(null);
            void run('delete', () => deleteJournalEntry(uid, deleting), { success: 'Entry deleted.' });
          }}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
