import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, Loading, Screen } from '@/components/ui';
import { useCompanyId } from '@/features/auth/auth-context';
import {
  confirmNewSalesOrder,
  loadNewOrderWorkspace,
  quoteNewOrderLine,
} from '@/features/sales/new-order/live-adapter';
import { NewSalesOrderFlow } from '@/features/sales/new-order/NewSalesOrderFlow';

export default function NewSalesOrder() {
  const companyId = useCompanyId();
  const queryClient = useQueryClient();
  const workspace = useQuery({
    queryKey: ['sales', 'new-order', companyId],
    queryFn: () => loadNewOrderWorkspace(companyId),
    staleTime: 30_000,
  });

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        {workspace.isPending ? (
          <Loading label="Loading live order entry" />
        ) : workspace.isLoadingError ? (
          <ErrorState message={(workspace.error as Error).message} onRetry={() => workspace.refetch()} />
        ) : !workspace.data.canManageSalesOrders ? (
          <EmptyState
            title="Sales order access required"
            hint="Your Foodline account can view sales, but it cannot create orders."
          />
        ) : !workspace.data.defaultWarehouse ? (
          <EmptyState
            title="Sales warehouse required"
            hint="Configure the default sales warehouse in the ERP before creating an order."
          />
        ) : (
          <NewSalesOrderFlow
            customers={workspace.data.customers}
            catalog={workspace.data.products}
            currencyCode={workspace.data.currencyCode}
            defaultDeliveryDate={workspace.data.defaultDeliveryDate}
            minimumDeliveryDate={workspace.data.minimumDeliveryDate}
            onQuote={(customer, item, quantity) => {
              if (!customer.defaultSiteId)
                throw new Error('This customer does not have an eligible delivery site.');
              return quoteNewOrderLine(companyId, {
                customerId: customer.id,
                customerSiteId: customer.defaultSiteId,
                item,
                quantity,
              });
            }}
            onCommit={async (draft, attempt) => {
              const result = await confirmNewSalesOrder(companyId, draft, attempt.key);
              void Promise.all([
                queryClient.invalidateQueries({ queryKey: ['sales', companyId] }),
                queryClient.invalidateQueries({ queryKey: ['home', companyId] }),
              ]);
              return result;
            }}
            onOpenSalesOrder={(id) => router.replace(`/(app)/sales-order/${id}`)}
            onCancel={() => router.back()}
          />
        )}
      </SafeAreaView>
    </Screen>
  );
}
