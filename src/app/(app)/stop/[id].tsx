import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader, initialsFrom } from '@/components/app-header';
import {
  Button,
  EmptyState,
  ErrorState,
  FieldRow,
  Group,
  GroupLabel,
  ChecklistLine,
  ListRow,
  Loading,
  Screen,
  StatusPill,
} from '@/components/ui';
import { useAuth, useCompanyId } from '@/features/auth/auth-context';
import { api } from '@/lib/api';

/**
 * Mockup 05, right phone — one stop: what is on the truck, then proof of delivery.
 *
 * Submitting goes to `record_current_proof_of_delivery_exact` with a command key
 * (idempotency) and the stop's row version (optimistic concurrency), the same
 * discipline as receiving — a dropped connection mid-submit must never record a
 * delivery twice or overwrite a newer stop state.
 */
export default function StopDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { company } = useAuth();
  const companyId = useCompanyId();
  const queryClient = useQueryClient();

  const [recipient, setRecipient] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ['stop', companyId, id],
    queryFn: () => api.routes.stop(companyId, id!),
    enabled: Boolean(id),
  });

  const complete = useMutation({
    mutationFn: async () => {
      if (!detail.data) throw new Error('Stop not loaded');
      await api.routes.recordProofOfDelivery(companyId, {
        stopId: detail.data.stop.id,
        stopRowVersion: detail.data.stop.rowVersion,
        recipientName: recipient,
        signatureCaptured: signed,
        photoCaptured: photo,
        idempotencyKey: Crypto.randomUUID(),
      });
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ['stop', companyId, id] });
      void queryClient.invalidateQueries({ queryKey: ['routes'] });
      router.back();
    },
    onError: (e: Error) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMessage(e.message);
    },
  });

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={['top']}>
        <AppHeader context="Driver" initials={initialsFrom(company?.name)} />

        {detail.isPending ? (
          <Loading label="Loading stop" />
        ) : detail.isError ? (
          <ErrorState message={(detail.error as Error).message} onRetry={() => detail.refetch()} />
        ) : !detail.data ? (
          <EmptyState title="Stop not found" hint="It may have been reassigned." />
        ) : (
          <ScrollView contentContainerClassName="gap-6 px-5 pb-10 pt-3">
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
                  {detail.data.lines.map((l, i) => (
                    <ChecklistLine
                      key={l.id}
                      name={l.productName}
                      quantity={l.quantityLabel}
                      state={l.state}
                      last={i === detail.data!.lines.length - 1}
                    />
                  ))}
                </View>
              )}
              <Button
                label="Scan shipment label"
                icon="maximize"
                variant="ghost"
                onPress={() => router.push('/receiving')}
              />
            </View>

            <View className="gap-3">
              <Text className="text-xl font-bold text-ink">Proof of delivery</Text>
              <View className="gap-2">
                <FieldRow
                  icon="user"
                  placeholder="Recipient name"
                  value={recipient}
                  onPress={() => setRecipient(recipient ? null : 'Signed by store manager')}
                />
                <FieldRow
                  icon="edit-3"
                  placeholder="Capture signature"
                  value={signed ? 'Signature captured' : null}
                  onPress={() => setSigned((v) => !v)}
                />
                <FieldRow
                  icon="camera"
                  placeholder="Add delivery photo"
                  value={photo ? 'Photo attached' : null}
                  onPress={() => setPhoto((v) => !v)}
                />
              </View>

              <Group>
                <ListRow
                  icon="alert-triangle"
                  tone="warn"
                  title="Report shortage or refusal"
                  onPress={() => router.push('/receiving')}
                />
              </Group>
            </View>

            <View className="gap-2">
              <GroupLabel label="Finish" />
              {message ? <Text className="text-sm text-danger">{message}</Text> : null}
              <Button
                label="Complete delivery"
                disabled={(!recipient && !signed && !photo) || complete.isPending}
                loading={complete.isPending}
                onPress={() => complete.mutate()}
              />
              <Text className="text-center text-xs text-ink-muted">
                Review quantities before completing this stop
              </Text>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Screen>
  );
}
