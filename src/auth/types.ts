import type { Persona } from '../personas/types';

/**
 * The session state machine.
 *
 * Render by switching on `status`, not by combining booleans. `isLoading &&
 * !user && hasToken` is how you end up showing a sign-in screen to somebody who
 * is already signed in, and it is the single most common auth bug in an app
 * this shape.
 */
export type AuthStatus =
  | 'restoring'        // reading SecureStore
  | 'signed-out'
  | 'authenticating'   // AuthKit handoff in flight
  | 'bootstrapping'    // token good, resolving session context
  | 'choosing-company'
  | 'ready'
  | 'expired';         // refresh failed mid-session — NOT the same as signed-out

export type BootstrapStage = 'signing-in' | 'loading-company' | 'preparing';

export type CompanyOption = {
  id: string;
  name: string;
  /** "Atlanta · 2 warehouses" */
  subtitle?: string;
};

export type Actor = {
  id: string;
  name: string;
  email: string;
  initials: string;
};

export type Session = {
  actor: Actor;
  company: CompanyOption;
  /** Resolved from the backend. See contracts/auth.md — source still unconfirmed. */
  persona: Persona;
};

export type AuthState =
  | { status: 'restoring' }
  | { status: 'signed-out'; error?: string | null }
  | { status: 'authenticating' }
  | { status: 'bootstrapping'; stage: BootstrapStage; slow?: boolean }
  | { status: 'choosing-company'; actor: Actor; companies: CompanyOption[] }
  | { status: 'ready'; session: Session }
  /**
   * Keeps `session` deliberately. Someone whose token lapses at stop six of
   * eight re-authenticates and returns to stop six — they are not dumped at a
   * sign-in screen with their work gone.
   */
  | { status: 'expired'; session: Session };
