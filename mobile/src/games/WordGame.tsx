import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { LetterMark, letterMarks, wordFor } from '../core/engine';
import { useArcade } from '../store';
import { fonts } from '../theme';
import { Icon, Toast, useShake, useToast } from '../ui';
import { TouchKey } from './Keyboard';

const tileGap = 5;
const keyGap = 6;
const keyHeight = 58;
const keyboardHeight = keyHeight * 3 + 16;
const praise = ['Genius', 'Magnificent', 'Impressive', 'Splendid', 'Great', 'Phew'];

const light = { page: '#FFFFFF', ink: '#1A1A1B', empty: '#D3D6DA', filled: '#878A8C', key: '#D3D6DA', keyInk: '#1A1A1B', absent: '#787C7E', correct: '#6AAA64', present: '#C9B458', toast: '#1A1A1B', toastInk: '#FFFFFF' };
const dark: typeof light = { page: '#121213', ink: '#F8F8F8', empty: '#3A3A3C', filled: '#565758', key: '#818384', keyInk: '#F8F8F8', absent: '#3A3A3C', correct: '#538D4E', present: '#B59F3B', toast: '#F8F8F8', toastInk: '#121213' };
type Wordle = typeof light;
const useWordle = () => (useColorScheme() === 'dark' ? dark : light);
const markFill = (mark: LetterMark, tones: Wordle) => (mark === 2 ? tones.correct : mark === 1 ? tones.present : tones.absent);

