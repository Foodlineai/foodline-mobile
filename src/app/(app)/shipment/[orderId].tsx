import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';

import { PostShipmentScreen } from '@/features/shipments/PostShipmentScreen';
import { demoShipmentTarget } from '@/features/shipments/fixtures';
import type { ShipmentDraft } from '@/features/shipments/types';
import { useCompanyId } from '@/features/auth/auth-context';
import { api } from '@/lib/api';

/**
 * Screen 07 — Post shipment, on `ship_current_sales_order` (confirmed against
 * the live ERP source 29 Sep). That RPC has no customer-reference param —
 * `draft.customerReference` is collected by the delivered UI but not sent
 * anywhere yet; see the port's own comment. Idempotency key generated once
 * per attempt, reused on retry; the order's row version goes back unchanged.
 *
 * `target` is still the fixture — there's no confirmed "read one order ready
 * to ship" RPC, only the post command itself.
 */
export default function PostShipment() {
  const companyId = useCompanyId();
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const idempotencyKey = useRef(Crypto.randomUUID());

  const post = async (draft: ShipmentDraft) => {
    setPosting(true);
    setMessage(null);
    try {
      await api.shipments.post(companyId, draft, idempotencyKey.current);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMessage((e as Error).message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <PostShipmentScreen
      target={demoShipmentTarget}
      initialDate={new Date().toISOString().slice(0, 10)}
      posting={posting}
      error={message}
      onPost={post}
    />
  );
}
