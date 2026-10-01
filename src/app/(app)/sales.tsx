import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader, initialsFrom } from '@/components/app-header';
import {
  EmptyState,
  ErrorState,
  Group,
  ListRow,
  Loading,
  ModuleHero,
  NoticeCard,
  Screen,
  SeeAllHeader,
  StaleBanner,
  StatusPill,
} from '@/components/ui';
import { useAuth, useCompanyId } from '@/features/auth/auth-context';
import { api, type SalesOrder } from '@/lib/api';

const STATE_LABEL: Record<SalesOrder['state'], string> = {
  draft: 'Draft',
  confirmed: 'Confirmed',
  picking: 'Picking',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  short: 'Short',
};

/** Mockup 02 — Sales Employee. */
export default function Sales() {
  const { company } = useAuth();
  const companyId = useCompanyId();
  const sales = useQuery({ queryKey: ['sales', companyId], queryFn: () => api.sales.summary(companyId) });

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        <AppHeader context="Sales" initials={initialsFrom(company?.name)} />

        {sales.isPending ? (
          <Loading label="Loading sales" />
        ) : sales.isLoadingError ? (
          <ErrorState message={(sales.error as Error).message} onRetry={() => sales.refetch()} />
        ) : (
          <ScrollView
            contentContainerClassName="gap-6 px-5 pb-10 pt-3"
            refreshControl={<RefreshControl refreshing={sales.isRefetching} onRefresh={() => sales.refetch()} />}
          >
            {sales.isRefetchError ? <StaleBanner updatedAt={sales.dataUpdatedAt} /> : null}
            <ModuleHero
              eyebrow="Operations"
              title="Sales & Customers"
              subtitle="Customers, orders and follow-ups"
              primary={{ label: 'New order', icon: 'plus', onPress: () => router.push('/sales/new') }}
              secondary={{ label: 'Ask AI', icon: 'zap', onPress: () => router.push('/(app)/(tabs)/ai') }}
            />

            <View className="gap-3">
              <SeeAllHeader title="Orders needing attention" onSeeAll={() => router.push('/tools/sales')} />
              {sales.data.ordersNeedingAttention.length === 0 ? (
                <EmptyState title="Nothing needs attention" hint="Shorts and delivery exceptions land here." />
              ) : (
                <Group>
                  {sales.data.ordersNeedingAttention.map((o) => (
                    <ListRow
                      key={o.id}
                      title={`${o.number} · ${o.customerName}`}
                      subtitle={o.attention ?? undefined}
                      trailing={<StatusPill status={o.state === 'short' ? 'low' : 'open'} label={STATE_LABEL[o.state]} />}
                      onPress={
                        o.state === 'confirmed' || o.state === 'picking'
                          ? () => router.push(`/(app)/shipment/${o.id}`)
                          : () => router.push('/tools/sales')
                      }
                    />
                  ))}
                </Group>
              )}
            </View>

            <View className="gap-3">
              <SeeAllHeader title="Customers" onSeeAll={() => router.push('/tools/sales')} />
              {sales.data.customers.length === 0 ? (
                <EmptyState title="No customers yet" />
              ) : (
                <Group>
                  {sales.data.customers.map((c) => (
                    <ListRow
                      key={c.id}
                      title={c.name}
                      subtitle={c.subtitle ?? 'Open customer details'}
                      onPress={() => router.push(`/(app)/customer/${c.id}`)}
                    />
                  ))}
                </Group>
              )}
            </View>

            {sales.data.aiInsight ? (
              <NoticeCard
                tone="ai"
                title="AI insights & summary"
                body={sales.data.aiInsight.body}
                actionLabel={sales.data.aiInsight.actionLabel}
                onAction={() => router.push('/tools/sales')}
              />
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </Screen>
  );
}
