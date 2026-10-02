/**
 * Inline voice mode: long-press the AI tab to start, it stays with you across
 * screens until you close it. A session is whatever transport produces the
 * audio conversation; the UI only needs its state and the one line the
 * Copilot is currently saying.
 *
 * The ERP's web voice is browser WebRTC against OpenAI Realtime with a
 * server-minted client secret (`issueAiCopilotRealtimeSession`). PR #314 has
 * no mobile route for that, so a live session is unavailable until the ERP
 * exposes one and a native WebRTC client is added. The type is the seam.
 */
export type VoiceStatus = 'off' | 'starting' | 'listening' | 'speaking' | 'unavailable';

export type VoiceEvent = { type: 'status'; status: 'listening' | 'speaking' } | { type: 'line'; text: string };

export type VoiceSession = {
  subscribe: (listener: (event: VoiceEvent) => void) => () => void;
  stop: () => void;
};

export type VoiceStartResult = { available: true; session: VoiceSession } | { available: false; reason: string };
