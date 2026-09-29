import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { FoodlineButton } from '../../components/FoodlineButton';
import { Card, CardRow, Mono, Overline, StatusPill } from '../../components/primitives';
import { colors, radius, space, type as typeScale } from '../../theme/tokens';
import type { AttentionOrder, CustomerSummary, SalesHome } from './types';

/**
 * Screen 05 — Sales home.
 *
 * A rep opens this between stops, on one hand, on a phone in a van. So the two
 * things they came to do — place an order and ask a question — are the first
 * two controls, above anything they have to read.
 */

export type SalesHomeScreenProps = {
  data: SalesHome;
  onNewOrder: () => void;
  onAskAi: () => void;
  onOpenOrder: (order: AttentionOrder) => void;
  onOpenCustomer: (customer: CustomerSummary) => void;
  onInsightAction: () => void;
};

export function SalesHomeScreen({
  data,
  onNewOrder,
  onAskAi,
  onOpenOrder,
  onOpenCustomer,
  onInsightAction,
}: SalesHomeScreenProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View>
        <StatusPill label="Sales" tone="info" />
        <Text style={styles.headline}>{data.headline}</Text>
        <Text style={styles.subhead}>{data.subhead}</Text>
      </View>

      <View style={styles.actions}>
        <FoodlineButton
          label="New order"
          onPress={onNewOrder}
          style={styles.action}
          leading={<Text style={styles.plus}>+</Text>}
          testID="sales-new-order"
        />
        <FoodlineButton
          label="Ask AI"
          variant="ai"
          onPress={onAskAi}
          style={styles.action}
          leading={<Text style={styles.sparkOnDark}>✦</Text>}
          testID="sales-ask-ai"
        />
      </View>

      <Card padded={false}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Orders needing attention</Text>
        </View>

        {data.attention.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Nothing needs you. Every order is moving as expected.
            </Text>
          </View>
        ) : (
          data.attention.map((order, i) => (
            <Pressable
              key={order.id}
              onPress={() => onOpenOrder(order)}
              accessibilityRole="button"
              accessibilityLabel={`${order.reference}, ${order.customerName}, ${order.status.label}`}
            >
              <CardRow first={i === 0}>
                <View style={styles.rowText}>
                  <View style={styles.refLine}>
                    <Mono>{order.reference}</Mono>
                    <Text style={styles.customer} numberOfLines={1}>
                      {order.customerName}
                    </Text>
                  </View>
                  <Text style={styles.note} numberOfLines={1}>
                    {order.note}
                  </Text>
                </View>
                <StatusPill label={order.status.label} tone={order.status.tone} />
              </CardRow>
            </Pressable>
          ))
        )}
      </Card>

      <Card padded={false}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Customers</Text>
        </View>

        {data.customers.map((customer, i) => (
          <Pressable
            key={customer.id}
            onPress={() => onOpenCustomer(customer)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${customer.name}`}
          >
            <CardRow first={i === 0}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{customer.initials}</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.customerName}>{customer.name}</Text>
                <Text style={styles.note}>{customer.subtitle}</Text>
              </View>
            </CardRow>
          </Pressable>
        ))}
      </Card>

      {data.insight && (
        <Pressable
          onPress={onInsightAction}
          accessibilityRole="button"
          accessibilityLabel={`AI Copilot: ${data.insight.body}`}
        >
          <LinearGradient
            colors={[colors.ai.deep, colors.ai.DEFAULT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.4 }}
            style={styles.insight}
          >
            <Overline color={colors.ai.line}>AI Copilot</Overline>
            <Text style={styles.insightBody}>{data.insight.body}</Text>
            <Text style={styles.insightAction}>{data.insight.actionLabel}</Text>
          </LinearGradient>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  content: { padding: space.screen, gap: space.gap, paddingBottom: 40 },

  headline: { ...typeScale.title, color: colors.ink.DEFAULT, marginTop: 9 },
  subhead: { ...typeScale.body, color: colors.ink.muted, marginTop: 2 },

  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1 },
  plus: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: -2 },
  sparkOnDark: { color: '#FFFFFF', fontSize: 14 },

  sectionHead: { paddingHorizontal: space.row, paddingTop: 13, paddingBottom: 4 },
  sectionTitle: { ...typeScale.section, color: colors.ink.DEFAULT },

  rowText: { flex: 1, minWidth: 0 },
  refLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customer: { ...typeScale.bodyStrong, color: colors.ink.DEFAULT, flexShrink: 1 },
  customerName: { ...typeScale.bodyStrong, color: colors.ink.DEFAULT },
  note: { ...typeScale.small, color: colors.ink.subtle, marginTop: 2 },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: radius.input,
    backgroundColor: colors.brand.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 12, fontWeight: '600', color: colors.brand.pressed },

  insight: { padding: 15, borderRadius: radius.card },
  insightBody: { ...typeScale.body, color: '#FFFFFF', marginTop: 6 },
  insightAction: {
    ...typeScale.small,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
    textDecorationLine: 'underline',
  },

  empty: { paddingHorizontal: space.row, paddingBottom: 14 },
  emptyText: { ...typeScale.small, color: colors.ink.subtle },
});
