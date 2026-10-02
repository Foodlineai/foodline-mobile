import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useVoice } from './VoiceProvider';

const useNativeDriver = Platform.OS !== 'web';
const DOCK_HEIGHT = 88;

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

/**
 * While voice mode is on: a gradient glow rises from the dock so it's obvious
 * the Copilot is live, and one line carries everything it says (no logo, no
 * transcript, no text box). The glow shows only while a session is actually
 * running — never for "starting" failures, because nothing is listening.
 */
export function VoiceOverlay() {
  const { status, line, active, stop } = useVoice();
  const reduce = useReduceMotion();
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: active ? 1 : 0, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver }).start();
  }, [active, fade]);

  useEffect(() => {
    if (!active || reduce) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: status === 'speaking' ? 700 : 1500, easing: Easing.inOut(Easing.sin), useNativeDriver }),
        Animated.timing(pulse, { toValue: 0, duration: status === 'speaking' ? 700 : 1500, easing: Easing.inOut(Easing.sin), useNativeDriver }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, reduce, status, pulse]);

  if (status === 'off') return null;

  const glowOpacity = Animated.multiply(fade, pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }));

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {active ? (
        <Animated.View pointerEvents="none" style={[styles.glow, { opacity: glowOpacity }]} testID="voice-glow">
          <LinearGradient
            colors={['rgba(79,70,229,0)', 'rgba(99,102,241,0.28)', 'rgba(56,189,248,0.55)']}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(99,102,241,0)', 'rgba(129,140,248,0.9)', 'rgba(56,189,248,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.edge}
          />
        </Animated.View>
      ) : null}

      <View pointerEvents="box-none" style={styles.barWrap}>
        <View style={styles.bar} accessibilityLiveRegion="polite" testID="voice-bar">
          <View style={[styles.dot, status === 'unavailable' && styles.dotOff]} />
          <Text style={styles.line} numberOfLines={2}>
            {line}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close voice" onPress={stop} hitSlop={10} style={styles.close} testID="voice-close">
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 230 },
  edge: { position: 'absolute', left: 0, right: 0, bottom: DOCK_HEIGHT - 2, height: 3 },
  barWrap: { position: 'absolute', left: 16, right: 16, bottom: DOCK_HEIGHT + 14 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C7CBFA',
    shadowColor: '#2F3BD6',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  dot: { height: 9, width: 9, borderRadius: 5, backgroundColor: '#4953E4' },
  dotOff: { backgroundColor: '#96A8CE' },
  line: { flex: 1, fontSize: 14, color: '#0B1020', fontWeight: '600' },
  close: { height: 30, width: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF3FC' },
  closeText: { fontSize: 13, color: '#475776', fontWeight: '700' },
});
