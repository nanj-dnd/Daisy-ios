import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ReactNode, memo, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing, FadeIn, SharedValue, cancelAnimation, useAnimatedReaction, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle, Defs, Pattern, Polygon, Rect } from 'react-native-svg';
import { advanceTrivia, beginTrivia, editionNumber, submitTrivia, triviaFor, triviaRounds } from '../core/engine';
import { useArcade } from '../store';
import { fonts } from '../theme';
import { InputRef, useGameActive } from '../ui';
import { useGameBack } from '../useGameBack';
import { Art, Sprite, boat, boatColors, cloud, cloudColors, creatures, fish, kelp, shrimp, shrimpColors } from './Sprites';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStack } from '../navigation';

const ice = '#E8F1FF', cyan = '#4DE3FF', slate = '#7D93B8', pink = '#FF5D8F', gold = '#FFD27A', abyss = '#050A14', hull = '#101D33';
const roundSeconds = 25;
/** Screen points per metre of water. A perfect 7,000 metre dive is a world 14,000 points tall. */
const scale = 2;
const floor = 7000;
const anchor = 250;

const seaColors = ['#2F6C9F', '#1C4E7E', '#123558', '#0B2340', '#071730', '#050E1E', '#03070F', '#02040A'] as const;
const seaStops = [0, 0.02, 0.05, 0.09, 0.16, 0.3, 0.6, 1] as const;
const gradientHeight = 200;

type Tier = { least: number; name: string; quip: string; color: string };
const tiers: Tier[] = [
  { least: 10, name: 'PLANKTON', quip: 'Everyone drifted here first.', color: '#8FB3D9' },
  { least: 25, name: 'SARDINE', quip: 'Safe in the shoal.', color: '#9FE7FF' },
  { least: 45, name: 'TURTLE', quip: 'Slow, steady, a little further down.', color: '#7CF2C4' },
  { least: 65, name: 'ANGLERFISH', quip: 'Not many lights down here.', color: gold },
  { least: 85, name: 'OARFISH', quip: 'Hardly anyone sees this one.', color: '#FF9D6E' },
  { least: 100, name: 'GIANT SQUID', quip: 'Bottom of the list. Nobody else came.', color: pink },
];
const tierFor = (points: number) => [...tiers].reverse().find((tier) => points >= tier.least) ?? tiers[0];

const markers: { depth: number; text: string; side: 'left' | 'right'; major?: boolean }[] = [
  { depth: 80, text: 'sunlight starts to thin', side: 'left' },
  { depth: 200, text: 'THE TWILIGHT ZONE', side: 'right', major: true },
  { depth: 330, text: 'as far as divers have gone', side: 'right' },
  { depth: 500, text: 'the last blue fades', side: 'left' },
  { depth: 1000, text: 'THE MIDNIGHT ZONE', side: 'left', major: true },
  { depth: 1600, text: 'sperm whales hunt around here', side: 'right' },
  { depth: 2500, text: 'two degrees and pitch black', side: 'left' },
  { depth: 3800, text: 'a very famous wreck lies here', side: 'right' },
  { depth: 4000, text: 'THE ABYSSAL ZONE', side: 'left', major: true },
  { depth: 6000, text: 'THE HADAL ZONE', side: 'right', major: true },
  { depth: 6950, text: 'the trench floor. a perfect dive.', side: 'right', major: true },
];

const shoals = Array.from({ length: 22 }, (_, index) => ({
  depth: 40 + index * index * 12 + (index % 3) * 22, pixel: 2 + (index % 2), seconds: 9 + (index * 5) % 11, phase: (index * 37) % 100 / 100, rightward: index % 2 === 0,
}));

function hop(from: number, to: number, seconds: number) {
  return withRepeat(withSequence(withTiming(to, { duration: seconds * 1000, easing: Easing.linear }), withTiming(from, { duration: 0 })), -1);
}

