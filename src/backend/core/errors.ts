export class ValidationError extends Error {
  readonly field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

const TRANSIENT_CODES = new Set(['unavailable', 'deadline-exceeded', 'resource-exhausted', 'aborted', 'internal', 'network-request-failed']);

function errorCode(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  return code.replace(/^(firestore|auth|storage)\//, '');
}

export function isTransientError(error: unknown): boolean {
  return TRANSIENT_CODES.has(errorCode(error));
}

/** Maps any thrown value to a message that is safe and useful to show users. */
export function toUserMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ValidationError) return error.message;
  switch (errorCode(error)) {
    case 'permission-denied':
      return "You don't have permission to do that. Please sign in again.";
    case 'unavailable':
    case 'network-request-failed':
      return 'You appear to be offline. Please check your connection and retry.';
    case 'quota-exceeded':
    case 'resource-exhausted':
      return 'The service is busy right now. Please try again shortly.';
    case 'unauthenticated':
      return 'Your session has expired. Please sign in again.';
    default:
      return fallback;
  }
}

/** Retries transient backend failures with exponential backoff; validation and permission errors fail fast. */
export async function withRetry<T>(operation: () => Promise<T>, attempts = 3, baseDelayMs = 400): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientError(error) || attempt === attempts - 1) break;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
    }
  }
  throw lastError;
}
