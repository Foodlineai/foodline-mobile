import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';

import { EmptyState, ErrorState, Loading, Screen } from '@/components/ui';
import { useCompanyId } from '@/features/auth/auth-context';
import { PurchaseOrderDetailScreen } from '@/features/purchasing/order-detail/PurchaseOrderDetailScreen';
import { api } from '@/lib/api';

/**
 * Detail screen for a single purchase order — `contracts/flows.md`'s build
 * order item 4. On `get_purchase_order_workspace` (confirmed against the live
 * ERP source 1 Oct — see `features/purchasing/order-detail/adapter.ts`).
 */
export default function PurchaseOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const companyId = useCompanyId();

  const detail = useQuery({
    queryKey: ['purchaseOrder', 'detail', companyId, id],
    queryFn: () => api.purchaseOrders.detail(companyId, id!),
    enabled: Boolean(id),
  });

  if (detail.isPending) {
    return (
      <Screen>
        <Loading label="Loading purchase order" />
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
        <EmptyState title="Purchase order not found" hint="It may have been cancelled or reassigned." />
      </Screen>
    );
  }

  const order = detail.data;

  return (
    <PurchaseOrderDetailScreen
      order={order}
      onOpenVendor={order.vendor.id ? () => router.push(`/(app)/vendor/${order.vendor.id}`) : undefined}
    />
  );
}
