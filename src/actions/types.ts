/**
 * Action client — the typed implementation of `contracts/actions.md`.
 *
 * The rule this file exists to enforce: **actions are data, not markup.** A
 * screen does not decide which actions exist. It asks what is available on this
 * record, for this actor, in this company, and renders what comes back.
 *
 * Without this, mobile and the desktop ERP drift on the same record — an action
 * appears in one and not the other, or a permission is enforced in one place
 * only. The desktop already standardised on a row-action pattern and an action
 * catalog; mobile consumes that vocabulary rather than inventing a parallel one.
 */

export type ActionIntent = 'primary' | 'default' | 'destructive';

/**
 * How an action reaches the backend. This is a contract, not a style choice.
 *
 *  - `direct`  the actor's own action, reversible or low-stakes → submit on tap
 *  - `review`  consequential → opens a surface showing what will happen; never
 *              fires from a list row
 *  - `draft`   produces something a human must approve → creates a draft and
 *              routes to the approval surface; never submits
 */
export type ExecutionMode = 'direct' | 'review' | 'draft';

export type RecordAction = {
  /** Stable id from the catalog. Never translated, prefixed or remapped. */
  id: string;
  /** Server-supplied and already localised. Do not rewrite it on the device. */
  label: string;
  intent: ActionIntent;
  execution: ExecutionMode;
  /**
   * Absent means available. Present means render it disabled, showing this
   * reason — an action the actor cannot take is disabled, never hidden. A user
   * who cannot see a button assumes the app is broken; one who reads "needs
   * manager approval" knows what to do next.
   */
  unavailableReason?: string;
};

/** Actions the catalog offers that this build has no handler for. */
export const UNSUPPORTED_REASON = 'Not available on mobile yet';

/**
 * Raw catalog rows are unvalidated. Anything that fails to parse is dropped
 * rather than rendered half-formed, and anything unrecognised is surfaced
 * disabled rather than silently swallowed — a new ERP action should appear on
 * the phone as a visible gap, so whoever added it finds out.
 */
export function parseActions(
  raw: unknown,
  isSupported: (id: string) => boolean,
): RecordAction[] {
  if (!Array.isArray(raw)) return [];

  const out: RecordAction[] = [];

  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;

    const id = typeof r.id === 'string' ? r.id : null;
    const label = typeof r.label === 'string' ? r.label : null;
    if (!id || !label) continue; // unlabelled action is not renderable

    const execution = asExecution(r.execution);
    const intent = asIntent(r.intent);

    const serverReason =
      typeof r.unavailable_reason === 'string'
        ? r.unavailable_reason
        : typeof r.unavailableReason === 'string'
          ? r.unavailableReason
          : undefined;

    out.push({
      id,
      label,
      intent,
      execution,
      unavailableReason: serverReason ?? (isSupported(id) ? undefined : UNSUPPORTED_REASON),
    });
  }

  return out;
}

/**
 * Unknown execution modes fall back to `review`, never `direct`.
 *
 * The client may be more cautious than the contract. It may never be less — a
 * mislabelled action that moves stock or money should cost an extra tap, not an
 * unintended submission.
 */
function asExecution(v: unknown): ExecutionMode {
  return v === 'direct' || v === 'review' || v === 'draft' ? v : 'review';
}

function asIntent(v: unknown): ActionIntent {
  return v === 'primary' || v === 'destructive' ? v : 'default';
}

/**
 * True when an action must not be fired straight from a row.
 *
 * Call this at the press site rather than trusting the screen author to
 * remember. `draft` is included: a draft still routes through an approval
 * surface, it does not complete in place.
 */
export function requiresSurface(action: RecordAction): boolean {
  return action.execution !== 'direct';
}

/**
 * Guard for anything that reaches a vendor. The approval gate is a liability
 * position, not a preference: if the model drafts a wrong PO and a vendor
 * fulfils it, that lands on us.
 *
 * If the catalog ever marks such an action `direct`, this returns false and the
 * caller must route it through a review surface anyway, then raise it.
 */
export function mayExecuteWithoutApproval(action: RecordAction): boolean {
  return action.execution === 'direct';
}
