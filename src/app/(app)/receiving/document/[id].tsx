import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';

import { EmptyState, ErrorState, Loading, Screen } from '@/components/ui';
import { useCompanyId } from '@/features/auth/auth-context';
import { buildCorrections } from '@/features/receiving/documents/adapter';
import { ReviewScreen } from '@/features/receiving/documents/ReviewScreen';
import type { ReviewDraft } from '@/features/receiving/documents/types';
import { api } from '@/lib/api';

/**
 * One command attempt: the key is generated when the user commits and reused
 * for every retry of the *same* attempt (same signature), and discarded once
 * it succeeds. A different payload is a different attempt — the server
 * rejects the same key with a different payload as an idempotency conflict.
 */
function useAttemptKey() {
  const current = useRef<{ signature: string; key: string } | null>(null);
  return {
    keyFor(signature: string) {
      if (!current.current || current.current.signature !== signature) {
        current.current = { signature, key: Crypto.randomUUID() };
      }
      return current.current.key;
    },
    settle() {
      current.current = null;
    },
  };
}

export default function ReceivingDocumentReview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const companyId = useCompanyId();
  const queryClient = useQueryClient();
  const saveAttempt = useAttemptKey();
  const approveAttempt = useAttemptKey();
  const rejectAttempt = useAttemptKey();

  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const review = useQuery({
    queryKey: ['receiving', 'document', companyId, id],
    queryFn: () => api.documents.get(companyId, id!),
    enabled: Boolean(id),
  });

  if (review.isPending) {
    return (
      <Screen>
        <Loading label="Loading document" />
      </Screen>
    );
  }
  if (review.isLoadingError) {
    return (
      <Screen>
        <ErrorState message={(review.error as Error).message} onRetry={() => review.refetch()} />
      </Screen>
    );
  }
  if (!review.data) {
    return (
      <Screen>
        <EmptyState title="Document not found" hint="It may have been removed." />
      </Screen>
    );
  }

  const { detail, order, orderError } = review.data;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['receiving', 'document', companyId, id] });
    void queryClient.invalidateQueries({ queryKey: ['receiving', 'documents', companyId] });
  };

  // A conflict means someone else moved the record: re-read and say so —
  // never overwrite, never retry silently.
  const fail = async (e: unknown) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    const message = (e as Error).message;
    setError(/stale|changed since/i.test(message) ? 'Someone else changed this document. It has been reloaded — review it again.' : message);
    if (/stale|changed since/i.test(message)) await refresh();
  };

  const save = async (draft: ReviewDraft) => {
    if (!order) return;
    setSaving(true);
    setError(null);
    try {
      const corrections = buildCorrections(draft, detail, order, () => Crypto.randomUUID());
      const signature = JSON.stringify({ v: detail.rowVersion, draft });
      await api.documents.saveCorrections(companyId, {
        reviewId: detail.reviewId,
        expectedRowVersion: detail.rowVersion,
        corrections,
        idempotencyKey: saveAttempt.keyFor(signature),
      });
      saveAttempt.settle();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refresh();
    } catch (e) {
      await fail(e);
    } finally {
      setSaving(false);
    }
  };

  const approve = async () => {
    setApproving(true);
    setError(null);
    try {
      await api.documents.approve(companyId, {
        reviewId: detail.reviewId,
        expectedRowVersion: detail.rowVersion,
        idempotencyKey: approveAttempt.keyFor(`approve:${detail.reviewId}:${detail.rowVersion}`),
      });
      approveAttempt.settle();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refresh();
    } catch (e) {
      await fail(e);
    } finally {
      setApproving(false);
    }
  };

  const reject = async (reason: string) => {
    setRejecting(true);
    setError(null);
    try {
      await api.documents.reject(companyId, {
        reviewId: detail.reviewId,
        expectedRowVersion: detail.rowVersion,
        reason,
        idempotencyKey: rejectAttempt.keyFor(`reject:${detail.reviewId}:${detail.rowVersion}:${reason}`),
      });
      rejectAttempt.settle();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refresh();
    } catch (e) {
      await fail(e);
    } finally {
      setRejecting(false);
    }
  };

  return (
    <ReviewScreen
      detail={detail}
      order={order}
      orderError={orderError}
      saving={saving}
      approving={approving}
      rejecting={rejecting}
      error={error}
      onSave={save}
      onApprove={approve}
      onReject={reject}
      onOpenReceipt={() => router.push('/(app)/receiving')}
    />
  );
}
