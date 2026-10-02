import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FoodlineButton } from '../components/FoodlineButton';
import { StepProgress, type Step } from '../components/primitives';
import { colors, radius, type as typeScale } from '../theme/tokens';
import type { BootstrapStage } from './types';

/**
 * Sign in.
 *
 * ⚠️ **There is no password field here, and there must never be one.**
 *
 * The button hands off to WorkOS AuthKit, which hosts credential collection. Our
 * app never sees a password, so there is nothing to leak, log, or capture into a
 * crash report. If someone proposes an in-app form to "improve the experience",
 * that is a security regression wearing a polish costume.
 *
 * The screen's job is therefore small and worth doing well: say where you are,
 * look like the product, and get out of the way.
 */

export type SignInScreenProps = {
  onSignIn: () => void;
  busy?: boolean;
  /** Set when a previous attempt failed. Plain language, never a raw error. */
  error?: string | null;
};

export function SignInScreen({ onSignIn, busy = false, error }: SignInScreenProps) {
  return (
    <LinearGradient
      colors={['#16297E', colors.ink.DEFAULT]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.dark}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.signInBody}>
          <Beacon />

          <Text style={styles.wordmark}>Foodline AI</Text>
          <Text style={styles.tagline}>
            The system of record, intelligence and action for food distribution.
          </Text>
        </View>

        <View style={styles.signInFoot}>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <FoodlineButton
            label="Sign in with WorkOS"
            busy={busy}
            onPress={onSignIn}
            accessibilityHint="Opens the secure Foodline sign-in page"
            testID="sign-in"
          />

          <Text style={styles.secure}>
            Sign-in opens a secure page. Your password is never entered in this app.
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ── Bootstrap ─────────────────────────────────────────────────────────── */

const STAGE_LABELS: Record<BootstrapStage, string> = {
  'signing-in': 'Signing you in',
  'loading-company': 'Loading your company',
  'preparing': 'Preparing your workspaces',
};

const STAGE_ORDER: BootstrapStage[] = ['signing-in', 'loading-company', 'preparing'];

/**
 * The bootstrap sequence. Named steps, never a spinner.
 *
 * This is the first screen a customer ever sees and the moment a slow network is
 * most likely, which is exactly why it says what it is doing. A spinner here
 * reads as broken; three named stages read as working.
 *
 * `slowStage` is set by the caller after roughly eight seconds on one stage.
 * Long is tolerable. Unexplained is not.
 */
export function SessionBootstrapScreen({
  stage,
  slowStage = false,
}: {
  stage: BootstrapStage;
  slowStage?: boolean;
}) {
  const index = STAGE_ORDER.indexOf(stage);

  const steps: Step[] = STAGE_ORDER.map((s, i) => ({
    label: STAGE_LABELS[s],
    state: i < index ? 'done' : i === index ? 'active' : 'pending',
  }));

  return (
    <LinearGradient
      colors={['#16297E', colors.ink.DEFAULT]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.dark}
    >
      <View style={styles.bootBody}>
        <Beacon />
        <Text style={styles.wordmark}>Foodline AI</Text>
      </View>

      <View style={styles.bootSteps}>
        <StepProgress steps={steps} />
        {slowStage && (
          <Text style={styles.slow}>
            This is taking longer than usual. Still working — your connection may be slow.
          </Text>
        )}
      </View>
    </LinearGradient>
  );
}

/* ── Splash ────────────────────────────────────────────────────────────── */

/** Shown while SecureStore is read. Should be on screen for well under a second. */
export function SplashScreen() {
  return (
    <LinearGradient
      colors={['#16297E', colors.ink.DEFAULT]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={[styles.dark, styles.splash]}
    >
      <Beacon />
      <Text style={styles.wordmark}>Foodline AI</Text>
    </LinearGradient>
  );
}

/* ── The beacon ────────────────────────────────────────────────────────── */

/**
 * A slow sweep with a soft pulse — the brand's beacon motion, not a loading
 * indicator. It runs at the same rate whatever is happening, deliberately: a
 * mark that speeds up under load is a mark that tells you the app is struggling.
 *
 * The real badge artwork (`mark-badge-colour.png`) drops in here when it lands.
 * Do not redraw the lighthouse — it is finished artwork.
 */
function Beacon() {
  const sweep = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(sweep, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 2100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 2100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep, pulse]);

  const rotate = sweep.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] });
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

  return (
    <View style={styles.beaconWrap}>
      <Animated.View style={[styles.beaconRing, { opacity: glow, transform: [{ rotate }] }]}>
        <LinearGradient
          colors={['rgba(124,156,240,0)', 'rgba(124,156,240,0.85)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.beaconSweep}
        />
      </Animated.View>

      <Animated.View style={[styles.beaconCore, { transform: [{ scale }] }]}>
        <LinearGradient
          colors={['#7C9CF0', '#4C80FB', '#1E3A8A']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.beaconFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  dark: { flex: 1, paddingHorizontal: 28 },
  safeArea: { flex: 1 },
  splash: { alignItems: 'center', justifyContent: 'center', gap: 20 },

  signInBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  bootBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },

  wordmark: { ...typeScale.title, color: '#FFFFFF', textAlign: 'center' },
  tagline: {
    ...typeScale.body,
    color: '#9DB9F8',
    textAlign: 'center',
    maxWidth: 300,
  },

  signInFoot: { paddingBottom: 24, gap: 12 },
  secure: { ...typeScale.small, color: '#96A8CE', textAlign: 'center' },
  errorBox: {
    padding: 13,
    borderRadius: radius.card,
    backgroundColor: 'rgba(198,47,39,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(243,198,195,0.4)',
  },
  errorText: { ...typeScale.small, color: '#FBE2E0' },

  bootSteps: { paddingBottom: 64, gap: 14 },
  slow: { ...typeScale.small, color: '#96A8CE', textAlign: 'center' },

  beaconWrap: { width: 132, height: 132, alignItems: 'center', justifyContent: 'center' },
  beaconRing: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    overflow: 'hidden',
  },
  beaconSweep: { flex: 1 },
  beaconCore: {
    width: 84,
    height: 84,
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#4C80FB',
    shadowOpacity: 0.7,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  beaconFill: { flex: 1 },
});
