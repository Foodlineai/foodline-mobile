import { router } from 'expo-router';
import React from 'react';

import { Attempt } from '@/actions/idempotency';
import { NewPurchaseOrderFlow } from '@/features/purchasing/NewPurchaseOrderFlow';
import { demoCatalogFor, demoCommitPo, demoVendors } from '@/features/purchasing/flow-fixtures';
import type { NewPoDraft } from '@/features/purchasing/types';

/**
 * P1 — New purchase order, end to end (screen not part of the original 12,
 * added in the drop-7 pack). No confirmed RPC exists yet for creating a PO
 * from scratch — my RPC research this session covered approving an
 * already-drafted PO (`decide_purchase_order_approval_command`) and posting
 * a shipment, not creating one. Vendors and catalog stay the delivered
 * fixtures in both demo and live mode until that RPC is confirmed; there's
 * no live source to swap in yet. `demoCommitPo` already exercises the real
 * retry contract (same idempotency key on failure, no duplicate) — see its
 * own comment in flow-fixtures.ts.
 */
export default function NewPurchaseOrder() {
  return (
    <NewPurchaseOrderFlow
      vendors={demoVendors}
      catalogFor={demoCatalogFor}
      onCommit={async (draft: NewPoDraft, _attempt: Attempt) => demoCommitPo(draft.vendorId)}
      onOpenPurchaseOrder={() => router.replace('/purchasing')}
      onCancel={() => router.back()}
    />
  );
}
