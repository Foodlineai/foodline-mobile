import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { Avatar, COLORS, ContextPill } from './ui';

/**
 * The header from every mockup: "Foodline AI ⌄", role/context pill, avatar.
 * The chevron opens company switching when the actor belongs to more than one.
 */
export function AppHeader({
  context,
  initials,
  onPressOrg,
  inlinePill = false,
}: {
  context: string;
  initials: string;
  onPressOrg?: () => void;
  /** Master-admin screens put the pill beside the name instead of beneath it. */
  inlinePill?: boolean;
}) {
  const name = (
    <Pressable
      accessibilityRole={onPressOrg ? 'button' : undefined}
      onPress={onPressOrg}
      disabled={!onPressOrg}
      hitSlop={8}
      className="flex-row items-center gap-2"
    >
      <LinearGradient
        colors={['#7C9CF0', '#4C80FB', '#1E3A8A']}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height: 28, width: 28, borderRadius: 9 }}
      />
      <Text className="text-2xl font-bold text-ink">Foodline AI</Text>
      {onPressOrg ? <Feather name="chevron-down" size={20} color={COLORS.ink} /> : null}
    </Pressable>
  );

  return (
    <View className="gap-2 px-5 pt-2">
      <View className="flex-row items-center justify-between gap-3">
        <View className={inlinePill ? 'flex-1 flex-row items-center gap-2.5' : 'flex-1'}>
          {name}
          {inlinePill ? <ContextPill label={context} /> : null}
        </View>
        <Avatar initials={initials} />
      </View>
      {inlinePill ? null : <ContextPill label={context} />}
    </View>
  );
}

export function initialsFrom(value: string | null | undefined): string {
  if (!value) return 'FL';
  const parts = value.trim().split(/[\s@._-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? 'F';
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? 'L';
  return (first + second).toUpperCase();
}
