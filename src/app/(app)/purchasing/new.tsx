import React from 'react';

import { LiveErpFlow } from '@/components/live-erp-flow';

export default function NewPurchaseOrder() {
  return (
    <LiveErpFlow
      title="Create purchase order"
      description="Select a live vendor catalog, review exact pricing, and submit the governed purchase order."
      path="/purchase-orders/new"
    />
  );
}
