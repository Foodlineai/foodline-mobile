import React from 'react';

import { LiveErpFlow } from '@/components/live-erp-flow';

export default function StartRecall() {
  return (
    <LiveErpFlow
      title="Start a recall"
      description="Select the exact live lot, review its traceability, and run the governed recall workflow."
      path="/lots"
    />
  );
}
