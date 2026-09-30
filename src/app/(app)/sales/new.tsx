import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';

import { Attempt } from '@/actions/idempotency';
import { Loading, Screen } from '@/components/ui';
import { useCompanyId } from '@/features/auth/auth-context';
import { demoCatalog, demoCommitSalesOrder } from '@/features/sales/new-order/fixtures';
import { NewSalesOrderFlow } from '@/features/sales/new-order/NewSalesOrderFlow';
import type { NewSalesOrderDraft } from '@/features/sales/new-order/types';
import { api } from '@/lib/api';

/**
 * S1 — New sales order (contracts/flows.md's own next-priority item after
 * P1 and I5, both already done). Customers are real, live data
 * (`api.sales.customers()`, already wired) — an improvement over P1, which
 * had no confirmed vendor-directory RPC and stayed fixture-only. The
 * catalog stays a fixture; see fixtures.ts for why real Item data can't
 * supply a sale price honestly. No confirmed "create sales order" RPC
 * either, so commit stays local-only (same TODO(wiring) discipline as P1's
 * demoCommitPo) — not invented.
 */
export default function NewSalesOrder() {
  const companyId = useCompanyId();
  const customers = useQuery({
    queryKey: ['sales', 'customers', companyId],
    queryFn: () => api.sales.customers(companyId),
  });

  if (customers.isPending) {
    return (
      <Screen>
        <Loading label="Loading customers" />
      </Screen>
    );
  }

  return (
    <NewSalesOrderFlow
      customers={customers.data ?? []}
      catalog={demoCatalog}
      onCommit={async (draft: NewSalesOrderDraft, _attempt: Attempt) => demoCommitSalesOrder(draft.customerId)}
      onOpenSalesOrder={() => router.replace('/sales')}
      onCancel={() => router.back()}
    />
  );
}
