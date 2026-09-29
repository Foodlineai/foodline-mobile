import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, EmptyState, ErrorState, Loading, Screen, StatusPill } from '@/components/ui';
import { useCompanyId } from '@/features/auth/auth-context';
import { api, type Item } from '@/lib/api';

const STATUS_LABEL: Record<Item['status'], string> = {
  ok: 'In stock',
  low: 'Below par',
  out: 'Out',
  over: 'Overstock',
};

/**
 * Item detail — the on-hand/on-order/par/days-cover detail that doesn't fit
 * ItemsScreen's row, plus the entry point into a recall (D2's own rule:
 * reached from inside an item, never a quick action).
 */
export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const companyId = useCompanyId();

  // No single-item RPC confirmed — reuse the list and find by id, same as
  // any screen would until `product_directory_snapshot` (or a detail RPC)
  // is confirmed to take an id filter.
  const items = useQuery({ queryKey: ['items', companyId, ''], queryFn: () => api.items.list(companyId) });
  const item = items.data?.find((i) => i.id === id);

  if (items.isPending) {
    return (
      <Screen>
        <Loading label="Loading item" />
      </Screen>
    );
  }
  if (items.isLoadingError) {
    return (
      <Screen>
        <ErrorState message={(items.error as Error).message} onRetry={() => items.refetch()} />
      </Screen>
    );
  }
  if (!item) {
    return (
      <Screen>
        <EmptyState title="Item not found" />
      </Screen>
    );
  }

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView contentContainerClassName="gap-5 px-5 pb-10 pt-4">
          <View className="gap-1">
            <Text className="text-2xl font-bold text-ink">{item.name}</Text>
            <Text className="text-sm text-ink-muted">
              {item.sku}
              {item.primaryVendorName ? ` · ${item.primaryVendorName}` : ''}
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-2">
            <StatusPill status={item.status} label={STATUS_LABEL[item.status]} />
            {item.binLocation ? <StatusPill status="open" label={item.binLocation} /> : null}
            {item.catchWeight ? <StatusPill status="open" label="Catch weight" /> : null}
          </View>

          <Card className="flex-row flex-wrap gap-6 p-4">
            <Metric label="On hand" value={`${item.onHand} ${item.uom}`} />
            <Metric label="On order" value={String(item.onOrder)} />
            <Metric label="Par" value={item.parLevel === null ? '—' : String(item.parLevel)} />
            <Metric label="Days cover" value={item.daysCover === null ? '—' : item.daysCover.toFixed(1)} />
          </Card>

          <Button
            label="Start a recall"
            variant="ghost"
            icon="alert-triangle"
            onPress={() =>
              router.push({ pathname: '/recall/[itemId]', params: { itemId: item.id, name: item.name } } as never)
            }
          />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-[10px] font-medium uppercase text-ink-muted">{label}</Text>
      <Text className="text-sm font-semibold text-ink">{value}</Text>
    </View>
  );
}
