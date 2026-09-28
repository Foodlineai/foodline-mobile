import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

export const COLORS = {
  brand: '#3B65ED',
  brandPressed: '#1D47E5',
  brandLight: '#4C7BEA',
  brandTint: '#EAF1FD',
  ink: '#0B1020',
  inkMuted: '#475776',
  inkFaint: '#8A96AF',
  surface: '#F7FAFD',
  card: '#FFFFFF',
  line: '#E7EDF5',
  warn: '#B7791F',
  danger: '#D64545',
  ai: '#4953E4',
  aiDeep: '#1A40DA',
  aiPending: '#3B45DC',
  info: '#1D4FA8',
} as const;

export type IconName = React.ComponentProps<typeof Feather>['name'];

export function Screen({ children }: { children: React.ReactNode }) {
  return <View className="flex-1 bg-surface">{children}</View>;
}

const cardShadow: ViewStyle = {
  shadowColor: '#0B1020',
  shadowOpacity: 0.05,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
};

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <View className={`rounded-2xl border border-surface-line bg-surface-card ${className}`} style={cardShadow}>
      {children}
    </View>
  );
}

/** The blue role/context chip under the app name, e.g. "Admin · All operations". */
export function ContextPill({ label }: { label: string }) {
  return (
    <View className="self-start rounded-full bg-brand-tint px-3 py-1.5">
      <Text className="text-xs font-semibold text-brand">{label}</Text>
    </View>
  );
}

export function Avatar({ initials }: { initials: string }) {
  return (
    <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-tint">
      <Text className="text-sm font-bold text-brand">{initials}</Text>
    </View>
  );
}

export function SectionHeader({ title, onPress }: { title: string; onPress?: () => void }) {
  const content = (
    <View className="flex-row items-center justify-between">
      <Text className="text-xl font-bold text-ink">{title}</Text>
      {onPress ? <Feather name="chevron-right" size={22} color={COLORS.inkMuted} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
      {content}
    </Pressable>
  );
}

export function GroupLabel({ label }: { label: string }) {
  return <Text className="text-xs font-bold uppercase tracking-wide text-ink-faint">{label}</Text>;
}

/** A tappable row: icon, title, optional subtitle, chevron. The workhorse of this app. */
export function ListRow({
  icon,
  title,
  subtitle,
  trailing,
  onPress,
  tone = 'default',
  first = false,
  last = false,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  tone?: 'default' | 'warn';
  first?: boolean;
  last?: boolean;
}) {
  const radius = `${first ? 'rounded-t-2xl' : ''} ${last ? 'rounded-b-2xl' : ''}`;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      className={`flex-row items-center gap-3 border-surface-line bg-surface-card px-4 py-3.5 ${last ? '' : 'border-b'} ${radius} active:bg-brand-tint/40`}
    >
      {icon ? (
        <Feather name={icon} size={20} color={tone === 'warn' ? COLORS.warn : COLORS.ink} />
      ) : null}
      <View className="flex-1">
        <Text className="text-base font-semibold text-ink" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-sm text-ink-muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {onPress ? <Feather name="chevron-right" size={20} color={COLORS.inkFaint} /> : null}
    </Pressable>
  );
}

