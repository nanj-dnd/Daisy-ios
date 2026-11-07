import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import Animated, { FadeOut, LinearTransition, ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { SeededRandom, checkGroup, dateLabel, groupsFor, shuffled } from '../core/engine';
import { useArcade } from '../store';
import { fonts, useGameLook } from '../theme';
import { Toast, useShake, useToast } from '../ui';

const gap = 8;
const glide = LinearTransition.springify().stiffness(190).damping(24);
/** Yellow is the plainest group and purple the trickiest, in the bank's order. */
const groupColors = ['#F9DF6D', '#A0C35A', '#B0C4EF', '#BA81C5'];

function WordTile({ word, chosen, width, height, wrongTries, onPress }: { word: string; chosen: boolean; width: number; height: number; wrongTries: number; onPress: () => void }) {
  const dark = useColorScheme() === 'dark';
  const { style, shake } = useShake();
  useEffect(() => { if (chosen && wrongTries > 0) shake(); }, [wrongTries]); // eslint-disable-line react-hooks/exhaustive-deps
  const rest = dark ? '#3A3A3C' : '#EFEFE6', held = dark ? '#EFEFE6' : '#5A594E';
  return (
    <Animated.View layout={glide} exiting={FadeOut.duration(120)} style={[{ width, height }, style]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={word} accessibilityState={{ selected: chosen }} style={({ pressed }) => [styles.tile, { backgroundColor: chosen ? held : rest, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={[styles.word, { color: chosen === dark ? '#000000' : dark ? '#F8F8F8' : '#FFFFFF' }]}>{word}</Text>
      </Pressable>
    </Animated.View>
  );
}

function Pill({ title, onPress, disabled, filled, ink, page }: { title: string; onPress: () => void; disabled?: boolean; filled?: boolean; ink: string; page: string }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} style={({ pressed }) => [styles.pill, { borderColor: ink, backgroundColor: filled ? ink : 'transparent', opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}>
      <Text style={[styles.pillText, { color: filled ? page : ink }]}>{title}</Text>
    </Pressable>
  );
}

export function GroupsGame({ day, availableWidth }: { day: number; availableWidth: number }) {
  const arcade = useArcade();
  const look = useGameLook('groups');
  const reduced = useReducedMotion();
  const progress = arcade.progress('groups', day);
  const groups = groupsFor(day);
  const [order, setOrder] = useState(() => shuffled(groups.flatMap((group) => group.words), new SeededRandom(day + 101)));
  const [wrongTries, setWrongTries] = useState(0);
  const toast = useToast();
  const solvedWords = new Set(progress.solvedGroups.flatMap((index) => groups[index].words));
  const remaining = order.filter((word) => !solvedWords.has(word));
  // The save is the only selection state, so a tap landing before a re-render can't act on a stale copy.
  const selection = new Set(progress.pendingAnswer.split('|').filter((word) => remaining.includes(word)));
  const tileWidth = (availableWidth - gap * 3) / 4;
  const tileHeight = Math.min(84, tileWidth);

  const toggle = (word: string) => arcade.update('groups', day, (state) => {
    const next = new Set(state.pendingAnswer.split('|').filter(Boolean));
    if (next.has(word)) next.delete(word);
    else if (next.size < 4) next.add(word);
    state.pendingAnswer = [...next].sort().join('|');
  });
  const mistake = (message: string) => {
    toast.show(message);
    setWrongTries((count) => count + 1);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    arcade.update('groups', day, (state) => {
      state.mistakes += 1;
      if (state.mistakes === 4) { state.pendingAnswer = ''; arcade.finish(state, false); }
    });
  };
  const submit = () => {
    if (progress.completed || selection.size !== 4) return;
    const verdict = checkGroup(selection, groups, progress.solvedGroups);
    if (verdict.kind === 'solved') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      arcade.update('groups', day, (state) => {
        state.solvedGroups.push(verdict.index); state.pendingAnswer = '';
        if (state.solvedGroups.length === 4) arcade.finish(state, true);
      });
    } else if (verdict.kind === 'oneAway') mistake('One away...');
    else mistake('Not a group');
  };
  const solvedRow = (index: number) => (
    <Animated.View key={index} entering={reduced ? undefined : ZoomIn.springify().stiffness(190).damping(22)} layout={glide} style={[styles.solved, { height: tileHeight, backgroundColor: groupColors[index % 4] }]}>
      <Text style={styles.solvedTitle}>{groups[index].title.toUpperCase()}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.members}>{groups[index].words.join(', ')}</Text>
    </Animated.View>
  );
  const unsolved = [0, 1, 2, 3].filter((index) => !progress.solvedGroups.includes(index));
  const left = Math.max(0, 4 - progress.mistakes);
  return (
    <View style={styles.game}>
      {toast.text !== '' && <Toast text={toast.text} fill={look.ink} ink={look.page} top={30} />}
      <Text style={[styles.date, { color: look.muted }]}>{dateLabel(day)}</Text>
      <Text style={[styles.prompt, { color: look.ink }]}>Create four groups of four!</Text>
      <View style={styles.board}>
        {progress.solvedGroups.map(solvedRow)}
        {progress.completed && !progress.won && unsolved.map(solvedRow)}
        {!progress.completed && (
          <View style={styles.grid}>
            {remaining.map((word) => <WordTile key={word} word={word} chosen={selection.has(word)} width={tileWidth} height={tileHeight} wrongTries={wrongTries} onPress={() => toggle(word)} />)}
          </View>
        )}
      </View>
      {!progress.completed && (
        <>
          <View style={styles.mistakes} accessible accessibilityLabel={`${left} mistakes remaining`}>
            <Text style={[styles.mistakesText, { color: look.ink }]}>Mistakes Remaining:</Text>
            {[0, 1, 2, 3].map((dot) => <View key={dot} style={[styles.dot, { backgroundColor: dot < left ? look.muted : 'transparent' }]} />)}
          </View>
          <View style={styles.tools}>
            <Pill title="Shuffle" ink={look.ink} page={look.page} onPress={() => setOrder((current) => [...current].sort(() => Math.random() - 0.5))} />
            <Pill title="Deselect All" ink={look.ink} page={look.page} disabled={selection.size === 0} onPress={() => arcade.update('groups', day, (state) => { state.pendingAnswer = ''; })} />
            <Pill title="Submit" ink={look.ink} page={look.page} filled={selection.size === 4} disabled={selection.size !== 4} onPress={submit} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  game: { gap: 14, paddingTop: 2 },
  date: { fontSize: 14, textAlign: 'center' },
  prompt: { fontFamily: fonts.plain, fontSize: 16, textAlign: 'center' },
  board: { gap },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap },
  tile: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderRadius: 6 },
  word: { fontFamily: fonts.plain, fontSize: 15, fontWeight: '700' },
  solved: { alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 12, borderRadius: 6 },
  solvedTitle: { fontFamily: fonts.plain, fontSize: 16, fontWeight: '700', color: '#000000' },
  members: { fontFamily: fonts.plain, fontSize: 15, color: '#000000' },
  mistakes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 6 },
  mistakesText: { fontFamily: fonts.plain, fontSize: 14 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  tools: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  pill: { minHeight: 46, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 24, borderWidth: 1 },
  pillText: { fontFamily: fonts.plain, fontSize: 15, fontWeight: '600' },
});
