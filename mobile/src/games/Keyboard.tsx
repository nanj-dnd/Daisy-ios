import { ReactNode, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { StyleProp, Text, TextStyle, ViewStyle } from 'react-native';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { springs } from '../theme';

type KeyProps = { label: string; style: StyleProp<ViewStyle>; faceStyle?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle>; enabled?: boolean; dimDisabled?: boolean; repeat?: boolean; press: () => void; children: ReactNode };

/**
 * Fires on touch-down from a native recognizer, one per finger. Pressable shares a single JavaScript
 * responder, which drops fast or overlapping taps and so loses repeated letters.
 */
export function TouchKey({ label, style, faceStyle, textStyle, enabled = true, dimDisabled = true, repeat = false, press, children }: KeyProps) {
  const latest = useRef({ press, enabled, repeat });
  useLayoutEffect(() => { latest.current = { press, enabled, repeat }; });
  const fire = useCallback(() => { if (latest.current.enabled) latest.current.press(); }, []);
  const wait = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeating = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = useCallback(() => {
    if (wait.current !== null) clearTimeout(wait.current);
    if (repeating.current !== null) clearInterval(repeating.current);
    wait.current = null; repeating.current = null;
  }, []);
  const begin = useCallback(() => {
    stop(); fire();
    if (!latest.current.enabled || !latest.current.repeat) return;
    wait.current = setTimeout(() => { fire(); repeating.current = setInterval(fire, 85); }, 360);
  }, [fire, stop]);
  useEffect(() => { if (!enabled) stop(); return stop; }, [enabled, stop]);
  const held = useSharedValue(0);
  const reduced = useReducedMotion();
  const tap = useTapGesture({
    enabled,
    maxDuration: 60_000,
    onBegin: () => {
      'worklet';
      held.value = withSpring(1, springs.press);
      scheduleOnRN(begin);
    },
    onFinalize: () => {
      'worklet';
      held.value = withSpring(0, springs.press);
      scheduleOnRN(stop);
    },
  });
  const pressed = useAnimatedStyle(() => ({ opacity: 1 - 0.18 * held.value, transform: [{ scale: reduced ? 1 : 1 - 0.04 * held.value }] }));
  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        accessible accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !enabled }} onAccessibilityTap={fire}
        style={[{ alignItems: 'center', justifyContent: 'center', opacity: enabled || !dimDisabled ? 1 : 0.5 }, style, !faceStyle && pressed]}
      >
        {faceStyle ? (
          <Animated.View pointerEvents="none" style={[{ flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }, faceStyle, pressed]}>
            {typeof children === 'string' ? <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit style={textStyle}>{children}</Text> : children}
          </Animated.View>
        ) : typeof children === 'string' ? <Text maxFontSizeMultiplier={1.2} style={textStyle}>{children}</Text> : children}
      </Animated.View>
    </GestureDetector>
  );
}
