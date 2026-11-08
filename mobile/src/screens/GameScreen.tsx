import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ComponentRef, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
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
import { rounded, type, useColors, useGameLook, wordMotion } from '../theme';
import { supabase } from '../social/client';
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
    <Animated.View entering={delay === null ? undefined : reduced ? FadeIn.duration(120) : FadeInDown.duration(240)} style={[styles.panel, { backgroundColor: look.panel }]}>
      <View style={styles.verdict}>
        <Icon name={progress.won ? 'checkmark.seal.fill' : 'flag.checkered'} size={22} color={look.ink} fallback="✓" />
        <Text style={[styles.verdictText, { color: look.ink }]}>{progress.won ? 'Nicely done.' : "Today's round is complete."}</Text>
      </View>
      <Text style={[type.subheadline, { color: look.muted }]}>{arcade.completedCount(day)} of {gameKinds.length} daily games completed.</Text>
      <Press onPress={() => void Share.share({ message: shareText(kind, day, progress) })} scale={0.98} accessibilityLabel="Share result" style={[styles.share, { backgroundColor: look.action }]}>
        <Icon name="square.and.arrow.up" size={17} color={look.actionInk} fallback="↗" />
        <Text style={[type.headline, { color: look.actionInk }]}>Share result</Text>
      </Press>
      {day === arcade.today && supabase !== null && (
        <Pressable onPress={() => navigation.navigate('Collection', { section: 3 })} accessibilityRole="button" style={styles.friends}>
          <Text style={[type.callout, { color: look.ink, fontWeight: '700' }]}>See how friends did</Text>
        </Pressable>
      )}
      {day === arcade.today && <Text style={[type.caption, { color: look.muted, fontVariant: ['tabular-nums'] }]}>Next {games[kind].title} in {countdown}</Text>}
    </Animated.View>
  );
}

export function GameScreen({ route }: NativeStackScreenProps<RootStack, 'Game'>) {
  return <GameSession key={`${route.params.kind}:${route.params.day}`} kind={route.params.kind} day={route.params.day} />;
}

function GameSession({ kind, day }: { kind: GameKind; day: number }) {
  const arcade = useArcade();
  const colors = useColors();
  const look = useGameLook(kind);
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [height, setHeight] = useState(0);
  const [finishedHere, setFinishedHere] = useState(false);
  const reduced = useReducedMotion();
  const [sudokuReset, setSudokuReset] = useState(0);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const progress = arcade.progress(kind, day);
  const completed = progress.completed;
  const [showResult, setShowResult] = useState(completed);
  const wasCompleted = useRef(completed);
  // The result waits for Wordle's tiles to finish turning over.
  const resultDelay = reduced ? 120 : kind === 'word' ? wordMotion.reveal + wordMotion.celebration : 260;
  const width = Math.min(window.width, 600) - padding[kind] * 2;

  useEffect(() => { if (kind !== 'trivia') arcade.start(kind, day); }, [kind, day]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!completed || wasCompleted.current) return;
    wasCompleted.current = true;
    setFinishedHere(true);
    if (progress.won && kind !== 'trivia') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const timer = setTimeout(() => setShowResult(true), resultDelay);
    return () => clearTimeout(timer);
  }, [completed]); // eslint-disable-line react-hooks/exhaustive-deps

  const result = showResult ? <ResultPanel kind={kind} day={day} delay={finishedHere ? 0 : null} /> : null;
  if (arcade.recoverableLoadError) {
    return <View style={[styles.screen, styles.blocked, { backgroundColor: colors.paper }]}><Text style={[type.callout, { color: colors.muted }]}>Use the recovery controls on the home screen before starting a game.</Text></View>;
  }
  if (kind === 'trivia') return <TriviaGame day={day} result={result} />;

  const game = () => {
    switch (kind) {
      case 'word': return <WordGame day={day} availableHeight={height} availableWidth={width} />;
      case 'cryptic': return <CrypticGame day={day} availableWidth={width} availableHeight={height} />;
      case 'estimation': return <EstimationGame day={day} />;
      case 'groups': return <GroupsGame day={day} availableWidth={width} />;
      case 'sudoku': return <SudokuGame key={sudokuReset} day={day} availableWidth={width} />;
      case 'zip': return <ZipGame day={day} availableWidth={width} />;
      case 'globle': return <GlobleGame day={day} availableWidth={width} />;
    }
  };
  return (
    <View style={[styles.screen, { backgroundColor: look.page }]}>
      {kind === 'globle' && <LinearGradient colors={['#BEE2F4', '#DCEFF3', '#E6F2E6']} style={StyleSheet.absoluteFill} />}
      <StatusBar style={look.status} />
      <GameBar kind={kind} day={day} right={kind === 'sudoku' ? <SudokuClear day={day} onCleared={() => setSudokuReset(value => value + 1)} /> : undefined} />
      <View style={styles.body} onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
        {height > 0 && (
          <ScrollView
            ref={scroller} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets
            automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="never"
            scrollEnabled={!pinned(kind) || showResult || height < 580 || window.fontScale > 1.3} alwaysBounceVertical={false} style={styles.scroller}
            onContentSizeChange={() => { if (showResult && finishedHere && kind !== 'estimation') scroller.current?.scrollToEnd({ animated: !reduced }); }}
            contentContainerStyle={[styles.content, { minHeight: height, width: width + padding[kind] * 2, paddingHorizontal: padding[kind], paddingBottom: insets.bottom + 8 }]}
          >
            {game()}
            {result}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  blocked: { padding: 24, justifyContent: 'center' },
  // The scroll viewport ends below GameBar; results and globe geometry must never paint over it.
  body: { flex: 1, overflow: 'hidden' },
  scroller: { flex: 1 },
  content: { alignSelf: 'center', paddingTop: 6, gap: 18 },
  panel: { padding: 20, gap: 13, borderRadius: 18, borderCurve: 'continuous' },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verdictText: { ...rounded, fontSize: 22, fontWeight: '800', flexShrink: 1 },
  friends: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  share: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingVertical: 15, borderRadius: 14, borderCurve: 'continuous' },
});
