import type {
  ActionResult,
  ActionReview,
  ActionWorkflow,
  CardKind,
  CopilotCard,
  Interaction,
  Question,
  QuestionInputMode,
  Questionnaire,
  SummaryItem,
  TurnResult,
} from './types';

type Raw = Record<string, unknown>;

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const nstr = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
const obj = (v: unknown): Raw => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : {});
const arr = (v: unknown): Raw[] => (Array.isArray(v) ? (v as Raw[]) : []);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s !== '') : []);

const CARD_KINDS: CardKind[] = [
  'customers',
  'inventory',
  'items',
  'navigation',
  'purchase-orders',
  'receivables',
  'sales-orders',
  'vendors',
];
const WORKFLOWS: ActionWorkflow[] = [
  'create-customer',
  'create-purchase-order',
  'create-promotion',
  'approve-promotion',
  'app-action',
  'send-report-email',
];
const INPUT_MODES: QuestionInputMode[] = ['choice', 'date', 'email', 'money', 'number', 'phone', 'text', 'textarea'];

const workflow = (v: unknown): ActionWorkflow => (WORKFLOWS.includes(v as ActionWorkflow) ? (v as ActionWorkflow) : 'app-action');

function summary(v: unknown): SummaryItem[] {
  return arr(v).map((s) => ({ label: str(s.label), value: str(s.value) }));
}

function toQuestion(q: Raw): Question {
  return {
    id: str(q.id),
    label: str(q.label),
    inputMode: INPUT_MODES.includes(q.inputMode as QuestionInputMode) ? (q.inputMode as QuestionInputMode) : 'text',
    required: q.required === true,
    hint: nstr(q.hint),
    placeholder: nstr(q.placeholder),
    multiple: q.multiple === true,
    options: arr(q.options).map((o) => {
      const when = obj(o.availableWhen);
      return {
        value: str(o.value),
        label: str(o.label),
        description: nstr(o.description),
        availableWhen: when.questionId ? { questionId: str(when.questionId), value: str(when.value) } : null,
      };
    }),
  };
}

/** Maps one `interaction` object from the ERP, or null if it isn't a shape this app can render. */
export function toInteraction(raw: unknown): Interaction | null {
  const r = obj(raw);
  switch (r.kind) {
    case 'questionnaire': {
      const initial: Record<string, string> = {};
      for (const [k, v] of Object.entries(obj(r.initialAnswers))) if (typeof v === 'string') initial[k] = v;
      const q: Questionnaire = {
        kind: 'questionnaire',
        workflow: workflow(r.workflow),
        title: str(r.title),
        description: str(r.description),
        reviewLabel: str(r.reviewLabel, 'Review'),
        questions: arr(r.questions).map(toQuestion),
        initialAnswers: initial,
      };
      return q;
    }
    case 'review': {
      const proposalToken = str(r.proposalToken);
      if (!proposalToken) return null;
      const review: ActionReview = {
        kind: 'review',
        workflow: workflow(r.workflow),
        title: str(r.title),
        description: str(r.description),
        summary: summary(r.summary),
        confirmLabel: str(r.confirmLabel, 'Confirm'),
        cancelLabel: str(r.cancelLabel, 'Cancel'),
        proposalToken,
        expiresAt: str(r.expiresAt),
      };
      return review;
    }
    case 'result': {
      const tone = r.tone === 'danger' || r.tone === 'warning' ? r.tone : 'success';
      const result: ActionResult = {
        kind: 'result',
        workflow: workflow(r.workflow),
        title: str(r.title),
        description: str(r.description),
        details: summary(r.details),
        tone,
      };
      return result;
    }
    default:
      return null;
  }
}

function toCard(c: Raw): CopilotCard | null {
  if (!CARD_KINDS.includes(c.kind as CardKind)) return null;
  return {
    id: str(c.id),
    kind: c.kind as CardKind,
    title: str(c.title),
    subtitle: str(c.subtitle),
    items: arr(c.items).map((i) => ({
      id: str(i.id),
      label: str(i.label),
      description: str(i.description),
      meta: str(i.meta),
      badge: nstr(i.badge),
      href: nstr(i.href),
    })),
  };
}

/** Maps `POST /api/mobile/copilot`'s body. Null when there is no answer to show. */
export function toTurnResult(raw: unknown): TurnResult | null {
  const r = obj(raw);
  const answer = str(r.answer);
  if (!answer) return null;
  return {
    answer,
    suggestions: strs(r.suggestions),
    cards: arr(r.cards).map(toCard).filter((c): c is CopilotCard => c !== null),
    interaction: toInteraction(r.interaction),
    notice: nstr(r.notice),
    mode: r.mode === 'local' ? 'local' : 'openai',
    model: str(r.model),
    toolNames: strs(r.toolNames),
    executedActions: r.executedActions === true,
    attachments: arr(r.attachments).map((a) => ({
      fileName: str(a.fileName),
      mediaType: str(a.mediaType),
      sizeBytes: typeof a.sizeBytes === 'number' ? a.sizeBytes : 0,
    })),
  };
}

/**
 * ERP card links are web paths. Map only the ones that have a real mobile
 * screen; everything else returns null so the card row stays readable but is
 * never a dead tap. Confirmed from the ERP source: `/items/`, `/vendors/`,
 * `/customers/`, `/sales-orders/`.
 */
export function appRouteForHref(href: string | null): string | null {
  if (!href) return null;
  const m = /^\/(items|vendors|customers|sales-orders|purchase-orders)\/([^/?#]+)$/.exec(href);
  if (!m) return null;
  const [, kind, id] = m;
  if (!kind || !id) return null;
  const map: Record<string, string> = {
    items: 'item',
    vendors: 'vendor',
    customers: 'customer',
    'sales-orders': 'sales-order',
    'purchase-orders': 'purchasing',
  };
  const route = map[kind];
  return route ? `/(app)/${route}/${id}` : null;
}
