import { useQuery } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';

import { EmptyState, ErrorState, Loading, Screen } from '@/components/ui';
import { useCompanyId } from '@/features/auth/auth-context';
import { PostShipmentScreen } from '@/features/shipments/PostShipmentScreen';
import type { ShipmentDraft } from '@/features/shipments/types';
import { api } from '@/lib/api';

export default function PostShipment() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const companyId = useCompanyId();
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const idempotencyKey = useRef(Crypto.randomUUID());
  const target = useQuery({
    queryKey: ['shipment', 'target', companyId, orderId],
    queryFn: () => api.shipments.target(companyId, orderId!),
    enabled: Boolean(orderId),
  });

  if (target.isPending)
    return (
      <Screen>
        <Loading label="Loading shipment" />
      </Screen>
    );
  if (target.isLoadingError)
    return (
      <Screen>
        <ErrorState message={(target.error as Error).message} onRetry={() => target.refetch()} />
      </Screen>
    );
  if (!target.data)
    return (
      <Screen>
        <EmptyState
          title="Order is not ready to ship"
          hint="Reload the order after its warehouse work is complete."
        />
      </Screen>
    );

  const post = async (draft: ShipmentDraft) => {
    setPosting(true);
    setMessage(null);
    try {
      await api.shipments.post(companyId, draft, idempotencyKey.current);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (cause) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMessage(cause instanceof Error ? cause.message : 'Shipment could not be posted.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <PostShipmentScreen
      target={target.data}
      initialDate={new Date().toISOString().slice(0, 10)}
      posting={posting}
      error={message}
      onPost={post}
    />
  );
}
