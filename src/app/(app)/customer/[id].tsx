import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';

import { CustomerDetailScreen } from '@/features/customers/CustomerDetailScreen';
import { CUSTOMER_DETAIL_RPC } from '@/features/customers/adapter';
import { demoCustomer, demoCustomerNoPattern } from '@/features/customers/fixtures';

/**
 * Screen 06 — Customer 360. `CUSTOMER_DETAIL_RPC` is unconfirmed (see
 * adapter.ts's header), so this always serves the fixture for now — not a
 * shortcut, the documented fallback until Lane A confirms the RPC name.
 */
export default function CustomerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  void CUSTOMER_DETAIL_RPC; // referenced so the unconfirmed-RPC TODO stays visible here too

  // The live customer list (`c1`/`c2`/`c3`) and this fixture set (`cust-*`)
  // don't share ids yet — there's no RPC to join them on. Riverside exercises
  // the no-repeat-pattern empty state on purpose; everything else falls back
  // to the one full fixture rather than a 404 for an id we can't resolve.
  const customer = id === 'c1' || id === demoCustomerNoPattern.id ? demoCustomerNoPattern : demoCustomer;

  return (
    <CustomerDetailScreen
      customer={customer}
      onBuildOrder={() => router.push(`/(app)/routine/${demoCustomer.id}`)}
      onOpenOrder={() => router.push('/tools/sales')}
    />
  );
}
