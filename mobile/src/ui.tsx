import { SymbolView, SymbolViewProps } from 'expo-symbols';
import { ComponentRef, ReactNode, Ref, useEffect, useRef, useState } from 'react';
import { Pressable, PressableProps, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { GameKind, nextEditionAt } from './core/engine';
import { store, useArcade } from './store';
import { springs, type, useColors } from './theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressProps = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scale?: number; children: ReactNode };
/** A pressable that gives way under the finger on a spring. */
export function Press({ style, scale = 0.96, children, onPressIn, onPressOut, ...rest }: PressProps) {
  const pressed = useSharedValue(1);
  const reduced = useReducedMotion();
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: pressed.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...rest}
      style={[style, !reduced && animated]}
      onPressIn={(event) => { pressed.set(withSpring(scale, springs.press)); onPressIn?.(event); }}
      onPressOut={(event) => { pressed.set(withSpring(1, springs.press)); onPressOut?.(event); }}
    >
      {children}
    </AnimatedPressable>
  );
}

export function ActionButton({ title, label, onPress, disabled, children }: { title?: string; label?: string; onPress: () => void; disabled?: boolean; children?: ReactNode }) {
  const colors = useColors();
  return (
    <Press
      onPress={onPress} disabled={disabled} scale={0.98} accessibilityLabel={label ?? title} accessibilityState={{ disabled: !!disabled }}
      style={[styles.action, { backgroundColor: disabled ? `${colors.muted}33` : colors.tint }]}
    >
      {children}
      {title !== undefined && <Text style={[type.headline, { color: disabled ? colors.muted : colors.paper }]}>{title}</Text>}
    </Press>
  );
}

/** Secondary actions: the whole 44-point row is the target, not just the glyphs. */
export function TextAction({ title, onPress, disabled, size = 'callout' }: { title: string; onPress: () => void; disabled?: boolean; size?: 'callout' | 'subheadline' }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} style={({ pressed }) => [styles.textAction, { opacity: disabled ? 0.38 : pressed ? 0.55 : 1 }]}>
      <Text style={[type[size], { color: colors.tint, fontWeight: '700' }]}>{title}</Text>
    </Pressable>
  );
}

export type InputRef = ComponentRef<typeof TextInput>;
type FieldProps = TextInputProps & { title: string; suffix?: string; inputRef?: Ref<InputRef> };
export function InputField({ title, suffix, inputRef, ...rest }: FieldProps) {
  const colors = useColors();
  return (
    <View style={[styles.field, { backgroundColor: colors.surface }]}>
      <TextInput
        ref={inputRef} placeholder={title} placeholderTextColor={colors.muted} accessibilityLabel={title} autoCorrect={false}
        style={[styles.input, { color: colors.ink }]} {...rest}
      />
      {suffix !== undefined && <Text numberOfLines={1} style={[type.callout, { color: colors.muted, fontWeight: '600' }]}>{suffix}</Text>}
    </View>
  );
}

export function FeedbackLine({ text }: { text: string }) {
  const colors = useColors();
  if (!text) return null;
  return <Text accessibilityLiveRegion="polite" style={[type.callout, { color: colors.tint }]}>{text}</Text>;
}

export function ProgressDots({ count, filled }: { count: number; filled: number }) {
  const colors = useColors();
  return (
    <View style={styles.dots} accessible accessibilityLabel={`${filled} of ${count} completed`}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={[styles.dot, { backgroundColor: colors.tint, opacity: index < filled ? 1 : 0.16 }]} />
      ))}
    </View>
  );
}

const symbols: Record<GameKind, { ios: SymbolViewProps['name']; fallback: string }> = {
  trivia: { ios: 'water.waves', fallback: '≈' }, estimation: { ios: 'number', fallback: '#' }, cryptic: { ios: 'quote.opening', fallback: '“' },
  word: { ios: 'character.cursor.ibeam', fallback: 'A' }, groups: { ios: 'square.grid.2x2', fallback: '▦' }, sudoku: { ios: 'square.grid.3x3', fallback: '▦' },
  zip: { ios: 'scribble.variable', fallback: '∿' }, globle: { ios: 'globe.americas.fill', fallback: '◍' },
};
export function GameSymbol({ kind, size, color, done }: { kind: GameKind; size: number; color: string; done?: boolean }) {
  const symbol = symbols[kind];
  return <Icon name={done ? 'checkmark.seal.fill' : symbol.ios} size={size} color={color} fallback={done ? '✓' : symbol.fallback} />;
}
export function Icon({ name, size, color, fallback, weight = 'bold' }: { name: SymbolViewProps['name']; size: number; color: string; fallback: string; weight?: SymbolViewProps['weight'] }) {
  return (
    <SymbolView
      name={name} size={size} tintColor={color} weight={weight}
      fallback={<Text style={{ color, fontSize: size, fontWeight: '700' }}>{fallback}</Text>}
    />
  );
}

/** A short message over the board. Showing the same text again restarts its clock. */
/** Time left until every game refreshes at midnight UTC, as h:mm:ss, ticking each second. Rolls the app over to the new day when it reaches zero. */
export function useCountdown() {
  const arcade = useArcade();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const left = Math.max(0, Math.ceil((nextEditionAt(arcade.today) - now) / 1000));
  useEffect(() => { if (left === 0) store.refreshDay(); }, [left]);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${Math.floor(left / 3600)}:${pad(Math.floor((left % 3600) / 60))}:${pad(left % 60)}`;
}

export function useToast(duration = 1600) {
  const [text, setText] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const show = (message: string) => {
    if (timer.current) clearTimeout(timer.current);
    setText(message);
    timer.current = setTimeout(() => setText(''), duration);
  };
  return { text, show };
}
export function Toast({ text, fill, ink, top }: { text: string; fill: string; ink: string; top: number }) {
  if (!text) return null;
  return (
    <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(220)} pointerEvents="none" style={[styles.toast, { top, backgroundColor: fill }]}>
      <Text accessibilityLiveRegion="polite" style={[styles.toastText, { color: ink }]}>{text}</Text>
    </Animated.View>
  );
}

/** Plays a short horizontal shake; call the returned function to fire it. */
export function useShake() {
  const reduced = useReducedMotion();
  const phase = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: 7 * Math.sin(phase.value * Math.PI * 4) }] }));
  const shake = () => {
    if (reduced) return;
    phase.set(0);
    phase.set(withTiming(1, { duration: 380 }));
  };
  return { style, shake };
}

const styles = StyleSheet.create({
  action: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingVertical: 15, borderRadius: 14, borderCurve: 'continuous' },
  textAction: { minHeight: 44, justifyContent: 'center' },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderRadius: 14, borderCurve: 'continuous' },
  input: { flex: 1, fontSize: 20, paddingVertical: 16 },
  dots: { flexDirection: 'row', gap: 9 },
  dot: { width: 9, height: 9, borderRadius: 4.5 },
  toast: { position: 'absolute', alignSelf: 'center', zIndex: 30, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 6 },
  toastText: { fontSize: 14, fontWeight: '700' },
});
