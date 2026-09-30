import React, { useState } from 'react';

import { AuthGate } from '@/auth/AuthGate';
import type { Actor, AuthState as DeliveredAuthState, CompanyOption } from '@/auth/types';
import type { Company } from '@/lib/api';
import { initialsFrom } from '@/components/app-header';
import { useAuth } from './auth-context';

/**
 * Bridges this app's existing auth-context (session/companyId/company/
 * persona/loading — all already live-wired) onto the delivered `AuthGate`'s
 * `AuthState` machine, without changing auth-context's own internals.
 *
 * Two real, documented gaps rather than fabricated data:
 *
 * 1. **`Actor.name`/`email` are placeholders.** `application_session_context`
 *    doesn't return either (confirmed 29 Sep against the live ERP source).
 *    `AuthGate` never actually renders `actor` for any status it handles
 *    itself, so this is safe today — but `AccountScreen` (not yet adopted;
 *    see account.tsx's own note) does render it, and would show a fake
 *    name if wired up before this is fixed. Likely fixable by decoding the
 *    WorkOS ID token's own `name`/`email` claims (the auth scopes already
 *    request `profile` and `email`) — not done here.
 *
 * 2. **`expired` is never reached.** Detecting a failed token refresh
 *    "mid-session" needs a hook into workos.ts's own refresh path, which
 *    this pass didn't touch. A lapsed session today surfaces as an ordinary
 *    query error on whatever screen is open, not the dedicated re-auth
 *    sheet contracts/auth.md describes. Real gap, not a style choice —
 *    flagged for whoever picks up token-refresh handling next.
 */
export function AppAuthGate({ children }: { children: React.ReactNode }) {
  const { session, companyId, company, persona, loading, signIn, selectCompany } = useAuth();
  const [authenticating, setAuthenticating] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setAuthenticating(true);
    setSignInError(null);
    try {
      await signIn();
    } catch (e) {
      setSignInError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setAuthenticating(false);
    }
  };

  const state: DeliveredAuthState = (() => {
    if (loading) return { status: 'restoring' };
    if (!session) {
      return authenticating ? { status: 'authenticating' } : { status: 'signed-out', error: signInError };
    }
    if (!companyId || !company) {
      if (session.companies.length > 1) {
        return {
          status: 'choosing-company',
          actor: toActor(session.actorId, undefined),
          companies: session.companies.map(toCompanyOption),
        };
      }
      return { status: 'bootstrapping', stage: 'loading-company' };
    }
    if (!persona) return { status: 'bootstrapping', stage: 'preparing' };

    return {
      status: 'ready',
      session: {
        actor: toActor(session.actorId, company.name),
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

function toActor(actorId: string, nameHint: string | undefined): Actor {
  // Placeholder — see this file's header. Not rendered by any AuthGate
  // status today; would need real data before AccountScreen uses it.
  return {
    id: actorId,
    name: 'Foodline user',
    email: '',
    initials: initialsFrom(nameHint),
  };
}

function toCompanyOption(c: Company): CompanyOption {
  return { id: c.id, name: c.name, subtitle: c.roleKey || undefined };
}
