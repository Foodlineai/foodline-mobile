import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FoodlineButton } from '../../components/FoodlineButton';
import { Card, CardRow, Mono, StatusPill } from '../../components/primitives';
import { colors, radius, space, type as typeScale } from '../../theme/tokens';
import type { CustomerDetail, FrequentItem, RecentOrder } from './types';

/**
 * Screen 06 — Customer 360.
 *
 * The commercially important screen. Reps rebuild the same order every week by
 * hand today; the frequency strip plus one button is what replaces that.
 *
 * The five-week strip is rendered here but NOT computed here — see
 * `adapter.ts`. Bucketing a customer's order history on the device would be slow
 * on mobile data, wrong across timezones, and would disagree with what the ERP
 * shows for the same question.
 */

export type CustomerDetailScreenProps = {
  customer: CustomerDetail;
  building?: boolean;
  onBuildOrder: () => void;
  onOpenOrder: (order: RecentOrder) => void;
};

export function CustomerDetailScreen({
  customer,
  building = false,
  onBuildOrder,
  onOpenOrder,
}: CustomerDetailScreenProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.name}>{customer.name}</Text>
        <View style={styles.pills}>
          <StatusPill label={customer.tierLabel} tone="info" />
          {customer.standing && <StatusPill label={customer.standing.label} tone={customer.standing.tone} />}
        </View>
      </View>

      <Card padded={false}>
        <View style={styles.figures}>
          {customer.figures.map((f, i) => (
            <View
              key={f.label}
              style={[styles.figure, i < customer.figures.length - 1 && styles.figureDivided]}
            >
              <Text style={styles.figureLabel}>{f.label}</Text>
              <Text style={[styles.figureValue, f.tone === 'ok' && { color: colors.ok.DEFAULT }]}>
                {f.value}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card padded={false}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Most common orders</Text>
          <Text style={styles.sectionNote}>Last {customer.frequencyWeeks} weeks</Text>
        </View>

        {customer.frequentItems.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              No repeat pattern yet. It appears once this customer has ordered a few weeks running.
            </Text>
          </View>
        ) : (
          customer.frequentItems.map((item, i) => (
            <CardRow key={item.id} first={i === 0}>
              <View style={styles.itemText}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.itemMeta} numberOfLines={1}>
                  {item.packSize} · {item.weeklyLabel}
                </Text>
              </View>
              <FrequencyStrip item={item} />
            </CardRow>
          ))
        )}
      </Card>

      <Card padded={false}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Recent orders</Text>
        </View>

        {customer.recentOrders.map((order, i) => (
          <Pressable
            key={order.id}
            onPress={() => onOpenOrder(order)}
            accessibilityRole="button"
            accessibilityLabel={`Order ${order.reference}, ${order.total}, ${order.status.label}`}
          >
            <CardRow first={i === 0}>
              <View style={styles.itemText}>
                <Mono>{order.reference}</Mono>
                <Text style={styles.itemMeta}>{order.placedLabel}</Text>
              </View>
              <Text style={styles.orderTotal}>{order.total}</Text>
              <StatusPill label={order.status.label} tone={order.status.tone} />
            </CardRow>
          </Pressable>
        ))}
      </Card>

      <FoodlineButton
        label="Build this week's order"
        busy={building}
        onPress={onBuildOrder}
        leading={<Text style={styles.spark}>✦</Text>}
        accessibilityHint="Creates a draft order from this customer's usual lines for you to check"
        testID="customer-build-order"
      />

      <Text style={styles.gate}>
        Creates a draft you review before it is placed. Nothing is submitted from this screen.
      </Text>
    </ScrollView>
  );
}

/**
 * Five dots, one per recent week, oldest on the left. Filled means ordered.
 *
 * Colour alone does not carry the meaning — each dot has an accessibility label,
 * and skipped weeks are visibly hollow rather than merely paler, so the pattern
 * survives a colour-blind rep and a sunlit truck cab.
 */
function FrequencyStrip({ item }: { item: FrequentItem }) {
  const ordered = item.weeks.filter(Boolean).length;

  return (
    <View
      style={styles.strip}
      accessibilityRole="image"
      accessibilityLabel={`Ordered in ${ordered} of the last ${item.weeks.length} weeks`}
    >
      {item.weeks.map((was, i) => (
        <View key={i} style={[styles.dot, was ? styles.dotOn : styles.dotOff]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  content: { padding: space.screen, gap: space.gap, paddingBottom: 40 },

  name: { ...typeScale.titleSm, color: colors.ink.DEFAULT },
  pills: { flexDirection: 'row', gap: 7, marginTop: 7, flexWrap: 'wrap' },

  figures: { flexDirection: 'row', paddingVertical: 12 },
  figure: { flex: 1, paddingHorizontal: 12 },
  figureDivided: { borderRightWidth: 1, borderRightColor: colors.hairline.soft },
  figureLabel: { fontSize: 11, color: colors.ink.subtle },
  figureValue: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.ink.DEFAULT,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: space.row,
    paddingTop: 13,
    paddingBottom: 4,
  },
  sectionTitle: { ...typeScale.section, color: colors.ink.DEFAULT },
  sectionNote: { fontSize: 11, color: colors.ink.subtle },

  itemText: { flex: 1, minWidth: 0 },
  itemName: { ...typeScale.bodyStrong, color: colors.ink.DEFAULT },
  itemMeta: { ...typeScale.small, color: colors.ink.subtle, marginTop: 2 },
  orderTotal: { ...typeScale.bodyStrong, color: colors.ink.DEFAULT, fontVariant: ['tabular-nums'] },

  strip: { flexDirection: 'row', gap: 5 },
  dot: { width: 9, height: 9, borderRadius: radius.pill },
  dotOn: { backgroundColor: colors.ok.DEFAULT },
  dotOff: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.hairline.DEFAULT },

  empty: { paddingHorizontal: space.row, paddingBottom: 14 },
  emptyText: { ...typeScale.small, color: colors.ink.subtle },

  spark: { color: '#FFFFFF', fontSize: 14 },
  gate: { ...typeScale.small, color: colors.ink.subtle, textAlign: 'center' },
});
