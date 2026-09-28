import type { Step } from '../../components/primitives';
import type { DraftedPurchaseOrder } from './types';

export const coverShortsSteps: Step[] = [
  { label: 'Read 15 open shorts and backorders', state: 'done' },
  { label: 'Matched 5 open POs already covering stock', state: 'done' },
  { label: 'Checking vendor lead times', state: 'active' },
  { label: 'Draft POs for your approval', state: 'pending' },
];

export const coverShortsStepsComplete: Step[] = coverShortsSteps.map((s) => ({
  ...s,
  state: 'done',
}));

export const demoDraftedPO: DraftedPurchaseOrder = {
  id: 'po-2091',
  reference: 'PO-2091',
  vendorName: 'Fresh Valley Produce',
  formattedTotal: '$1,260.00',
  summary: '4 lines · covers 3 customer orders · lead time 2 days',
  lines: [
    { id: 'l1', description: 'Roma tomatoes · 6 × 5 lb', quantityLabel: '18 cases' },
    { id: 'l2', description: 'Baby spinach · 4 × 2.5 lb', quantityLabel: '8 cases' },
    { id: 'l3', description: 'Green leaf lettuce · 24 ct', quantityLabel: '6 cases' },
  ],
  lineOverflow: 1,
  rowVersion: 'demo-v1',
};
