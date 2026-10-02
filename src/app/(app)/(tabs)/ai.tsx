import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FoodlineButton } from '@/components/FoodlineButton';
import { colors, space, type as typeScale } from '@/theme/tokens';

/**
 * The centre AI tab, and the landing route for `foodline://ai` (the link used
 * to hit "Unmatched Route"). The Copilot isn't connected to a live AI service
 * in this build, so this says so plainly rather than fabricating a
 * conversation. When it is connected it only ever *proposes* — every
 * suggestion carries a RecordAction and anything review/draft routes to that
 * surface; nothing here submits (contracts/actions.md).
 */
export default function Copilot() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.body}>
        <Text style={styles.glyph}>✦</Text>
        <Text style={styles.title}>Copilot</Text>
        <Text style={styles.text}>
          Not connected to a live AI service in this build yet. When it is, it will propose actions here — you review
          and approve; it never commits.
        </Text>
        <FoodlineButton label="Back to Home" variant="quiet" onPress={() => router.replace('/')} testID="copilot-home" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  body: { flex: 1, padding: space.screen, gap: space.gap, justifyContent: 'center' },
  glyph: { fontSize: 36, color: '#2F3BD6' },
  title: { ...typeScale.titleSm, color: colors.ink.DEFAULT },
  text: { ...typeScale.body, color: colors.ink.subtle },
});
