import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader, initialsFrom } from '@/components/app-header';
import {
  Button,
  EmptyState,
  ErrorState,
  Group,
  ListRow,
  Loading,
  Screen,
  SectionHeader,
  StaleBanner,
} from '@/components/ui';
import { useAuth, useCompanyId } from '@/features/auth/auth-context';
import { api } from '@/lib/api';

/**
 * "My Work" — the actor's own queue. Mockup 04 puts the scanner CTA at the top
 * because that is what a warehouse phone is actually for.
 */
export default function MyWork() {
  const { company } = useAuth();
  const companyId = useCompanyId();

  const home = useQuery({ queryKey: ['home', companyId], queryFn: () => api.home.summary(companyId) });

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        <AppHeader context={company?.name ?? 'Foodline'} initials={initialsFrom(company?.name)} />

        <ScrollView
          contentContainerClassName="gap-6 px-5 pb-10 pt-4"
          refreshControl={<RefreshControl refreshing={home.isRefetching} onRefresh={() => home.refetch()} />}
        >
          <Text className="text-3xl font-bold text-ink">Your work</Text>

          <Button
            label="Scan item or location"
            icon="maximize"
            onPress={() => router.push('/receiving')}
          />

          {home.isRefetchError ? <StaleBanner updatedAt={home.dataUpdatedAt} /> : null}

          <View className="gap-3">
            <SectionHeader title="Assigned to you" />
            {home.isPending ? (
              <Loading label="Loading your queue" />
            ) : home.isLoadingError ? (
              <ErrorState message={(home.error as Error).message} onRetry={() => home.refetch()} />
            ) : home.data.needsYou.length === 0 ? (
              <EmptyState title="Your queue is clear" hint="New tasks land here as they are assigned." />
            ) : (
              <Group>
                {home.data.needsYou.map((item) => (
                  <ListRow
                    key={item.key}
                    icon="check-square"
                    title={item.title}
                    subtitle={item.workspace}
                    onPress={item.route ? () => router.push(item.route as never) : undefined}
                  />
                ))}
              </Group>
            )}
          </View>

          <View className="gap-3">
            <SectionHeader title="Warehouse work" />
            <Group>
              <ListRow icon="package" title="Receiving & putaway" onPress={() => router.push('/receiving')} />
              <ListRow icon="box" title="Items & locations" onPress={() => router.push('/inventory')} />
              <ListRow icon="shopping-cart" title="Purchase orders" onPress={() => router.push('/purchasing')} />
            </Group>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
