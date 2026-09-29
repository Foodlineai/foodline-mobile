import type { RecordAction } from './types';

/**
 * Demo actions. These implement the same contract as live — same shapes, same
 * execution modes.
 *
 * If demo mode let you approve a PO in one tap while live took you through a
 * review screen, the demo would be teaching the customer something false. That
 * is exactly the category of surprise that cost trust before.
 */

export const demoSalesOrderActions: RecordAction[] = [
  { id: 'sales_order.view', label: 'Open order', intent: 'default', execution: 'direct' },
  { id: 'sales_order.post_shipment', label: 'Post shipment', intent: 'primary', execution: 'review' },
  {
    id: 'sales_order.credit',
    label: 'Raise a credit',
    intent: 'default',
    execution: 'review',
    unavailableReason: 'Needs manager approval',
  },
];

export const demoPurchaseOrderActions: RecordAction[] = [
  { id: 'purchase_order.view', label: 'Open PO', intent: 'default', execution: 'direct' },
  {
    id: 'purchase_order.approve_draft',
    label: 'Review and approve',
    intent: 'primary',
    execution: 'draft',
  },
];

export const demoItemActions: RecordAction[] = [
  { id: 'item.view_stock', label: 'View stock', intent: 'default', execution: 'direct' },
  { id: 'item.start_recall', label: 'Start a recall', intent: 'destructive', execution: 'review' },
];
