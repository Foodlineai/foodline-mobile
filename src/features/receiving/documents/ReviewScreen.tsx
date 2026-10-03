import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FoodlineButton } from '../../../components/FoodlineButton';
import { Card, Mono, StatusPill } from '../../../components/primitives';
import { colors, radius, space, type as typeScale } from '../../../theme/tokens';
import {
  LOW_CONFIDENCE,
  draftProblems,
  draftTotals,
  initialDraft,
  isDirty,
  lineConfidence,
  sortLinesByDoubt,
  validateLine,
} from './adapter';
import type { LineEdit, ParsedLine, ReviewDetail, ReviewDraft, ReviewOrderContext } from './types';

export type ReviewScreenProps = {
  detail: ReviewDetail;
  order: ReviewOrderContext | null;
  /** Why the order couldn't be read; editing is disabled while this is set. */
  orderError: string | null;
  saving: boolean;
  approving: boolean;
  rejecting: boolean;
  error: string | null;
  onSave: (draft: ReviewDraft) => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onOpenReceipt?: (goodsReceiptId: string) => void;
};

const pct = (n: number) => `${Math.round(n * 100)}%`;

/**
 * Review a parsed receiving document before anything is written.
 *
 * The job here is to make disagreement easy, not to display a parse:
 * - Every parsed value stays visible under its field after an edit, tagged
 *   "edited" — so a reviewer can see what the parser thought.
 * - Doubtful lines (lowest confidence) are first, not in document order.
 * - Totals are recomputed from the reviewer's edits, never the parse.
 * - Nothing is written by editing. "Save corrections" stores them on the
 *   server; "Approve" then creates the goods receipt from the *saved* set,
 *   so approve is disabled while there are unsaved edits.
 *
 * Not here, said plainly: the original PDF/image isn't viewable in the app
 * (no confirmed read path for the stored attachment), so the source can't sit
 * beside the values on this screen yet — only its file name is shown.
 */
