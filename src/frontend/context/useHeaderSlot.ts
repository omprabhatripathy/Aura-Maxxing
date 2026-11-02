import { createContext, useContext } from 'react';

/** DOM node in the top bar (left of the theme switch) where pages can portal header actions. */
export const HeaderSlotContext = createContext<HTMLElement | null>(null);

export function useHeaderSlot(): HTMLElement | null {
  return useContext(HeaderSlotContext);
}
