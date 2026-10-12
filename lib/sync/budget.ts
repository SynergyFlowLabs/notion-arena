import type { AdapterError } from "./transport";

/**
 * One request budget per connection.
 *
 * Research finding (docs/DATA_SYNC_RESEARCH.md §2.5): Notion rate-limits per
 * connection, not per user or per widget, and the budget is a 60-second window
 * spent at any pace. 180/min on Free and Plus, 600/min on Business and above.
 * Ten widgets on one page that each polled independently would starve each
 * other, so every Notion call in the product goes through this gate.
 *
 * The gate is deliberately boring: a token bucket per connection, a hard
 * ceiling well under the documented limit, and `Retry-After` honoured on 429
 * and 529 exactly as the request-limits guide describes.
 */

interface Bucket {
  /** requests already spent in the current window */
  spent: number;
  /** ms epoch when the window resets */
  resetAt: number;
  /** extra pause imposed by a 429/529 Retry-After */
  pausedUntil: number;
  rpm: number;
}

const buckets = new Map<string, Bucket>();

const DEFAULT_RPM: Record<string, number> = {
  // Leave headroom: the workspace-wide shared budget can throttle us even when
  // our own connection budget is clean, and installs are bursty by nature.
  business: 480,
  default: 150,
};

export function configureConnection(connectionId: string, opts: { rpm?: number } = {}) {
  const rpm = opts.rpm ?? DEFAULT_RPM.default;
  buckets.set(connectionId, { spent: 0, resetAt: Date.now() + 60_000, pausedUntil: 0, rpm });
}

function bucket(connectionId: string): Bucket {
  let b = buckets.get(connectionId);
  if (!b) {
    b = { spent: 0, resetAt: Date.now() + 60_000, pausedUntil: 0, rpm: DEFAULT_RPM.default };
    buckets.set(connectionId, b);
  }
  if (Date.now() >= b.resetAt) {
    b.spent = 0;
    b.resetAt = Date.now() + 60_000;
  }
  return b;
}

export interface BudgetSnapshot {
  connectionId: string;
  rpm: number;
  spent: number;
  remaining: number;
  resetAt: string;
  pausedForMs: number;
}

export function snapshot(connectionId: string): BudgetSnapshot {
  const b = bucket(connectionId);
  return {
    connectionId,
    rpm: b.rpm,
    spent: b.spent,
    remaining: Math.max(0, b.rpm - b.spent),
    resetAt: new Date(b.resetAt).toISOString(),
    pausedForMs: Math.max(0, b.pausedUntil - Date.now()),
  };
}

export class BudgetExhausted extends Error {
  retryAfterMs: number;
  constructor(retryAfterMs: number) {
    super(
      `Notion request budget for this connection is exhausted (${Math.ceil(
        retryAfterMs / 1000
      )}s until the window resets).`
    );
    this.name = "BudgetExhausted";
    this.retryAfterMs = retryAfterMs;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Runs one unit of work against a connection's budget.
 *
 * `cost` lets a bulk routine (a 200-row reconcile) reserve several requests at
 * once instead of interleaving with other work.
 */
export async function withBudget<T>(
  connectionId: string,
  fn: () => Promise<T>,
  cost = 1
): Promise<T> {
  const b = bucket(connectionId);
  if (b.pausedUntil > Date.now()) throw new BudgetExhausted(b.pausedUntil - Date.now());
  if (b.spent + cost > b.rpm) {
    throw new BudgetExhausted(b.resetAt - Date.now());
  }
  b.spent += cost;
  return fn();
}

/** Call this on every 429/529 so the next request in the process respects it. */
export function noteRateLimit(connectionId: string, retryAfterSeconds: number) {
  const b = bucket(connectionId);
  b.pausedUntil = Math.max(b.pausedUntil, Date.now() + retryAfterSeconds * 1000 + 250);
  b.spent = b.rpm;
  b.resetAt = Math.max(b.resetAt, Date.now() + retryAfterSeconds * 1000);
}

/** Retry policy from the request-limits guide: 429/529 always, jittered backoff. */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: { attempts?: number; onRetry?: (err: unknown, attempt: number) => void } = {}
): Promise<T> {
  const attempts = opts.attempts ?? 3;
  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      const e = err as AdapterError;
      const retryable = e?.status === 429 || e?.status === 529 || e?.code === "rate_limited";
      if (!retryable || attempt === attempts - 1) throw err;
      opts.onRetry?.(err, attempt + 1);
      const base = e.retryAfter ? e.retryAfter * 1000 : Math.min(2 ** attempt, 8) * 1000;
      await sleep(base + Math.random() * 250);
    }
  }
  throw lastErr;
}

/** Test/dev helper. */
export function resetBudgets() {
  buckets.clear();
}
