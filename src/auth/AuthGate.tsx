import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FoodlineButton } from '../components/FoodlineButton';
import { Card, CardRow, StatusPill } from '../components/primitives';
import { visibleWorkspaces } from '../personas/types';
import { colors, radius, space, type as typeScale } from '../theme/tokens';
import { SessionBootstrapScreen, SignInScreen, SplashScreen } from './SignInScreen';
import type { AuthState, CompanyOption, Session } from './types';

/**
 * The gate. One switch on `status` — see the note in types.ts about why this is
 * a machine and not a pile of booleans.
 */
export type AuthGateProps = {
  state: AuthState;
  onSignIn: () => void;
  onChooseCompany: (company: CompanyOption) => void;
  onReauthenticate: () => void;
  onUseDemoMode?: () => void;
  children: React.ReactNode;
};

export function AuthGate({
  state,
  onSignIn,
  onChooseCompany,
  onReauthenticate,
  onUseDemoMode,
  children,
}: AuthGateProps) {
  switch (state.status) {
    case 'restoring':
      return <SplashScreen />;

    case 'signed-out':
      return <SignInScreen onSignIn={onSignIn} error={state.error} onUseDemoMode={onUseDemoMode} />;

    case 'authenticating':
      return <SignInScreen onSignIn={onSignIn} busy />;

    case 'bootstrapping':
      return <SessionBootstrapScreen stage={state.stage} slowStage={state.slow} />;

    case 'choosing-company':
      return <CompanyChoice companies={state.companies} onChoose={onChooseCompany} />;

    case 'ready':
      return <>{children}</>;

    case 'expired':
      // The app stays mounted underneath — their work is still there.
      return (
        <>
          {children}
          <ExpiredSheet onReauthenticate={onReauthenticate} />
        </>
      );
  }
}

function CompanyChoice({
  companies,
  onChoose,
}: {
  companies: CompanyOption[];
  onChoose: (c: CompanyOption) => void;
}) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Which company?</Text>
      <Text style={styles.sub}>You have access to more than one. You can switch later.</Text>

      <Card padded={false}>
        {companies.map((c, i) => (
          <Pressable key={c.id} onPress={() => onChoose(c)} accessibilityRole="button">
            <CardRow first={i === 0}>
              <View style={styles.grow}>
                <Text style={styles.rowTitle}>{c.name}</Text>
                {c.subtitle && <Text style={styles.rowMeta}>{c.subtitle}</Text>}
              </View>
              <Text style={styles.chevron}>›</Text>
            </CardRow>
          </Pressable>
        ))}
      </Card>
    </ScrollView>
  );
}

/**
 * Re-auth without losing the screen behind it. A driver at stop six should come
 * back to stop six.
 */
function ExpiredSheet({ onReauthenticate }: { onReauthenticate: () => void }) {
  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.scrim} />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <Text style={styles.sheetTitle}>Please sign in again</Text>
        <Text style={styles.sheetBody}>
          Your session timed out. Nothing has been lost — you will come straight back to what you
          were doing.
        </Text>
        <FoodlineButton label="Sign in" onPress={onReauthenticate} />
      </View>
    </Modal>
  );
}

/* ── Account ───────────────────────────────────────────────────────────── */

/**
 * Account, not user management.
 *
 * **We do not invite, assign roles or deactivate on mobile.** Those belong in the
 * ERP's Users & Roles, which is itself still a placeholder — building a second
 * admin surface on a phone would mean two implementations of a permission model
 * that does not yet exist even once.
 *
 * What this screen does is tell the actor what they are and what that gets them.
 * "You are Inventory · Atlanta warehouse, here is what you can reach" is a far
 * better answer than someone quietly wondering why their app looks different
 * from a colleague's.
 */
export type AccountScreenProps = {
  session: Session;
  canSwitchCompany: boolean;
  onSwitchCompany: () => void;
  onSignOut: () => void;
};

export function AccountScreen({
  session,
  canSwitchCompany,
  onSwitchCompany,
  onSignOut,
}: AccountScreenProps) {
  const { actor, company, persona } = session;
  const reach = visibleWorkspaces(persona.id);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{actor.initials}</Text>
        </View>
        <View style={styles.grow}>
          <Text style={styles.name}>{actor.name}</Text>
          <Text style={styles.rowMeta}>{actor.email}</Text>
        </View>
      </View>

      <Card>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.rowTitle}>
          {persona.label} · {persona.scopeLabel}
        </Text>
        <Text style={styles.rowMeta}>{company.name}</Text>
      </Card>

      <Card padded={false}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>What you can reach</Text>
        </View>
        {reach.map(({ workspace, access }, i) => (
          <CardRow key={workspace.id} first={i === 0}>
            <Text style={[styles.rowTitle, styles.grow]}>{workspace.label}</Text>
            {access === 'read' && <StatusPill label="View" tone="info" />}
          </CardRow>
        ))}
      </Card>

      <Text style={styles.hint}>
        Your access is set by an administrator. Ask them if something you need is missing.
      </Text>

      <View style={styles.actions}>
        {canSwitchCompany && (
          <FoodlineButton label="Switch company" variant="quiet" onPress={onSwitchCompany} />
        )}
        <FoodlineButton label="Sign out" variant="quiet" onPress={onSignOut} testID="sign-out" />
      </View>

      <Text style={styles.hint}>
        Signing out clears this device. On a shared handset, sign out before handing it over.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  content: { padding: space.screen, gap: space.gap, paddingBottom: 40 },
  grow: { flex: 1, minWidth: 0 },

  title: { ...typeScale.titleSm, color: colors.ink.DEFAULT },
  sub: { ...typeScale.small, color: colors.ink.muted, marginTop: -4 },

  identity: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.brand.tint,
    borderWidth: 1,
    borderColor: colors.info.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 17, fontWeight: '600', color: colors.brand.pressed },
  name: { ...typeScale.section, color: colors.ink.DEFAULT },

  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.ink.subtle,
    marginBottom: 4,
  },
  sectionHead: { paddingHorizontal: space.row, paddingTop: 13, paddingBottom: 4 },
  sectionTitle: { ...typeScale.section, color: colors.ink.DEFAULT },
  rowTitle: { ...typeScale.bodyStrong, color: colors.ink.DEFAULT },
  rowMeta: { ...typeScale.small, color: colors.ink.subtle, marginTop: 2 },
  chevron: { fontSize: 20, color: colors.ink.disabled },

  hint: { ...typeScale.small, color: colors.ink.subtle, textAlign: 'center' },
  actions: { gap: 10, marginTop: 4 },

  scrim: { flex: 1, backgroundColor: 'rgba(11,16,32,0.5)' },
  sheet: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: space.screen,
    paddingBottom: 36,
    gap: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.hairline.DEFAULT,
    marginBottom: 8,
  },
  sheetTitle: { ...typeScale.section, color: colors.ink.DEFAULT },
  sheetBody: { ...typeScale.body, color: colors.ink.muted, marginBottom: 6 },
});
