/**
 * Inline voice mode: long-press the AI tab to start, it stays with you across
 * screens until you close it. A session is whatever transport produces the
 * audio conversation; the UI only needs its state and the one line the
 * Copilot is currently saying.
 *
 * The ERP issues a short-lived, company-scoped OpenAI Realtime credential.
 * Native capture plugs into this seam only after microphone data transfer is
 * explicitly approved; model keys never ship in the application.
 */
export type VoiceStatus = 'off' | 'starting' | 'listening' | 'speaking' | 'unavailable';

export type VoiceEvent =
  { type: 'status'; status: 'listening' | 'speaking' } | { type: 'line'; text: string };

export type VoiceSession = {
  subscribe: (listener: (event: VoiceEvent) => void) => () => void;
  stop: () => void;
};

export type VoiceStartResult =
  { available: true; session: VoiceSession } | { available: false; reason: string };
