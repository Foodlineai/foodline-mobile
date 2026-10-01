import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, type ImageStyle, type StyleProp } from 'react-native';

import { ARTWORK } from './artwork';

export function FoodlineAiOrb({ size = 48, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
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
    rotation.stopAnimation();
    pulse.stopAnimation();
    if (reduceMotion) {
      rotation.setValue(0);
      pulse.setValue(0);
      return;
    }

    const orbit = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      })
    );
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ])
    );
    orbit.start();
    breathing.start();
    return () => {
      orbit.stop();
      breathing.stop();
    };
  }, [pulse, reduceMotion, rotation]);

  return (
    <Animated.Image
      source={ARTWORK.foodlineAiOrb}
      accessibilityLabel="Foodline AI"
      resizeMode="contain"
      style={[
        { width: size, height: size },
        {
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }),
          transform: [
            { rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
            { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.035] }) },
          ],
        },
        style,
      ]}
    />
  );
}