export function Group({ children }: { children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  return (
    <View className="overflow-hidden rounded-2xl border border-surface-line" style={cardShadow}>
      {items.map((child, i) =>
        React.isValidElement<{ first?: boolean; last?: boolean }>(child)
          ? React.cloneElement(child, { first: i === 0, last: i === items.length - 1 })
          : child
      )}
    </View>
  );
}

export function StatTile({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <Card className="min-w-[46%] flex-1 flex-row items-center gap-3 p-4">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-tint">
        <Feather name={icon} size={20} color={COLORS.brand} />
      </View>
      <View className="flex-1">
        <Text className="text-sm text-ink-muted" numberOfLines={1}>
          {label}
        </Text>
        <Text className="text-2xl font-bold text-ink">{value}</Text>
      </View>
    </Card>
  );
}

export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
  trailingChevron = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
  icon?: IconName;
  trailingChevron?: boolean;
}) {
  const isDisabled = disabled || loading;
  const primary = variant === 'primary';

  const content = loading ? (
    <ActivityIndicator color={primary ? '#FFFFFF' : COLORS.brand} />
  ) : (
    <>
      {icon ? <Feather name={icon} size={20} color={primary ? '#FFFFFF' : COLORS.brand} /> : null}
      <Text className={`text-base font-bold ${primary ? 'text-white' : 'text-brand'}`}>{label}</Text>
      {trailingChevron ? (
        <Feather name="chevron-right" size={20} color={primary ? '#FFFFFF' : COLORS.brand} />
      ) : null}
    </>
  );

  if (!primary) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        onPress={onPress}
        disabled={isDisabled}
        className={`h-14 flex-row items-center justify-center gap-2.5 rounded-full border border-brand-border bg-surface-card px-5 ${
          isDisabled ? 'opacity-50' : ''
        }`}
      >
        {content}
      </Pressable>
    );
  }

  // Primary — the 3D treatment (contracts/design.md §2 in the cowork repo):
  // gradient fill, gloss over the top 48%, hairline border, a brand-tinted
  // ambient shadow. RN has no inset box-shadow and no multiple shadows, so
  // this is the scoped-down version the contract's own RN note calls for —
  // not the full web recipe. Get it right once here; every screen using
  // <Button variant="primary"> inherits it, nothing reimplements it.
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.primaryShadow,
        isDisabled ? styles.disabled : null,
        pressed && !isDisabled ? styles.pressed : null,
      ]}
    >
      <LinearGradient colors={[COLORS.brandLight, COLORS.brandPressed]} style={styles.primaryGradient}>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
          style={styles.gloss}
        />
        {content}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryShadow: {
    borderRadius: 999,
    shadowColor: COLORS.brand,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    // Android does not tint elevation — accept the default grey shadow
    // rather than faking it with a blurred sibling view (costs a frame on
    // every scroll, per design.md §2).
    elevation: 6,
  },
  primaryGradient: {
    height: 56,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  gloss: { position: 'absolute', left: 0, right: 0, top: 0, height: '48%' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.9 },
});

