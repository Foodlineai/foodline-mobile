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
  NoticeCard,
  Screen,
  SectionHeader,
  StatTile,
  type IconName,
} from '@/components/ui';
import { useAuth, useCompanyId } from '@/features/auth/auth-context';
import { api } from '@/lib/api';

const WORKSPACE_ICONS: Record<string, IconName> = {
  'Sales & Customers': 'file-text',
  Purchasing: 'shopping-cart',
  'Routes & Delivery': 'alert-triangle',
  Inventory: 'box',
  Warehouse: 'home',
};

export default function Home() {
  const { company, session } = useAuth();
  const companyId = useCompanyId();

  const home = useQuery({
    queryKey: ['home', companyId],
    queryFn: () => api.home.summary(companyId),
  });

  const contextLabel = company ? `${titleCase(company.roleKey)} · ${company.name}` : 'Foodline';

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        <AppHeader
          context={contextLabel}
          initials={initialsFrom(home.data?.greetingName ?? session?.actorId)}
          onPressOrg={(session?.companies.length ?? 0) > 1 ? () => router.push('/(auth)/select-company') : undefined}
        />

        {home.isPending ? (
          <Loading label="Loading your day" />
        ) : home.isError ? (
          <ErrorState message={(home.error as Error).message} onRetry={() => home.refetch()} />
        ) : (
          <ScrollView
            contentContainerClassName="gap-6 px-5 pb-10 pt-4"
            refreshControl={<RefreshControl refreshing={home.isRefetching} onRefresh={() => home.refetch()} />}
          >
            <View className="gap-1">
              <Text className="text-3xl font-bold text-ink">
                {greeting()}
                {home.data.greetingName ? `, ${home.data.greetingName}` : ''}
              </Text>
              <Text className="text-base text-ink-muted">
                {home.data.needsYou.length > 0
                  ? `${home.data.needsYou.length} thing${home.data.needsYou.length === 1 ? '' : 's'} ${
                      home.data.needsYou.length === 1 ? 'needs' : 'need'
                    } your attention`
                  : "You're all caught up"}
              </Text>
            </View>

            {home.data.tiles.length > 0 ? (
              <View className="flex-row gap-3">
                {home.data.tiles.map((tile) => (
                  <StatTile key={tile.key} label={tile.label} value={tile.value} />
                ))}
              </View>
            ) : null}

            <View className="gap-3">
              <SectionHeader title="Needs you" />
              {home.data.needsYou.length === 0 ? (
                <EmptyState title="Nothing waiting on you" hint="Approvals and exceptions will appear here." />
              ) : (
                <Group>
                  {home.data.needsYou.map((item) => {
                    const icon = WORKSPACE_ICONS[item.workspace] ?? 'circle';
                    return (
                      <ListRow
                        key={item.key}
                        icon={icon}
                        tone={icon === 'alert-triangle' ? 'danger' : 'default'}
                        title={item.title}
                        subtitle={item.workspace}
                        onPress={item.route ? () => router.push(item.route as never) : undefined}
                      />
                    );
                  })}
                </Group>
              )}
            </View>

            {home.data.acrossCompany.length > 0 ? (
              <View className="gap-3">
                <SectionHeader title="Across your company" />
                <Group>
                  {home.data.acrossCompany.map((line) => (
                    <ListRow
                      key={line.key}
                      icon={WORKSPACE_ICONS[line.label] ?? 'activity'}
                      title={`${line.label} · ${line.detail}`}
                      onPress={line.route ? () => router.push(line.route as never) : undefined}
                    />
                  ))}
                </Group>
              </View>
            ) : null}

            {home.data.aiSummary ? (
              <NoticeCard
                tone="ai"
                title="AI summary"
                body={home.data.aiSummary.body}
                actionLabel={home.data.aiSummary.actionLabel}
                onAction={() => router.push('/(app)/(tabs)/more')}
              />
            ) : null}

            <Button
              label="Open all workspaces"
              trailingChevron
              onPress={() => router.push('/(app)/(tabs)/more')}
            />
          </ScrollView>
        )}
      </SafeAreaView>
    </Screen>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function titleCase(value: string): string {
  return value.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
