import type { SalesHome } from './types';

export const demoSalesHome: SalesHome = {
  headline: "Tuesday's book",
  subhead: '11 orders to place before the 3pm cut-off.',
  attention: [
    {
      id: 'so-1048',
      reference: 'SO-1048',
      customerName: 'Riverside Market',
      note: 'Two lines short · alternatives ready',
      status: { label: 'Short', tone: 'warn' },
    },
    {
      id: 'so-1042',
      reference: 'SO-1042',
      customerName: 'Cedar Grove Catering',
      note: 'Stop 3 of 8 · arriving 10:00',
      status: { label: 'On road', tone: 'info' },
    },
  ],
  customers: [
    { id: 'cust-cedar-grove', name: 'Cedar Grove Catering', initials: 'CG', subtitle: 'Tier 2 · orders every Tuesday' },
    { id: 'cust-riverside', name: 'Riverside Market', initials: 'RM', subtitle: 'Tier 1 · $4,180 open balance' },
  ],
  insight: {
    body: 'Cedar Grove has ordered the same eleven lines four weeks running. I can build this week\u2019s order for you to check.',
    actionLabel: 'Build the order',
  },
};

/** Quiet day — exercises the empty attention list and a null insight. */
export const demoSalesHomeQuiet: SalesHome = {
  ...demoSalesHome,
  headline: 'Nothing urgent',
  subhead: 'Every order is on track.',
  attention: [],
  insight: null,
};
