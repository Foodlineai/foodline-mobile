import { useQueries } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';

import { EmptyState, ErrorState, Loading, Screen } from '@/components/ui';
import { useCompanyId } from '@/features/auth/auth-context';
import { mergeSalesOrderFulfillment } from '@/features/sales/order-detail/adapter';
import { SalesOrderDetailScreen } from '@/features/sales/order-detail/SalesOrderDetailScreen';
import { api } from '@/lib/api';

/**
 * Detail screen for a single sales order — build-brief Priority 1. On
 * `get_current_sales_order_detail` merged with `get_current_sales_order_fulfillment`
 * (both confirmed against the live ERP source 1 Oct — see
 * `features/sales/order-detail/adapter.ts`). Route renamed from the earlier
 * `sales/[id]` to `sales-order/[id]` to match the build brief's convention.
 *
 * Confirmed/picking orders already have a dedicated fulfilment screen
 * (`shipment/[orderId]`, S3); `sales.tsx` keeps routing those there. This
 * screen is the landing spot for every other state, so no row in Sales
 * falls through to the `/tools/sales` stub.
 */
export default function SalesOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const companyId = useCompanyId();

  const [detailQuery, fulfillmentQuery] = useQueries({
    queries: [
      {
        queryKey: ['salesOrder', 'detail', companyId, id],
        queryFn: () => api.sales.orderDetail(companyId, id!),
        enabled: Boolean(id),
      },
      {
        queryKey: ['salesOrder', 'fulfillment', companyId, id],
        queryFn: () => api.sales.orderFulfillment(companyId, id!),
        enabled: Boolean(id),
      },
    ],
  });

  if (detailQuery.isPending) {
    return (
      <Screen>
        <Loading label="Loading order" />
      </Screen>
    );
  }
  if (detailQuery.isLoadingError) {
    return (
      <Screen>
        <ErrorState message={(detailQuery.error as Error).message} onRetry={() => detailQuery.refetch()} />
      </Screen>
    );
  }
  if (!detailQuery.data) {
    return (
      <Screen>
        <EmptyState title="Order not found" hint="It may have been cancelled or reassigned." />
      </Screen>
    );
  }

  // Fulfillment is an enrichment, not a gate — a failed/slow fulfillment
  // fetch still shows the order, just without short/backorder badges.
  const order = mergeSalesOrderFulfillment(detailQuery.data, fulfillmentQuery.data ?? null);

  return (
    <SalesOrderDetailScreen
      order={order}
      onOpenCustomer={() => router.push(`/(app)/customer/${order.customer.id}`)}
      onResolveShort={() => router.push(`/(app)/sales-order/${order.id}/short`)}
    />
  );
}
