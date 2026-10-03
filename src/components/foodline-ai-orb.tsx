import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ARTWORK } from './artwork';

export function FoodlineAiOrb({ size = 48, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const breath = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    breath.stopAnimation();
    glow.stopAnimation();
    if (reduceMotion) {
      breath.setValue(0);
      glow.setValue(0);
      return;
    }

    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 2100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 2100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ])
    );
    const glowing = Animated.loop(
      Animated.sequence([
        Animated.delay(350),
        Animated.timing(glow, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1800,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.delay(550),
      ])
    );
    breathing.start();
    glowing.start();
    return () => {
      breathing.stop();
      glowing.stop();
    };
  }, [breath, glow, reduceMotion]);

  return (
    <Animated.View
      accessibilityLabel="Foodline AI"
      accessibilityRole="image"
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
        {
          transform: [
            { translateY: breath.interpolate({ inputRange: [0, 1], outputRange: [0.5, -1] }) },
            { scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1.02] }) },
          ],
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            borderRadius: size / 2,
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.28] }),
            transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.16] }) }],
          },
        ]}
      />
      <Animated.Image
        source={ARTWORK.foodlineAiOrb}
        resizeMode="contain"
        style={{
          width: size,
          height: size,
          opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }),
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#7CA8FF',
  },
});
