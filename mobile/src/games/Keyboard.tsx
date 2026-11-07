import { ReactNode, useCallback, useLayoutEffect, useRef } from 'react';
import { StyleProp, Text, TextStyle, ViewStyle } from 'react-native';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { springs } from '../theme';

type KeyProps = { label: string; style: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle>; enabled?: boolean; press: () => void; children: ReactNode };

/**
 * Fires on touch-down from a native recognizer, one per finger. Pressable shares a single JavaScript
 * responder, which drops fast or overlapping taps and so loses repeated letters.
 */
export function TouchKey({ label, style, textStyle, enabled = true, press, children }: KeyProps) {
  const latest = useRef({ press, enabled });
  useLayoutEffect(() => { latest.current = { press, enabled }; });
  const fire = useCallback(() => { if (latest.current.enabled) latest.current.press(); }, []);
  const held = useSharedValue(0);
  const tap = useTapGesture({
    maxDuration: 60_000,
    onBegin: () => {
      'worklet';
      held.value = withSpring(1, springs.press);
      scheduleOnRN(fire);
    },
    onFinalize: () => {
      'worklet';
      held.value = withSpring(0, springs.press);
    },
  });
  const pressed = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.06 * held.value }] }));
  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        accessible accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !enabled }} onAccessibilityTap={fire}
        style={[{ alignItems: 'center', justifyContent: 'center', opacity: enabled ? 1 : 0.5 }, style, pressed]}
      >
        {typeof children === 'string' ? <Text style={textStyle}>{children}</Text> : children}
      </Animated.View>
    </GestureDetector>
  );
}
