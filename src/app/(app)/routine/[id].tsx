import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';

import { RoutineApprovalScreen } from '@/features/routines/RoutineApprovalScreen';
import { coverShortsSteps, coverShortsStepsComplete, demoDraftedPO } from '@/features/routines/fixtures';
import type { DraftedPurchaseOrder } from '@/features/routines/types';
import { useCompanyId } from '@/features/auth/auth-context';
import { api } from '@/lib/api';

/**
 * Screen 04 — Routine progress, then the approval gate. The product's central
 * commercial claim made visible: the model does the work, a person signs it
 * off. There is no path here that reaches a vendor without the tap below —
 * confirmed structurally true server-side too: `decide_purchase_order_approval_command`
 * is the only path to `approved_at`, and PO dispatch refuses to run without it.
 *
 * The draft shown here is still the fixture — there's no confirmed "read one
 * drafted PO" RPC yet, only the approve command. Approving calls the real
 * `decide_purchase_order_approval_command` (via api.routines, live mode) with
 * a command key generated once per attempt and reused on retry, and the PO's
 * row version plus the approval cycle's own id/version sent back unchanged.
 */
export default function RoutineApproval() {
  const companyId = useCompanyId();
  const [running, setRunning] = useState(true);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const idempotencyKey = useRef(Crypto.randomUUID());

  useEffect(() => {
    const t = setTimeout(() => setRunning(false), 2200);
    return () => clearTimeout(t);
  }, []);

  const steps = running ? coverShortsSteps : coverShortsStepsComplete;
  const draft: DraftedPurchaseOrder | undefined = running ? undefined : demoDraftedPO;

  const approve = async (toApprove: DraftedPurchaseOrder) => {
    setApproving(true);
    setMessage(null);
    try {
      await api.routines.approveDraftedPurchaseOrder(companyId, {
        draft: toApprove,
        idempotencyKey: idempotencyKey.current,
      });
      setApproved(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => router.back(), 700);
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMessage((e as Error).message);
    } finally {
      setApproving(false);
    }
  };

  return (
    <RoutineApprovalScreen
      title={approved ? 'Approved' : "Covering tomorrow's shorts"}
      steps={steps}
      draft={draft}
      approving={approving}
      error={message}
      onReviewAndApprove={approve}
      onEditDraft={() => router.push('/tools/purchasing')}
    />
  );
}
