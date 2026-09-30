import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

import { FoodlineAiOrb } from '@/components/foodline-ai-orb';
import { COLORS, type IconName } from '@/components/ui';

/** The five-tab shell keeps Foodline AI at the centre of every workflow. */
const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home' },
  { name: 'my-work', title: 'My Work', icon: 'clipboard' },
  { name: 'ai', title: 'AI', icon: 'zap' },
  { name: 'activity', title: 'Activity', icon: 'bell' },
  { name: 'more', title: 'More', icon: 'more-horizontal' },
];

export default function TabsLayout() {
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
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) =>
              tab.name === 'ai' ? (
                <FoodlineAiOrb size={54} style={{ marginTop: -18 }} />
              ) : (
                <Feather name={tab.icon} size={size ?? 22} color={color} />
              ),
          }}
        />
      ))}
      <Tabs.Screen name="search" options={{ href: null }} />
    </Tabs>
  );
}
