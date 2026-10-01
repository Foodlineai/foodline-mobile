import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader, initialsFrom } from '@/components/app-header';
import {
  Button,
  ChecklistLine,
  EmptyState,
  ErrorState,
  Group,
  ListRow,
  Loading,
  Screen,
  StaleBanner,
  StatusPill,
} from '@/components/ui';
import { useAuth, useCompanyId } from '@/features/auth/auth-context';
import { api } from '@/lib/api';
import { openLiveErp } from '@/lib/open-erp';

export default function StopDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { company } = useAuth();
  const companyId = useCompanyId();
  const [opening, setOpening] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ['stop', companyId, id],
    queryFn: () => api.routes.stop(companyId, id!),
    enabled: Boolean(id),
  });

  async function openWorkflow(path: string) {
    if (opening) return;
    setOpening(path);
    setMessage(null);
    try {
      await openLiveErp(path);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'The live ERP could not be opened.');
    } finally {
      setOpening(null);
    }
  }

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        <AppHeader context="Driver" initials={initialsFrom(company?.name)} />
        {detail.isPending ? (
          <Loading label="Loading stop" />
        ) : detail.isLoadingError ? (
          <ErrorState message={(detail.error as Error).message} onRetry={() => detail.refetch()} />
        ) : !detail.data ? (
          <EmptyState title="Stop not found" hint="It may have been reassigned." />
        ) : (
          <ScrollView contentContainerClassName="gap-6 px-5 pb-10 pt-3">
            {detail.isRefetchError ? <StaleBanner updatedAt={detail.dataUpdatedAt} /> : null}
            <View className="gap-2">
              <Text className="text-3xl font-bold text-ink">
                Stop {detail.data.stop.sequence} · {detail.data.stop.customerName}
              </Text>
              <StatusPill
                status={detail.data.stop.state === 'complete' ? 'ok' : 'partial'}
                label={detail.data.stop.state === 'arrived' ? 'Arrived' : detail.data.stop.state}
              />
            </View>

            <View className="gap-3">
              <View className="gap-1">
                <Text className="text-xl font-bold text-ink">Delivery checklist</Text>
                <Text className="text-sm text-ink-muted">
                  {detail.data.lines.length} shipment line{detail.data.lines.length === 1 ? '' : 's'}
                </Text>
              </View>
              {detail.data.lines.length === 0 ? (
                <EmptyState title="No lines on this stop" />
              ) : (
                <View className="overflow-hidden rounded-2xl border border-surface-line">
                  {detail.data.lines.map((line, index) => (
                    <ChecklistLine
                      key={line.id}
                      name={line.productName}
                      quantity={line.quantityLabel}
                      state={line.state}
                      last={index === detail.data!.lines.length - 1}
                    />
                  ))}
                </View>
              )}
              <Button
                label="Scan shipment label"
                icon="maximize"
                variant="ghost"
                loading={opening === '/scanner-work'}
                onPress={() => void openWorkflow('/scanner-work')}
              />
            </View>

            <View className="gap-3">
              <Text className="text-xl font-bold text-ink">Proof of delivery</Text>
              <Group>
                <ListRow
                  icon="alert-triangle"
                  tone="warn"
                  title="Report shortage or refusal"
                  subtitle="Reconcile exact quantities in the live ERP"
                  onPress={() => void openWorkflow('/proof-of-delivery')}
                />
              </Group>
              {message ? <Text className="text-sm text-danger">{message}</Text> : null}
              <Button
                label="Complete proof in live ERP"
                icon="external-link"
                loading={opening === '/proof-of-delivery'}
                onPress={() => void openWorkflow('/proof-of-delivery')}
              />
              <Text className="text-center text-xs text-ink-muted">
                The ERP verifies every quantity, recipient, signature, and photo before recording proof.
              </Text>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Screen>
  );
}
