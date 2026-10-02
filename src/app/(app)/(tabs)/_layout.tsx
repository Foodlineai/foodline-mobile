import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, type AccessibilityState, type GestureResponderEvent } from 'react-native';

import { COLORS, type IconName } from '@/components/ui';

/**
 * Home · My Work · AI · Activity · Search. The AI tab sits in the centre as a
 * raised Nova Indigo disc (Chris's 31 Aug ask: the AI present everywhere, not
 * only on the hub). It replaced "More"; the workspace directory is still a
 * route (`/more`) and is reached from the header's grid button and Home.
 */
type TabDef = { name: string; title: string; icon: IconName };
const HOME: TabDef = { name: 'index', title: 'Home', icon: 'home' };
const MY_WORK: TabDef = { name: 'my-work', title: 'My Work', icon: 'clipboard' };
const ACTIVITY: TabDef = { name: 'activity', title: 'Activity', icon: 'bell' };
const SEARCH: TabDef = { name: 'search', title: 'Search', icon: 'search' };

const NOVA = ['#5A63E9', '#2F3BD6'] as const;

type AiTabButtonProps = { onPress?: (e: GestureResponderEvent) => void; accessibilityState?: AccessibilityState };

function AiTabButton({ onPress, accessibilityState }: AiTabButtonProps) {
  const focused = accessibilityState?.selected;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="AI Copilot"
      accessibilityState={accessibilityState}
      style={styles.aiSlot}
      testID="tab-ai"
    >
      <LinearGradient colors={NOVA} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.disc, focused && styles.discFocused]}>
        <Text style={styles.glyph}>✦</Text>
      </LinearGradient>
      <Text style={[styles.aiLabel, focused && { color: '#2F3BD6' }]}>AI</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const tab = (t: TabDef) => (
    <Tabs.Screen
      key={t.name}
      name={t.name}
      options={{
        title: t.title,
        tabBarIcon: ({ color, size }) => <Feather name={t.icon} size={size ?? 22} color={color} />,
      }}
    />
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.brand,
        tabBarInactiveTintColor: COLORS.inkMuted,
        tabBarStyle: { backgroundColor: COLORS.card, borderTopColor: COLORS.line, height: 88, paddingTop: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: COLORS.surface },
      }}
    >
      {tab(HOME)}
      {tab(MY_WORK)}
      <Tabs.Screen name="ai" options={{ title: 'AI', tabBarButton: (props) => <AiTabButton {...props} /> }} />
      {tab(ACTIVITY)}
      {tab(SEARCH)}
      <Tabs.Screen name="more" options={{ title: 'Workspaces', href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  aiSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  disc: {
    height: 56,
    width: 56,
    borderRadius: 28,
    marginTop: -22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F3BD6',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  discFocused: { shadowOpacity: 0.55 },
  glyph: { color: '#FFFFFF', fontSize: 24, lineHeight: 28 },
  aiLabel: { fontSize: 11, fontWeight: '600', color: COLORS.inkMuted, marginTop: 4 },
});
