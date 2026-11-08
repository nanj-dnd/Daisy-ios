import { geoInterpolate } from 'd3-geo';
import * as Haptics from 'expo-haptics';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { answerColor, borderDistance, centroidOf, countries, countryIndex, findCountry, globleAnswer, heatColor, suggestCountries } from '../core/globle';
import { useArcade } from '../store';
import { fonts, useGameLook } from '../theme';
import { Icon, Press, useGameActive } from '../ui';
import { Globe } from './Globe';

const blue = '#2F4BE2';
const kilometres = (value: number) => `${value.toLocaleString('en-US')} km`;

export function GlobleGame({ day, availableWidth }: { day: number; availableWidth: number }) {
  const arcade = useArcade();
  const look = useGameLook('globle');
  const reduced = useReducedMotion();
  const active = useGameActive();
  const progress = arcade.progress('globle', day);
  const answer = globleAnswer(day);
  const [typed, setTyped] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [byOrder, setByOrder] = useState(false);
  const [zoom, setZoom] = useState(1);
  const last = progress.guesses.length > 0 ? countryIndex(progress.guesses[progress.guesses.length - 1]) : null;
  const [centre, setCentre] = useState<[number, number]>(() => (progress.completed ? centroidOf(answer) : last !== null ? centroidOf(last) : [10, 20]));
  // The view as last drawn, read by gestures and flights that outlive the render that started them.
  const live = useRef({ centre, zoom });
  useLayoutEffect(() => { live.current = { centre, zoom }; });
  const grab = useRef({ centre, zoom });
  const zoomStart = useRef(1);
  const flight = useRef<number | null>(null);
  const size = Math.min(availableWidth, 430);

  const guesses = useMemo(
    () => progress.guesses.map((name, order) => {
      const index = countryIndex(name);
      return { name, index, order, distance: borderDistance(index, answer) };
    }),
    [progress.guesses, answer],
  );
  const fills = useMemo(() => {
    const painted = new Map(guesses.map((guess) => [guess.index, guess.index === answer ? answerColor : heatColor(guess.distance)]));
    if (progress.completed) painted.set(answer, answerColor);
    return painted;
  }, [guesses, answer, progress.completed]);
  const closest = guesses.reduce<number | null>((best, guess) => (best === null || guess.distance < best ? guess.distance : best), null);

  useEffect(() => () => { if (flight.current !== null) cancelAnimationFrame(flight.current); }, []);
  useEffect(() => { if (!active && flight.current !== null) { cancelAnimationFrame(flight.current); flight.current = null; } }, [active]);
  /** Turns the globe to a country along the shortest way round. */
  const flyTo = (index: number) => {
    const target = centroidOf(index);
    if (flight.current !== null) cancelAnimationFrame(flight.current);
    flight.current = null;
    if (reduced) { setCentre(target); return; }
    const path = geoInterpolate(live.current.centre, target);
    const started = Date.now();
    let drawn = 0;
    const step = () => {
      const elapsed = Date.now() - started;
      const t = Math.min(1, elapsed / 650);
      // Projection is CPU work; bound flights to 30 frames/sec instead of competing with touch input.
      if (elapsed - drawn >= 32 || t === 1) { setCentre(path(1 - (1 - t) ** 3) as [number, number]); drawn = elapsed; }
      flight.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    flight.current = requestAnimationFrame(step);
  };

  const guess = (text: string) => {
    const current = arcade.progress('globle', day);
    if (current.completed) return;
    const index = findCountry(text);
    if (index === null) { setMessage('Invalid country name'); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
    const name = countries[index].name;
    setTyped('');
    Keyboard.dismiss();
    if (current.guesses.includes(name)) { setMessage(`Already guessed ${name}`); flyTo(index); return; }
    const distance = borderDistance(index, answer);
    arcade.update('globle', day, (state) => {
      if (state.completed || state.guesses.includes(name)) return;
      state.guesses.push(name);
      if (index === answer) arcade.finish(state, true);
    });
    if (index === answer) setMessage(`The Mystery Country is ${name}!`);
    else if (closest === null) setMessage(distance === 0 ? `${name} shares a border with it!` : `${name} is ${kilometres(distance)} away`);
    else setMessage(distance === 0 ? `${name} shares a border with it!` : distance < closest ? `${name} is warmer!` : distance === closest ? `${name} is just as close` : `${name} is cooler`);
    void Haptics.impactAsync(index === answer ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
    flyTo(index);
  };
  const giveUp = () => Alert.alert('Reveal the mystery country?', 'This ends today’s Globle.', [
    { text: 'Keep guessing', style: 'cancel' },
    {
      text: 'Reveal', style: 'destructive',
      onPress: () => {
        arcade.update('globle', day, (state) => { if (!state.completed) { state.revealed = true; arcade.finish(state, false); } });
        setMessage(`The Mystery Country was ${countries[answer].name}`);
        flyTo(answer);
      },
    },
  ]);

  // Dragging turns the globe under the finger: a drag across its radius turns it about one radian.
  const begin = () => {
    if (flight.current !== null) { cancelAnimationFrame(flight.current); flight.current = null; }
    grab.current = { ...live.current };
  };
  const turn = (x: number, y: number) => {
    const perPoint = 180 / Math.PI / ((size / 2 - 10) * grab.current.zoom);
    const [lon, lat] = grab.current.centre;
    setCentre([((lon - x * perPoint + 540) % 360 + 360) % 360 - 180, Math.max(-80, Math.min(80, lat + y * perPoint))]);
  };
  const scale = (factor: number) => setZoom(Math.max(1, Math.min(6, zoomStart.current * factor)));
  const beginZoom = () => {
    zoomStart.current = live.current.zoom;
    if (flight.current !== null) { cancelAnimationFrame(flight.current); flight.current = null; }
  };
  const resetView = () => {
    if (flight.current !== null) { cancelAnimationFrame(flight.current); flight.current = null; }
    setZoom(1);
    const target = progress.completed ? answer : last;
    if (target !== null) flyTo(target); else setCentre([10, 20]);
  };
  const pan = usePanGesture({
    minDistance: 4, maxPointers: 1,
    onBegin: () => { 'worklet'; scheduleOnRN(begin); },
    onUpdate: (event) => { 'worklet'; scheduleOnRN(turn, event.translationX, event.translationY); },
  });
  const pinch = usePinchGesture({
    onBegin: () => { 'worklet'; scheduleOnRN(beginZoom); },
    onUpdate: (event) => { 'worklet'; scheduleOnRN(scale, event.scale); },
  });
  const gesture = useSimultaneousGestures(pan, pinch);

  const suggestions = progress.completed ? [] : suggestCountries(typed).filter((name) => !progress.guesses.includes(name));
  const listed = byOrder ? guesses : [...guesses].sort((a, b) => a.distance - b.distance || a.order - b.order);
  return (
    <View style={styles.game}>
      {!progress.completed && (
        <View style={styles.entry}>
          <TextInput
            value={typed} maxLength={80} onChangeText={(text) => { setTyped(text); setMessage(null); }} onSubmitEditing={(event) => guess(event.nativeEvent.text)}
            placeholder="Enter country name" placeholderTextColor="#606B78" autoCorrect={false} autoCapitalize="words" returnKeyType="done"
            submitBehavior="submit" accessibilityLabel="Country name" style={styles.input}
          />
          <Press onPress={() => guess(typed)} disabled={!typed.trim()} scale={0.98} accessibilityLabel="Guess country" accessibilityState={{ disabled: !typed.trim() }} style={[styles.enter, !typed.trim() && { opacity: 0.55 }]}>
            <Text style={styles.enterText}>Enter</Text>
          </Press>
        </View>
      )}
      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((name) => (
            <Pressable key={name} onPress={() => guess(name)} accessibilityRole="button" accessibilityLabel={`Guess ${name}`} style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.7 }]}>
              <Text style={styles.suggestionText}>{name}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Text style={[styles.message, { color: look.ink }]} accessibilityLiveRegion="polite">
        {message ?? (progress.completed
          ? progress.won ? `The Mystery Country is ${countries[answer].name}!` : `The Mystery Country was ${countries[answer].name}`
          : guesses.length === 0 ? 'Enter the name of any country to make your first guess.' : `Closest border so far: ${kilometres(closest ?? 0)}`)}
      </Text>
      <GestureDetector gesture={gesture}>
        <View style={[styles.globe, { width: size, height: size }]} accessible accessibilityRole="adjustable" accessibilityLabel={`Globe showing ${guesses.length} guessed countries. Drag to spin, pinch to zoom.`} accessibilityValue={{ text: `${zoom.toFixed(1)} times zoom` }} accessibilityActions={[{ name: 'increment', label: 'Zoom in' }, { name: 'decrement', label: 'Zoom out' }, { name: 'east', label: 'Turn east' }, { name: 'west', label: 'Turn west' }]} onAccessibilityAction={({ nativeEvent }) => {
          if (flight.current !== null) { cancelAnimationFrame(flight.current); flight.current = null; }
          if (nativeEvent.actionName === 'increment') setZoom(value => Math.min(6, value + 0.5));
          if (nativeEvent.actionName === 'decrement') setZoom(value => Math.max(1, value - 0.5));
          if (nativeEvent.actionName === 'east' || nativeEvent.actionName === 'west') setCentre(([lon, lat]) => [lon + (nativeEvent.actionName === 'east' ? 30 : -30), lat]);
        }}>
          <Globe size={size} centre={centre} zoom={zoom} fills={fills} />
        </View>
      </GestureDetector>
      <View style={styles.globeTools}>
        <Text style={[styles.gestureHint, { color: look.muted }]}>Drag to spin · Pinch to zoom</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Reset globe view" onPress={resetView} style={styles.reset}>
          <Icon name="arrow.counterclockwise" size={16} color={blue} fallback="↺" weight="medium" />
        </Pressable>
      </View>
      {guesses.length > 0 && (
        <View style={styles.list}>
          <View style={styles.listHead}>
            <Text style={[styles.listTitle, { color: look.ink }]}>{byOrder ? 'Guesses' : 'Closest'}</Text>
            <Pressable onPress={() => setByOrder((value) => !value)} accessibilityRole="button" style={styles.sortButton}>
              <Text style={styles.sort}>{byOrder ? 'Sort by distance' : 'Sort by order of guesses'}</Text>
            </Pressable>
          </View>
          {listed.map((entry) => (
            <Pressable key={entry.name} onPress={() => flyTo(entry.index)} accessibilityRole="button" accessibilityLabel={`${entry.name}, ${entry.index === answer ? 'the mystery country' : kilometres(entry.distance)}`} style={styles.row}>
              <View style={[styles.swatch, { backgroundColor: entry.index === answer ? answerColor : heatColor(entry.distance) }]} />
              <Text style={[styles.country, { color: look.ink }]}>{entry.name}</Text>
              <Text style={[styles.distance, { color: look.muted }]}>{entry.index === answer ? 'Found' : kilometres(entry.distance)}</Text>
            </Pressable>
          ))}
          {closest !== null && <Text style={[styles.closest, { color: look.ink }]}>Closest border: {kilometres(closest)}</Text>}
          {!progress.completed && (
            <Pressable onPress={giveUp} accessibilityRole="button" style={styles.giveUp}>
              <Text style={[styles.giveUpText, { color: look.muted }]}>Give up and reveal</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  game: { gap: 12, alignItems: 'center' },
  entry: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', paddingTop: 6 },
  input: { flex: 1, height: 44, paddingHorizontal: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#9AA3AD', borderRadius: 4, fontSize: 16, color: '#111111' },
  enter: { height: 44, paddingHorizontal: 18, borderRadius: 4, backgroundColor: blue, alignItems: 'center', justifyContent: 'center' },
  enterText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignSelf: 'stretch' },
  suggestion: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.85)' },
  suggestionText: { fontSize: 14, fontWeight: '600', color: '#111111' },
  message: { fontSize: 16, lineHeight: 23, fontWeight: '500', textAlign: 'center', minHeight: 46, paddingHorizontal: 6 },
  globe: { alignItems: 'center', justifyContent: 'center' },
  list: { alignSelf: 'stretch', gap: 2, paddingTop: 4 },
  globeTools: { flexDirection: 'row', alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', marginTop: -12, gap: 4 },
  gestureHint: { fontSize: 13, flexShrink: 1 },
  reset: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sortButton: { minHeight: 44, justifyContent: 'center', flexShrink: 1 },
  listTitle: { fontFamily: fonts.montserrat, fontSize: 20 },
  sort: { fontSize: 13, fontWeight: '600', color: blue, textDecorationLine: 'underline' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#A6C7D3' },
  swatch: { width: 18, height: 18, borderRadius: 3, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.35)' },
  country: { flex: 1, fontSize: 16 },
  distance: { fontSize: 14, fontVariant: ['tabular-nums'] },
  closest: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  giveUp: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  giveUpText: { fontSize: 14, textDecorationLine: 'underline' },
});
