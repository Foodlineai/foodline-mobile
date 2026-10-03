import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, type AccessibilityState, type GestureResponderEvent } from 'react-native';

import { FoodlineAiOrb } from '@/components/foodline-ai-orb';
import { COLORS, type IconName } from '@/components/ui';
import { useVoice } from '@/features/copilot/voice/VoiceProvider';

/**
 * Home · My Work · AI · Activity · Search. The AI tab sits in the centre as a
 * raised animated Foodline AI orb (Chris's 31 Aug ask: the AI present everywhere, not
 * only on the hub). It replaced "More"; the workspace directory is still a
 * route (`/more`) and is reached from the header's grid button and Home.
 * Tap opens the conversation; long-press toggles inline voice mode.
 */
type TabDef = { name: string; title: string; icon: IconName };
const HOME: TabDef = { name: 'index', title: 'Home', icon: 'home' };
const MY_WORK: TabDef = { name: 'my-work', title: 'My Work', icon: 'clipboard' };
const ACTIVITY: TabDef = { name: 'activity', title: 'Activity', icon: 'bell' };
const SEARCH: TabDef = { name: 'search', title: 'Search', icon: 'search' };

type AiTabButtonProps = {
  onPress?: (e: GestureResponderEvent) => void;
  accessibilityState?: AccessibilityState;
};

function AiTabButton({ onPress, accessibilityState }: AiTabButtonProps) {
  const focused = accessibilityState?.selected;
  const voice = useVoice();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={voice.toggle}
      delayLongPress={380}
      accessibilityRole="button"
      accessibilityLabel={
        voice.active ? 'Foodline AI, voice on. Long press to turn off' : 'Foodline AI. Long press for voice'
      }
      accessibilityActions={[{ name: 'longpress', label: voice.active ? 'Turn voice off' : 'Turn voice on' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'longpress') voice.toggle();
      }}
      accessibilityState={accessibilityState}
      style={styles.aiSlot}
      testID="tab-ai"
    >
      <FoodlineAiOrb size={56} style={[styles.disc, focused && styles.discFocused, voice.active && styles.discLive]} />
      <Text style={[styles.aiLabel, (focused || voice.active) && { color: '#2F3BD6' }]}>{voice.active ? 'Voice' : 'AI'}</Text>
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
  discLive: { shadowColor: '#38BDF8', shadowOpacity: 0.9, shadowRadius: 18 },
  aiLabel: { fontSize: 11, fontWeight: '600', color: COLORS.inkMuted, marginTop: 4 },
});
