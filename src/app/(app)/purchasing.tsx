import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader, initialsFrom } from '@/components/app-header';
import {
  AlertCard,
  Button,
  EmptyState,
  ErrorState,
  Group,
  ListRow,
  Loading,
  MiniStat,
  Screen,
  SeeAllHeader,
  StaleBanner,
  StatusPill,
} from '@/components/ui';
import { useAuth, useCompanyId } from '@/features/auth/auth-context';
import { api } from '@/lib/api';

/** Mockup 03 — Purchasing Employee. */
export default function Purchasing() {
  const { company } = useAuth();
  const companyId = useCompanyId();
  const summary = useQuery({
    queryKey: ['purchasing', 'summary', companyId],
    queryFn: () => api.purchaseOrders.summary(companyId),
  });

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        <AppHeader context="Purchasing" initials={initialsFrom(company?.name)} />

        {summary.isPending ? (
          <Loading label="Loading purchasing" />
        ) : summary.isLoadingError ? (
          <ErrorState message={(summary.error as Error).message} onRetry={() => summary.refetch()} />
        ) : (
          <ScrollView
            contentContainerClassName="gap-6 px-5 pb-10 pt-3"
            refreshControl={<RefreshControl refreshing={summary.isRefetching} onRefresh={() => summary.refetch()} />}
          >
            {summary.isRefetchError ? <StaleBanner updatedAt={summary.dataUpdatedAt} /> : null}
            <Text className="text-3xl font-bold text-ink">Buying today</Text>

            <View className="flex-row gap-3">
              <MiniStat icon="file-text" value={String(summary.data.approvalCount)} label="approvals" />
              <MiniStat
                icon="alert-triangle"
                tone="danger"
                value={String(summary.data.supplyIssueCount)}
                label="supply issues"
              />
            </View>

            {summary.data.topIssue ? (
              <View className="gap-3">
                <SeeAllHeader title="Needs action" />
                <AlertCard
                  title={summary.data.topIssue.productName}
                  lines={[
                    `${summary.data.topIssue.ordersAffected} customer orders affected`,
                    `Need ${summary.data.topIssue.neededQuantity} ${summary.data.topIssue.uom} · ${summary.data.topIssue.incomingQuantity} incoming`,
                  ]}
                  action={{
                    label: 'Review purchase need',
                    onPress: () => {
                      const purchaseOrder = summary.data.awaitingReview[0];
                      router.push(
                        purchaseOrder ? `/(app)/routine/${purchaseOrder.id}` : '/tools/purchasing'
                      );
                    },
                  }}
                />
              </View>
            ) : null}

            <View className="gap-3">
              <SeeAllHeader title="Awaiting review" onSeeAll={() => router.push('/tools/purchasing')} />
              {summary.data.awaitingReview.length === 0 ? (
                <EmptyState title="Nothing awaiting review" />
              ) : (
                <Group>
                  {summary.data.awaitingReview.map((po) => (
                    <ListRow
                      key={po.id}
                      icon="file-text"
                      title={`${po.number} · ${po.vendorName}`}
                      subtitle={po.expectedAt ? `Due ${po.expectedAt}` : undefined}
                      trailing={
                        po.total === null ? undefined : (
                          <Text className="text-base font-bold text-ink">
                            ${po.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </Text>
                        )
                      }
                      onPress={() => router.push(`/(app)/routine/${po.id}`)}
                    />
                  ))}
                </Group>
              )}
            </View>

            <View className="gap-3">
              <SeeAllHeader title="Incoming today" onSeeAll={() => router.push('/receiving')} />
              {summary.data.incomingToday.length === 0 ? (
                <EmptyState title="Nothing due today" />
              ) : (
                <Group>
                  {summary.data.incomingToday.map((po) => (
                    <ListRow
                      key={po.id}
                      icon="truck"
                      title={`${po.number} · ${po.vendorName}`}
                      subtitle={po.expectedAt ? `Expected ${po.expectedAt}` : undefined}
                      trailing={<StatusPill status="open" label="In transit" />}
                      onPress={() => router.push('/receiving')}
                    />
                  ))}
                </Group>
              )}
            </View>

            <Button label="New purchase order" icon="plus" onPress={() => router.push('/purchasing/new')} />
          </ScrollView>
        )}
      </SafeAreaView>
    </Screen>
  );
}
