import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { Linking, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader, initialsFrom } from '@/components/app-header';
import { ARTWORK } from '@/components/artwork';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Group,
  GroupLabel,
  ListRow,
  Loading,
  ModuleArtwork,
  COLORS,
  Screen,
  StaleBanner,
  StatusPill,
} from '@/components/ui';
import { useAuth, useCompanyId } from '@/features/auth/auth-context';
import { api, type DeliveryStop } from '@/lib/api';

const STATE_LABEL: Record<DeliveryStop['state'], string> = {
  pending: 'Pending',
  en_route: 'En route',
  arrived: 'Arrived',
  complete: 'Complete',
  failed: 'Failed',
};

/** Mockup 05 — Routes / Driver: today's route, next stop front and centre. */
export default function Routes() {
  const { company } = useAuth();
  const companyId = useCompanyId();
  const route = useQuery({ queryKey: ['route', 'today', companyId], queryFn: () => api.routes.today(companyId) });

  const stops = route.data?.stops ?? [];
  const next = stops.find((s) => s.state === 'arrived' || s.state === 'en_route') ?? stops.find((s) => s.state === 'pending');
  const following = next ? stops.find((s) => s.sequence > next.sequence) : undefined;

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        <AppHeader context="Driver · My assigned route" initials={initialsFrom(company?.name)} />

        {route.isPending ? (
          <Loading label="Loading your route" />
        ) : route.isLoadingError ? (
          <ErrorState message={(route.error as Error).message} onRetry={() => route.refetch()} />
        ) : !route.data ? (
          <EmptyState title="No route assigned" hint="Routes appear here once dispatch assigns one to you." />
        ) : (
          <ScrollView
            contentContainerClassName="gap-5 px-5 pb-10 pt-3"
            refreshControl={<RefreshControl refreshing={route.isRefetching} onRefresh={() => route.refetch()} />}
          >
            {route.isRefetchError ? <StaleBanner updatedAt={route.dataUpdatedAt} /> : null}
            <ModuleArtwork
              source={ARTWORK.routes}
              accessibilityLabel="Foodline delivery route map with refrigerated truck and completed stops"
            />

            <View className="gap-1">
              <Text className="text-3xl font-bold text-ink">Today&apos;s route</Text>
              <Text className="text-base text-ink-muted">
                {route.data.code}
                {route.data.vehicleLabel ? ` · ${route.data.vehicleLabel}` : ''}
              </Text>
              <Text className="text-sm text-ink-muted">
                {route.data.stopsComplete} of {route.data.stopsTotal} stops complete
              </Text>
            </View>

            <ProgressBar complete={route.data.stopsComplete} total={route.data.stopsTotal} />

            {next ? (
              <Card className="gap-3 p-4">
                <GroupLabel label={`Next stop · ${next.sequence} of ${route.data.stopsTotal}`} />
                <Text className="text-xl font-bold text-ink">{next.customerName}</Text>

                <View className="gap-1.5">
                  <IconLine icon="map-pin" text={next.address} />
                  {next.windowLabel ? <IconLine icon="clock" text={next.windowLabel} /> : null}
                  {next.note ? <IconLine icon="file-text" text={next.note} /> : null}
                </View>

                <Button
                  label="Start GPS"
                  icon="navigation"
                  onPress={() => {
                    const q = encodeURIComponent(next.address);
                    void Linking.openURL(`https://maps.apple.com/?daddr=${q}`);
                  }}
                />
                <Text className="text-center text-xs text-ink-muted">Opens your configured navigation app</Text>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Button
                      label="Call customer"
                      icon="phone"
                      variant="ghost"
                      disabled={!next.phone}
                      onPress={() => next.phone && void Linking.openURL(`tel:${next.phone}`)}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      label="View shipment"
                      icon="package"
                      variant="ghost"
                      onPress={() => router.push(`/stop/${next.id}` as never)}
                    />
                  </View>
                </View>
              </Card>
            ) : (
              <EmptyState title="Route complete" hint="Every stop on this route is done." />
            )}

            {following ? (
              <Group>
                <ListRow
                  icon="corner-down-right"
                  title={`Next: ${following.customerName}`}
                  subtitle={`Stop ${following.sequence}`}
                  onPress={() => router.push(`/stop/${following.id}` as never)}
                />
              </Group>
            ) : null}

            <View className="gap-2">
              <GroupLabel label="All stops" />
              <Group>
                {stops.map((s) => (
                  <ListRow
                    key={s.id}
                    icon={s.state === 'complete' ? 'check-circle' : 'circle'}
                    title={`${s.sequence}. ${s.customerName}`}
                    subtitle={s.windowLabel ?? s.address}
                    trailing={
                      <StatusPill
                        status={s.state === 'complete' ? 'ok' : s.state === 'arrived' ? 'partial' : 'open'}
                        label={STATE_LABEL[s.state]}
                      />
                    }
                    onPress={() => router.push(`/stop/${s.id}` as never)}
                  />
                ))}
              </Group>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Screen>
  );
}

function ProgressBar({ complete, total }: { complete: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((complete / total) * 100)) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: complete }}
      className="h-2 overflow-hidden rounded-full bg-surface-line"
    >
      <View className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
    </View>
  );
}

function IconLine({ icon, text }: { icon: 'map-pin' | 'clock' | 'file-text'; text: string }) {
  return (
    <View className="flex-row items-start gap-2.5">
      <Feather name={icon} size={16} color={COLORS.inkMuted} style={{ marginTop: 2 }} />
      <Text className="flex-1 text-sm text-ink">{text}</Text>
    </View>
  );
}
