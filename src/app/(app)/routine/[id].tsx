import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { RoutineApprovalScreen } from '@/features/routines/RoutineApprovalScreen';
import { coverShortsSteps, coverShortsStepsComplete, demoDraftedPO } from '@/features/routines/fixtures';
import type { DraftedPurchaseOrder } from '@/features/routines/types';

/**
 * Screen 04 — Routine progress, then the approval gate. The product's central
 * commercial claim made visible: the model does the work, a person signs it
 * off. There is no path here that reaches a vendor without the tap below.
 *
 * TODO(wiring): the RPC that actually submits an approval is unconfirmed (see
 * contracts/actions.md's open questions for Lane A). Approving here is local
 * state only — it does not call anything — until that name exists. Do not
 * invent one to make this feel more finished than it is.
 */
export default function RoutineApproval() {
  const [running, setRunning] = useState(true);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRunning(false), 2200);
    return () => clearTimeout(t);
  }, []);

  const steps = running ? coverShortsSteps : coverShortsStepsComplete;
  const draft: DraftedPurchaseOrder | undefined = running ? undefined : demoDraftedPO;

  const approve = () => {
    setApproving(true);
    setTimeout(() => {
      setApproving(false);
      setApproved(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => router.back(), 700);
    }, 900);
  };

  return (
    <RoutineApprovalScreen
      title={approved ? 'Approved · demo only' : "Covering tomorrow's shorts"}
      steps={steps}
      draft={draft}
      approving={approving}
      onReviewAndApprove={approve}
      onEditDraft={() => router.push('/tools/purchasing')}
    />
  );
}
