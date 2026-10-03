import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, EmptyState, ErrorState, Group, ListRow, Loading, Screen, SeeAllHeader, StatusPill } from '@/components/ui';
import { useCompanyId } from '@/features/auth/auth-context';
import { api } from '@/lib/api';

function notBuiltYet(what: string) {
  Alert.alert('Not built yet', `${what} isn't part of this drop.`);
}

/**
 * Item detail — "the highest-leverage screen in the app" per the build
 * brief: lots/expiry, recall, cycle counts and traceability all dead-end
 * without it. On `get_current_product_workspace` (confirmed against the
 * live ERP source 1 Oct — see `features/items/detail/adapter.ts`).
 *
 * Cost/pricing/sourcing sections confirmed present on that same RPC are
 * deliberately not fetched here, not just unrendered — per RPC-ADDENDUM-2,
 * "not fetching beats fetching and not rendering" for a persona whose cost
 * visibility is hidden, and this screen has no reliable signal yet for
 * which persona is looking at it.
 */
export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const companyId = useCompanyId();

  const detail = useQuery({
    queryKey: ['items', 'detail', companyId, id],
    queryFn: () => api.items.detail(companyId, id!),
    enabled: Boolean(id),
  });

  if (detail.isPending) {
    return (
      <Screen>
        <Loading label="Loading item" />
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
        <EmptyState title="Item not found" />
      </Screen>
    );
  }

  const item = detail.data;

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView contentContainerClassName="gap-6 px-5 pb-10 pt-4">
          <View className="gap-1">
            <Text className="text-2xl font-bold text-ink">{item.name}</Text>
            <Text className="text-sm text-ink-muted">
              {item.sku}
              {item.categoryName ? ` · ${item.categoryName}` : ''}
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-2">
            {item.trackLots ? <StatusPill status="open" label="Lot tracked" /> : null}
            {item.trackExpiry ? <StatusPill status="open" label="Expiry tracked" /> : null}
            {item.catchWeight ? <StatusPill status="open" label="Catch weight" /> : null}
          </View>

          {!item.canReadInventory ? (
            <Card className="p-4">
              <Text className="text-sm text-ink-muted">
                On-hand, lots and expiry aren&apos;t visible to this role.
              </Text>
            </Card>
          ) : (
            <>
              <View className="gap-3">
                <SeeAllHeader title="On hand by location" />
                {item.locations.length === 0 ? (
                  <EmptyState title="No stock on hand anywhere" />
                ) : (
                  <Group>
                    {item.locations.map((loc, i) => (
                      <ListRow
                        key={loc.warehouseId || i}
                        icon="package"
                        title={loc.warehouseName}
                        subtitle={`${loc.reserved} reserved${loc.onOrder ? ` · ${loc.onOrder} on order` : ''}`}
                        trailing={<Text className="text-base font-bold text-ink">{loc.onHand}</Text>}
                        first={i === 0}
                        last={i === item.locations.length - 1}
                      />
                    ))}
                  </Group>
                )}
              </View>

              <View className="gap-3">
                <SeeAllHeader title="Lots" />
                {item.lots.length === 0 ? (
                  <EmptyState title="No lots on hand" hint={item.trackLots ? undefined : 'This item isn’t lot tracked.'} />
                ) : (
                  <Group>
                    {item.lots.map((lot, i) => (
                      <ListRow
                        key={lot.id}
                        icon="tag"
                        tone={lot.isShortDated ? 'warn' : 'default'}
                        title={lot.lotCode}
                        subtitle={`${lot.warehouseName}${lot.expiresOn ? ` · Exp ${lot.expiresOn}` : ''}`}
                        trailing={<Text className="text-base font-bold text-ink">{lot.onHand}</Text>}
                        first={i === 0}
                        last={i === item.lots.length - 1}
                      />
                    ))}
                  </Group>
                )}
              </View>
            </>
          )}

          <View className="gap-3">
            <SeeAllHeader title="Recent activity" />
            {item.activity.length === 0 ? (
              <EmptyState title="No recorded activity" />
            ) : (
              <Group>
                {item.activity.slice(0, 5).map((entry, i) => (
                  <ListRow
                    key={entry.id}
                    icon="clock"
                    title={entry.action}
                    subtitle={entry.occurredAt}
                    first={i === 0}
                    last={i === Math.min(item.activity.length, 5) - 1}
                  />
                ))}
              </Group>
            )}
          </View>

          <View className="gap-2">
            <Button
              label="Start a recall"
              variant="ghost"
              icon="alert-triangle"
              onPress={() =>
                router.push({ pathname: '/recall/[itemId]', params: { itemId: item.id, name: item.name } } as never)
              }
            />
            <Button label="Traceability" variant="ghost" icon="git-branch" onPress={() => notBuiltYet('Traceability')} />
            <Button label="Start a cycle count" variant="ghost" icon="check-square" onPress={() => notBuiltYet('Cycle count')} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