export function NoticeCard({
  tone,
  title,
  body,
  actionLabel,
  onAction,
}: {
  tone: 'ai' | 'warn';
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const ai = tone === 'ai';
  return (
    <View
      className={`gap-1.5 rounded-2xl border p-4 ${ai ? 'border-brand-border bg-brand-tint' : 'border-warn-border bg-warn-tint'}`}
    >
      <View className="flex-row items-center gap-2">
        <Feather name={ai ? 'zap' : 'alert-triangle'} size={16} color={ai ? COLORS.brand : COLORS.warn} />
        <Text className={`text-sm font-bold ${ai ? 'text-brand' : 'text-warn'}`}>{title}</Text>
      </View>
      <Text className="text-sm text-ink">{body}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8} className="mt-1 flex-row items-center gap-1">
          <Text className={`text-sm font-bold ${ai ? 'text-brand' : 'text-warn'}`}>{actionLabel}</Text>
          <Feather name="chevron-right" size={16} color={ai ? COLORS.brand : COLORS.warn} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const tone =
    status === 'out' || status === 'cancelled'
      ? 'bg-danger-tint text-danger'
      : status === 'low' || status === 'partial'
        ? 'bg-warn-tint text-warn'
        : status === 'ok' || status === 'received'
          ? 'bg-good-tint text-good'
          : 'bg-brand-tint text-brand';
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${tone}`}>
      <Text className={`text-[11px] font-bold uppercase ${tone}`}>{label ?? status}</Text>
    </View>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 py-16">
      <ActivityIndicator color={COLORS.brand} />
      <Text className="text-sm text-ink-muted">{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View className="items-center justify-center gap-4 px-8 py-16">
      <Feather name="alert-circle" size={28} color={COLORS.danger} />
      <Text className="text-center text-base font-bold text-ink">Something went wrong</Text>
      <Text className="text-center text-sm text-ink-muted">{message}</Text>
      {onRetry ? <Button label="Try again" onPress={onRetry} variant="ghost" /> : null}
    </View>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View className="items-center justify-center gap-2 px-8 py-16">
      <Text className="text-base font-bold text-ink">{title}</Text>
      {hint ? <Text className="text-center text-sm text-ink-muted">{hint}</Text> : null}
    </View>
  );
}

/** The tinted hero card at the top of a module screen (mockups 02, 03). */
export function ModuleHero({
  eyebrow,
  title,
  subtitle,
  primary,
  secondary,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  primary?: { label: string; icon?: IconName; onPress: () => void };
  secondary?: { label: string; icon?: IconName; onPress: () => void };
}) {
  return (
    <View className="gap-3 rounded-2xl border border-brand-border bg-brand-tint p-4">
      <View className="gap-1">
        {eyebrow ? <GroupLabel label={eyebrow} /> : null}
        <Text className="text-2xl font-bold text-ink">{title}</Text>
        {subtitle ? <Text className="text-sm text-ink-muted">{subtitle}</Text> : null}
      </View>
      {primary || secondary ? (
        <View className="flex-row items-center gap-3">
          {primary ? (
            <View className="flex-1">
              <Button label={primary.label} icon={primary.icon} onPress={primary.onPress} />
            </View>
          ) : null}
          {secondary ? (
            <Pressable
              accessibilityRole="button"
              onPress={secondary.onPress}
              hitSlop={8}
              className="flex-row items-center gap-2 px-2"
            >
              <Feather name={secondary.icon ?? 'zap'} size={18} color={COLORS.brand} />
              <Text className="text-base font-bold text-brand">{secondary.label}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** Section heading with a "See all" affordance (mockup 02). */
export function SeeAllHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View className="flex-row items-baseline justify-between">
      <Text className="text-xl font-bold text-ink">{title}</Text>
      {onSeeAll ? (
        <Pressable accessibilityRole="button" onPress={onSeeAll} hitSlop={8}>
          <Text className="text-sm font-bold text-brand">See all</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Small paired stat, optionally in an alert tone (mockup 03). */
export function MiniStat({
  icon,
  value,
  label,
  tone = 'brand',
}: {
  icon: IconName;
  value: string;
  label: string;
  tone?: 'brand' | 'danger';
}) {
  const alert = tone === 'danger';
  return (
    <View
      className={`min-w-[46%] flex-1 flex-row items-center gap-3 rounded-2xl border p-4 ${
        alert ? 'border-danger/20 bg-danger-tint' : 'border-brand-border bg-brand-tint'
      }`}
    >
      <Feather name={icon} size={22} color={alert ? COLORS.danger : COLORS.brand} />
      <View className="flex-1">
        <Text className="text-2xl font-bold text-ink">{value}</Text>
        <Text className="text-sm text-ink-muted" numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

/** Amber "needs action" card with an inline primary button (mockup 03). */
export function AlertCard({
  title,
  lines,
  action,
}: {
  title: string;
  lines: string[];
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View className="gap-3 rounded-2xl border border-warn-border bg-warn-tint p-4">
      <View className="flex-row items-start gap-3">
        <Feather name="alert-triangle" size={20} color={COLORS.warn} />
        <View className="flex-1 gap-0.5">
          <Text className="text-base font-bold text-ink">{title}</Text>
          {lines.map((line) => (
            <Text key={line} className="text-sm text-ink-muted">
              {line}
            </Text>
          ))}
        </View>
      </View>
      {action ? <Button label={action.label} onPress={action.onPress} /> : null}
    </View>
  );
}

/** The small "View" chip some tool rows carry (mockups 02, 03). */
export function ViewBadge() {
  return (
    <View className="rounded-md bg-brand-tint px-2 py-1">
      <Text className="text-[11px] font-bold text-brand">View</Text>
    </View>
  );
}

/** An inline text action on the right of a row ("Review PO →"). */
export function RowAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} className="flex-row items-center gap-1">
      <Text className="text-sm font-bold text-brand">{label}</Text>
      <Feather name="arrow-right" size={15} color={COLORS.brand} />
    </Pressable>
  );
}

/** A tappable field placeholder — proof-of-delivery inputs (mockup 05). */
export function FieldRow({
  icon,
  placeholder,
  value,
  onPress,
}: {
  icon: IconName;
  placeholder: string;
  value?: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl border border-surface-line bg-surface-card px-4 py-3.5 active:bg-brand-tint/40"
    >
      <Feather name={icon} size={20} color={value ? COLORS.brand : COLORS.inkFaint} />
      <Text className={`flex-1 text-base ${value ? 'font-semibold text-ink' : 'text-ink-faint'}`} numberOfLines={1}>
        {value || placeholder}
      </Text>
      {value ? <Feather name="check" size={18} color={COLORS.brand} /> : null}
    </Pressable>
  );
}

/** A compact three-column line: name · quantity · state (mockup 05 checklist). */
export function ChecklistLine({
  name,
  quantity,
  state,
  last = false,
}: {
  name: string;
  quantity: string;
  state: string;
  last?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center gap-3 bg-surface-card px-4 py-3.5 ${last ? '' : 'border-b border-surface-line'}`}
    >
      <Text className="flex-1 text-base font-semibold text-ink" numberOfLines={1}>
        {name}
      </Text>
      <Text className="text-sm text-ink">{quantity}</Text>
      <Text className="w-24 text-right text-sm text-ink-muted">{state}</Text>
    </View>
  );
}
