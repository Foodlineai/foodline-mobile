import React from 'react';

import { LiveErpFlow } from '@/components/live-erp-flow';

export default function NewSalesOrder() {
  return (
    <LiveErpFlow
      title="Create sales order"
      description="Build, price, review, and confirm the order against the live customer and product catalog."
      path="/new-order"
    />
  );
}