function Swimmer({ depth, pixel, seconds, phase, rightward, width, still }: (typeof shoals)[number] & { width: number; still: boolean }) {
  const from = rightward ? -50 : width + 50, to = rightward ? width + 50 : -50;
  const position = useSharedValue(from + (to - from) * phase);
  useEffect(() => {
    if (still) return;
    position.set(withSequence(withTiming(to, { duration: seconds * 1000 * (1 - phase), easing: Easing.linear }), withTiming(from, { duration: 0 }), hop(from, to, seconds)));
    return () => cancelAnimation(position);
  }, [from, to, seconds, phase, position, still]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: position.value }] }));
  return (
    <Animated.View style={[styles.swimmer, { top: depth * scale }, style]}>
      <Sprite art={fish} palette={{ d: '#04101F', k: '#2F5B86' }} pixel={pixel} flip={!rightward} />
    </Animated.View>
  );
}

/** Everything fixed in the water. Memoized, because React must not touch it while the camera moves. */
const World = memo(function World({ width, still, from, to }: { width: number; still: boolean; from: number; to: number }) {
  const columns = useMemo<Art[]>(() => [kelp(9), kelp(13), kelp(7), kelp(11)], []);
  return (
    <>
      <LinearGradient colors={['#6FB2E5', '#B7DCF5', '#EEF7FD']} style={[styles.sky, { width }]} />
      <View style={[styles.sun]} />
      <Sprite art={cloud} palette={cloudColors} pixel={5} style={[styles.spot, { left: 26, top: -190 }]} />
      <Sprite art={cloud} palette={cloudColors} pixel={3} style={[styles.spot, { left: width - 120, top: -130 }]} />
      <Sprite art={cloud} palette={cloudColors} pixel={4} style={[styles.spot, { left: 90, top: -82 }]} />
      <Sprite art={boat} palette={boatColors} pixel={3} style={[styles.spot, { left: width * 0.66, top: -24 }]} />
      {/* Scaled up from a small texture: a gradient this tall drawn at full size would cost hundreds of megabytes. */}
      <LinearGradient colors={seaColors} locations={seaStops} style={[styles.sea, { width, height: gradientHeight, transform: [{ scaleY: ((floor + 300) * scale) / gradientHeight }] }]} />
      {columns.map((art, index) => (
        <Sprite key={index} art={art} palette={{ l: index % 2 === 0 ? '#0D2A47' : '#0A2038' }} pixel={3} flip={index % 2 === 1} style={[styles.spot, { left: index < 2 ? index * 30 - 14 : width - 60 - (index - 2) * 30, top: 1340 - art.length * 3 + (index % 2) * 90 }]} />
      ))}
      {shoals.filter(swimmer => swimmer.depth >= from && swimmer.depth <= to).map((swimmer) => <Swimmer key={swimmer.depth} {...swimmer} width={width} still={still} />)}
      {markers.map((marker) => (
        <Text key={marker.depth} style={[styles.marker, marker.side === 'left' ? { left: 12 } : { right: 34 }, { top: marker.depth * scale }, marker.major && styles.markerMajor]}>
          {marker.side === 'left' ? `── ${marker.text}` : `${marker.text} ──`}
        </Text>
      ))}
      <View style={[styles.seabed, { top: floor * scale, width }]} />
    </>
  );
});

function Ruler({ from, to, at }: { from: number; to: number; at: number }) {
  const start = Math.max(0, Math.floor(from / 20) * 20);
  const ticks = Array.from({ length: Math.ceil((to - start) / 20) }, (_, index) => start + index * 20);
  return (
    <>
      {ticks.map((metres) => (
        <View key={metres} style={[styles.tickRow, { top: metres * scale }]}>
          {metres % 100 === 0 && metres > 0 && Math.abs(metres - at) > 15 && <Text style={styles.tickLabel}>-{metres}m</Text>}
          <View style={[styles.tick, { width: metres % 100 === 0 ? 14 : 7 }]} />
        </View>
      ))}
    </>
  );
}

