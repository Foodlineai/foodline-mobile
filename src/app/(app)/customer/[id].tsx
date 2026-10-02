import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';

import { EmptyState, ErrorState, Loading, Screen } from '@/components/ui';
import { CustomerDetailScreen } from '@/features/customers/CustomerDetailScreen';
import { useCompanyId } from '@/features/auth/auth-context';
import { api } from '@/lib/api';

/**
 * Screen 06 — Customer 360, on `get_current_customer_detail` (confirmed
 * against the live ERP source 29 Sep — see adapter.ts's header for what it
 * does and doesn't return).
 */
export default function CustomerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const companyId = useCompanyId();

  const detail = useQuery({
    queryKey: ['customer', 'detail', companyId, id],
    queryFn: () => api.customers.detail(companyId, id!),
    enabled: Boolean(id),
  });

  if (detail.isPending) {
    return (
      <Screen>
        <Loading label="Loading customer" />
      </Screen>
    );
  }
  if (detail.isLoadingError) {
    return (
      <Screen>
        <ErrorState message={(detail.error as Error).message} onRetry={() => detail.refetch()} />
      </Screen>
    );
  }
  if (!detail.data) {
    return (
      <Screen>
        <EmptyState title="Customer not found" hint="It may have been reassigned or removed." />
      </Screen>
    );
  }

  const customer = detail.data;

  return (
    <CustomerDetailScreen
      customer={customer}
      onBuildOrder={() => router.push('/sales/new')}
      onOpenOrder={(order) => router.push(`/(app)/sales-order/${order.id}`)}
    />
  );
}
