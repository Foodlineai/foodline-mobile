import * as Haptics from 'expo-haptics';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useCompanyId } from '@/features/auth/auth-context';
import { api } from '@/lib/api';
import { usePageContext } from '../page-context';
import type { VoiceSession, VoiceStatus } from './types';

type VoiceContextValue = {
  status: VoiceStatus;
  /** The one line the Copilot is carrying right now. */
  line: string;
  /** Voice is on (starting, listening or speaking). */
  active: boolean;
  start: () => Promise<void>;
  stop: () => void;
  toggle: () => void;
};

const Ctx = createContext<VoiceContextValue | null>(null);

const UNAVAILABLE_MS = 4500;

/**
 * Inline voice mode state. Lives above the tabs so a session follows the user
 * from screen to screen until they close it. Long-press on the AI tab toggles
 * it; the dock glow and the one-line bar both read from here.
 */
export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const companyId = useCompanyId();
  const page = usePageContext();
  const [status, setStatus] = useState<VoiceStatus>('off');
  const [line, setLine] = useState('');
  const session = useRef<VoiceSession | null>(null);
  const unsubscribe = useRef<(() => void) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const starting = useRef(false);

  const teardown = useCallback(() => {
    unsubscribe.current?.();
    unsubscribe.current = null;
    session.current?.stop();
    session.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const stop = useCallback(() => {
    teardown();
    starting.current = false;
    setStatus('off');
    setLine('');
  }, [teardown]);

  const start = useCallback(async () => {
    if (starting.current || session.current) return;
    starting.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStatus('starting');
    setLine('Starting voice…');
    try {
      const result = await api.voice.start(companyId, { pathname: page.pathname });
      if (!result.available) {
        setStatus('unavailable');
        setLine(result.reason);
        // Say so, briefly, and get out of the way. No glow: nothing is listening.
        timer.current = setTimeout(() => {
          setStatus('off');
          setLine('');
        }, UNAVAILABLE_MS);
        return;
      }
      session.current = result.session;
      unsubscribe.current = result.session.subscribe((event) => {
        if (event.type === 'status') setStatus(event.status);
        else setLine(event.text);
      });
      setStatus('listening');
      setLine('Listening…');
    } catch (e) {
      setStatus('unavailable');
      setLine((e as Error).message || "Couldn't start voice.");
      timer.current = setTimeout(() => {
        setStatus('off');
        setLine('');
      }, UNAVAILABLE_MS);
    } finally {
      starting.current = false;
    }
  }, [companyId, page.pathname]);

  // A company switch or sign-out ends the session; it must not outlive the scope it was started in.
  useEffect(() => stop, [companyId, stop]);

  const active = status === 'starting' || status === 'listening' || status === 'speaking';

  const value = useMemo<VoiceContextValue>(
    () => ({
      status,
      line,
      active,
      start,
      stop,
      toggle: () => {
        if (active) stop();
        else void start();
      },
    }),
    [status, line, active, start, stop]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useVoice(): VoiceContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useVoice must be used inside VoiceProvider');
  return v;
}
