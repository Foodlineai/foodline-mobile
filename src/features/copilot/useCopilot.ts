import { useCallback, useRef, useState } from 'react';

import { api } from '@/lib/api';
import type { PageContext } from './page-context';
import { CopilotError, type ActionReview, type CopilotMessage, type Interaction, type Questionnaire } from './types';

export type InteractionState = {
  interaction: Interaction;
  busy: boolean;
  error: string | null;
};

/**
 * The conversation. Owns message history (the ERP accepts at most the last
 * 12), the per-reply action state, and the review gate: a drafted action is
 * only ever committed by the person tapping confirm on a review the ERP
 * produced. There is no path here that submits on its own.
 */
export function useCopilot(companyId: string, page: PageContext) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [actions, setActions] = useState<Record<string, InteractionState>>({});
  const counter = useRef(0);
  const inFlight = useRef(false);
  const committing = useRef(new Set<string>());
  const nextId = () => `m${(counter.current += 1)}`;

  const ask = useCallback(
    async (text: string, base: CopilotMessage[]) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setPending(true);
      const turn = [...base, { id: nextId(), role: 'user' as const, text }];
      setMessages(turn);
      try {
        const result = await api.copilot.turn(companyId, {
          messages: turn
            .filter((m): m is Extract<CopilotMessage, { role: 'user' | 'assistant' }> => m.role !== 'error')
            .map((m) => ({ role: m.role, content: m.text }))
            .slice(-12),
          pathname: page.pathname,
          pageTitle: page.title,
        });
        const id = nextId();
        setMessages((m) => [...m, { id, role: 'assistant', text: result.answer, result }]);
        if (result.interaction) {
          setActions((a) => ({ ...a, [id]: { interaction: result.interaction as Interaction, busy: false, error: null } }));
        }
      } catch (e) {
        const message = e instanceof CopilotError || e instanceof Error ? e.message : 'Something went wrong.';
        setMessages((m) => [...m, { id: nextId(), role: 'error', text: message }]);
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    },
    [companyId, page.pathname, page.title]
  );

  const send = useCallback((text: string) => ask(text.trim(), messages), [ask, messages]);

  /** Drops the failed attempt and asks again — the same question, as a fresh turn. */
  const retry = useCallback(() => {
    const failedAt = messages.length - 1;
    const last = messages[failedAt];
    if (!last || last.role !== 'error') return;
    const prior = messages.slice(0, failedAt);
    const question = prior[prior.length - 1];
    if (!question || question.role !== 'user') return;
    void ask(question.text, prior.slice(0, -1));
  }, [ask, messages]);

  const reset = useCallback(() => {
    setMessages([]);
    setActions({});
  }, []);

  const patch = (id: string, next: Partial<InteractionState>) =>
    setActions((a) => {
      const cur = a[id];
      return cur ? { ...a, [id]: { ...cur, ...next } } : a;
    });

  const submitQuestionnaire = useCallback(
    async (messageId: string, q: Questionnaire, answers: Record<string, string>) => {
      patch(messageId, { busy: true, error: null });
      try {
        const interaction = await api.copilot.reviewAction(companyId, { workflow: q.workflow, answers });
        patch(messageId, { interaction, busy: false });
      } catch (e) {
        patch(messageId, { busy: false, error: (e as Error).message });
      }
    },
    [companyId]
  );

  const confirm = useCallback(
    async (messageId: string, review: ActionReview) => {
      // One commit in flight per reply: the proposal is one-time server-side, but a double tap shouldn't depend on that.
      if (committing.current.has(messageId)) return;
      committing.current.add(messageId);
      patch(messageId, { busy: true, error: null });
      try {
        const interaction = await api.copilot.executeAction(companyId, review.proposalToken);
        patch(messageId, { interaction, busy: false });
      } catch (e) {
        patch(messageId, { busy: false, error: (e as Error).message });
      } finally {
        committing.current.delete(messageId);
      }
    },
    [companyId]
  );

  const dismiss = useCallback((messageId: string) => {
    setActions((a) => {
      const { [messageId]: _removed, ...rest } = a;
      return rest;
    });
  }, []);

  return { messages, pending, actions, send, retry, reset, submitQuestionnaire, confirm, dismiss };
}
