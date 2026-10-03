import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useDeferredValue, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader, initialsFrom } from '@/components/app-header';
import { EmptyState, ErrorState, Group, ListRow, Loading, Screen } from '@/components/ui';
import { useAuth, useCompanyId } from '@/features/auth/auth-context';
import { api } from '@/lib/api';
import { WORKSPACES } from '@/features/workspaces/catalog';

/** One search box across items and modules — the phone's fastest way in. */
export default function Search() {
  const { company } = useAuth();
  const companyId = useCompanyId();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const active = deferred.trim().length >= 2;

  const items = useQuery({
    queryKey: ['search', 'items', companyId, deferred],
    queryFn: () => api.items.list(companyId, { search: deferred }),
    enabled: active,
  });

  const modules = active
    ? WORKSPACES.filter((w) => w.label.toLowerCase().includes(deferred.trim().toLowerCase()))
    : [];

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        <AppHeader context={company?.name ?? 'Foodline'} initials={initialsFrom(company?.name)} />

        <View className="gap-4 px-5 pt-4">
          <Text className="text-3xl font-bold text-ink">Search</Text>
          <View className="rounded-2xl border border-surface-line bg-surface-card px-4">
            <TextInput
              className="h-12 text-base text-ink"
              placeholder="Find an item, lot, bin or module"
              placeholderTextColor="#8A96AF"
              autoCapitalize="none"
              autoFocus
              value={query}
              onChangeText={setQuery}
            />
          </View>

          {!active ? (
            <EmptyState title="Start typing" hint="At least two characters." />
          ) : items.isPending ? (
            <Loading label="Searching" />
          ) : items.isLoadingError ? (
            <ErrorState message={(items.error as Error).message} onRetry={() => items.refetch()} />
          ) : (
            <View className="gap-5">
              {modules.length > 0 ? (
                <Group>
                  {modules.map((m) => (
                    <ListRow
                      key={m.key}
                      icon={m.icon}
                      title={m.label}
                      subtitle="Workspace"
                      onPress={m.route ? () => router.push(m.route as never) : undefined}
                    />
                  ))}
                </Group>
              ) : null}

              {items.data.length === 0 && modules.length === 0 ? (
                <EmptyState title="No matches" hint="Try a SKU or a shorter term." />
              ) : items.data.length > 0 ? (
                <Group>
                  {items.data.slice(0, 12).map((item) => (
                    <ListRow
                      key={item.id}
                      icon="box"
                      title={item.name}
                      subtitle={`${item.sku} · ${item.onHand} ${item.uom} on hand`}
                      onPress={() => router.push('/inventory')}
                    />
                  ))}
                </Group>
              ) : null}
            </View>
          )}
        </View>
      </SafeAreaView>
    </Screen>
  );
}