export function ReviewScreen({
  detail,
  order,
  orderError,
  saving,
  approving,
  rejecting,
  error,
  onSave,
  onApprove,
  onReject,
  onOpenReceipt,
}: ReviewScreenProps) {
  const parsedById = useMemo(() => new Map(detail.lines.map((l) => [l.sourceLineId, l])), [detail.lines]);
  const [draft, setDraft] = useState<ReviewDraft>(() => initialDraft(detail));
  const [rejectReason, setRejectReason] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);

  // Re-seed from the server after a save/approve bumps the row version.
  const [seenVersion, setSeenVersion] = useState(detail.rowVersion);
  if (seenVersion !== detail.rowVersion) {
    setSeenVersion(detail.rowVersion);
    setDraft(initialDraft(detail));
  }

  const decided = detail.status === 'approved' || detail.status === 'rejected';
  const editable = !decided && order !== null && !orderError;
  const dirty = isDirty(draft, detail);
  const problems = draftProblems(draft);
  const totals = draftTotals(draft);
  const lowCount = detail.lines.filter((l) => lineConfidence(l) < LOW_CONFIDENCE).length;

  const ordered = useMemo(() => sortLinesByDoubt(draft.lines, parsedById), [draft.lines, parsedById]);

  const setLine = (sourceLineId: string, patch: Partial<LineEdit>) =>
    setDraft((d) => ({ ...d, lines: d.lines.map((l) => (l.sourceLineId === sourceLineId ? { ...l, ...patch } : l)) }));

  const canSave = editable && dirty && problems.length === 0 && !saving;
  const canApprove = editable && detail.status === 'in-review' && !dirty && !approving;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View>
        <Mono>{detail.supplierDocumentNumber.value ?? 'Delivery document'}</Mono>
        <View style={styles.pills}>
          <StatusPill label={detail.status.replace('-', ' ')} tone={detail.status === 'approved' ? 'ok' : detail.status === 'rejected' ? 'danger' : 'warn'} />
          {lowCount > 0 && !decided ? <StatusPill label={`${lowCount} to check`} tone="warn" /> : null}
        </View>
        <Text style={styles.meta}>
          From {detail.sender} · {detail.connector}
        </Text>
      </View>

      {detail.status === 'approved' ? (
        <Card>
          <Text style={styles.strong}>Received.</Text>
          <Text style={styles.small}>A goods receipt was created from the saved corrections.</Text>
          {detail.goodsReceiptId && onOpenReceipt ? (
            <FoodlineButton label="Open receiving" onPress={() => onOpenReceipt(detail.goodsReceiptId!)} />
          ) : null}
        </Card>
      ) : null}
      {detail.status === 'rejected' ? (
        <Card>
          <Text style={styles.strong}>Rejected.</Text>
          <Text style={styles.small}>{detail.rejectionReason ?? 'No reason recorded.'}</Text>
        </Card>
      ) : null}

      {orderError && !decided ? (
        <Card>
          <Text style={styles.strong}>Can&apos;t edit this document yet</Text>
          <Text style={styles.small}>{orderError}</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Document</Text>
        {detail.attachments.map((a) => (
          <Text key={a.fileName} style={styles.small}>
            {a.fileName} · {a.mediaType} · {Math.round(a.sizeBytes / 1024)} KB
          </Text>
        ))}
        <Text style={styles.note}>
          The original file can&apos;t be previewed in the app yet, so check the values below against your copy of
          the document.
        </Text>
        <Field
          label="Supplier document number"
          parsed={detail.supplierDocumentNumber.value}
          value={draft.supplierDocumentNumber}
          editable={editable}
          onChange={(v) => setDraft((d) => ({ ...d, supplierDocumentNumber: v }))}
          error={draft.supplierDocumentNumber.trim() === '' && editable ? 'Required' : undefined}
        />
        <Text style={styles.parsedRow}>
          Vendor: {detail.vendor.value ?? '—'} ({pct(detail.vendor.confidence ?? 0)}) · Order:{' '}
          {detail.purchaseOrder.value ?? '—'} ({pct(detail.purchaseOrder.confidence ?? 0)})
        </Text>
      </Card>

      <Text style={styles.sectionTitle}>Lines — least certain first</Text>
      {ordered.map((line) => {
        const parsed = parsedById.get(line.sourceLineId);
        if (!parsed) return null;
        return (
          <LineCard
            key={line.sourceLineId}
            parsed={parsed}
            edit={line}
            order={order}
            editable={editable}
            onChange={(patch) => setLine(line.sourceLineId, patch)}
          />
        );
      })}

      <Card>
        <Text style={styles.sectionTitle}>Totals from your edits</Text>
        <Text style={styles.small}>
          {totals.lines} line{totals.lines === 1 ? '' : 's'} kept · {totals.accepted} accepted · {totals.damaged}{' '}
          damaged · {totals.rejected} rejected
        </Text>
        <Text style={styles.note}>Quantities only — this document carries no prices, so there is no cost total.</Text>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!decided ? (
        <View style={styles.actions}>
          {editable && problems.length > 0 ? <Text style={styles.error}>{problems.join(' · ')}</Text> : null}
          <FoodlineButton
            label={dirty ? 'Save corrections' : 'Corrections saved'}
            busy={saving}
            disabled={!canSave}
            onPress={() => onSave(draft)}
            testID="review-save"
          />
          <FoodlineButton
            label="Approve and receive"
            variant="ai"
            busy={approving}
            disabled={!canApprove}
            onPress={onApprove}
            accessibilityHint="Creates the goods receipt from the saved corrections"
            testID="review-approve"
          />
          {editable && dirty ? (
            <Text style={styles.note}>
              {detail.status === 'in-review'
                ? 'You have unsaved edits. Approving uses the last saved version, so save first.'
                : 'Save your corrections first — approving needs a saved review.'}
            </Text>
          ) : null}
          {rejectOpen ? (
            <View style={styles.rejectBox}>
              <TextInput
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="Why is this document being rejected? (required)"
                placeholderTextColor={colors.ink.disabled}
                multiline
                style={styles.input}
              />
              <FoodlineButton
                label="Reject document"
                variant="danger"
                busy={rejecting}
                disabled={rejectReason.trim().length === 0 || rejecting}
                onPress={() => onReject(rejectReason.trim())}
              />
            </View>
          ) : (
            <FoodlineButton label="Reject this document" variant="quiet" onPress={() => setRejectOpen(true)} />
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

function LineCard({
  parsed,
  edit,
  order,
  editable,
  onChange,
}: {
  parsed: ParsedLine;
  edit: LineEdit;
  order: ReviewOrderContext | null;
  editable: boolean;
  onChange: (patch: Partial<LineEdit>) => void;
}) {
  const conf = lineConfidence(parsed);
  const low = conf < LOW_CONFIDENCE;
  const problems = validateLine(edit);
  const matched = order?.lines.find((o) => o.purchaseOrderVersionLineId === edit.purchaseOrderVersionLineId) ?? null;

  return (
    <View style={[styles.lineCard, low && edit.include && styles.lineCardLow, !edit.include && styles.lineCardOff]}>
      <View style={styles.lineHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.itemName} numberOfLines={2}>
            {parsed.description ?? parsed.sku ?? 'Unreadable line'}
          </Text>
          <Text style={styles.small}>
            Item {pct(parsed.confidence.item)} · Qty {pct(parsed.confidence.quantity)} · Lot/expiry{' '}
            {pct(parsed.confidence.lotAndExpiry)} · Unit {pct(parsed.confidence.uom)}
          </Text>
        </View>
        {low ? <StatusPill label="Check" tone="warn" /> : null}
      </View>

      {editable ? (
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: edit.include }}
          onPress={() => onChange({ include: !edit.include })}
          style={styles.toggle}
        >
          <Text style={styles.toggleText}>{edit.include ? 'Keep on the receipt' : 'Left off the receipt'}</Text>
        </Pressable>
      ) : null}

      {edit.include ? (
        <>
          <Text style={styles.label}>Order line</Text>
          {matched ? (
            <Text style={styles.value}>
              {matched.sku} · {matched.productName} · ordered {matched.orderedQuantity}
            </Text>
          ) : (
            <Text style={styles.errorSmall}>{problems.match ?? 'Not matched'}</Text>
          )}
          {editable && order ? (
            <View style={styles.chips}>
              {order.lines.map((o) => {
                const selected = o.purchaseOrderVersionLineId === edit.purchaseOrderVersionLineId;
                return (
                  <Pressable
                    key={o.purchaseOrderVersionLineId}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => onChange({ purchaseOrderVersionLineId: o.purchaseOrderVersionLineId })}
                    style={[styles.chip, selected && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextOn]} numberOfLines={1}>
                      {o.sku || o.productName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {parsed.purchaseOrderVersionLineId === null ? (
            <Text style={styles.parsedRow}>Parser couldn&apos;t match this to an order line.</Text>
          ) : null}

          <View style={styles.row3}>
            <Field label="Accepted" parsed={parsed.quantity} value={edit.acceptedQuantity} editable={editable} numeric onChange={(v) => onChange({ acceptedQuantity: v })} error={problems.accepted ?? problems.total} />
            <Field label="Damaged" parsed={null} value={edit.damagedQuantity} editable={editable} numeric onChange={(v) => onChange({ damagedQuantity: v })} error={problems.damaged} />
            <Field label="Rejected" parsed={null} value={edit.rejectedQuantity} editable={editable} numeric onChange={(v) => onChange({ rejectedQuantity: v })} error={problems.rejected} />
          </View>
          <Field label="Lot" parsed={parsed.lotCode} value={edit.lotCode} editable={editable} onChange={(v) => onChange({ lotCode: v })} error={problems.lot} />
          <Field label="Expires (YYYY-MM-DD)" parsed={parsed.expiresOn} value={edit.expiresOn} editable={editable} onChange={(v) => onChange({ expiresOn: v })} error={problems.expiry} />
          <View style={styles.row2}>
            <Field label="Net weight" parsed={parsed.netWeight} value={edit.netWeight} editable={editable} numeric onChange={(v) => onChange({ netWeight: v })} error={problems.weight} />
            <Field label="Temp °C" parsed={parsed.temperatureC} value={edit.temperatureC} editable={editable} onChange={(v) => onChange({ temperatureC: v })} error={problems.temperature} />
          </View>
          {Number(edit.damagedQuantity) > 0 || Number(edit.rejectedQuantity) > 0 ? (
            <Field label="Reason (required)" parsed={null} value={edit.reason} editable={editable} onChange={(v) => onChange({ reason: v })} error={problems.reason} />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function Field({
  label,
  parsed,
  value,
  editable,
  numeric,
  onChange,
  error,
}: {
  label: string;
  /** What the parser read; stays visible after an edit. */
  parsed: string | null;
  value: string;
  editable: boolean;
  numeric?: boolean;
  onChange: (v: string) => void;
  error?: string;
}) {
  const edited = parsed !== null && value.trim() !== parsed.trim();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {edited ? '  · edited' : ''}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        editable={editable}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={label}
        style={[styles.input, !editable && styles.inputOff, error ? styles.inputError : null, edited && styles.inputEdited]}
      />
      {parsed !== null ? <Text style={styles.parsed}>Parsed: {parsed}</Text> : null}
      {error ? <Text style={styles.errorSmall}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  content: { padding: space.screen, gap: space.gap, paddingBottom: 60 },
  pills: { flexDirection: 'row', gap: 7, marginTop: 7, flexWrap: 'wrap' },
  meta: { ...typeScale.small, color: colors.ink.subtle, marginTop: 6 },

  sectionTitle: { ...typeScale.section, color: colors.ink.DEFAULT, marginBottom: 4 },
  strong: { ...typeScale.bodyStrong, color: colors.ink.DEFAULT },
  small: { ...typeScale.small, color: colors.ink.subtle, marginTop: 2 },
  note: { ...typeScale.small, color: colors.ink.subtle, marginTop: 8 },
  parsedRow: { ...typeScale.small, color: colors.ink.subtle, marginTop: 8 },

  lineCard: {
    padding: 13,
    borderRadius: radius.card,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.hairline.DEFAULT,
    gap: 6,
  },
  lineCardLow: { borderColor: colors.warn.line, backgroundColor: colors.warn.tint },
  lineCardOff: { opacity: 0.6 },
  lineHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemName: { ...typeScale.bodyStrong, color: colors.ink.DEFAULT },
  toggle: { alignSelf: 'flex-start', paddingVertical: 6 },
  toggleText: { ...typeScale.small, color: colors.info.DEFAULT, textDecorationLine: 'underline' },

  label: { fontSize: 11, color: colors.ink.subtle, marginTop: 6 },
  value: { ...typeScale.body, color: colors.ink.DEFAULT },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.hairline.DEFAULT,
    backgroundColor: colors.surface.card,
    maxWidth: 160,
  },
  chipOn: { borderColor: colors.brand.DEFAULT, backgroundColor: colors.brand.tint },
  chipText: { fontSize: 12, color: colors.ink.muted },
  chipTextOn: { color: colors.brand.DEFAULT, fontWeight: '700' },

  row3: { flexDirection: 'row', gap: 8 },
  row2: { flexDirection: 'row', gap: 8 },
  field: { flex: 1, minWidth: 0 },
  input: {
    minHeight: space.tap,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.hairline.DEFAULT,
    backgroundColor: colors.surface.card,
    fontSize: 14,
    color: colors.ink.DEFAULT,
    marginTop: 3,
  },
  inputOff: { backgroundColor: colors.surface.raised, color: colors.ink.subtle },
  inputError: { borderColor: colors.danger.DEFAULT },
  inputEdited: { borderColor: colors.info.DEFAULT },
  parsed: { fontSize: 11, color: colors.ink.subtle, marginTop: 2 },
  error: { ...typeScale.small, color: colors.danger.DEFAULT },
  errorSmall: { fontSize: 11, color: colors.danger.DEFAULT, marginTop: 2 },

  actions: { gap: 10, marginTop: 6 },
  rejectBox: { gap: 8 },
});