function Tile({ letter, mark, delay, bounce }: { letter: string; mark: LetterMark | null; delay: number; bounce: boolean }) {
  const tones = useWordle();
  const reduced = useReducedMotion();
  const turn = useSharedValue(mark === null ? 0 : 180);
  const pop = useSharedValue(1);
  const lift = useSharedValue(0);
  useEffect(() => {
    turn.set(mark === null ? 0 : withDelay(delay, withTiming(180, { duration: reduced ? 200 : 500 })));
  }, [mark, delay, reduced, turn]);
  useEffect(() => {
    if (letter === '' || reduced || mark !== null) return;
    pop.set(1.12);
    pop.set(withSpring(1, { stiffness: 900, damping: 24 }));
  }, [letter, mark, pop, reduced]);
  useEffect(() => {
    if (!bounce || reduced) return;
    lift.set(withDelay(1500 + delay, withSequence(withTiming(-26, { duration: 170 }), withTiming(4, { duration: 150 }), withTiming(-9, { duration: 110 }), withTiming(0, { duration: 110 }))));
  }, [bounce, delay, lift, reduced]);
  // Keeps its old face until it is edge-on, then shows the result on the way back round.
  const turning = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { perspective: 400 }, { rotateX: `${reduced ? 0 : turn.value >= 90 ? turn.value - 180 : turn.value}deg` }, { scale: pop.value }],
  }));
  const before = useAnimatedStyle(() => ({ opacity: turn.value >= 90 ? 0 : 1 }));
  const after = useAnimatedStyle(() => ({ opacity: turn.value >= 90 ? 1 : 0 }));
  return (
    <Animated.View style={[styles.tile, turning]}>
      <Animated.View style={[styles.face, { borderWidth: 2, borderColor: letter ? tones.filled : tones.empty }, before]}>
        {letter !== '' && <Text style={[styles.letter, { color: tones.ink }]}>{letter}</Text>}
      </Animated.View>
      {mark !== null && (
        <Animated.View style={[styles.face, { backgroundColor: markFill(mark, tones) }, after]}>
          <Text style={[styles.letter, { color: '#FFFFFF' }]}>{letter}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

function Row({ word, marks, won, shakeRef }: { word: string; marks: LetterMark[]; won: boolean; shakeRef?: { current: (() => void) | null } }) {
  const { style, shake } = useShake();
  useEffect(() => {
    if (shakeRef) shakeRef.current = shake;
  });
  return (
    <Animated.View style={[styles.row, style]} accessible accessibilityLabel={word === '' ? 'Empty row' : word}>
      {[0, 1, 2, 3, 4].map((col) => <Tile key={col} letter={word[col] ?? ''} mark={marks[col] ?? null} delay={col * 300} bounce={won} />)}
    </Animated.View>
  );
}

export function WordGame({ day, availableHeight, availableWidth }: { day: number; availableHeight: number; availableWidth: number }) {
  const arcade = useArcade();
  const tones = useWordle();
  const progress = arcade.progress('word', day);
  const answer = wordFor(day);
  const toast = useToast();
  const [shownGuesses, setShownGuesses] = useState(progress.guesses.length);
  const [justWon, setJustWon] = useState(false);
  const shakeRow = useRef<(() => void) | null>(null);

  // The keyboard colours in once the tiles have finished turning.
  useEffect(() => {
    const timer = setTimeout(() => setShownGuesses(progress.guesses.length), 1900);
    return () => clearTimeout(timer);
  }, [progress.guesses.length]);

  const known: Record<string, LetterMark> = {};
  for (const guess of progress.guesses.slice(0, shownGuesses)) {
    letterMarks(guess, answer).forEach((mark, index) => {
      if ((known[guess[index]] ?? -1) < mark) known[guess[index]] = mark;
    });
  }
  const tile = Math.min(62, (availableWidth - tileGap * 4) / 5, (availableHeight - keyboardHeight - 32 - tileGap * 5) / 6);
  const boardWidth = tile * 5 + tileGap * 4;

  const typeLetter = (letter: string) => {
    // Reads the store, not this render: two thumbs can land before React re-renders.
    arcade.update('word', day, (state) => { if (!state.completed && state.pendingAnswer.length < 5) state.pendingAnswer += letter; });
  };
  const remove = () => arcade.update('word', day, (state) => { state.pendingAnswer = state.pendingAnswer.slice(0, -1); });
  const reject = (message: string) => {
    toast.show(message);
    shakeRow.current?.();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };
  const submit = () => {
    const current = arcade.progress('word', day);
    const guess = current.pendingAnswer;
    if (current.completed) return;
    if (guess.length !== 5) return reject('Not enough letters');
    if (!arcade.isWord(guess)) return reject('Not in word list');
    if (current.guesses.includes(guess)) return reject('Already tried');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const tries = current.guesses.length + 1;
    arcade.update('word', day, (state) => {
      state.guesses.push(guess); state.pendingAnswer = '';
      if (guess === answer || state.guesses.length === 6) arcade.finish(state, guess === answer);
    });
    if (guess === answer) { setJustWon(true); setTimeout(() => toast.show(praise[tries - 1]), 1500); }
    else if (tries === 6) setTimeout(() => toast.show(answer), 1500);
  };

  const keyWidth = (availableWidth - keyGap * 9) / 10;
  const wide = keyWidth * 1.5 + keyGap / 2;
  const letters = (row: string) => [...row].map((letter) => {
    const mark = known[letter];
    return (
      <TouchKey
        key={letter} label={letter} press={() => typeLetter(letter)}
        style={[styles.key, { width: keyWidth, backgroundColor: mark === undefined ? tones.key : markFill(mark, tones) }]}
        textStyle={[styles.keyText, { color: mark === undefined ? tones.keyInk : '#FFFFFF' }]}
      >
        {letter}
      </TouchKey>
    );
  });
  return (
    <View style={[styles.game, !progress.completed && styles.fill]}>
      {toast.text !== '' && <Toast text={toast.text} fill={tones.toast} ink={tones.toastInk} top={6} />}
      <View style={[styles.board, { width: boardWidth, height: tile * 6 + tileGap * 5 }]} accessibilityLabel="Word grid">
        {[0, 1, 2, 3, 4, 5].map((row) => {
          const word = row < progress.guesses.length ? progress.guesses[row] : row === progress.guesses.length ? progress.pendingAnswer : '';
          return <Row key={row} word={word} marks={row < progress.guesses.length ? letterMarks(word, answer) : []} won={justWon && word === answer} shakeRef={row === progress.guesses.length ? shakeRow : undefined} />;
        })}
      </View>
      {!progress.completed && (
        <>
          <View style={styles.fill} />
          <View style={styles.keyboard}>
            <View style={styles.keyRow}>{letters('QWERTYUIOP')}</View>
            <View style={styles.keyRow}>{letters('ASDFGHJKL')}</View>
            <View style={styles.keyRow}>
              <TouchKey label="Enter" press={submit} style={[styles.key, { width: wide, backgroundColor: tones.key }]} textStyle={[styles.enter, { color: tones.keyInk }]}>ENTER</TouchKey>
              {letters('ZXCVBNM')}
              <TouchKey label="Delete letter" press={remove} style={[styles.key, { width: wide, backgroundColor: tones.key }]}>
                <Icon name="delete.left" size={22} color={tones.keyInk} fallback="⌫" weight="regular" />
              </TouchKey>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  game: { alignItems: 'center', paddingTop: 12 },
  fill: { flex: 1 },
  board: { gap: tileGap },
  row: { flex: 1, flexDirection: 'row', gap: tileGap },
  tile: { flex: 1 },
  face: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  letter: { fontFamily: fonts.plain, fontSize: 32, fontWeight: '700' },
  keyboard: { gap: 8, alignSelf: 'stretch' },
  keyRow: { flexDirection: 'row', justifyContent: 'center', gap: keyGap, height: keyHeight },
  key: { borderRadius: 4 },
  keyText: { fontFamily: fonts.plain, fontSize: 19, fontWeight: '700' },
  enter: { fontFamily: fonts.plain, fontSize: 12, fontWeight: '700' },
});
