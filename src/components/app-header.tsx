import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { FoodlineAiOrb } from './foodline-ai-orb';
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
      <FoodlineAiOrb size={32} />
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
