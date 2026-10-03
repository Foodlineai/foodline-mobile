/**
 * View-model types for the mobile Copilot. The shapes mirror the ERP's own
 * contracts (`ai-copilot-contracts.ts`, `ai-action-contracts.ts` in
 * Foodlineai/frontend, read from PR #314's branch). The mobile app holds no
 * prompts, tools, model key or action catalog — it renders what the ERP's
 * governed Copilot returns.
 */

export type ChatRole = 'user' | 'assistant';

export type CardKind =
  | 'customers'
  | 'inventory'
  | 'items'
  | 'navigation'
  | 'purchase-orders'
  | 'receivables'
  | 'sales-orders'
  | 'vendors';

export type CopilotCardItem = {
  id: string;
  label: string;
  description: string;
  meta: string;
  badge: string | null;
  /** An ERP web path (e.g. `/items/<id>`). Never navigated to directly — see `appRouteForHref`. */
  href: string | null;
};

export type CopilotCard = {
  id: string;
  kind: CardKind;
  title: string;
  subtitle: string;
  items: CopilotCardItem[];
};

export type QuestionInputMode = 'choice' | 'date' | 'email' | 'money' | 'number' | 'phone' | 'text' | 'textarea';

export type QuestionOption = {
  value: string;
  label: string;
  description: string | null;
  /** Only offered while another question has this answer. */
  availableWhen: { questionId: string; value: string } | null;
};

export type Question = {
  id: string;
  label: string;
  inputMode: QuestionInputMode;
  required: boolean;
  hint: string | null;
  placeholder: string | null;
  multiple: boolean;
  options: QuestionOption[];
};

export type ActionWorkflow =
  | 'create-customer'
  | 'create-purchase-order'
  | 'create-promotion'
  | 'approve-promotion'
  | 'app-action'
  | 'send-report-email';

export type SummaryItem = { label: string; value: string };

export type Questionnaire = {
  kind: 'questionnaire';
  workflow: ActionWorkflow;
  title: string;
  description: string;
  reviewLabel: string;
  questions: Question[];
  initialAnswers: Record<string, string>;
};

export type ActionReview = {
  kind: 'review';
  workflow: ActionWorkflow;
  title: string;
  description: string;
  summary: SummaryItem[];
  confirmLabel: string;
  cancelLabel: string;
  /** One-time, server-signed. The only thing the device sends to commit. */
  proposalToken: string;
  expiresAt: string;
};

export type ActionResult = {
  kind: 'result';
  workflow: ActionWorkflow;
  title: string;
  description: string;
  details: SummaryItem[];
  tone: 'danger' | 'success' | 'warning';
};

export type Interaction = Questionnaire | ActionReview | ActionResult;

export type AttachmentInfo = { fileName: string; mediaType: string; sizeBytes: number };

export type TurnResult = {
  answer: string;
  suggestions: string[];
  cards: CopilotCard[];
  interaction: Interaction | null;
  notice: string | null;
  /** 'local' means the ERP answered without its model (fallback). */
  mode: 'openai' | 'local';
  model: string;
  toolNames: string[];
  executedActions: boolean;
  /** Metadata only; exports are downloaded on the web, not decoded on the phone. */
  attachments: AttachmentInfo[];
};

export type TurnInput = {
  messages: { role: ChatRole; content: string }[];
  pathname: string;
  pageTitle?: string;
  pageDescription?: string;
};

export type CopilotMessage =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; text: string; result: TurnResult }
  | { id: string; role: 'error'; text: string };

/** Errors the UI can show verbatim. `status` 0 means the request never got an answer. */
export class CopilotError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'CopilotError';
  }
}