/** One line per rarity tier below where this answer began. */
function TierLines({ base, points }: { base: number; points: number }) {
  return (
    <>
      {tiers.map((tier) => {
        const reached = points >= tier.least;
        return (
          <View key={tier.name} style={[styles.tierLine, { top: (base + tier.least * 10) * scale }]}>
            <View style={[styles.dash, { borderColor: reached ? tier.color : `${slate}66` }]} />
            <Text style={[styles.tierLabel, { color: reached ? tier.color : slate }]}>{tier.name} · {tier.least}</Text>
          </View>
        );
      })}
    </>
  );
}

function Bubble({ left, seconds, phase }: { left: number; seconds: number; phase: number }) {
  const rise = useSharedValue(phase);
  useEffect(() => {
    rise.set(withSequence(withTiming(1, { duration: seconds * 1000 * (1 - phase), easing: Easing.linear }), withTiming(0, { duration: 0 }), hop(0, 1, seconds)));
    return () => cancelAnimation(rise);
  }, [rise, seconds, phase]);
  const style = useAnimatedStyle(() => ({ opacity: 1 - rise.value, transform: [{ translateY: -110 * rise.value }, { translateX: 6 * Math.sin(rise.value * 9) }] }));
  return <Animated.View style={[styles.bubble, { left }, style]} />;
}

function Shrimp({ top, diving, still }: { top: number; diving: boolean; still: boolean }) {
  const bob = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    bob.set(withRepeat(withSequence(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) })), -1));
    return () => cancelAnimation(bob);
  }, [bob, still]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value * 7 }, { rotate: `${diving ? 24 : 0}deg` }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.shrimp, { top }, style]}>
      {!still && [8, 22, 34].map((left, index) => <Bubble key={left} left={left} seconds={2.6 + index * 0.7} phase={index * 0.3} />)}
      <Sprite art={shrimp} palette={shrimpColors} pixel={3} />
    </Animated.View>
  );
}

/** Steps a dark panel's corners like the original's cut-pixel pods. */
function PixelPanel({ width, height, fill = '#0B1526E6', children, style }: { width: number; height: number; fill?: string; children: ReactNode; style?: object }) {
  const step = 4;
  const points = [
    [step * 2, 0], [width - step * 2, 0], [width - step * 2, step], [width - step, step], [width - step, step * 2], [width, step * 2],
    [width, height - step * 2], [width - step, height - step * 2], [width - step, height - step], [width - step * 2, height - step], [width - step * 2, height],
    [step * 2, height], [step * 2, height - step], [step, height - step], [step, height - step * 2], [0, height - step * 2],
    [0, step * 2], [step, step * 2], [step, step], [step * 2, step],
  ].map((pair) => pair.join(',')).join(' ');
  return (
    <View style={[{ width, height }, style]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}><Polygon points={points} fill={fill} /></Svg>
      {children}
    </View>
  );
}

function DepthCount({ depth }: { depth: SharedValue<number> }) {
  const [shown, setShown] = useState(() => Math.round(depth.get()));
  useAnimatedReaction(() => Math.round(depth.value / 5) * 5, (value, previous) => { if (value !== previous) scheduleOnRN(setShown, value); });
  return <Text numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.15} style={styles.depthValue}>{shown.toLocaleString('en-US')}m</Text>;
}

function Scanlines() {
  return (
    <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs><Pattern id="scan" width={4} height={3} patternUnits="userSpaceOnUse"><Rect width={4} height={1} fill="#000000" opacity={0.06} /></Pattern></Defs>
      <Rect width="100%" height="100%" fill="url(#scan)" />
    </Svg>
  );
}

