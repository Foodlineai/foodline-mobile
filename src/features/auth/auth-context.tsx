import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api } from '@/lib/api';
import type { Company, Session, UUID } from '@/lib/api';
import { resetSupabase } from '@/lib/supabase';
import { derivePersona } from '@/personas/derive';
import type { Persona } from '@/personas/types';

type AuthState = {
  session: Session | null;
  /** The company whose data is being shown. Null until one is selected. */
  companyId: UUID | null;
  company: Company | null;
  /** Derived from `company.roleKey` — see personas/derive.ts for what's
   * confirmed vs a judgment call in that mapping. Null until a company is
   * selected, same as `company`. */
  persona: Persona | null;
  loading: boolean;
  authError: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  selectCompany: (companyId: UUID) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [companyId, setCompanyId] = useState<UUID | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const hydrate = useCallback(async (nextCompanyId: UUID | null) => {
    const resolved = await api.session.resolve(nextCompanyId);
    if (!resolved) {
      setSession(null);
      setCompanyId(null);
      return;
    }
    if (resolved.companies.length === 0) {
      await api.session.signOut();
      resetSupabase();
      throw new Error('Your WorkOS account does not have access to a Foodline company.');
    }

    // Auto-select when the actor belongs to exactly one company — the common case.
    const only = resolved.companies.length === 1 ? resolved.companies[0] : undefined;
    const authorizedCompanyId = resolved.companyId ?? only?.id ?? null;
    if (authorizedCompanyId && !resolved.companies.some((company) => company.id === authorizedCompanyId)) {
      throw new Error('The selected company is not authorized for this WorkOS account.');
    }

    // Commit both values only after the server response is validated. A
    // rejected switch must never leave an arbitrary tenant header behind.
    setSession(resolved);
    setCompanyId(authorizedCompanyId);
    setAuthError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!cancelled) await hydrate(null);
      } catch (error) {
        if (!cancelled) {
          setSession(null);
          setCompanyId(null);
          setAuthError(authMessage(error));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  const signIn = useCallback(async () => {
    setAuthError(null);
    await api.session.signIn();
    resetSupabase();
    await hydrate(null);
  }, [hydrate]);

  const signOut = useCallback(async () => {
    await api.session.signOut();
    resetSupabase();
    setSession(null);
    setCompanyId(null);
    setAuthError(null);
  }, []);

  const selectCompany = useCallback(
    async (next: UUID) => {
      if (!session?.companies.some((company) => company.id === next)) {
        throw new Error('That company is not authorized for this WorkOS account.');
      }
      await hydrate(next);
      resetSupabase();
    },
    [hydrate, session]
  );

  const company = useMemo(
    () => session?.companies.find((c) => c.id === companyId) ?? null,
    [session, companyId]
  );

  const persona = useMemo(() => (company ? derivePersona(company) : null), [company]);

  const value = useMemo(
    () => ({ session, companyId, company, persona, loading, authError, signIn, signOut, selectCompany }),
    [session, companyId, company, persona, loading, authError, signIn, signOut, selectCompany]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** For screens that cannot render without a company — the tab group guarantees it. */
export function useCompanyId(): UUID {
  const { companyId, session } = useAuth();
  if (!companyId || !session?.companies.some((company) => company.id === companyId)) {
    throw new Error('No authorized company selected');
  }
  return companyId;
}

function authMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (/does not have access|not authorized|access_denied|setup_required/i.test(message)) {
    return 'Your WorkOS account is not assigned to an active Foodline company. Ask an administrator for access.';
  }
  return 'We could not verify your Foodline company access. Check your connection and try again.';
}
