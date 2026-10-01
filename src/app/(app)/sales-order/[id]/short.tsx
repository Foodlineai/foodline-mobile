import { useQueries, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert } from 'react-native';

import { EmptyState, ErrorState, Loading, Screen } from '@/components/ui';
import { useCompanyId } from '@/features/auth/auth-context';
import { ResolveShortScreen, type ShortLine } from '@/features/sales/resolve-short/ResolveShortScreen';
import { api } from '@/lib/api';

export default function ResolveShort() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const companyId = useCompanyId();
  const queryClient = useQueryClient();

  const [detailQuery, fulfillmentQuery] = useQueries({
    queries: [
      {
        queryKey: ['salesOrder', 'detail', companyId, id],
        queryFn: () => api.sales.orderDetail(companyId, id!),
        enabled: Boolean(id),
      },
      {
        queryKey: ['salesOrder', 'fulfillment', companyId, id],
        queryFn: () => api.sales.orderFulfillment(companyId, id!),
        enabled: Boolean(id),
      },
    ],
  });

  const [allocatingLineId, setAllocatingLineId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  // One key per screen visit, not per press — a retry of the same cancel
  // attempt must reuse it; a fresh visit is a fresh attempt.
  const cancelKey = useRef(Crypto.randomUUID());

  if (detailQuery.isPending || fulfillmentQuery.isPending) {
    return (
      <Screen>
        <Loading label="Loading order" />
      </Screen>
    );
  }
  if (detailQuery.isLoadingError) {
    return (
      <Screen>
        <ErrorState message={(detailQuery.error as Error).message} onRetry={() => detailQuery.refetch()} />
      </Screen>
    );
  }
  if (fulfillmentQuery.isLoadingError) {
    return (
      <Screen>
        <ErrorState message={(fulfillmentQuery.error as Error).message} onRetry={() => fulfillmentQuery.refetch()} />
      </Screen>
    );
  }
  if (!detailQuery.data || !fulfillmentQuery.data) {
    return (
      <Screen>
        <EmptyState title="Order not found" hint="It may have been cancelled or reassigned." />
      </Screen>
    );
  }

  const order = detailQuery.data;
  const fulfillment = fulfillmentQuery.data;
  const lineById = new Map(order.lines.map((l) => [l.id, l]));
  const shortLines: ShortLine[] = fulfillment.lines
    .filter((f) => Number(f.backorderedBaseQuantity) > 0)
    .map((f) => {
      const line = lineById.get(f.salesOrderLineId);
      return {
        salesOrderLineId: f.salesOrderLineId,
        itemLabel: line?.itemLabel ?? 'Unknown item',
        sku: line?.sku ?? '',
        uomCode: line?.uomCode ?? 'ea',
        backorderedBaseQuantity: f.backorderedBaseQuantity,
      };
    });

  if (shortLines.length === 0) {
    return (
      <Screen>
        <EmptyState title="Nothing to resolve" hint="This order has no short lines right now." />
      </Screen>
    );
  }

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['salesOrder', 'detail', companyId, id] });
    void queryClient.invalidateQueries({ queryKey: ['salesOrder', 'fulfillment', companyId, id] });
  };

  const allocateLine = async (line: ShortLine) => {
    setAllocatingLineId(line.salesOrderLineId);
    try {
      await api.sales.allocateBackorder(companyId, {
        salesOrderLineId: line.salesOrderLineId,
        expectedOrderRowVersion: Number(fulfillment.orderRowVersion),
        quantity: null,
        idempotencyKey: Crypto.randomUUID(),
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Stock allocated', `Reserved available stock for ${line.itemLabel}.`);
      invalidate();
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Could not allocate stock', (e as Error).message);
    } finally {
      setAllocatingLineId(null);
    }
  };

  const cancelRemainder = async (reason: string) => {
    setCancelling(true);
    setCancelError(null);
    try {
      await api.sales.cancelRemainder(companyId, {
        salesOrderId: order.id,
        expectedOrderRowVersion: Number(order.rowVersion),
        reason,
        idempotencyKey: cancelKey.current,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Remaining quantity cancelled', 'Every short line on this order was cancelled.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      invalidate();
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setCancelError((e as Error).message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <ResolveShortScreen
      order={order}
      shortLines={shortLines}
      allocatingLineId={allocatingLineId}
      onAllocateLine={allocateLine}
      cancelling={cancelling}
      cancelError={cancelError}
      onCancelRemainder={cancelRemainder}
    />
  );
}
