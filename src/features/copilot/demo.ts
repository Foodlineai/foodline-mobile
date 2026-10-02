import { CopilotError, type ActionReview, type Interaction, type TurnInput, type TurnResult } from './types';

/**
 * Demo transport — scripted, clearly labelled, nothing leaves the device.
 * It exists so the conversational UI, cards and the review gate can be used
 * and verified without credentials. Replies are keyword-matched fixtures,
 * not a model; every one carries a notice saying so.
 */
const DEMO_NOTICE = 'Demo mode — scripted replies, nothing is sent to the ERP.';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const base: Omit<TurnResult, 'answer'> = {
  suggestions: ['What needs my attention today?', 'Which items are below par?', 'Show open purchase orders'],
  cards: [],
  interaction: null,
  notice: DEMO_NOTICE,
  mode: 'local',
  model: 'demo',
  toolNames: [],
  executedActions: false,
  attachments: [],
};

function reply(text: string, extra: Partial<TurnResult> = {}): TurnResult {
  return { ...base, answer: text, ...extra };
}

export async function demoTurn(input: TurnInput): Promise<TurnResult> {
  await wait(700);
  const last = input.messages[input.messages.length - 1]?.content.toLowerCase() ?? '';

  if (/below par|low stock|reorder|running low|items/.test(last)) {
    return reply('Three items are below par. Romaine Hearts is the most urgent — about two days of cover.', {
      toolNames: ['read_items'],
      suggestions: ['Create a purchase order for these', 'Show open purchase orders'],
      cards: [
        {
          id: 'c-items',
          kind: 'items',
          title: 'Below par',
          subtitle: '3 items',
          items: [
            { id: 'i1', label: 'Romaine Hearts, 24ct', description: 'PRD-1042 · Valley Greens', meta: '18 on hand · par 60', badge: 'Low', href: '/items/i1' },
            { id: 'i5', label: 'Shoestring Fries 6/5lb', description: 'FRZ-5580 · Northline Frozen', meta: '7 on hand · par 25', badge: 'Low', href: '/items/i5' },
            { id: 'i3', label: 'Chicken Breast, Boneless 40lb', description: 'PRO-0771 · Southern Poultry Co', meta: '0 on hand · par 30', badge: 'Out', href: '/items/i3' },
          ],
        },
      ],
    });
  }
  if (/purchase order|po\b|pos\b/.test(last) && !/create|draft|raise|new/.test(last)) {
    return reply('Two purchase orders are open. PO-4468 from Southern Poultry is partially received.', {
      toolNames: ['read_purchase_orders'],
      cards: [
        {
          id: 'c-po',
          kind: 'purchase-orders',
          title: 'Open purchase orders',
          subtitle: '2 open',
          items: [
            { id: 'po1', label: 'PO-4471 · Valley Greens', description: 'Sent · due 23 Sep', meta: '$2,140.00', badge: 'Sent', href: '/purchase-orders/po1' },
            { id: 'po2', label: 'PO-4468 · Southern Poultry Co', description: 'Partial · due 22 Sep', meta: '$2,514.00', badge: 'Partial', href: '/purchase-orders/po2' },
          ],
        },
      ],
    });
  }
  if (/create|draft|raise|new/.test(last) && /order|po\b/.test(last)) {
    return reply("I can draft that. I'll ask two questions, then show you the order to review. Nothing is created until you confirm.", {
      interaction: {
        kind: 'questionnaire',
        workflow: 'create-purchase-order',
        title: 'New purchase order',
        description: 'Tell me the vendor and anything the buyer should know.',
        reviewLabel: 'Review order',
        initialAnswers: {},
        questions: [
          {
            id: 'vendor', label: 'Vendor', inputMode: 'choice', required: true, hint: null, placeholder: null, multiple: false,
            options: [
              { value: 'v1', label: 'Valley Greens', description: 'Produce', availableWhen: null },
              { value: 'v2', label: 'Southern Poultry Co', description: 'Protein', availableWhen: null },
            ],
          },
          { id: 'note', label: 'Note for the buyer', inputMode: 'textarea', required: false, hint: null, placeholder: 'Optional', multiple: false, options: [] },
        ],
      },
    });
  }
  if (/attention|today|summary|brief/.test(last)) {
    return reply('Three things need you: 6 quotes to confirm, 2 purchase approvals, and 3 delivery exceptions.', {
      toolNames: ['read_work_queue'],
    });
  }
  return reply("I can look up items, vendors, customers and orders, and draft a purchase order for you to review. What would you like?");
}

export async function demoReviewAction(input: { workflow: string; answers: Record<string, string> }): Promise<Interaction> {
  await wait(500);
  if (input.workflow !== 'create-purchase-order') throw new CopilotError('That workflow is not available in the demo.', 400);
  const vendor = input.answers.vendor === 'v2' ? 'Southern Poultry Co' : 'Valley Greens';
  const review: ActionReview = {
    kind: 'review',
    workflow: 'create-purchase-order',
    title: 'Review purchase order',
    description: 'Nothing is created until you confirm.',
    summary: [
      { label: 'Vendor', value: vendor },
      { label: 'Lines', value: '3 items below par' },
      { label: 'Note', value: input.answers.note?.trim() || '—' },
    ],
    confirmLabel: 'Create draft order',
    cancelLabel: 'Cancel',
    proposalToken: 'demo-proposal-token-0000000000000000000000',
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
  };
  return review;
}

export async function demoExecuteAction(proposalToken: string): Promise<Interaction> {
  await wait(600);
  if (!proposalToken.startsWith('demo-')) throw new CopilotError('Unknown proposal.', 400);
  return {
    kind: 'result',
    workflow: 'create-purchase-order',
    title: 'Draft order created (demo)',
    description: 'This is the demo — no order was created in any system.',
    details: [{ label: 'Status', value: 'Draft — needs approval before it reaches a vendor' }],
    tone: 'success',
  };
}
