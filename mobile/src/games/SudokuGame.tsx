import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { sudokuComplete, sudokuConflicts, sudokuPeers } from '../core/engine';
import { useArcade } from '../store';
import { useGameLook } from '../theme';
import { Icon, Press, Toast, useToast } from '../ui';

const conflictRed = '#D92D20';
const wall = 3;
type Snapshot = { board: number[]; notes: Record<number, number[]> };

/** Lives in the top bar, as it does in the original. */
export function SudokuClear({ day }: { day: number }) {
  const arcade = useArcade();
  const look = useGameLook('sudoku');
  const progress = arcade.progress('sudoku', day);
  const clear = () => Alert.alert('Clear the board?', 'This removes your digits and notes. The original clues stay.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Clear', style: 'destructive', onPress: () => arcade.update('sudoku', day, (state) => { state.board = [...arcade.sudoku(day).givens]; state.notes = {}; }) },
  ]);
  if (progress.completed) return null;
  return (
    <Pressable onPress={clear} accessibilityRole="button" style={({ pressed }) => [styles.clear, { borderColor: look.ink, opacity: pressed ? 0.6 : 1 }]}>
      <Text style={[styles.clearText, { color: look.ink }]}>Clear</Text>
    </Pressable>
  );
}

export function SudokuGame({ day, availableWidth }: { day: number; availableWidth: number }) {
  const arcade = useArcade();
  const look = useGameLook('sudoku');
  const reduced = useReducedMotion();
  const progress = arcade.progress('sudoku', day);
  const puzzle = arcade.sudoku(day);
  const board = progress.board.length > 0 ? progress.board : puzzle.givens;
  const [selected, setSelected] = useState<number | null>(() => (progress.completed ? null : board.indexOf(0)));
  const [notesOn, setNotesOn] = useState(false);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const toast = useToast();
  const conflicts = sudokuConflicts(board);
  const size = availableWidth / 6;
  const dark = look.status === 'light';
  const key = dark ? '#30373D' : '#EFF4F1';
  const picked = dark ? '#2F4A3F' : '#EAF5F0';
  const nearby = dark ? '#30363C' : '#F4F6F5';

  useEffect(() => {
    if (progress.board.length === 0) arcade.update('sudoku', day, (state) => { state.board = [...puzzle.givens]; });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const remember = () => setHistory((past) => [...past, { board: [...board], notes: JSON.parse(JSON.stringify(progress.notes)) }]);
  const settle = (state: typeof progress) => {
    if (!sudokuComplete(state.board)) return;
    arcade.finish(state, true);
    setSelected(null);
  };
  const enter = (value: number) => {
    if (selected === null || progress.completed || puzzle.givens[selected] !== 0) return;
    remember();
    arcade.update('sudoku', day, (state) => {
      if (state.board.length === 0) state.board = [...puzzle.givens];
      if (notesOn && value > 0 && state.board[selected] === 0) {
        const notes = new Set(state.notes[selected] ?? []);
        if (notes.has(value)) notes.delete(value); else notes.add(value);
        state.notes[selected] = [...notes].sort();
      } else {
        state.board[selected] = value;
        delete state.notes[selected];
        if (value > 0) {
          for (const peer of sudokuPeers(selected)) if (state.notes[peer]) state.notes[peer] = state.notes[peer].filter((note) => note !== value);
        }
        settle(state);
      }
    });
  };
  const undo = () => {
    const last = history[history.length - 1];
    if (!last || progress.completed) return;
    setHistory((past) => past.slice(0, -1));
    arcade.update('sudoku', day, (state) => { state.board = last.board; state.notes = last.notes; });
  };
  const hint = () => {
    if (progress.completed) return;
    const wrong = board.findIndex((value, index) => value !== 0 && value !== puzzle.solution[index]);
    const target = wrong >= 0 ? wrong : selected !== null && board[selected] === 0 ? selected : board.indexOf(0);
    if (target < 0) return;
    remember();
    setSelected(target);
    toast.show(wrong >= 0 ? 'That digit was wrong' : 'One digit placed');
    arcade.update('sudoku', day, (state) => {
      state.board[target] = puzzle.solution[target];
      delete state.notes[target];
      state.hints = Math.min(36, state.hints + 1);
      settle(state);
    });
  };
  const reveal = () => Alert.alert("Reveal this grid's solution?", "This finishes today's grid. Your result will say that the solution was revealed.", [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Reveal solution', style: 'destructive', onPress: () => {
        arcade.update('sudoku', day, (state) => { state.board = [...puzzle.solution]; state.notes = {}; state.revealed = true; arcade.finish(state, false); });
        setSelected(null);
      },
    },
  ]);
  const fill = (index: number) => {
    if (selected === index) return picked;
    if (selected !== null && (index % 6 === selected % 6 || Math.floor(index / 6) === Math.floor(selected / 6))) return nearby;
    return look.panel;
  };
  const keyFaded = selected === null ? 0.42 : 1;

  return (
    <View style={styles.game}>
      {toast.text !== '' && <Toast text={toast.text} fill={look.ink} ink={look.page} top={availableWidth + 6} />}
      <View style={[styles.grid, { width: availableWidth, height: availableWidth, backgroundColor: look.panel, borderColor: look.muted }]}>
        {Array.from({ length: 36 }, (_, index) => {
          const value = board[index];
          const given = puzzle.givens[index] !== 0;
          const notes = progress.notes[index] ?? [];
          const clash = conflicts.has(index);
          return (
            <Pressable
              key={index} disabled={progress.completed} onPress={() => setSelected(index)} accessibilityRole="button"
              accessibilityLabel={`Row ${Math.floor(index / 6) + 1}, column ${(index % 6) + 1}, ${value === 0 ? 'empty' : value}, ${given ? 'given' : 'editable'}${clash ? ', conflict' : ''}`}
              accessibilityValue={notes.length > 0 ? { text: `Notes: ${notes.join(', ')}` } : undefined}
              accessibilityState={{ selected: selected === index }}
              style={[styles.cell, {
                left: (index % 6) * size, top: Math.floor(index / 6) * size, width: size, height: size, backgroundColor: fill(index),
                borderColor: `${look.muted}55`,
              }]}
            >
              {value !== 0 ? (
                <Animated.Text
                  key={value} entering={given || reduced ? undefined : ZoomIn.springify().stiffness(900).damping(24)}
                  style={[styles.digit, { fontWeight: given ? '700' : '400', color: clash ? conflictRed : look.ink }]}
                >
                  {value}
                </Animated.Text>
              ) : (
                <View style={styles.notes}>
                  {[1, 2, 3, 4, 5, 6].map((note) => <Text key={note} style={[styles.note, { color: look.muted }]}>{notes.includes(note) ? note : ' '}</Text>)}
                </View>
              )}
            </Pressable>
          );
        })}
        {[2, 4].map((row) => <View key={row} pointerEvents="none" style={[styles.rule, { top: row * size - wall / 2 - 2, left: 0, right: 0, height: wall, backgroundColor: look.muted }]} />)}
        <View pointerEvents="none" style={[styles.rule, { left: 3 * size - wall / 2 - 2, top: 0, bottom: 0, width: wall, backgroundColor: look.muted }]} />
        {selected !== null && <View pointerEvents="none" style={[styles.ring, { left: (selected % 6) * size - 2, top: Math.floor(selected / 6) * size - 2, width: size, height: size, borderColor: look.ink }]} />}
      </View>
      {!progress.completed && (
        <>
          <View style={styles.tools}>
            <Pressable onPress={hint} accessibilityRole="button" style={styles.tool}>
              <Icon name="lightbulb" size={17} color={look.ink} fallback="•" weight="regular" />
              <Text style={[styles.toolText, { color: look.ink }]}>Hint</Text>
            </Pressable>
            <Pressable onPress={() => setNotesOn((value) => !value)} accessibilityRole="switch" accessibilityLabel="Notes" accessibilityState={{ checked: notesOn }} style={styles.tool}>
              <Icon name="pencil" size={17} color={look.ink} fallback="✎" weight="regular" />
              <Text style={[styles.toolText, { color: look.ink }]}>Notes</Text>
              <Text style={[styles.toolState, { color: notesOn ? '#0A8A5F' : `${look.muted}88` }]}>{notesOn ? 'ON' : 'OFF'}</Text>
            </Pressable>
          </View>
          <View style={styles.pad}>
            {[[1, 2, 3], [4, 5, 6]].map((row, rowIndex) => (
              <View key={rowIndex} style={styles.padRow}>
                {row.map((value) => (
                  <Press key={value} onPress={() => enter(value)} disabled={selected === null} scale={0.95} accessibilityLabel={`Enter ${value}`} style={[styles.key, { backgroundColor: key, opacity: keyFaded }]}>
                    <Text style={[styles.keyText, { color: look.ink }]}>{value}</Text>
                  </Press>
                ))}
                {rowIndex === 0 ? (
                  <Press onPress={() => enter(0)} disabled={selected === null} scale={0.95} accessibilityLabel="Erase selected cell" style={[styles.key, { backgroundColor: key, opacity: keyFaded }]}>
                    <Icon name="xmark" size={17} color={look.ink} fallback="×" weight="regular" />
                    <Text style={[styles.keyLabel, { color: look.ink }]}>Erase</Text>
                  </Press>
                ) : (
                  <Press onPress={undo} disabled={history.length === 0} scale={0.95} accessibilityLabel="Undo" style={[styles.key, { backgroundColor: key, opacity: history.length === 0 ? 0.42 : 1 }]}>
                    <Icon name="arrow.uturn.backward" size={17} color={look.ink} fallback="↩" weight="regular" />
                    <Text style={[styles.keyLabel, { color: look.ink }]}>Undo</Text>
                  </Press>
                )}
              </View>
            ))}
          </View>
          <Pressable onPress={reveal} accessibilityRole="button" style={styles.reveal}><Text style={[styles.revealText, { color: look.muted }]}>Reveal solution</Text></Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  game: { gap: 10, paddingTop: 12 },
  clear: { minHeight: 32, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 16, borderWidth: 1 },
  clearText: { fontSize: 15, fontWeight: '600' },
  grid: { borderWidth: wall, borderRadius: 5, overflow: 'hidden' },
  cell: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  digit: { fontSize: 25 },
  notes: { flexDirection: 'row', flexWrap: 'wrap', width: '100%', padding: 2 },
  note: { width: '33.33%', fontSize: 11, textAlign: 'center' },
  rule: { position: 'absolute' },
  ring: { position: 'absolute', borderWidth: 3 },
  tools: { flexDirection: 'row', justifyContent: 'space-around' },
  tool: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  toolText: { fontSize: 15, fontWeight: '600' },
  toolState: { fontSize: 13, fontWeight: '600' },
  pad: { gap: 8 },
  padRow: { flexDirection: 'row', gap: 8 },
  key: { flex: 1, height: 60, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 12 },
  keyText: { fontSize: 31 },
  keyLabel: { fontSize: 12 },
  reveal: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  revealText: { fontSize: 14 },
});
