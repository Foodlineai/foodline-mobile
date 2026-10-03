import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, Loading, Screen } from '@/components/ui';
import { useCompanyId } from '@/features/auth/auth-context';
import { NewPurchaseOrderFlow } from '@/features/purchasing/NewPurchaseOrderFlow';
import { api } from '@/lib/api';

export default function NewPurchaseOrder() {
  const companyId = useCompanyId();
  const queryClient = useQueryClient();
  const workspace = useQuery({
    queryKey: ['purchase-order-create', companyId],
    queryFn: () => api.purchaseOrders.creationWorkspace(companyId),
  });

  if (workspace.isPending) {
    return (
      <Screen>
        <SafeAreaView className="flex-1" edges={['top']}>
          <Loading label="Loading live purchasing setup" />
        </SafeAreaView>
      </Screen>
    );
  }

  if (workspace.isError) {
    return (
      <Screen>
        <SafeAreaView className="flex-1" edges={['top']}>
          <ErrorState message={workspace.error.message} onRetry={() => workspace.refetch()} />
        </SafeAreaView>
      </Screen>
    );
  }

  if (!workspace.data.canCreate) {
    return (
      <Screen>
        <SafeAreaView className="flex-1" edges={['top']}>
          <EmptyState
            title="Purchase-order creation is not permitted"
            hint="Your Foodline company access allows purchasing reads but not purchase-order creation."
          />
        </SafeAreaView>
      </Screen>
    );
  }

  if (workspace.data.vendors.length === 0 || workspace.data.warehouses.length === 0) {
    return (
      <Screen>
        <SafeAreaView className="flex-1" edges={['top']}>
          <EmptyState
            title="Purchasing setup is incomplete"
            hint="At least one active USD vendor and receiving warehouse are required before an order can be created."
          />
        </SafeAreaView>
      </Screen>
    );
  }

  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      <NewPurchaseOrderFlow
        vendors={workspace.data.vendors}
        warehouses={workspace.data.warehouses}
        orderDate={workspace.data.businessDate}
        catalogFor={(vendorId) => workspace.data.catalog.filter((item) => item.vendorId === vendorId)}
        onCommit={async (draft, attempt) => {
          const created = await api.purchaseOrders.createAndSubmit(companyId, draft, attempt.key);
          await queryClient.invalidateQueries({ queryKey: ['purchasing', companyId] });
          return created;
        }}
        onOpenPurchaseOrder={(id) => router.replace(`/purchasing/${id}`)}
        onCancel={() => router.back()}
      />
    </SafeAreaView>
  );
}
