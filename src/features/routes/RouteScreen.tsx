import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components/primitives';
import { colors, radius, space, type as typeScale } from '../../theme/tokens';
import type { RouteStop, RouteSummary, RouteView, StopState } from './types';

/**
 * Screen 11 — Route, map and table.
 *
 * The 18 Sep ask was both views, not a choice between them: the map answers
 * "where am I", the table answers "what is left", and dispatch needs the second
 * more than the first.
 *
 * ⚠️ TODO(map): the map provider is an unmade decision. `react-native-maps` is
 * not in Expo Go, so adding it forces a development build and costs the
 * "runs on any phone in thirty seconds" demo property. The alternatives are a
 * static rendered map image from the server, or deferring the map entirely.
 * Until that is decided, `MapSlot` renders a labelled placeholder and the table
 * carries the screen — which is the half that dispatch actually uses.
 * Do not add a map dependency without raising it first.
 */

const STOP_TONE: Record<StopState, { fg: string; bg: string; line: string }> = {
  delivered: { fg: colors.ok.DEFAULT, bg: colors.ok.tint, line: colors.ok.line },
  arrived: { fg: '#FFFFFF', bg: colors.brand.pressed, line: colors.brand.pressed },
  exception: { fg: colors.warn.ink, bg: colors.warn.tint, line: colors.warn.line },
  upcoming: { fg: colors.ink.muted, bg: colors.surface.card, line: colors.hairline.DEFAULT },
};

export type RouteScreenProps = {
  route: RouteSummary;
  onOpenStop: (stop: RouteStop) => void;
  /** Rendered inside the map slot once a provider is chosen. */
  mapContent?: React.ReactNode;
};

export function RouteScreen({ route, onOpenStop, mapContent }: RouteScreenProps) {
  const [view, setView] = useState<RouteView>('both');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.title}>Today&apos;s stops</Text>
        <Text style={styles.subtitle}>{route.progressLabel}</Text>
      </View>

      <View style={styles.segment}>
        <SegmentButton label="Map" on={view === 'map'} onPress={() => setView('map')} />
        <SegmentButton
          label="Map and table"
          on={view === 'both'}
          onPress={() => setView('both')}
        />
      </View>

      <MapSlot>{mapContent}</MapSlot>

      {view === 'both' && (
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
      )}
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

function SegmentButton({
  label,
  on,
  onPress,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={[styles.segmentButton, on && styles.segmentButtonOn]}
    >
      <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{label}</Text>
    </Pressable>
  );
}

/** Holds the map once a provider is chosen. See the TODO(map) note above. */
function MapSlot({ children }: { children?: React.ReactNode }) {
  if (children) return <View style={styles.map}>{children}</View>;

  return (
    <View style={[styles.map, styles.mapEmpty]} accessibilityLabel="Route map, not yet available">
      <Text style={styles.mapEmptyText}>Map view</Text>
      <Text style={styles.mapEmptyNote}>Provider not chosen — the stop list below is live</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  content: { padding: space.screen, gap: space.gap, paddingBottom: 40 },

  title: { ...typeScale.titleSm, color: colors.ink.DEFAULT },
  subtitle: { ...typeScale.small, fontSize: 13, color: colors.ink.muted, marginTop: 3 },

  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.raised,
    borderWidth: 1,
    borderColor: colors.hairline.DEFAULT,
  },
  segmentButton: {
    flex: 1,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonOn: { backgroundColor: colors.surface.card },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.ink.muted },
  segmentTextOn: { color: colors.brand.pressed },

  map: {
    height: 178,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairline.DEFAULT,
  },
  mapEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.surface.raised,
  },
  mapEmptyText: { ...typeScale.bodyStrong, color: colors.ink.subtle },
  mapEmptyNote: { fontSize: 11, color: colors.ink.disabled },

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
