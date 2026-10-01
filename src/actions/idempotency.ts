import * as Crypto from 'expo-crypto';

/**
 * Idempotency keys.
 *
 * The key belongs to the **user's intent**, not to the network request.
 * Generate it once when the user commits, hold it for every retry of that same
 * attempt, and discard it only when the attempt succeeds or is abandoned.
 *
 * Regenerating the key on retry is the bug that double-counts stock, and it will
 * happen on a warehouse floor with bad signal long before it shows up in
 * testing. That is why this is a small module with a narrow surface rather than
 * a `uuid()` call inlined at each mutation site.
 */

/**
 * One attempt at one mutation. Create it when the button is pressed; pass the
 * same instance to every retry.
 */
export class Attempt {
  readonly key: string;
  readonly scope: string;
  private settled = false;

  constructor(scope: string) {
    this.scope = scope;
    this.key = Crypto.randomUUID();
  }

  /** Headers for the mutation. Spread into the request on every retry. */
  headers(): Record<string, string> {
    return { 'Idempotency-Key': this.key };
  }

  /** Call on success or on abandon. A settled attempt must not be retried. */
  settle(): void {
    this.settled = true;
  }

  get isSettled(): boolean {
    return this.settled;
  }
}

/** Raised when a mutation is rejected because the row moved underneath us. */
export class RowVersionConflict extends Error {
  constructor(public readonly currentVersion: string | null) {
    super('This record was changed by someone else.');
    this.name = 'RowVersionConflict';
  }
}

/**
 * A version conflict is never retried and never overwritten — the user is told
 * and the record re-read. Silent overwrite loses someone else's work; a retry
 * loop hammers the server with a write that cannot succeed.
 */
export function isConflict(error: unknown): error is RowVersionConflict {
  return error instanceof RowVersionConflict;
}
