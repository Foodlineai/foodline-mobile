import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';

import { PostShipmentScreen } from '@/features/shipments/PostShipmentScreen';
import { demoShipmentTarget } from '@/features/shipments/fixtures';

/**
 * Screen 07 — Post shipment. Every field but the date is optional; posting
 * with none of them filled in must succeed.
 *
 * TODO(wiring): the post-shipment RPC name is unconfirmed. This posts nothing
 * anywhere — it simulates success locally so the screen is real to try, not
 * to guess a name that would typecheck against nothing.
 */
export default function PostShipment() {
  const [posting, setPosting] = useState(false);

  const post = () => {
    setPosting(true);
    setTimeout(() => {
      setPosting(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    }, 800);
  };

  return (
    <PostShipmentScreen
      target={demoShipmentTarget}
      initialDate={new Date().toISOString().slice(0, 10)}
      posting={posting}
      onPost={post}
    />
  );
}
