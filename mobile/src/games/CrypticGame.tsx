import * as Haptics from 'expo-haptics';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown, useReducedMotion } from 'react-native-reanimated';
import { useState } from 'react';
import { crypticFor } from '../core/engine';
import { useArcade } from '../store';
import { fonts } from '../theme';
import { Icon, Toast, useShake, useToast } from '../ui';
import { TouchKey } from './Keyboard';

const lilac = '#F5D1FD', butter = '#FFF2B1', sky = '#D5E8FF', mint = '#BFF0C8';
const keyGap = 6;

function Chunky({ title, onPress, fill, disabled, width }: { title: string; onPress: () => void; fill: string; disabled?: boolean; width?: number }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} style={({ pressed }) => [styles.chunky, { backgroundColor: disabled ? 'transparent' : fill, borderColor: disabled ? '#5C6F8C' : '#000000', boxShadow: disabled ? undefined : '3px 3px 0 #000000', flex: width === undefined ? 1 : undefined, width, transform: [{ translateY: pressed ? 2 : 0 }] }]}>
      <Text style={[styles.chunkyText, { color: disabled ? '#5C6F8C' : '#000000' }]}>{title}</Text>
    </Pressable>
  );
}

function Marked({ title, tint, onPress, disabled }: { title: string; tint: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} style={[styles.marked, disabled && styles.spent]}>
      <View style={[styles.marker, { backgroundColor: tint }]} />
      <Text style={styles.markedText}>{title}</Text>
    </Pressable>
  );
}

