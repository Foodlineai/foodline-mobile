import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { FoodlineButton } from '../../components/FoodlineButton';
import { Card, Mono, Overline, StepProgress, type Step } from '../../components/primitives';
import { colors, space, type as typeScale } from '../../theme/tokens';
import type { DraftedPurchaseOrder } from './types';

/**
 * Screen 04 — Routine progress, then the approval gate.
 *
 * This screen is the product's central commercial claim made visible: the model
 * does the work, a person signs it off. Two rules hold here and are not styling
 * preferences:
 *
 *   1. There is no path from this screen that reaches a vendor without a human
 *      tapping approve on a view that shows the lines. Do not add one, do not
 *      add a setting that reveals one, do not write copy implying one exists.
 *   2. Progress is named and stepped. Never an indeterminate spinner.
 */

export type RoutineApprovalScreenProps = {
  title: string;
  steps: Step[];
  draft?: DraftedPurchaseOrder;
  approving?: boolean;
  onReviewAndApprove: (draft: DraftedPurchaseOrder) => void;
  onEditDraft: (draft: DraftedPurchaseOrder) => void;
};

export function RoutineApprovalScreen({
  title,
  steps,
  draft,
  approving = false,
  onReviewAndApprove,
  onEditDraft,
}: RoutineApprovalScreenProps) {
  const running = steps.some((s) => s.state !== 'done');

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Card>
        <View style={styles.cardHead}>
          <Text style={styles.spark}>✦</Text>
          <Overline color={colors.ai.pending}>
            {running ? 'Routine running' : 'Routine complete'}
          </Overline>
        </View>

        <Text style={styles.title}>{title}</Text>

        <View style={styles.progress}>
          <StepProgress steps={steps} />
        </View>
      </Card>

      {draft ? (
        <>
          <Card padded={false}>
            <LinearGradient
              colors={[colors.ai.deep, colors.ai.DEFAULT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.banner}
            >
              <Text style={styles.bannerSpark}>✦</Text>
              <Text style={styles.bannerText}>Awaiting your approval</Text>
            </LinearGradient>

            <View style={styles.draftBody}>
              <View style={styles.draftHead}>
                <Mono>{draft.reference}</Mono>
                <Text style={styles.total}>{draft.formattedTotal}</Text>
              </View>

              <Text style={styles.vendor}>{draft.vendorName}</Text>
              <Text style={styles.meta}>{draft.summary}</Text>

              <View style={styles.lines}>
                {draft.lines.map((line) => (
                  <View key={line.id} style={styles.line}>
                    <Text style={styles.lineName} numberOfLines={1}>
                      {line.description}
                    </Text>
                    <Text style={styles.lineQty}>{line.quantityLabel}</Text>
                  </View>
                ))}
              </View>

              {draft.lineOverflow > 0 && (
                <Text style={styles.overflow}>
                  and {draft.lineOverflow} more {draft.lineOverflow === 1 ? 'line' : 'lines'}
                </Text>
              )}
            </View>
          </Card>

          <View style={styles.gate}>
            <Text style={styles.gateText}>
              Foodline AI drafts. Nothing reaches a vendor until a person approves it — you are
              the approval gate on this order.
            </Text>
          </View>

          <View style={styles.actions}>
            <FoodlineButton
              label="Review and approve"
              busy={approving}
              onPress={() => onReviewAndApprove(draft)}
              accessibilityHint="Opens the full purchase order for you to check before it is sent"
              testID="routine-approve"
            />
            <FoodlineButton
              label="Edit the draft"
              variant="quiet"
              disabled={approving}
              onPress={() => onEditDraft(draft)}
            />
          </View>
        </>
      ) : (
        running && (
          <Text style={styles.waiting}>
            Nothing to approve yet. This screen will fill in as the routine finishes.
          </Text>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  content: { padding: space.screen, gap: space.gapLoose, paddingBottom: 40 },

  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spark: { color: colors.ai.DEFAULT, fontSize: 15 },
  title: { ...typeScale.section, color: colors.ink.DEFAULT, marginTop: 8 },
  progress: { marginTop: 12 },

  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  bannerSpark: { color: '#FFFFFF', fontSize: 14 },
  bannerText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },

  draftBody: { padding: space.row },
  draftHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  total: { fontSize: 20, fontWeight: '600', color: colors.ink.DEFAULT, fontVariant: ['tabular-nums'] },
  vendor: { ...typeScale.bodyStrong, color: colors.ink.DEFAULT, marginTop: 3 },
  meta: { ...typeScale.small, color: colors.ink.muted, marginTop: 2 },

  lines: { marginTop: 12, gap: 7 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  lineName: { ...typeScale.small, fontSize: 13, color: colors.ink.muted, flexShrink: 1 },
  lineQty: { fontSize: 13, fontWeight: '600', color: colors.ink.DEFAULT, fontVariant: ['tabular-nums'] },
  overflow: { ...typeScale.small, color: colors.ink.subtle, marginTop: 8 },

  gate: {
    padding: 13,
    borderRadius: 14,
    backgroundColor: colors.ai.tint,
    borderWidth: 1,
    borderColor: colors.ai.line,
  },
  gateText: { ...typeScale.small, color: colors.ink.muted },

  actions: { gap: 10 },
  waiting: { ...typeScale.small, color: colors.ink.subtle, textAlign: 'center', paddingVertical: 20 },
});
