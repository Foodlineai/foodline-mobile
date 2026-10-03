import { getAccessToken } from '@/features/auth/workos';
import { env } from '@/lib/env';
import { toInteraction, toTurnResult } from './mappers';
import { CopilotError, type Interaction, type TurnInput, type TurnResult } from './types';

/**
 * Live transport for the governed ERP Copilot — `POST /api/mobile/copilot`
 * and `POST /api/mobile/copilot/action` (Foodlineai/frontend PR #314, read
 * from its branch). WorkOS bearer token + `x-erp-company-id`; the ERP checks
 * company membership and runs the same orchestration and action policy the
 * web dock does. Nothing about prompts, tools or the model lives here.
 *
 * Not deployed as of 2 Oct: the PR is open (one lint error) and the live
 * ERP answers these paths with a redirect to /sign-in. That is detected and
 * reported plainly rather than shown as a generic failure.
 */

const TIMEOUT_MS = 60_000;
const SERVICE_NOT_DEPLOYED_MESSAGE = 'Foodline AI is being updated on the ERP. Please try again shortly.';

function responseErrorMessage(payload: unknown, fallback: string): string {
  const message = (payload as { error?: unknown } | null)?.error;
  if (typeof message !== 'string' || !message.trim()) return fallback;
  // TanStack's HTML-only fallback can itself be returned as JSON by a host
  // that has not deployed the mobile route. It is infrastructure detail, not
  // a Copilot answer, and must never be rendered into the conversation.
  if (/only html requests|html request|mobile copilot yet|route not found/i.test(message)) {
    return SERVICE_NOT_DEPLOYED_MESSAGE;
  }
  return message;
}

async function post(path: string, companyId: string, body: unknown): Promise<unknown> {
  const token = await getAccessToken();
  if (!token) throw new CopilotError('Your session has expired. Sign in again.', 401);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${env.erpBaseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-erp-company-id': companyId,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError')
      throw new CopilotError('The Copilot took too long to answer. Try again.', 0);
    throw new CopilotError("Couldn't reach the Copilot. Check your connection.", 0);
  } finally {
    clearTimeout(timer);
  }

  const isJson = (response.headers.get('content-type') ?? '').includes('application/json');
  if (!isJson || response.url.includes('/sign-in')) {
    throw new CopilotError(SERVICE_NOT_DEPLOYED_MESSAGE, response.status);
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new CopilotError(
      responseErrorMessage(payload, 'Foodline AI could not complete that request.'),
      response.status
    );
  }
  return payload;
}

export async function liveTurn(companyId: string, input: TurnInput): Promise<TurnResult> {
  const payload = await post('/api/mobile/copilot', companyId, {
    locale: 'en',
    messages: input.messages.slice(-12),
    pathname: input.pathname,
    ...(input.pageTitle ? { pageTitle: input.pageTitle } : {}),
    ...(input.pageDescription ? { pageDescription: input.pageDescription } : {}),
  });
  const result = toTurnResult(payload);
  if (!result) throw new CopilotError('The Copilot returned an answer this app could not read.', 502);
  if (/only html requests|html request|route not found/i.test(result.answer)) {
    throw new CopilotError(SERVICE_NOT_DEPLOYED_MESSAGE, 503);
  }
  return result;
}

export async function liveReviewAction(
  companyId: string,
  input: { workflow: string; answers: Record<string, string> }
): Promise<Interaction> {
  const payload = await post('/api/mobile/copilot/action', companyId, {
    kind: 'review',
    locale: 'en',
    workflow: input.workflow,
    answers: input.answers,
  });
  const interaction = toInteraction(payload);
  if (!interaction) throw new CopilotError('The Copilot returned a review this app could not read.', 502);
  return interaction;
}

/** Commits a proposal. The server's one-time token is the only authority; no retry loop. */
export async function liveExecuteAction(companyId: string, proposalToken: string): Promise<Interaction> {
  const payload = await post('/api/mobile/copilot/action', companyId, { kind: 'execute', proposalToken });
  const interaction = toInteraction(payload);
  if (!interaction) throw new CopilotError('The Copilot returned a result this app could not read.', 502);
  return interaction;
}
