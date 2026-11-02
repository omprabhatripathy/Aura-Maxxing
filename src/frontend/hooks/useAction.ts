import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../components/shared/feedback/useToast';
import { ValidationError, isTransientError, toUserMessage } from '../../backend/core/errors';

interface RunOptions {
  success?: string;
  error?: string;
}

type Runner = (key: string, fn: () => Promise<unknown>, options?: RunOptions) => Promise<boolean>;

/**
 * Wraps a backend call with pending state, success toast and error toast (with Retry for transient failures).
 * Returns true on success so callers can reset forms. Validation errors are rethrown for inline display.
 */
export function useAction() {
  const toast = useToast();
  const [pending, setPending] = useState<Set<string>>(new Set());
  const runRef = useRef<Runner | null>(null);

  const run = useCallback<Runner>(
    async (key, fn, options = {}) => {
      setPending((p) => new Set(p).add(key));
      try {
        await fn();
        if (options.success) toast.success(options.success);
        return true;
      } catch (error) {
        if (error instanceof ValidationError) throw error;
        const message = toUserMessage(error, options.error);
        toast.error(message, isTransientError(error) ? () => void runRef.current?.(key, fn, options) : undefined);
        return false;
      } finally {
        setPending((p) => {
          const next = new Set(p);
          next.delete(key);
          return next;
        });
      }
    },
    [toast]
  );
  // Lets the Retry button re-run the latest version of `run` without a self-referencing callback.
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  return { run, isPending: (key: string) => pending.has(key) };
}

/** Runs an action and turns validation errors into an inline message instead of a toast. */
export async function withInlineErrors(action: () => Promise<boolean>, setError: (message: string) => void): Promise<boolean> {
  try {
    setError('');
    return await action();
  } catch (error) {
    setError(error instanceof ValidationError ? error.message : toUserMessage(error));
    return false;
  }
}