export function CrypticGame({ day, availableWidth }: { day: number; availableWidth: number }) {
  const arcade = useArcade();
  const reduced = useReducedMotion();
  const progress = arcade.progress('cryptic', day);
  const clue = crypticFor(day);
  const [hintsOpen, setHintsOpen] = useState(false);
  const toast = useToast();
  const { style: shakeStyle, shake } = useShake();
  const length = clue.answer.length;
  const typed = progress.completed ? clue.answer : progress.pendingAnswer;
  const box = Math.min(46, (availableWidth - 8) / length);
  const keyWidth = (availableWidth - keyGap * 9) / 10;

  const typeLetter = (letter: string) => arcade.update('cryptic', day, (state) => { if (!state.completed && state.pendingAnswer.length < length) state.pendingAnswer += letter; });
  const remove = () => arcade.update('cryptic', day, (state) => { state.pendingAnswer = state.pendingAnswer.slice(0, -1); });
  const submit = () => {
    const guess = arcade.progress('cryptic', day).pendingAnswer;
    if (progress.completed || guess.length !== length) return;
    if (guess === clue.answer) { arcade.update('cryptic', day, (state) => arcade.finish(state, true)); return; }
    toast.show('not quite');
    shake();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };
  const reveal = () => {
    setHintsOpen(false);
    Alert.alert('Reveal the answer?', "This finishes today's clue. You can read the full explanation.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reveal answer', style: 'destructive', onPress: () => arcade.update('cryptic', day, (state) => { state.revealed = true; arcade.finish(state, false); }) },
    ]);
  };
  const takeHint = (level: number) => {
    arcade.update('cryptic', day, (state) => { state.hints = Math.max(state.hints, level); });
    setHintsOpen(false);
  };
  const letters = (row: string) => [...row].map((letter) => (
    <TouchKey key={letter} label={letter} press={() => typeLetter(letter)} style={[styles.key, { width: keyWidth }]} textStyle={styles.keyText}>{letter}</TouchKey>
  ));

  return (
    <View style={[styles.game, !progress.completed && styles.fill]}>
      {toast.text !== '' && <Toast text={toast.text} fill="#000000" ink="#FFFFFF" top={140} />}
      <View style={styles.clue}>{/* Keeps the letter count on the line with the clue's last word. */}
        <Text style={styles.clueText}>{clue.clue.replace(' (', '\u00A0(')}</Text></View>
      <Animated.View style={[styles.boxes, shakeStyle]} accessible accessibilityLabel={`${length} letter answer: ${typed || 'empty'}`}>
        {Array.from({ length }, (_, index) => {
          const ghost = progress.hints >= 2 && index === 0 && typed === '' ? clue.answer[0] : '';
          const fill = progress.completed ? mint : !progress.completed && index === typed.length ? lilac : '#FFFFFF';
          return (
            <View key={index} style={[styles.box, { width: box, height: box, backgroundColor: fill }, index > 0 && styles.joined, index === 0 && styles.firstBox, index === length - 1 && styles.lastBox]}>
              <Text style={[styles.boxLetter, { width: box, fontSize: box * 0.72, opacity: ghost ? 0.3 : 1 }]}>{typed[index] ?? ghost}</Text>
            </View>
          );
        })}
      </Animated.View>
      {!progress.completed && (
        <View style={styles.progress} accessible accessibilityLabel={`${progress.hints} hints used. Par is two.`}>
          {[1, 2, 3].map((dot) => (
            <View key={dot} style={styles.dotColumn}>
              <View style={[styles.dot, { backgroundColor: dot <= progress.hints ? '#000000' : sky }, dot === 2 && dot > progress.hints && styles.parDot]} />
              {dot === 2 && <Text style={styles.par}>par</Text>}
            </View>
          ))}
        </View>
      )}
      {progress.hints >= 1 && !progress.completed && (
        <Animated.View entering={FadeIn} style={styles.hint}>
          <Text style={styles.hintText}>{clue.hint}</Text>
        </Animated.View>
      )}
      {progress.completed ? (
        <View style={styles.answerCard}>
          <Text style={styles.answerTitle}>{progress.revealed ? 'the answer' : 'solved!'}</Text>
          <Text style={styles.explanation}>{clue.explanation}</Text>
        </View>
      ) : (
        <>
          <View style={styles.actions}>
            <Chunky title="hints" fill={butter} onPress={() => setHintsOpen(true)} />
            <Chunky title="check" fill={lilac} disabled={progress.pendingAnswer.length !== length} onPress={submit} />
          </View>
          <View style={styles.fill} />
          <View style={styles.keyboard}>
            <View style={styles.keyRow}>{letters('QWERTYUIOP')}</View>
            <View style={styles.keyRow}>{letters('ASDFGHJKL')}</View>
            <View style={styles.keyRow}>
              {letters('ZXCVBNM')}
              <TouchKey label="Delete letter" press={remove} style={[styles.key, { width: keyWidth * 1.6 }]}>
                <Icon name="delete.left" size={20} color="#000000" fallback="⌫" weight="regular" />
              </TouchKey>
            </View>
          </View>
        </>
      )}
      {hintsOpen && (
        <Animated.View entering={reduced ? undefined : SlideInDown.springify().stiffness(240).damping(26)} exiting={reduced ? undefined : SlideOutDown.duration(180)} style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Select a hint</Text>
            <Pressable onPress={() => setHintsOpen(false)} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}><Icon name="xmark" size={20} color="#000000" fallback="×" /></Pressable>
          </View>
          <Marked title="show hint" tint={lilac} onPress={() => takeHint(1)} disabled={progress.hints >= 1} />
          <Marked title="show first letter" tint={butter} onPress={() => takeHint(2)} disabled={progress.hints >= 2} />
          <View style={styles.rule} />
          <Marked title="reveal answer" tint={sky} onPress={reveal} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  game: { gap: 22 },
  fill: { flex: 1 },
  clue: { paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#FFFFFF', borderRadius: 8 },
  clueText: { fontFamily: fonts.mulish, fontSize: 24, lineHeight: 34, color: '#000000' },
  boxes: { flexDirection: 'row', alignSelf: 'center', marginTop: 4 },
  box: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#000000' },
  joined: { marginLeft: -3 },
  firstBox: { borderTopLeftRadius: 5, borderBottomLeftRadius: 5 },
  lastBox: { borderTopRightRadius: 5, borderBottomRightRadius: 5 },
  boxLetter: { fontFamily: fonts.chunky, color: '#000000', textAlign: 'center' },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 14 },
  dotColumn: { alignItems: 'center', width: 22 },
  dot: { width: 20, height: 20, borderRadius: 10 },
  parDot: { borderWidth: 2, borderColor: '#000000', backgroundColor: 'transparent' },
  par: { position: 'absolute', top: 22, width: 44, textAlign: 'center', fontFamily: fonts.chunky, fontSize: 18, color: '#000000' },
  hint: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: butter, borderRadius: 8 },
  hintText: { fontFamily: fonts.mulish, fontSize: 16, lineHeight: 22, color: '#000000' },
  actions: { flexDirection: 'row', gap: 16, paddingHorizontal: 8 },
  chunky: { height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 25, borderWidth: 3 },
  chunkyText: { fontFamily: fonts.chunky, fontSize: 20 },
  keyboard: { gap: 9, marginHorizontal: -8 },
  keyRow: { flexDirection: 'row', justifyContent: 'center', gap: keyGap },
  key: { height: 46, backgroundColor: '#FFFFFF', borderRadius: 5, boxShadow: '0 0 3px -1px rgba(0,0,0,0.3)' },
  keyText: { fontFamily: fonts.mulish, fontSize: 18, color: '#000000' },
  answerCard: { padding: 20, gap: 8, backgroundColor: '#FFFFFF', borderRadius: 8 },
  answerTitle: { fontFamily: fonts.chunky, fontSize: 24, color: '#000000' },
  explanation: { fontFamily: fonts.mulish, fontSize: 17, lineHeight: 25, color: '#000000' },
  sheet: { position: 'absolute', left: -2, right: -2, bottom: 0, zIndex: 20, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18, gap: 8, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#000000', borderRadius: 18, boxShadow: '3px 3px 0 #000000' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontFamily: fonts.mulish, fontSize: 16, color: '#000000' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  marked: { minHeight: 46, alignSelf: 'flex-start', justifyContent: 'center' },
  spent: { opacity: 0.35 },
  marker: { position: 'absolute', left: -3, right: -3, bottom: 12, height: 10, borderRadius: 3 },
  markedText: { fontFamily: fonts.chunky, fontSize: 20, color: '#000000' },
  rule: { height: 1, backgroundColor: '#DDDDDD', marginVertical: 4 },
});
