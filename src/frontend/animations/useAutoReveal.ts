import { useEffect } from 'react';
import type { RefObject } from 'react';

const SELECTOR = [
  '.aura-card',
  '.ui-section',
  '.ui-grid > *',
  '.todo-card',
  '.area-card',
  '.health-page__module',
].join(',');

/**
 * Viewport-triggered fade-up for every card/section inside `root` (web shell only).
 * CSS lives in styles/web.css; reduced-motion users get content immediately.
 */
export function useAutoReveal(root: RefObject<HTMLElement | null>, key: string, enabled: boolean): void {
  useEffect(() => {
    const host = root.current;
    if (!enabled || !host || typeof IntersectionObserver === 'undefined') return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.revealed = '';
          io.unobserve(e.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    const tag = () => {
      let index = 0;
      host.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        if ('revealed' in el.dataset) return;
        // Already tagged by a previous (cleaned-up) run, e.g. StrictMode's double effect: just re-observe.
        if ('reveal' in el.dataset) {
          io.observe(el);
          return;
        }
        // Pages that run their own framer-motion choreography opt out.
        if (el.closest('[data-no-auto-reveal]')) return;
        // Skip elements nested in another revealing element so they don't animate twice.
        if (el.parentElement?.closest('[data-reveal]')) return;
        el.dataset.reveal = '';
        el.style.setProperty('--reveal-delay', `${Math.min(index++, 8) * 45}ms`);
        io.observe(el);
      });
    };

    tag();
    const mo = new MutationObserver(tag);
    mo.observe(host, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, [root, key, enabled]);
}
