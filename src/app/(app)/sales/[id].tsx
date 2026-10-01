import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';

import { EmptyState, ErrorState, Loading, Screen } from '@/components/ui';
import { useCompanyId } from '@/features/auth/auth-context';
import { SalesOrderDetailScreen } from '@/features/sales/order-detail/SalesOrderDetailScreen';
import { api } from '@/lib/api';

/**
 * Detail screen for a single sales order — `contracts/flows.md`'s build
 * order item 4. On `get_current_sales_order_detail` (confirmed against the
 * live ERP source 1 Oct — see `features/sales/order-detail/adapter.ts`).
 *
 * Confirmed/picking orders already have a dedicated fulfilment screen
 * (`shipment/[orderId]`, S3); `sales.tsx` keeps routing those there. This
 * screen is the landing spot for every other state, so no row in Sales
 * falls through to the `/tools/sales` stub.
 */
export default function SalesOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const companyId = useCompanyId();

  const detail = useQuery({
    queryKey: ['salesOrder', 'detail', companyId, id],
    queryFn: () => api.sales.orderDetail(companyId, id!),
    enabled: Boolean(id),
  });

  if (detail.isPending) {
    return (
      <Screen>
        <Loading label="Loading order" />
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
        <EmptyState title="Order not found" hint="It may have been cancelled or reassigned." />
      </Screen>
    );
  }

  const order = detail.data;

  return <SalesOrderDetailScreen order={order} onOpenCustomer={() => router.push(`/(app)/customer/${order.customer.id}`)} />;
}
