import { getAccessToken } from '@/features/auth/workos';
import { env } from '@/lib/env';
import type { UUID } from '@/lib/api';

export type AiChatMessage = { role: 'user' | 'assistant'; content: string };

export type AiQuestion = {
  id: string;
  label: string;
  inputMode: 'choice' | 'date' | 'email' | 'money' | 'number' | 'phone' | 'text' | 'textarea';
  required: boolean;
  multiple: boolean;
  hint: string | null;
  placeholder: string | null;
  options: {
    label: string;
    value: string;
    description: string | null;
    availableWhen: { questionId: string; value: string } | null;
  }[];
};

export type AiInteraction =
  | {
      kind: 'questionnaire';
      title: string;
      description: string;
      reviewLabel: string;
      workflow: string;
      initialAnswers: Record<string, string>;
      questions: AiQuestion[];
    }
  | {
      kind: 'review';
      title: string;
      description: string;
      confirmLabel: string;
      cancelLabel: string;
      proposalToken: string;
      workflow: string;
      summary: { label: string; value: string }[];
    }
  | {
      kind: 'result';
      title: string;
      description: string;
      tone: 'danger' | 'success' | 'warning';
      workflow: string;
      details: { label: string; value: string }[];
    };

export type AiTurnResult = {
  answer: string;
  interaction: AiInteraction | null;
  mode: 'openai' | 'local';
  model: string;
  notice: string | null;
  suggestions: string[];
};

async function post<T>(companyId: UUID, path: string, body: unknown): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error('Your session expired. Sign in again to use Foodline AI.');

  const response = await fetch(`${env.erpBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-erp-company-id': companyId,
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error || `Foodline AI request failed (${response.status})`);
  return payload as T;
}

export function sendFoodlineAiMessage(companyId: UUID, messages: AiChatMessage[]) {
  return post<AiTurnResult>(companyId, '/api/mobile/copilot', {
    locale: 'en',
    messages: messages.slice(-12),
    pageDescription: 'Foodline Android operations companion',
    pageTitle: 'Foodline AI',
    pathname: '/mobile/ai',
  });
}

export function reviewFoodlineAiAction(
  companyId: UUID,
  input: { answers: Record<string, string>; workflow: string }
) {
  return post<AiInteraction>(companyId, '/api/mobile/copilot/action', {
    kind: 'review',
    answers: input.answers,
    locale: 'en',
    workflow: input.workflow,
  });
}

export function executeFoodlineAiAction(companyId: UUID, proposalToken: string) {
  return post<AiInteraction>(companyId, '/api/mobile/copilot/action', {
    kind: 'execute',
    proposalToken,
  });
}
