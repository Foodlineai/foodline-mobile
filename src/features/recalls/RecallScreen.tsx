import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FoodlineButton } from '../../components/FoodlineButton';
import { Card, Mono } from '../../components/primitives';
import { colors, radius, space, type as typeScale } from '../../theme/tokens';
import type { RecallClassification, RecallTarget } from './types';

/**
 * Screen 10 — Start a recall.
 *
 * Three constraints, all from the 18 Sep review, all load-bearing:
 *
 *   1. Reached from inside an item, never from a quick-action menu. The severity
 *      has to match the effort — a recall two taps from a list row is a recall
 *      someone starts by accident.
 *   2. Every classification carries its definition on screen. Warehouse staff
 *      should not have to know FDA terminology to pick correctly, and a demo is
 *      a good moment to teach it.
 *   3. Confirm opens a review step. This screen never fires the recall.
 *
 * The classification wording below needs a regulatory read before it goes in
 * front of a customer — flagged in contracts/design.md and still open.
 */

const CLASSIFICATIONS: RecallClassification[] = [
  {
    id: 'class-i',
    label: 'Class I',
    definition:
      'Reasonable probability that eating the product will cause serious health harm or death.',
  },
  {
    id: 'class-ii',
    label: 'Class II',
    definition: 'May cause temporary or reversible health effects; serious harm is unlikely.',
  },
  {
    id: 'class-iii',
    label: 'Class III',
    definition: 'Not likely to cause any health effect — a labelling or specification failure.',
  },
  {
    id: 'market-withdrawal',
    label: 'Market withdrawal',
    definition:
      'A minor issue with no health hazard — you pull the stock, no regulator is involved.',
  },
  {
    id: 'regulatory-hold',
    label: 'Regulatory hold',
    definition:
      'Stock held or pulled at the direction of a regulator or your own food-safety team.',
  },
];

export type RecallScreenProps = {
  target: RecallTarget;
  /** Opens the review step. Never submits — see the note above. */
  onContinueToReview: (classificationId: string) => void;
  onCancel: () => void;
};

export function RecallScreen({ target, onContinueToReview, onCancel }: RecallScreenProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const consequences = [
    `The lot is blocked from picking everywhere, immediately.`,
    `${target.openOrders} open ${target.openOrders === 1 ? 'order' : 'orders'} holding this lot are flagged to their sales reps.`,
    `${target.customersAffected} customers who received it are queued for notification.`,
    `A traceability record opens and every step is logged for audit.`,
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.alert}>
        <View style={styles.alertHead}>
          <View style={styles.alertDot} />
          <Mono style={styles.lot}>{target.lotCode}</Mono>
        </View>
        <Text style={styles.item}>{target.itemName}</Text>
        <Text style={styles.blast}>{target.blastRadius}</Text>
      </View>

      <Card padded={false}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Classification</Text>
          <Text style={styles.sectionNote}>
            Pick the one that matches the hazard. The definitions are here so nobody has to guess.
          </Text>
        </View>

        {CLASSIFICATIONS.map((c, i) => {
          const on = selected === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => setSelected(c.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${c.label}. ${c.definition}`}
              style={[styles.option, i > 0 && styles.optionDivided]}
            >
              <View style={[styles.radio, on && styles.radioOn]}>
                {on && <View style={styles.radioCore} />}
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>{c.label}</Text>
                <Text style={styles.optionDefinition}>{c.definition}</Text>
              </View>
            </Pressable>
          );
        })}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>What happens when you confirm</Text>
        <View style={styles.consequences}>
          {consequences.map((line, i) => (
            <View key={line} style={styles.consequence}>
              <Text style={styles.consequenceNum}>{i + 1}</Text>
              <Text style={styles.consequenceText}>{line}</Text>
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.actions}>
        <FoodlineButton
          label="Review recall before sending"
          variant="danger"
          disabled={selected === null}
          onPress={() => selected && onContinueToReview(selected)}
          accessibilityHint="Opens a review step. Nothing is sent from this screen."
          testID="recall-continue"
        />
        <FoodlineButton label="Cancel" variant="quiet" onPress={onCancel} />
      </View>

      {selected === null && (
        <Text style={styles.hint}>Choose a classification to continue.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  content: { padding: space.screen, gap: space.gap, paddingBottom: 44 },

  alert: {
    padding: 15,
    borderRadius: radius.card,
    backgroundColor: colors.danger.tint,
    borderWidth: 1,
    borderColor: colors.danger.line,
  },
  alertHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  alertDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger.DEFAULT },
  lot: { color: colors.danger.DEFAULT },
  item: { fontSize: 20, fontWeight: '600', color: colors.ink.DEFAULT, marginTop: 6 },
  blast: { ...typeScale.small, color: colors.danger.DEFAULT, marginTop: 4 },

  sectionHead: { paddingHorizontal: space.row, paddingTop: 13, paddingBottom: 8 },
  sectionTitle: { ...typeScale.section, color: colors.ink.DEFAULT },
  sectionNote: { ...typeScale.small, color: colors.ink.subtle, marginTop: 2 },

  option: {
    flexDirection: 'row',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: space.tap,
  },
  optionDivided: { borderTopWidth: 1, borderTopColor: colors.hairline.soft },
  radio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.hairline.DEFAULT,
    backgroundColor: colors.surface.card,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.danger.DEFAULT },
  radioCore: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger.DEFAULT },
  optionText: { flex: 1 },
  optionLabel: { ...typeScale.bodyStrong, color: colors.ink.DEFAULT },
  optionDefinition: { ...typeScale.small, color: colors.ink.muted, marginTop: 2 },

  consequences: { marginTop: 9, gap: 7 },
  consequence: { flexDirection: 'row', gap: 9 },
  consequenceNum: { ...typeScale.small, color: colors.danger.DEFAULT, fontWeight: '600' },
  consequenceText: { ...typeScale.small, fontSize: 13, color: colors.ink.muted, flex: 1 },

  actions: { gap: 9 },
  hint: { ...typeScale.small, color: colors.ink.subtle, textAlign: 'center' },
});