function Dial({ seconds, urgent }: { seconds: number; urgent: boolean }) {
  const size = 50, radius = 21, around = 2 * Math.PI * radius;
  const color = urgent ? pink : cyan;
  return (
    <View style={styles.dial} accessible accessibilityLabel={`${seconds} seconds remaining`}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#16304E" strokeWidth={2} fill="#071120" />
        <Circle cx={size / 2} cy={size / 2} r={radius * 0.6} stroke="#16304E" strokeWidth={1} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={3} fill="none" strokeDasharray={`${around * (seconds / roundSeconds)} ${around}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text maxFontSizeMultiplier={1.2} style={[styles.dialValue, { color }]}>{seconds}</Text>
    </View>
  );
}

function FrameButton({ title, onPress, color }: { title: string; onPress: () => void; color: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title.replace(/[▼▲]/g, '').trim()} style={({ pressed }) => [styles.frame, { borderColor: color, shadowColor: color, opacity: pressed ? 0.75 : 1 }]}>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit style={styles.frameText}>{title}</Text>
    </Pressable>
  );
}

export function TriviaGame({ day, result }: { day: number; result: ReactNode }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStack>>();
  const arcade = useArcade();
  const reduced = useReducedMotion();
  const active = useGameActive();
  const insets = useSafeAreaInsets();
  const actionBottom = insets.bottom + 50;
  const window = useWindowDimensions();
  const progress = arcade.progress('trivia', day);
  const prompts = triviaFor(day);
  const [now, setNow] = useState(() => Date.now());
  const [surfaced, setSurfaced] = useState(progress.completed);
  const [keyboardShown, setKeyboardShown] = useState(() => Keyboard.isVisible());
  const leave = useGameBack();
  const input = useRef<InputRef>(null);
  const answered = progress.triviaPoints.length;
  const awaiting = progress.started && !progress.completed && answered === progress.round;
  const total = progress.triviaPoints.reduce((sum, points) => sum + points, 0);
  const metres = total * 10;
  const depth = useSharedValue(metres);
  const settled = useRef(metres);
  const [restingAt, setRestingAt] = useState(metres);
  // Derived, so the result can't flash up in the frame before the dive starts.
  const diving = !reduced && restingAt !== metres;

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardShown(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardShown(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // The deadline is stored, so a timer that passes while the app is away still counts.
  useEffect(() => {
    if (!active || progress.completed) return;
    const tick = () => {
      const date = Date.now();
      const state = arcade.progress('trivia', day);
      setNow(previous => state.roundDeadline !== null && Math.ceil((state.roundDeadline - previous) / 1000) === Math.ceil((state.roundDeadline - date) / 1000) ? previous : date);
      if (state.roundDeadline !== null && date >= state.roundDeadline) {
        arcade.update('trivia', day, (draft) => { submitTrivia(draft, prompts[draft.round], '', date, true); });
      }
    };
    tick();
    const clock = setInterval(tick, 250);
    const subscription = AppState.addEventListener('change', (next) => { if (next === 'active') tick(); });
    return () => { clearInterval(clock); subscription.remove(); };
  }, [day, active, progress.completed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!awaiting || !active) return;
    const timer = setTimeout(() => input.current?.focus(), 450);
    return () => clearTimeout(timer);
  }, [progress.round, awaiting, active]);

  useEffect(() => {
    if (reduced) {
      settled.current = metres; depth.set(metres);
      const frame = requestAnimationFrame(() => setRestingAt(metres));
      return () => cancelAnimationFrame(frame);
    }
    if (metres === settled.current) return;
    const distance = metres - settled.current;
    settled.current = metres;
    const duration = Math.min(1500, 750 + distance * 0.6);
    depth.set(withTiming(metres, { duration, easing: Easing.bezier(0.3, 0, 0.2, 1) }));
    const timer = setTimeout(() => { setRestingAt(metres); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }, duration);
    return () => clearTimeout(timer);
  }, [metres, reduced, depth]);

  const camera = useAnimatedStyle(() => ({ transform: [{ translateY: anchor - depth.value * scale }] }));
  const submit = (answer: string) => arcade.update('trivia', day, (state) => { submitTrivia(state, prompts[state.round], answer); });
  const stage = !progress.started ? 'intro' : progress.completed && surfaced ? 'summary' : awaiting ? 'prompt' : 'landed';
  const seconds = progress.roundDeadline === null ? 0 : Math.max(0, Math.ceil((progress.roundDeadline - now) / 1000));
  const urgent = seconds <= 5;
  const shown = Math.min(progress.round, answered - 1);
  const points = progress.triviaPoints[shown] ?? 0;
  const said = progress.guesses[shown] ?? '';
  const tier = tierFor(points);
  const deepest = prompts[Math.max(0, shown)].answers.at(-1);

  return (
    <View style={styles.stage}>
      <StatusBar style={stage === 'intro' ? 'dark' : 'light'} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, camera]}>
        <World width={window.width} still={reduced || !active} from={Math.min(restingAt, metres) - 160} to={Math.max(restingAt, metres) + window.height / scale} />
        <View style={styles.ruler}><Ruler from={metres - 500} to={Math.min(floor, metres + 1300)} at={metres} /></View>
        {stage === 'landed' && answered > 0 && <TierLines base={metres - points * 10} points={points} />}
      </Animated.View>
      <Shrimp top={stage === 'landed' || stage === 'summary' ? anchor - 40 : anchor + 180} diving={diving} still={reduced || !active} />
      <View pointerEvents="none" style={[styles.you, { top: anchor }]}><Text style={styles.youText}>YOU</Text><View style={styles.youLine} /><View style={styles.youHead} /></View>
      <Scanlines />

      {/* Under the HUD, so the back button stays reachable. */}
      {stage === 'summary' && (
        <View style={[StyleSheet.absoluteFill, styles.summaryShade]}>
          <ScrollView contentContainerStyle={[styles.summary, { paddingTop: insets.top + 112, paddingBottom: insets.bottom + 20 }]}>
            <Text accessibilityRole="header" style={styles.summaryDepth}>{metres.toLocaleString('en-US')}m</Text>
            <Text style={styles.summaryLine}>{total} / 700 · {progress.triviaPoints.filter((value) => value > 0).length} of 7 landed</Text>
            {progress.triviaPoints.map((value, index) => (
              <View key={index} style={styles.logRow}>
                <View style={styles.logText}>
                  <Text style={styles.logPrompt}>{prompts[index].question}</Text>
                  <Text style={styles.logAnswer}>{progress.guesses[index] ? `“${progress.guesses[index]}”` : 'nothing landed'}</Text>
                </View>
                <Text style={[styles.logPoints, { color: value > 0 ? tierFor(value).color : slate }]}>{value > 0 ? tierFor(value).name : '—'}{'\n'}+{value}</Text>
              </View>
            ))}
            {result}
          </ScrollView>
        </View>
      )}
      <View pointerEvents="none" style={[styles.hud, { top: insets.top + 2 }]}>
        <PixelPanel width={86} height={50}>
          <View style={styles.pod}><Text maxFontSizeMultiplier={1.1} style={styles.podLabel}>DEPTH</Text><DepthCount depth={depth} /></View>
        </PixelPanel>
        <View style={styles.rounds}>
          <View style={styles.squares} accessible accessibilityLabel={`${answered} of ${triviaRounds} prompts answered`}>
            {Array.from({ length: triviaRounds }, (_, index) => (
              <View key={index} style={[styles.square, index < answered ? styles.squareDone : index === progress.round && awaiting ? styles.squareNow : styles.squareOpen]} />
            ))}
          </View>
          <Text maxFontSizeMultiplier={1.1} style={styles.roundLabel}>{progress.completed ? 'DIVE COMPLETE' : progress.started ? `PROMPT ${progress.round + 1} OF ${triviaRounds}` : `DIVE #${editionNumber(day)}`}</Text>
        </View>
        <PixelPanel width={86} height={50}>
          <View style={[styles.pod, styles.podRight]}><Text maxFontSizeMultiplier={1.1} style={styles.podLabel}>SCORE</Text><Text maxFontSizeMultiplier={1.15} style={styles.scoreValue}>{total}</Text></View>
        </PixelPanel>
      </View>
      {stage === 'intro' && (
        <View pointerEvents="box-none" style={[styles.layer, { paddingBottom: actionBottom }]}>
          <View style={[styles.title, { top: insets.top + 80 }]} pointerEvents="none">
            <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit allowFontScaling={false} style={styles.titleText}>KRILLION</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit allowFontScaling={false} style={styles.tagline}>THE DAILY DIVE</Text>
          </View>
          <View style={styles.introFooter}>
            <Text style={styles.subline}>7 prompts · 25 seconds each · rarer answers sink deeper. Ratings are curated, not live player data.</Text>
            <FrameButton title="▼  BEGIN DESCENT  ▼" color={cyan} onPress={() => arcade.update('trivia', day, (state) => beginTrivia(state))} />
          </View>
        </View>
      )}

      {stage === 'prompt' && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.spacer} contentContainerStyle={{ paddingTop: insets.top + 110, paddingHorizontal: 16, paddingBottom: 16 }}>
          <Animated.View key={progress.round} entering={reduced ? undefined : FadeIn.duration(260)} style={styles.card}>
            <Text style={styles.cardRound}>PROMPT {progress.round + 1} OF {triviaRounds}</Text>
            <Text style={styles.question}>{prompts[progress.round].question}</Text>
            <Text style={styles.cardHint}>▼ rarer answers sink deeper ▼</Text>
          </Animated.View>
          </ScrollView>
          {/* KeyboardAvoidingView owns its paddingBottom. Safe-area clearance belongs on this child. */}
          <View style={[styles.answerTray, { paddingBottom: keyboardShown ? 16 : insets.bottom + 40 }]}>
          <View style={styles.bar}>
            <Dial seconds={seconds} urgent={urgent} />
            <View style={[styles.field, { borderColor: urgent ? pink : cyan }]}>
              <TextInput
                ref={input} value={progress.pendingAnswer} placeholder="type one answer…" placeholderTextColor={slate} accessibilityLabel="Your answer"
                autoCorrect={false} autoCapitalize="words" returnKeyType="go" selectionColor={cyan} style={styles.input}
                onChangeText={(value) => arcade.update('trivia', day, (state) => { if (state.roundDeadline !== null && !state.completed) state.pendingAnswer = value.slice(0, 80); })}
                onSubmitEditing={() => { if (progress.pendingAnswer.trim() !== '') submit(progress.pendingAnswer); }}
              />
            </View>
            <Pressable disabled={progress.pendingAnswer.trim() === ''} onPress={() => submit(progress.pendingAnswer)} accessibilityRole="button" accessibilityLabel="Dive" style={[styles.dive, { opacity: progress.pendingAnswer.trim() === '' ? 0.55 : 1 }]}>
              <Text numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2} style={styles.diveText}>DIVE</Text>
            </Pressable>
          </View>
          <View style={styles.fuse}><View style={[styles.fuseFill, { width: `${(seconds / roundSeconds) * 100}%`, backgroundColor: urgent ? pink : cyan }]} /></View>
          </View>
        </KeyboardAvoidingView>
      )}

      {stage === 'landed' && !diving && (
        <View pointerEvents="box-none" style={[styles.layer, { paddingBottom: actionBottom }]}>
          <Animated.View entering={reduced ? undefined : FadeIn.duration(320)} style={styles.landed}>
            {points > 0 && <Sprite art={creatures[tiers.indexOf(tier)]} palette={{ d: tier.color, k: abyss }} pixel={5} />}
            <Text style={[styles.tierName, { color: points > 0 ? tier.color : '#B9CCE8', textShadowColor: points > 0 ? tier.color : 'transparent' }]}>{points > 0 ? tier.name : 'NOTHING LANDED'}</Text>
            <Text style={styles.said}>{said ? `“${said}”` : '—'}</Text>
            <Text style={styles.gain}><Text style={{ color: points > 0 ? cyan : slate }}>+{points} PTS</Text>{points > 0 ? ` · sink ${points * 10}m` : ''}</Text>
            <Text style={styles.quip}>{points > 0 ? tier.quip : said ? 'not on the chart.' : 'the clock beat you to it.'}</Text>
            {deepest && deepest.points > points && <Text style={styles.quip}>deepest answer: {deepest.name} · {deepest.points}</Text>}
          </Animated.View>
          <FrameButton
            title={progress.completed ? 'SURFACE  ▲' : 'DESCEND  ▼'} color={pink}
            onPress={() => { if (progress.completed) setSurfaced(true); else arcade.update('trivia', day, (state) => advanceTrivia(state)); }}
          />
        </View>
      )}

      {/* Keep these last and above every full-screen stage, including the prompt's scroll view. */}
      <View pointerEvents="box-none" style={[styles.tools, { top: insets.top + 58 }]}>
        <Pressable onPress={leave} hitSlop={6} accessibilityRole="button" accessibilityLabel="Back" style={({ pressed }) => [styles.tool, { opacity: pressed ? 0.65 : 1 }]}><Text style={styles.toolText}>‹</Text></Pressable>
        <Pressable onPress={() => navigation.navigate('Rules', { kind: 'trivia' })} hitSlop={6} accessibilityRole="button" accessibilityLabel="How to play Krillion" style={({ pressed }) => [styles.tool, { opacity: pressed ? 0.65 : 1 }]}><Text style={styles.toolText}>?</Text></Pressable>
      </View>
    </View>
  );
}

