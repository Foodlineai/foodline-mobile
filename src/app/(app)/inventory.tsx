import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, Loading, Screen, StaleBanner } from '@/components/ui';
import { ITEM_FILTERS, matchesFilter, toStockItem } from '@/features/inventory/adapter';
import { ItemsScreen } from '@/features/inventory/ItemsScreen';
import { useCompanyId } from '@/features/auth/auth-context';
import { api } from '@/lib/api';

/**
 * Screen 09 — Items (D1), on the delivered `ItemsScreen`. The two 18 Sep
 * corrections — pack size in its own column, Case vs Catch weight — are
 * real now: `catchWeight` is a confirmed field on `product_directory_snapshot`
 * (see features/inventory/adapter.ts). Pack size itself is confirmed absent
 * from that RPC, so it falls back to the UOM code rather than a guess.
 */
export default function Inventory() {
  const companyId = useCompanyId();
  const [filterId, setFilterId] = useState('all');

  const items = useQuery({ queryKey: ['items', companyId, ''], queryFn: () => api.items.list(companyId) });

  const stockItems = useMemo(() => (items.data ?? []).map(toStockItem), [items.data]);
  const filtered = useMemo(
    () => stockItems.filter((i) => matchesFilter(i, filterId)),
    [stockItems, filterId]
  );

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        {items.isRefetchError ? <StaleBanner updatedAt={items.dataUpdatedAt} /> : null}

        {items.isPending ? (
          <Loading label="Loading inventory" />
        ) : items.isLoadingError ? (
          <ErrorState message={(items.error as Error).message} onRetry={() => items.refetch()} />
        ) : items.data.length === 0 ? (
          <EmptyState title="No items yet" />
        ) : (
          <ItemsScreen
            items={filtered}
            filters={ITEM_FILTERS}
            activeFilterId={filterId}
            onFilterChange={setFilterId}
            onOpenItem={(item) => router.push(`/item/${item.id}` as never)}
            onOpenCycleCounts={() => router.push('/inventory/counts' as never)}
          />
        )}
      </SafeAreaView>
    </Screen>
  );
}
