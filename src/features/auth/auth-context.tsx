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
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  selectCompany: (companyId: UUID) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [companyId, setCompanyId] = useState<UUID | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async (nextCompanyId: UUID | null) => {
    const resolved = await api.session.resolve(nextCompanyId);
    setSession(resolved);
    // Auto-select when the actor belongs to exactly one company — the common case.
    const only = resolved?.companies.length === 1 ? resolved.companies[0] : undefined;
    setCompanyId(resolved?.companyId ?? only?.id ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!cancelled) await hydrate(null);
      } catch {
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  const signIn = useCallback(async () => {
    await api.session.signIn();
    resetSupabase();
    await hydrate(null);
  }, [hydrate]);

  const signOut = useCallback(async () => {
    await api.session.signOut();
    resetSupabase();
    setSession(null);
    setCompanyId(null);
  }, []);

  const selectCompany = useCallback(
    async (next: UUID) => {
      resetSupabase();
      setCompanyId(next);
      await hydrate(next);
    },
    [hydrate]
  );

  const company = useMemo(
    () => session?.companies.find((c) => c.id === companyId) ?? null,
    [session, companyId]
  );

  const persona = useMemo(() => (company ? derivePersona(company) : null), [company]);

  const value = useMemo(
    () => ({ session, companyId, company, persona, loading, signIn, signOut, selectCompany }),
    [session, companyId, company, persona, loading, signIn, signOut, selectCompany]
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
  const { companyId } = useAuth();
  if (!companyId) throw new Error('No company selected');
  return companyId;
}
