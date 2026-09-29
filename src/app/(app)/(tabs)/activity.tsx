import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader, initialsFrom } from '@/components/app-header';
import { EmptyState, ErrorState, Group, ListRow, Loading, Screen, StaleBanner } from '@/components/ui';
import { useAuth, useCompanyId } from '@/features/auth/auth-context';
import { api } from '@/lib/api';

export default function Activity() {
  const { company } = useAuth();
  const companyId = useCompanyId();
  const home = useQuery({ queryKey: ['home', companyId], queryFn: () => api.home.summary(companyId) });

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        <AppHeader context={company?.name ?? 'Foodline'} initials={initialsFrom(company?.name)} />
        <ScrollView
          contentContainerClassName="gap-5 px-5 pb-10 pt-4"
          refreshControl={<RefreshControl refreshing={home.isRefetching} onRefresh={() => home.refetch()} />}
        >
          <Text className="text-3xl font-bold text-ink">Activity</Text>
          {home.isRefetchError ? <StaleBanner updatedAt={home.dataUpdatedAt} /> : null}

          {home.isPending ? (
            <Loading />
          ) : home.isLoadingError ? (
            <ErrorState message={(home.error as Error).message} onRetry={() => home.refetch()} />
          ) : home.data.acrossCompany.length === 0 ? (
            <EmptyState title="Nothing to report" hint="Company activity appears here through the day." />
          ) : (
            <Group>
              {home.data.acrossCompany.map((line) => (
                <ListRow
                  key={line.key}
                  icon="activity"
                  title={line.label}
                  subtitle={line.detail}
                  onPress={line.route ? () => router.push(line.route as never) : undefined}
                />
              ))}
            </Group>
          )}

          <View className="pt-2">
            <Text className="text-sm text-ink-muted">
              Notification history and audit events will surface here once the ERP&apos;s notifications
              RPC is wired in.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