const pixel = { fontFamily: fonts.pixel };
const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: abyss, overflow: 'hidden' },
  sky: { position: 'absolute', top: -420, height: 420 },
  sun: { position: 'absolute', right: 120, top: -150, width: 54, height: 54, backgroundColor: '#FFF3B8', borderRadius: 27, shadowColor: '#FFE28A', shadowOpacity: 0.9, shadowRadius: 26, shadowOffset: { width: 0, height: 0 } },
  spot: { position: 'absolute' },
  sea: { position: 'absolute', top: 0, transformOrigin: 'top' },
  seabed: { position: 'absolute', height: 300, backgroundColor: '#010205' },
  swimmer: { position: 'absolute', left: 0 },
  marker: { ...pixel, position: 'absolute', fontSize: 15, letterSpacing: 1, color: `${slate}AA` },
  markerMajor: { color: cyan, fontSize: 17 },
  ruler: { position: 'absolute', right: 0, top: 0, width: 80 },
  tickRow: { position: 'absolute', right: 0, flexDirection: 'row', alignItems: 'center', gap: 5 },
  tick: { height: 1, backgroundColor: `${slate}AA` },
  tickLabel: { ...pixel, fontSize: 13, color: slate },
  tierLine: { position: 'absolute', left: 12, right: 74, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dash: { flex: 1, borderTopWidth: 2, borderStyle: 'dashed' },
  tierLabel: { ...pixel, fontSize: 15, letterSpacing: 1.5 },
  bubble: { position: 'absolute', bottom: 34, width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderColor: '#BFE4FF' },
  shrimp: { position: 'absolute', left: 30 },
  you: { position: 'absolute', right: 0, flexDirection: 'row', alignItems: 'center', gap: 4 },
  youText: { ...pixel, fontSize: 14, color: pink },
  youLine: { width: 22, height: 2, backgroundColor: pink },
  youHead: { width: 0, height: 0, borderTopWidth: 6, borderBottomWidth: 6, borderRightWidth: 9, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: pink },
  hud: { position: 'absolute', left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between', zIndex: 9 },
  pod: { flex: 1, paddingHorizontal: 12, paddingTop: 6 },
  podRight: { alignItems: 'flex-end' },
  podLabel: { ...pixel, fontSize: 12, letterSpacing: 2.4, color: slate },
  depthValue: { ...pixel, fontSize: 24, lineHeight: 26, color: cyan },
  scoreValue: { ...pixel, fontSize: 24, lineHeight: 26, color: pink },
  rounds: { alignItems: 'center', gap: 5, paddingTop: 7 },
  squares: { flexDirection: 'row', gap: 3 },
  square: { width: 14, height: 14, borderWidth: 2 },
  squareDone: { backgroundColor: gold, borderColor: '#2A1D07' },
  squareNow: { backgroundColor: pink, borderColor: '#FFFFFF' },
  squareOpen: { backgroundColor: '#142238', borderColor: '#050A14' },
  roundLabel: { ...pixel, fontSize: 12, letterSpacing: 2.4, color: slate },
  tools: { position: 'absolute', left: 8, right: 10, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
  tool: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B1526CC', borderWidth: 2, borderColor: '#1F3350' },
  toolText: { ...pixel, fontSize: 24, lineHeight: 26, color: slate },
  layer: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end', paddingHorizontal: 10 },
  title: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  titleText: { ...pixel, fontSize: 68, lineHeight: 74, letterSpacing: 4, color: '#0B1C36', maxWidth: '94%' },
  tagline: { ...pixel, fontSize: 22, letterSpacing: 5, color: '#0B4F73', maxWidth: '94%' },
  introFooter: { padding: 12, gap: 16, backgroundColor: '#050A14D9' },
  subline: { ...pixel, fontSize: 18, lineHeight: 23, letterSpacing: 0.6, color: '#B9CCE8', textAlign: 'center', paddingHorizontal: 4 },
  frame: { alignSelf: 'center', minWidth: 230, paddingHorizontal: 26, height: 66, alignItems: 'center', justifyContent: 'center', backgroundColor: hull, borderWidth: 3, shadowOpacity: 0.7, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  frameText: { ...pixel, fontSize: 25, letterSpacing: 4.5, color: ice },
  card: { paddingHorizontal: 18, paddingVertical: 16, gap: 10, backgroundColor: '#0B1526D9', borderWidth: 2, borderColor: '#1A2C46' },
  cardRound: { ...pixel, fontSize: 15, letterSpacing: 4, color: pink },
  question: { ...pixel, fontSize: 30, lineHeight: 31, color: ice },
  cardHint: { ...pixel, fontSize: 15, letterSpacing: 1.5, color: slate },
  spacer: { flex: 1 },
  answerTray: { paddingTop: 12, paddingHorizontal: 16, backgroundColor: '#071120', borderTopWidth: 1, borderTopColor: '#1F3350' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dial: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  dialValue: { ...pixel, fontSize: 24 },
  field: { flex: 1, minWidth: 0, height: 48, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: '#0B1526F2', borderWidth: 2 },
  input: { ...pixel, fontSize: 22, color: ice, padding: 0 },
  dive: { height: 48, minWidth: 76, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E54B80', borderBottomWidth: 3, borderBottomColor: '#8E2C50' },
  diveText: { ...pixel, fontSize: 22, letterSpacing: 1.5, color: abyss },
  fuse: { height: 3, marginTop: 6, backgroundColor: '#142238' },
  fuseFill: { height: 3 },
  landed: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 22, paddingTop: 110 },
  tierName: { ...pixel, fontSize: 40, lineHeight: 42, letterSpacing: 5, textAlign: 'center', textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } },
  said: { ...pixel, fontSize: 24, color: ice, textAlign: 'center' },
  gain: { ...pixel, fontSize: 23, letterSpacing: 1, color: ice, textAlign: 'center' },
  quip: { ...pixel, fontSize: 17, letterSpacing: 1.3, color: '#A9BBD6', textAlign: 'center' },
  summaryShade: { backgroundColor: '#050A14C7' },
  summary: { paddingHorizontal: 16, gap: 12 },
  summaryDepth: { ...pixel, fontSize: 64, lineHeight: 66, color: cyan, textAlign: 'center' },
  summaryLine: { ...pixel, fontSize: 20, letterSpacing: 1.5, color: ice, textAlign: 'center', marginBottom: 6 },
  logRow: { flexDirection: 'row', gap: 12, padding: 12, backgroundColor: '#0B1526E6', borderWidth: 2, borderColor: '#1A2C46' },
  logText: { flex: 1, gap: 3 },
  logPrompt: { ...pixel, fontSize: 17, lineHeight: 18, color: slate },
  logAnswer: { ...pixel, fontSize: 22, color: ice },
  logPoints: { ...pixel, fontSize: 16, lineHeight: 18, letterSpacing: 1, textAlign: 'right' },
});
