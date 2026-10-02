import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radius, space } from '../theme/tokens';

/**
 * The 3D control. Twelve screens inherit this — do not reimplement it per screen.
 *
 * Four parts, all of them load-bearing (contracts/design.md §2):
 *   1. vertical gradient, lifted top stop to darker bottom stop
 *   2. a gloss band over the top 48%
 *   3. a hairline light border
 *   4. an ambient shadow tinted with the button's own colour
 *
 * The tinted shadow is most of the effect. On iOS that is `shadowColor` set to
 * the brand hex. On Android, `elevation` will not take a colour — accept the
 * grey shadow. Faking it with a blurred sibling View costs a frame on every
 * scroll, which matters more on a warehouse handset than the shadow does.
 */

type Variant = 'primary' | 'ai' | 'danger' | 'quiet';

const PALETTE: Record<Variant, { lift: string; base: string; label: string; glow: string }> = {
  primary: {
    lift: colors.brand.lift,
    base: colors.brand.pressed,
    label: '#FFFFFF',
    glow: colors.brand.DEFAULT,
  },
  ai: {
    lift: '#5A63E9',
    base: '#2F3BD6',
    label: '#FFFFFF',
    glow: colors.ai.DEFAULT,
  },
  danger: {
    lift: '#D4463D',
    base: '#AE271F',
    label: '#FFFFFF',
    glow: colors.danger.DEFAULT,
  },
  quiet: {
    lift: colors.surface.card,
    base: colors.surface.raised,
    label: colors.ink.muted,
    glow: 'transparent',
  },
};

export type FoodlineButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  /** Renders a spinner and blocks presses. Use for in-flight mutations. */
  busy?: boolean;
  disabled?: boolean;
  /** Icon or badge placed before the label. */
  leading?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityHint?: string;
};

export function FoodlineButton({
  label,
  onPress,
  variant = 'primary',
  busy = false,
  disabled = false,
  leading,
  style,
  testID,
  accessibilityHint,
}: FoodlineButtonProps) {
  const p = PALETTE[variant];
  const inert = disabled || busy;
  const quiet = variant === 'quiet';

  return (
    <Pressable
      testID={testID}
      onPress={inert ? undefined : onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inert, busy }}
      style={({ pressed }) => [
        styles.shell,
        quiet ? styles.shellQuiet : { shadowColor: p.glow },
        inert && styles.inert,
        pressed && !inert && styles.pressed,
        style,
      ]}
    >
      <LinearGradient
        colors={[p.lift, p.base]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.fill, quiet && styles.fillQuiet]}
      >
        {/* Gloss over the top 48%. Non-interactive, sits under the label. */}
        {!quiet && (
          <LinearGradient
            colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
            style={styles.gloss}
            pointerEvents="none"
          />
        )}

        <View style={styles.content} pointerEvents="none">
          {busy ? (
            <ActivityIndicator color={p.label} />
          ) : (
            <>
              {leading}
              <Text style={[styles.label, { color: p.label }]} numberOfLines={1}>
                {label}
              </Text>
            </>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    minHeight: space.tap + 6,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.45,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  shellQuiet: {
    borderWidth: 1,
    borderColor: colors.hairline.DEFAULT,
  },
  fill: {
    flex: 1,
    minHeight: space.tap + 6,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  fillQuiet: { borderColor: 'transparent' },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: space.tap,
  },
  label: { fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
  inert: { opacity: 0.45 },
});
