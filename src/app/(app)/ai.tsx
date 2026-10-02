import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FoodlineButton } from '@/components/FoodlineButton';
import { colors, space, type as typeScale } from '@/theme/tokens';

/**
 * Landing route for `foodline://ai` (A1) — a notification or shared link used
 * to dead-end on "Unmatched Route". The Copilot isn't connected to a live AI
 * service in this build, so this says so plainly and gives a way out rather
 * than fabricating a conversation. The centre AI tab (A2) will replace this
 * body; the route itself stays so the deep link keeps resolving.
 */
export default function Copilot() {
  return (
    <View style={styles.screen}>
      <Text style={styles.body}>
        The Copilot isn&apos;t connected to a live AI service in this build yet. It will propose actions here —
        never commit them.
      </Text>
      <FoodlineButton label="Back to Home" onPress={() => router.replace('/')} testID="copilot-home" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.DEFAULT, padding: space.screen, gap: space.gap, justifyContent: 'center' },
  body: { ...typeScale.body, color: colors.ink.subtle },
});
