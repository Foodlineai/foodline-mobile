import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components/primitives';
import { colors, radius, space, type as typeScale } from '../../theme/tokens';
import type { RouteStop, RouteSummary, StopState } from './types';

/** Live route sequence and stop status, with an optional production map slot. */

const STOP_TONE: Record<StopState, { fg: string; bg: string; line: string }> = {
  delivered: { fg: colors.ok.DEFAULT, bg: colors.ok.tint, line: colors.ok.line },
  arrived: { fg: '#FFFFFF', bg: colors.brand.pressed, line: colors.brand.pressed },
  exception: { fg: colors.warn.ink, bg: colors.warn.tint, line: colors.warn.line },
  upcoming: { fg: colors.ink.muted, bg: colors.surface.card, line: colors.hairline.DEFAULT },
};

export type RouteScreenProps = {
  route: RouteSummary;
  onOpenStop: (stop: RouteStop) => void;
  /** Rendered when a production map provider is configured. */
  mapContent?: React.ReactNode;
};

export function RouteScreen({ route, onOpenStop, mapContent }: RouteScreenProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.title}>Today&apos;s stops</Text>
        <Text style={styles.subtitle}>{route.progressLabel}</Text>
      </View>

      {mapContent ? <View style={styles.map}>{mapContent}</View> : null}

      <Card padded={false}>
        <View style={styles.tableHead}>
          <Text style={[styles.headCell, styles.colSeq]}>Stop</Text>
          <Text style={[styles.headCell, styles.colName]}>Customer</Text>
          <Text style={[styles.headCell, styles.colWindow]}>Window</Text>
        </View>

        {route.stops.map((stop, i) => (
          <StopRow key={stop.id} stop={stop} first={i === 0} onPress={() => onOpenStop(stop)} />
        ))}
      </Card>
    </ScrollView>
  );
}

function StopRow({
  stop,
  first,
  onPress,
}: {
  stop: RouteStop;
  first: boolean;
  onPress: () => void;
}) {
  const tone = STOP_TONE[stop.state];
  const current = stop.state === 'arrived';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Stop ${stop.sequence}, ${stop.customerName}, ${stop.window}, ${stop.note}`}
      style={[styles.stopRow, !first && styles.stopRowDivided, current && styles.stopRowCurrent]}
    >
      <View style={[styles.seq, { backgroundColor: tone.bg, borderColor: tone.line }]}>
        {stop.state === 'delivered' ? (
          <Text style={[styles.seqText, { color: tone.fg }]}>✓</Text>
        ) : (
          <Text style={[styles.seqText, { color: tone.fg }]}>{stop.sequence}</Text>
        )}
      </View>

      <View style={styles.colName}>
        <Text style={styles.customer} numberOfLines={1}>
          {stop.customerName}
        </Text>
        <Text
          style={[
            styles.note,
            stop.state === 'delivered' && { color: colors.ok.DEFAULT },
            stop.state === 'exception' && { color: colors.warn.DEFAULT },
            current && { color: colors.brand.pressed },
          ]}
          numberOfLines={1}
        >
          {stop.note}
        </Text>
      </View>

      <Text style={[styles.window, current && styles.windowCurrent]}>{stop.window}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  content: { padding: space.screen, gap: space.gap, paddingBottom: 40 },

  title: { ...typeScale.titleSm, color: colors.ink.DEFAULT },
  subtitle: { ...typeScale.small, fontSize: 13, color: colors.ink.muted, marginTop: 3 },

  map: {
    height: 178,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairline.DEFAULT,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headCell: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.ink.subtle,
  },
  colSeq: { width: 34 },
  colName: { flex: 1, minWidth: 0 },
  colWindow: { width: 60, textAlign: 'right' },

  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minHeight: space.tap,
  },
  stopRowDivided: { borderTopWidth: 1, borderTopColor: colors.hairline.soft },
  stopRowCurrent: { backgroundColor: colors.brand.tint },

  seq: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seqText: { fontSize: 12, fontWeight: '600' },

  customer: { ...typeScale.bodyStrong, color: colors.ink.DEFAULT },
  note: { fontSize: 11, color: colors.ink.subtle, marginTop: 2 },

  window: {
    width: 60,
    textAlign: 'right',
    fontSize: 12,
    color: colors.ink.subtle,
    fontVariant: ['tabular-nums'],
  },
  windowCurrent: { color: colors.brand.pressed, fontWeight: '600' },
});
