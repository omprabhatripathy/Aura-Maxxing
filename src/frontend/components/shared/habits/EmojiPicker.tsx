import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { loadHabitEmojis, type EmojiGroup } from '../../../lib/habitEmoji';
import './EmojiPicker.css';

const PANEL_WIDTH = 300;
const PANEL_HEIGHT = 340;

interface Props {
  value: string;
  /** Shown on the trigger when nothing is chosen. */
  fallback: string;
  onChange: (emoji: string) => void;
}

function panelPosition(trigger: HTMLElement): CSSProperties {
  const r = trigger.getBoundingClientRect();
  const width = Math.min(PANEL_WIDTH, window.innerWidth - 16);
  const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
  const below = window.innerHeight - r.bottom;
  return below >= PANEL_HEIGHT || below >= r.top
    ? { left, width, top: r.bottom + 6, maxHeight: Math.min(PANEL_HEIGHT, below - 14) }
    : { left, width, bottom: window.innerHeight - r.top + 6, maxHeight: Math.min(PANEL_HEIGHT, r.top - 14) };
}

export default function EmojiPicker({ value, fallback, onChange }: Props) {
  const [pos, setPos] = useState<CSSProperties | null>(null);
  const [groups, setGroups] = useState<EmojiGroup[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const open = pos !== null;

  useEffect(() => {
    if (!open) return;
    let alive = true;
    loadHabitEmojis().then((g) => {
      if (alive) setGroups(g);
    });
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !panelRef.current?.contains(t)) setPos(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPos(null);
    };
    const onReflow = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      setPos(null);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
    return () => {
      alive = false;
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
  }, [open]);

  const choose = (emoji: string) => {
    onChange(emoji);
    setPos(null);
  };

  const toggle = () => {
    if (open || !triggerRef.current) setPos(null);
    else setPos(panelPosition(triggerRef.current));
  };

  return (
    <div className="emoji-picker" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`emoji-picker__trigger${value ? '' : ' is-empty'}`}
        aria-label={value ? `Habit emoji ${value}. Change emoji` : 'Choose an emoji for this habit'}
        title="Choose emoji"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        {value || fallback}
      </button>
      {open &&
        createPortal(
          <div id={panelId} ref={panelRef} className="emoji-picker__panel" role="dialog" aria-label="Choose an emoji" style={pos}>
            {groups.length === 0 && <p className="emoji-picker__group-label">Loading…</p>}
            {groups.map((g) => (
            <div key={g.group} className="emoji-picker__group">
              <p className="emoji-picker__group-label">{g.group}</p>
              <div className="emoji-picker__grid">
                {g.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className={`emoji-picker__option${emoji === value ? ' is-selected' : ''}`}
                    aria-label={emoji}
                    aria-pressed={emoji === value}
                    onClick={() => choose(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {value && (
            <button type="button" className="emoji-picker__clear" onClick={() => choose('')}>
              Use category icon
            </button>
          )}
          </div>,
          document.body,
        )}
    </div>
  );
}
