import { useQuery } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';

import { EmptyState, ErrorState, Loading, Screen } from '@/components/ui';
import { useCompanyId } from '@/features/auth/auth-context';
import { RoutineApprovalScreen } from '@/features/routines/RoutineApprovalScreen';
import type { DraftedPurchaseOrder } from '@/features/routines/types';
import { api } from '@/lib/api';

const READY_STEPS = [
  { id: 'demand', label: 'Demand analysed', state: 'done' as const },
  { id: 'supply', label: 'Supply checked', state: 'done' as const },
  { id: 'draft', label: 'Purchase order drafted', state: 'done' as const },
];

export default function RoutineApproval() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const companyId = useCompanyId();
  const [approving, setApproving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const idempotencyKey = useRef(Crypto.randomUUID());
  const draft = useQuery({
    queryKey: ['purchase-order', 'approval', companyId, id],
    queryFn: () => api.routines.draft(companyId, id!),
    enabled: Boolean(id),
  });

  if (draft.isPending)
    return (
      <Screen>
        <Loading label="Loading purchase order" />
      </Screen>
    );
  if (draft.isLoadingError)
    return (
      <Screen>
        <ErrorState message={(draft.error as Error).message} onRetry={() => draft.refetch()} />
      </Screen>
    );
  if (!draft.data)
    return (
      <Screen>
        <EmptyState
          title="No approval is waiting"
          hint="This purchase order may already have been decided or reassigned."
        />
      </Screen>
    );

  const approve = async (toApprove: DraftedPurchaseOrder) => {
    setApproving(true);
    setMessage(null);
    try {
      await api.routines.approveDraftedPurchaseOrder(companyId, {
        draft: toApprove,
        idempotencyKey: idempotencyKey.current,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (cause) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMessage(cause instanceof Error ? cause.message : 'Approval could not be completed.');
    } finally {
      setApproving(false);
    }
  };

  return (
    <RoutineApprovalScreen
      title={`Review ${draft.data.reference}`}
      steps={READY_STEPS}
      draft={draft.data}
      approving={approving}
      error={message}
      onReviewAndApprove={approve}
      onEditDraft={() => router.push('/tools/purchasing')}
    />
  );
}
