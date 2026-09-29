import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FoodlineButton } from '../../components/FoodlineButton';
import { Card, StatusPill } from '../../components/primitives';
import { colors, radius, space, type as typeScale } from '../../theme/tokens';
import type { ShipmentDraft, ShipmentTarget } from './types';

/**
 * Screen 07 — Post shipment.
 *
 * The whole design brief here is one word: Optional. Every field except the
 * shipment date is optional, and each one says so on its own label rather than
 * relying on the absence of an asterisk. Posting with no carrier and no tracking
 * number must succeed — a distributor running its own trucks has neither, and
 * making them hunt for a value they do not have is exactly the kind of small
 * friction that gets repeated back as "your software is fussy".
 */

export type PostShipmentScreenProps = {
  target: ShipmentTarget;
  initialDate: string;
  posting?: boolean;
  onPost: (draft: ShipmentDraft) => void;
};

export function PostShipmentScreen({
  target,
  initialDate,
  posting = false,
  onPost,
}: PostShipmentScreenProps) {
  const [shipmentDate, setShipmentDate] = useState(initialDate);
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [customerReference, setCustomerReference] = useState('');
  const [internalNote, setInternalNote] = useState('');

  const dateMissing = shipmentDate.trim().length === 0;

  const submit = () => {
    if (dateMissing) return;
    onPost({
      orderId: target.orderId,
      shipmentDate: shipmentDate.trim(),
      carrier: carrier.trim() || null,
      trackingNumber: trackingNumber.trim() || null,
      customerReference: customerReference.trim() || null,
      internalNote: internalNote.trim() || null,
      rowVersion: target.rowVersion,
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Card>
        <View style={styles.summaryHead}>
          <Text style={styles.customer}>{target.customerName}</Text>
          <StatusPill label="Packed" tone="ok" />
        </View>
        <Text style={styles.summaryMeta}>{target.summary}</Text>
      </Card>

      <Field
        label="Shipment date"
        badge="Required"
        badgeTone="required"
        value={shipmentDate}
        onChangeText={setShipmentDate}
        placeholder="MM/DD/YYYY"
        error={dateMissing ? 'A shipment date is needed before posting.' : undefined}
      />

      <Card>
        <View style={styles.optionalHead}>
          <Text style={styles.sectionTitle}>Optional details</Text>
          <StatusPill label="Optional" tone="neutral" />
        </View>

        <View style={styles.fields}>
          <Field
            label="Carrier"
            badge="Optional"
            value={carrier}
            onChangeText={setCarrier}
            placeholder="Own fleet, or a carrier name"
            bare
          />
          <Field
            label="Tracking number"
            badge="Optional"
            value={trackingNumber}
            onChangeText={setTrackingNumber}
            placeholder="Only if a carrier gave you one"
            bare
          />
          <Field
            label="Customer reference"
            badge="Optional"
            value={customerReference}
            onChangeText={setCustomerReference}
            placeholder="What the customer calls this order"
            bare
          />
          <Field
            label="Internal note"
            badge="Optional"
            value={internalNote}
            onChangeText={setInternalNote}
            placeholder="Anything the warehouse should know"
            bare
          />
        </View>
      </Card>

      <View style={styles.helper}>
        <Text style={styles.helperText}>
          Only the shipment date is required. The customer is notified when the order ships, not
          when it is packed.
        </Text>
      </View>

      <FoodlineButton
        label="Post shipment"
        busy={posting}
        disabled={dateMissing}
        onPress={submit}
        testID="shipment-post"
      />
    </ScrollView>
  );
}

function Field({
  label,
  badge,
  badgeTone = 'optional',
  value,
  onChangeText,
  placeholder,
  error,
  bare = false,
}: {
  label: string;
  badge: string;
  badgeTone?: 'required' | 'optional';
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  error?: string;
  bare?: boolean;
}) {
  const required = badgeTone === 'required';

  return (
    <View style={bare ? undefined : styles.fieldBlock}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.badge, required ? styles.badgeRequired : styles.badgeOptional]}>
          <Text style={[styles.badgeText, required && styles.badgeTextRequired]}>{badge}</Text>
        </View>
      </View>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.ink.disabled}
        style={[styles.input, error ? styles.inputError : null]}
        accessibilityLabel={`${label}, ${badge.toLowerCase()}`}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  content: { padding: space.screen, gap: space.gapLoose, paddingBottom: 48 },

  summaryHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  customer: { ...typeScale.section, color: colors.ink.DEFAULT },
  summaryMeta: { ...typeScale.small, color: colors.ink.subtle, marginTop: 3 },

  optionalHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sectionTitle: { ...typeScale.section, color: colors.ink.DEFAULT },
  fields: { marginTop: 13, gap: 13 },

  fieldBlock: {},
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  label: { fontSize: 12, fontWeight: '600', color: colors.ink.muted },

  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill, borderWidth: 1 },
  badgeOptional: { backgroundColor: colors.surface.DEFAULT, borderColor: colors.hairline.DEFAULT },
  badgeRequired: { backgroundColor: colors.brand.tint, borderColor: colors.info.line },
  badgeText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', color: colors.ink.muted },
  badgeTextRequired: { color: colors.brand.pressed },

  input: {
    height: space.tap,
    paddingHorizontal: 13,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.hairline.DEFAULT,
    backgroundColor: colors.surface.card,
    fontSize: 14,
    color: colors.ink.DEFAULT,
  },
  inputError: { borderColor: colors.danger.DEFAULT },
  error: { ...typeScale.small, color: colors.danger.DEFAULT, marginTop: 5 },

  helper: {
    padding: 13,
    borderRadius: radius.card,
    backgroundColor: colors.brand.tint,
    borderWidth: 1,
    borderColor: colors.info.line,
  },
  helperText: { ...typeScale.small, color: colors.ink.muted },
});
