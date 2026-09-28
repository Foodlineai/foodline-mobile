import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useDeferredValue, useState } from 'react';
import { RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader, initialsFrom } from '@/components/app-header';
import {
  Button,
  EmptyState,
  ErrorState,
  Group,
  ListRow,
  Loading,
  NoticeCard,
  Screen as ScreenRoot,
  SeeAllHeader,
  StatusPill,
} from '@/components/ui';
import { useAuth, useCompanyId } from '@/features/auth/auth-context';
import { api, type Item } from '@/lib/api';

const STATUS_LABEL: Record<Item['status'], string> = {
  ok: 'In stock',
  low: 'Below par',
  out: 'Out',
  over: 'Overstock',
};

/**
 * Mockup 04 / prototype `Items.html` (screen 09) — stock work first, browsing
 * second. Retoned to a compact list per the prototype, EXCEPT the pack-size
 * column and Case/Catch-weight tag it draws: `contracts/screen-rpc-map.md`
 * itself marks those fields unconfirmed against the live payload, and `Item`
 * doesn't carry them. Parsing pack size out of `item.name` would be a guess
 * dressed up as a feature — left as the on-hand/status line instead, same
 * data as before, until the RPC shape is confirmed.
 */
export default function Inventory() {
  const { company } = useAuth();
  const companyId = useCompanyId();
  const [search, setSearch] = useState('');
  const [belowParOnly, setBelowParOnly] = useState(false);
  const deferred = useDeferredValue(search);

  const items = useQuery({
    queryKey: ['items', companyId, deferred, belowParOnly],
    queryFn: () => api.items.list(companyId, { search: deferred, onlyBelowPar: belowParOnly }),
  });

  const lowCount = (items.data ?? []).filter((i) => i.status === 'low' || i.status === 'out').length;

  return (
    <ScreenRoot>
      <SafeAreaView className="flex-1" edges={['top']}>
        <AppHeader
          context={company ? `Inventory · ${company.name}` : 'Inventory'}
          initials={initialsFrom(company?.name)}
        />

        <ScrollView
          contentContainerClassName="gap-5 px-5 pb-10 pt-3"
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={items.isRefetching} onRefresh={() => items.refetch()} />}
        >
          <Text className="text-3xl font-bold text-ink">Your stock work</Text>

          <Button label="Scan item or location" icon="maximize" onPress={() => router.push('/receiving')} />

          <View className="rounded-2xl border border-surface-line bg-surface-card px-4">
            <TextInput
              className="h-12 text-base text-ink"
              placeholder="Find item, lot or bin"
              placeholderTextColor="#8A96AF"
              autoCapitalize="none"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {lowCount > 0 ? (
            <NoticeCard
              tone="warn"
              title={`${lowCount} item${lowCount === 1 ? '' : 's'} below par`}
              body="Review before the next order guide run."
              actionLabel={belowParOnly ? 'Show everything' : 'Show only these'}
              onAction={() => setBelowParOnly((v) => !v)}
            />
          ) : null}

          <View className="gap-3">
            <SeeAllHeader title="Stock" onSeeAll={() => router.push('/tools/inventory')} />
            {items.isPending ? (
              <Loading label="Loading inventory" />
            ) : items.isError ? (
              <ErrorState message={(items.error as Error).message} onRetry={() => items.refetch()} />
            ) : items.data.length === 0 ? (
              <EmptyState title="No items match" hint="Try a different search or clear the filter." />
            ) : (
              <Group>
                {items.data.map((item) => (
                  <ItemRow key={item.id} item={item} />
                ))}
              </Group>
            )}
          </View>

          <Group>
            <ListRow
              icon="tool"
              title="Inventory tools"
              subtitle="Lots, counts, transfers, traceability"
              onPress={() => router.push('/tools/inventory')}
            />
          </Group>
        </ScrollView>
      </SafeAreaView>
    </ScreenRoot>
  );
}

/** One line per item, prototype-density: name + sku/vendor, on-hand + status
 * trailing. Tapping opens the fuller detail (on hand/on order/par/days cover)
 * rather than showing all four inline — that's what made the old card busy. */
function ItemRow({ item }: { item: Item }) {
  return (
    <ListRow
      title={item.name}
      subtitle={[item.sku, item.primaryVendorName].filter(Boolean).join(' · ')}
      trailing={
        <View className="items-end gap-1">
          <Text className="text-base font-bold text-ink">
            {item.onHand} {item.uom}
          </Text>
          <StatusPill status={item.status} label={STATUS_LABEL[item.status]} />
        </View>
      }
    />
  );
}
