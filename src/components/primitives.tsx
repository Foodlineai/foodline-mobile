import React from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radius, space, type as typeScale } from '../theme/tokens';

/* ── Card ──────────────────────────────────────────────────────────────── */

export function Card({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  return (
    <LinearGradient
      colors={[colors.surface.card, colors.surface.cardFoot]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.card, padded && styles.cardPadded, style]}
    >
      {children}
    </LinearGradient>
  );
}

export function CardRow({
  children,
  first = false,
  style,
}: {
  children: React.ReactNode;
  first?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.row, !first && styles.rowDivided, style]}>{children}</View>;
}

/* ── Status pill ───────────────────────────────────────────────────────── */

export type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'ai' | 'neutral';

const TONES: Record<Tone, { fg: string; bg: string; line: string }> = {
  ok: { fg: colors.ok.DEFAULT, bg: colors.ok.tint, line: colors.ok.line },
  warn: { fg: colors.warn.ink, bg: colors.warn.tint, line: colors.warn.line },
  danger: { fg: colors.danger.DEFAULT, bg: colors.danger.tint, line: colors.danger.line },
  info: { fg: colors.info.DEFAULT, bg: colors.info.tint, line: colors.info.line },
  ai: { fg: colors.ai.pending, bg: colors.ai.tint, line: colors.ai.line },
  neutral: { fg: colors.ink.muted, bg: colors.surface.DEFAULT, line: colors.hairline.DEFAULT },
};

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg, borderColor: t.line }]}>
      <Text style={[styles.pillText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

/* ── Mono ──────────────────────────────────────────────────────────────── */

/**
 * SO/PO numbers, lot codes, bin codes. Anything a warehouse reads aloud or types
 * back needs to be unambiguous and to line up in a column.
 */
export function Mono({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.mono, style]}>{children}</Text>;
}

/* ── Step progress ─────────────────────────────────────────────────────── */

export type Step = {
  label: string;
  state: 'done' | 'active' | 'pending';
};

/**
 * Named, stepped progress. Never an indeterminate spinner — customers read a
 * spinner as broken, and the whole point is to keep an anxious buyer calm while
 * the model works.
 */
export function StepProgress({ steps }: { steps: Step[] }) {
  const done = steps.filter((s) => s.state === 'done').length;
  const active = steps.some((s) => s.state === 'active') ? 0.5 : 0;
  const pct = Math.min(1, (done + active) / Math.max(1, steps.length));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: steps.length, now: done }}
      accessibilityLabel={`Step ${done + 1} of ${steps.length}`}
    >
      <View style={styles.track}>
        <LinearGradient
          colors={[colors.ai.pending, '#6E75EA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${pct * 100}%` }]}
        />
      </View>

      <View style={styles.steps}>
        {steps.map((s) => (
          <View key={s.label} style={styles.step}>
            <StepDot state={s.state} />
            <Text
              style={[
                styles.stepLabel,
                s.state === 'active' && styles.stepLabelActive,
                s.state === 'pending' && styles.stepLabelPending,
              ]}
            >
              {s.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function StepDot({ state }: { state: Step['state'] }) {
  if (state === 'done') {
    return (
      <View style={[styles.dot, { backgroundColor: colors.ok.DEFAULT }]}>
        <Text style={styles.tick}>✓</Text>
      </View>
    );
  }
  if (state === 'active') {
    return (
      <View style={[styles.dot, styles.dotRing]}>
        <View style={styles.dotCore} />
      </View>
    );
  }
  return <View style={[styles.dot, styles.dotEmpty]} />;
}

/* ── Section heading ───────────────────────────────────────────────────── */

export function Overline({ children, color }: { children: React.ReactNode; color?: string }) {
  return <Text style={[styles.overline, color ? { color } : null]}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.hairline.DEFAULT,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.ink.DEFAULT,
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  cardPadded: { padding: space.row },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.gap,
    paddingHorizontal: space.row,
    paddingVertical: 11,
    minHeight: space.tap,
  },
  rowDivided: { borderTopWidth: 1, borderTopColor: colors.hairline.soft },

  pill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  pillText: { fontSize: 11, fontWeight: '600' },

  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontVariant: ['tabular-nums'],
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.pressed,
  },

  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.ai.tint,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill },

  steps: { marginTop: 14, gap: 11 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepLabel: { ...typeScale.small, color: colors.ink.muted, flexShrink: 1 },
  stepLabelActive: { color: colors.ink.DEFAULT, fontWeight: '600' },
  stepLabelPending: { color: colors.ink.disabled },

  dot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dotRing: { borderWidth: 2, borderColor: colors.ai.line },
  dotCore: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.ai.pending },
  dotEmpty: { borderWidth: 2, borderColor: colors.hairline.DEFAULT },
  tick: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', lineHeight: 13 },

  overline: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.ink.subtle,
  },
});
