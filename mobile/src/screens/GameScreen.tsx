import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ComponentRef, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameKind, gameKinds, games, shareText } from '../core/engine';
import { CrypticGame } from '../games/CrypticGame';
import { EstimationGame } from '../games/EstimationGame';
import { GlobleGame } from '../games/GlobleGame';
import { GameBar } from '../games/GameBar';
import { GroupsGame } from '../games/GroupsGame';
import { SudokuClear, SudokuGame } from '../games/SudokuGame';
import { TriviaGame } from '../games/TriviaGame';
import { WordGame } from '../games/WordGame';
import { ZipGame } from '../games/ZipGame';
import { RootStack } from '../navigation';
import { useArcade } from '../store';
import { rounded, type, useColors, useGameLook } from '../theme';
import { Icon, Press, useCountdown } from '../ui';

const padding: Record<GameKind, number> = { trivia: 16, estimation: 12, cryptic: 16, word: 8, groups: 16, sudoku: 16, zip: 16, globle: 16 };
/** Boards that hold their own keyboard fill the screen instead of scrolling. */
const pinned = (kind: GameKind) => kind === 'word' || kind === 'cryptic';

function ResultPanel({ kind, day, delay }: { kind: GameKind; day: number; delay: number | null }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStack>>();
  const arcade = useArcade();
  const look = useGameLook(kind);
  const reduced = useReducedMotion();
  const progress = arcade.progress(kind, day);
  const countdown = useCountdown();
  return (
    <Animated.View entering={delay === null || reduced ? undefined : FadeInDown.delay(delay).springify().stiffness(224).damping(26)} style={[styles.panel, { backgroundColor: look.panel }]}>
      <View style={styles.verdict}>
        <Icon name={progress.won ? 'checkmark.seal.fill' : 'flag.checkered'} size={22} color={look.ink} fallback="✓" />
        <Text style={[styles.verdictText, { color: look.ink }]}>{progress.won ? 'Nicely done.' : "Today's round is complete."}</Text>
      </View>
      <Text style={[type.subheadline, { color: look.muted }]}>{arcade.completedCount(day)} of {gameKinds.length} daily games completed.</Text>
      <Press onPress={() => void Share.share({ message: shareText(kind, day, progress) })} scale={0.98} accessibilityLabel="Share result" style={[styles.share, { backgroundColor: look.action }]}>
        <Icon name="square.and.arrow.up" size={17} color={look.actionInk} fallback="↗" />
        <Text style={[type.headline, { color: look.actionInk }]}>Share result</Text>
      </Press>
      {day === arcade.today && (
        <Pressable onPress={() => navigation.navigate('Collection', { section: 3 })} accessibilityRole="button" style={styles.friends}>
          <Text style={[type.callout, { color: look.ink, fontWeight: '700' }]}>See how friends did</Text>
        </Pressable>
      )}
      {day === arcade.today && <Text style={[type.caption, { color: look.muted, fontVariant: ['tabular-nums'] }]}>Next {games[kind].title} in {countdown}</Text>}
    </Animated.View>
  );
}

export function GameScreen({ route }: NativeStackScreenProps<RootStack, 'Game'>) {
  const { kind, day } = route.params;
  const arcade = useArcade();
  const colors = useColors();
  const look = useGameLook(kind);
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [height, setHeight] = useState(0);
  const [finishedHere, setFinishedHere] = useState(false);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const progress = arcade.progress(kind, day);
  const completed = progress.completed;
  const wasCompleted = useRef(completed);
  // The result waits for Wordle's tiles to finish turning over.
  const resultDelay = kind === 'word' ? 2100 : 100;
  const width = Math.min(window.width, 600) - padding[kind] * 2;

  useEffect(() => { if (kind !== 'trivia') arcade.start(kind, day); }, [kind, day]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!completed || wasCompleted.current) return;
    wasCompleted.current = true;
    setFinishedHere(true);
    if (progress.won) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const timer = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), resultDelay + 200);
    return () => clearTimeout(timer);
  }, [completed]); // eslint-disable-line react-hooks/exhaustive-deps

  const result = <ResultPanel kind={kind} day={day} delay={finishedHere ? resultDelay : null} />;
  if (arcade.recoverableLoadError) {
    return <View style={[styles.screen, styles.blocked, { backgroundColor: colors.paper }]}><Text style={[type.callout, { color: colors.muted }]}>Use the recovery controls on the home screen before starting a game.</Text></View>;
  }
  if (kind === 'trivia') return <><StatusBar style="light" /><TriviaGame day={day} result={result} /></>;

  const game = () => {
    switch (kind) {
      case 'word': return <WordGame day={day} availableHeight={height} availableWidth={width} />;
      case 'cryptic': return <CrypticGame day={day} availableWidth={width} />;
      case 'estimation': return <EstimationGame day={day} />;
      case 'groups': return <GroupsGame day={day} availableWidth={width} />;
      case 'sudoku': return <SudokuGame day={day} availableWidth={width} />;
      case 'zip': return <ZipGame day={day} availableWidth={width} />;
      case 'globle': return <GlobleGame day={day} availableWidth={width} />;
    }
  };
  return (
    <View style={[styles.screen, { backgroundColor: look.page }]}>
      {kind === 'globle' && <LinearGradient colors={['#BEE2F4', '#DCEFF3', '#E6F2E6']} style={StyleSheet.absoluteFill} />}
      <StatusBar style={look.status} />
      <GameBar kind={kind} day={day} right={kind === 'sudoku' ? <SudokuClear day={day} /> : undefined} />
      <View style={styles.body} onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
        {height > 0 && (
          <ScrollView
            ref={scroller} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets
            scrollEnabled={!pinned(kind) || completed} alwaysBounceVertical={false} style={styles.scroller}
            contentContainerStyle={[styles.content, { minHeight: height, width: width + padding[kind] * 2, paddingHorizontal: padding[kind], paddingBottom: insets.bottom + 8 }]}
          >
            {game()}
            {completed && result}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  blocked: { padding: 24, justifyContent: 'center' },
  body: { flex: 1 },
  // Fermi's card casts a wide shadow that shouldn't stop at the scroll view's edge.
  scroller: { overflow: 'visible' },
  content: { alignSelf: 'center', paddingTop: 6, gap: 18 },
  panel: { padding: 20, gap: 13, borderRadius: 18, borderCurve: 'continuous' },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verdictText: { ...rounded, fontSize: 22, fontWeight: '800', flexShrink: 1 },
  friends: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  share: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingVertical: 15, borderRadius: 14, borderCurve: 'continuous' },
});
