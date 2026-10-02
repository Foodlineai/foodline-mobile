import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader, initialsFrom } from '@/components/app-header';
import { Button, EmptyState, ErrorState, Group, ListRow, Loading, Screen, StaleBanner, StatusPill } from '@/components/ui';
import { useAuth, useCompanyId } from '@/features/auth/auth-context';
import { api, type ShipmentLine } from '@/lib/api';
import { openLiveErp } from '@/lib/open-erp';

const STOP_STATUS_PILL: Record<string, { status: string; label: string }> = {
  planned: { status: 'partial', label: 'Not yet arrived' },
  arrived: { status: 'partial', label: 'Arrived' },
  completed: { status: 'ok', label: 'Delivered' },
  skipped: { status: 'out', label: 'Skipped' },
  failed: { status: 'out', label: 'Failed' },
};

/**
 * Mockup 05, right phone — one stop: arrive, what's on the truck, then proof
 * of delivery. On `get_current_delivery_stop_detail` /
 * `record_current_proof_of_delivery_exact` (confirmed against the live ERP
 * source 1 Oct — the proof payload needed a full rewrite, see
 * `lib/api/supabase-adapter.ts`'s `routes` block: it requires a per-line
 * delivered/refused/short reconciliation, not a single boolean, and a
 * separate route row version alongside the stop's own).
 *
 * Each line defaults to fully delivered; marking one "short or refused"
 * moves its whole base quantity there (no partial per-line split in this
 * pass). No signature/photo capture — that needs an uploaded, server-
 * verified evidence record (`signatureAttachmentId`/`photoAttachmentId`),
 * and no upload path exists in this app yet; said so rather than faking a
 * capture toggle that doesn't record anything real.
 */
export default function StopDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { company } = useAuth();
  const companyId = useCompanyId();
  const queryClient = useQueryClient();

  const [recipient, setRecipient] = useState('');
  const [reason, setReason] = useState('');
  const [shortLineIds, setShortLineIds] = useState<Set<string>>(new Set());
  const [openingScanner, setOpeningScanner] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ['stop', companyId, id],
    queryFn: () => api.routes.stop(companyId, id!),
    enabled: Boolean(id),
  });

  async function openScanner() {
    if (openingScanner) return;
    setOpeningScanner(true);
    setMessage(null);
    try {
      await openLiveErp('/scanner-work');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'The live scanner workflow could not be opened.');
    } finally {
      setOpeningScanner(false);
    }
  }

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['stop', companyId, id] });
    void queryClient.invalidateQueries({ queryKey: ['route', 'today', companyId] });
  };

  const arrive = useMutation({
    mutationFn: async () => {
      if (!detail.data) throw new Error('Stop not loaded');
      await api.routes.arriveAtStop(companyId, {
        stopId: detail.data.stop.id,
        expectedRowVersion: detail.data.stop.rowVersion,
        idempotencyKey: Crypto.randomUUID(),
      });
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      invalidate();
    },
    onError: (e: Error) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMessage(e.message);
    },
  });

  const complete = useMutation({
    mutationFn: async () => {
      if (!detail.data) throw new Error('Stop not loaded');
      const lines = detail.data.lines.map((l: ShipmentLine) => {
        const short = shortLineIds.has(l.id);
        return {
          shipmentLineId: l.id,
          deliveredBaseQuantity: short ? 0 : l.baseQuantity,
          refusedBaseQuantity: 0,
          shortBaseQuantity: short ? l.baseQuantity : 0,
        };
      });
      await api.routes.recordProofOfDelivery(companyId, {
        stopId: detail.data.stop.id,
        expectedStopVersion: detail.data.stop.rowVersion,
        expectedRouteVersion: detail.data.routeRowVersion,
        recipientName: recipient.trim() || null,
        reason: reason.trim() || null,
        lines,
        idempotencyKey: Crypto.randomUUID(),
      });
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      invalidate();
      router.back();
    },
    onError: (e: Error) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMessage(e.message);
    },
  });

  const toggleShort = (lineId: string) => {
    setShortLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  };

  const hasAnyDelivered = (detail.data?.lines.length ?? 0) > shortLineIds.size;
  const hasAnyShort = shortLineIds.size > 0;
  const canComplete =
    detail.data?.stop.state === 'arrived' &&
    (!hasAnyDelivered || recipient.trim().length > 0) &&
    (!hasAnyShort || reason.trim().length > 0) &&
    !complete.isPending;

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
              <Text className="text-3xl font-bold text-ink">{detail.data.stop.customerName}</Text>
              <StatusPill
                status={STOP_STATUS_PILL[detail.data.stop.state]?.status ?? 'partial'}
                label={STOP_STATUS_PILL[detail.data.stop.state]?.label ?? detail.data.stop.state}
              />
            </View>

            {detail.data.stop.state === 'planned' ? (
              <Button
                label="Mark arrived"
                icon="map-pin"
                loading={arrive.isPending}
                disabled={arrive.isPending}
                onPress={() => arrive.mutate()}
              />
            ) : (
              <>
                <View className="gap-3">
                  <View className="gap-1">
                    <Text className="text-xl font-bold text-ink">Delivery checklist</Text>
                    <Text className="text-sm text-ink-muted">
                      {detail.data.lines.length} shipment line{detail.data.lines.length === 1 ? '' : 's'} — tap a line to
                      mark it short or refused
                    </Text>
                  </View>
                  {detail.data.lines.length === 0 ? (
                    <EmptyState title="No lines on this stop" />
                  ) : (
                    <Group>
                      {detail.data.lines.map((l, i) => {
                        const short = shortLineIds.has(l.id);
                        return (
                          <ListRow
                            key={l.id}
                            icon={short ? 'alert-triangle' : 'check-circle'}
                            tone={short ? 'warn' : 'default'}
                            title={l.productName}
                            subtitle={short ? 'Short / refused' : 'Delivered in full'}
                            trailing={<Text className="text-base font-bold text-ink">{l.quantity}</Text>}
                            onPress={() => toggleShort(l.id)}
                            first={i === 0}
                            last={i === detail.data!.lines.length - 1}
                          />
                        );
                      })}
                    </Group>
                  )}
                  <Button
                    label="Scan shipment label"
                    icon="maximize"
                    variant="ghost"
                    loading={openingScanner}
                    onPress={() => void openScanner()}
                  />
                </View>

                <View className="gap-3">
                  <Text className="text-xl font-bold text-ink">Proof of delivery</Text>
                  <TextInput
                    value={recipient}
                    onChangeText={setRecipient}
                    placeholder="Recipient name"
                    className="rounded-2xl border border-surface-line bg-surface-card px-4 py-3.5 text-base text-ink"
                  />
                  {hasAnyShort ? (
                    <TextInput
                      value={reason}
                      onChangeText={setReason}
                      placeholder="Reason for the short/refused line(s) (required)"
                      multiline
                      className="rounded-2xl border border-surface-line bg-surface-card px-4 py-3.5 text-base text-ink"
                    />
                  ) : null}
                  <Text className="text-xs text-ink-muted">
                    Signature and photo capture aren&apos;t built yet — this submits the quantities and recipient name
                    only.
                  </Text>
                </View>

                <View className="gap-2">
                  {message ? <Text className="text-sm text-danger">{message}</Text> : null}
                  <Button
                    label="Complete delivery"
                    disabled={!canComplete}
                    loading={complete.isPending}
                    onPress={() => complete.mutate()}
                  />
                </View>
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Screen>
  );
}
