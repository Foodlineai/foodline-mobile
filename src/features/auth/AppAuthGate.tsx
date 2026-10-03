import React, { useState } from 'react';

import { AuthGate } from '@/auth/AuthGate';
import type { Actor, AuthState as DeliveredAuthState, CompanyOption } from '@/auth/types';
import type { Company } from '@/lib/api';
import { useAuth } from './auth-context';

/**
 * Bridges this app's existing auth-context (session/companyId/company/
 * persona/loading — all already live-wired) onto the delivered `AuthGate`'s
 * `AuthState` machine, without changing auth-context's own internals.
 *
 * One documented gap remains: **`expired` is never reached.** Detecting a failed token refresh
 *    "mid-session" needs a hook into workos.ts's own refresh path, which
 *    this pass didn't touch. A lapsed session today surfaces as an ordinary
 *    query error on whatever screen is open, not the dedicated re-auth
 *    sheet contracts/auth.md describes. Real gap, not a style choice —
 *    flagged for whoever picks up token-refresh handling next.
 */
export function AppAuthGate({ children }: { children: React.ReactNode }) {
  const { session, companyId, company, persona, loading, authError, signIn, selectCompany } = useAuth();
  const [authenticating, setAuthenticating] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setAuthenticating(true);
    setSignInError(null);
    try {
      await signIn();
    } catch (e) {
      setSignInError(signInMessage(e));
    } finally {
      setAuthenticating(false);
    }
  };

  const state: DeliveredAuthState = (() => {
    if (loading) return { status: 'restoring' };
    if (!session) {
      return authenticating
        ? { status: 'authenticating' }
        : { status: 'signed-out', error: signInError ?? authError };
    }
    if (!companyId || !company) {
      if (session.companies.length > 1) {
        return {
          status: 'choosing-company',
          actor: toActor(session.actorId),
          companies: session.companies.map(toCompanyOption),
        };
      }
      return { status: 'bootstrapping', stage: 'loading-company' };
    }
    if (!persona) return { status: 'bootstrapping', stage: 'preparing' };

    return {
      status: 'ready',
      session: {
        actor: toActor(session.actorId),
        company: toCompanyOption(company),
        persona,
      },
    };
  })();

  return (
    <AuthGate
      state={state}
      onSignIn={() => void handleSignIn()}
      onChooseCompany={(c) => void selectCompany(c.id)}
      onReauthenticate={() => void handleSignIn()}
    >
      {children}
    </AuthGate>
  );
}

function toActor(actorId: string): Actor {
  return {
    id: actorId,
    name: null,
    email: null,
    initials: '',
  };
}

function toCompanyOption(c: Company): CompanyOption {
  return { id: c.id, name: c.name, subtitle: c.roleKey || undefined };
}

function signInMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (/cancel/i.test(message)) return 'Sign-in was cancelled.';
  if (/does not have access|not authorized|access_denied|setup_required/i.test(message)) {
    return 'Your WorkOS account is not assigned to an active Foodline company. Ask an administrator for access.';
  }
  return 'We could not verify your Foodline account. Check your connection and try again.';
}
