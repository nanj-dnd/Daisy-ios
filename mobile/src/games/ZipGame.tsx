import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { clockLabel, makeZip, zipCanStep, zipComplete } from '../core/engine';
import { useArcade } from '../store';
import { useGameLook } from '../theme';
import { Icon } from '../ui';

const lineColor = '#EE7A32';
const ringColor = '#E06A26';

export function ZipGame({ day, availableWidth }: { day: number; availableWidth: number }) {
  const arcade = useArcade();
  const look = useGameLook('zip');
  const progress = arcade.progress('zip', day);
  const [puzzle] = useState(() => makeZip(day));
  const [now, setNow] = useState(() => Date.now());
  const [howTo, setHowTo] = useState(true);
  const path = progress.path ?? [];
  const size = puzzle.size;
  const cell = availableWidth / size;
  const seconds = ((progress.completedAt ?? now) - (progress.startedAt ?? now)) / 1000;
  const lastCell = useRef(-1);

  useEffect(() => {
    if (progress.completed) return;
    const clock = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(clock);
  }, [progress.completed]);

  const finishIfDone = (state: typeof progress) => {
    if (!zipComplete(puzzle, state.path ?? [])) return;
    arcade.finish(state, true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  /** Touching the line rewinds to that point; touching a neighbour extends it. Fast drags can skip cells, so it walks the gap. */
  const visit = (target: number) => {
    arcade.update('zip', day, (state) => {
      if (state.completed) return;
      const line = [...(state.path ?? [])];
      const existing = line.indexOf(target);
      if (existing >= 0) { line.length = existing + 1; state.path = line; return; }
      let head = line[line.length - 1];
      if (head === undefined) { if (zipCanStep(puzzle, line, target)) line.push(target); state.path = line; return; }
      const targetRow = Math.floor(target / size), targetColumn = target % size;
      while (head !== target) {
        const row = Math.floor(head / size), column = head % size;
        const across = targetColumn === column ? 0 : Math.sign(targetColumn - column);
        const down = targetRow === row ? 0 : Math.sign(targetRow - row);
        const options = [across !== 0 ? head + across : -1, down !== 0 ? head + down * size : -1].filter((option) => option >= 0 && zipCanStep(puzzle, line, option));
        if (options.length === 0) break;
        head = options[0];
        line.push(head);
      }
      state.path = line;
      finishIfDone(state);
    });
  };
  const latest = useRef(visit);
  useLayoutEffect(() => { latest.current = visit; });
  const touch = useCallback((x: number, y: number) => {
    const column = Math.floor(x / cell), row = Math.floor(y / cell);
    if (column < 0 || row < 0 || column >= size || row >= size) return;
    const target = row * size + column;
    if (target === lastCell.current) return;
    lastCell.current = target;
    latest.current(target);
  }, [cell, size]);
  const lift = useCallback(() => { lastCell.current = -1; }, []);
  const pan = usePanGesture({
    minDistance: 0,
    onBegin: (event) => { 'worklet'; scheduleOnRN(touch, event.x, event.y); },
    onUpdate: (event) => { 'worklet'; scheduleOnRN(touch, event.x, event.y); },
    onFinalize: () => { 'worklet'; scheduleOnRN(lift); },
  });

  const undo = () => arcade.update('zip', day, (state) => { state.path = (state.path ?? []).slice(0, Math.max(1, (state.path ?? []).length - 1)); });
  const reset = () => arcade.update('zip', day, (state) => { state.path = []; });
  const hint = () => arcade.update('zip', day, (state) => {
    if (state.completed) return;
    const line = state.path ?? [];
    let shared = 0;
    while (shared < line.length && line[shared] === puzzle.solution[shared]) shared += 1;
    state.path = puzzle.solution.slice(0, shared + 1);
    state.hints = Math.min(36, state.hints + 1);
    finishIfDone(state);
  });
  const centre = (index: number) => ({ x: (index % size) * cell + cell / 2, y: Math.floor(index / size) * cell + cell / 2 });
  const points = path.map(centre).map(({ x, y }) => `${x},${y}`).join(' ');
  const head = path.length > 0 ? centre(path[path.length - 1]) : null;
  const first = Number(Object.keys(puzzle.marks).find((key) => puzzle.marks[Number(key)] === 1));

  return (
    <View style={styles.game}>
      <View style={styles.status}>
        <View style={styles.clock} accessible accessibilityLabel={`Time ${clockLabel(seconds)}`}>
          <Icon name="clock" size={15} color={look.ink} fallback="◷" />
          <Text style={[styles.clockText, { color: look.ink }]}>{clockLabel(seconds)}</Text>
        </View>
        {!progress.completed && (
          <Pressable onPress={reset} disabled={path.length === 0} accessibilityRole="button" style={({ pressed }) => [styles.reset, { borderColor: look.ink, opacity: path.length === 0 ? 0.4 : pressed ? 0.6 : 1 }]}>
            <Text style={[styles.resetText, { color: look.ink }]}>Reset</Text>
          </Pressable>
        )}
      </View>
      <GestureDetector gesture={pan}>
        <View style={[styles.board, { width: availableWidth, height: availableWidth, backgroundColor: look.panel, borderColor: look.muted }]} accessible accessibilityLabel={`Zip grid, ${path.length} of ${size * size} cells filled`}>
          {Array.from({ length: size - 1 }, (_, line) => (
            <View key={`v${line}`}>
              <View style={[styles.gridline, { left: (line + 1) * cell, top: 0, bottom: 0, width: 2, height: availableWidth, backgroundColor: `${look.muted}66` }]} />
              <View style={[styles.gridline, { top: (line + 1) * cell, left: 0, right: 0, height: 2, width: availableWidth, backgroundColor: `${look.muted}66` }]} />
            </View>
          ))}
          <Svg width={availableWidth} height={availableWidth} style={StyleSheet.absoluteFill}>
            {path.length > 1 && <Polyline points={points} fill="none" stroke={lineColor} strokeWidth={cell * 0.72} strokeLinecap="round" strokeLinejoin="round" />}
            {head && <Circle cx={head.x} cy={head.y} r={cell * 0.36} fill={lineColor} />}
          </Svg>
          {Object.entries(puzzle.marks).map(([key, value]) => {
            const index = Number(key), { x, y } = centre(index), radius = cell * 0.31;
            return (
              <View key={key} pointerEvents="none" style={[styles.mark, { left: x - radius, top: y - radius, width: radius * 2, height: radius * 2, borderRadius: radius }, index === first && path.length === 0 && styles.markStart]}>
                <Text style={[styles.markText, { fontSize: cell * 0.3 }]}>{value}</Text>
              </View>
            );
          })}
        </View>
      </GestureDetector>
      {!progress.completed && (
        <>
          <View style={styles.actions}>
            <Pressable onPress={undo} disabled={path.length < 2} accessibilityRole="button" style={[styles.action, { backgroundColor: path.length < 2 ? `${look.muted}26` : look.ink }]}>
              <Text style={[styles.actionText, { color: path.length < 2 ? `${look.muted}AA` : look.page }]}>Undo</Text>
            </Pressable>
            <Pressable onPress={hint} accessibilityRole="button" style={[styles.action, styles.outline, { borderColor: look.ink }]}>
              <Text style={[styles.actionText, { color: look.ink }]}>Hint</Text>
            </Pressable>
          </View>
          <View style={[styles.howTo, { borderColor: `${look.muted}44`, backgroundColor: look.panel }]}>
            <Pressable onPress={() => setHowTo((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded: howTo }} style={styles.howToHead}>
              <Text style={[styles.howToTitle, { color: look.ink }]}>How to play</Text>
              <Icon name={howTo ? 'chevron.up' : 'chevron.down'} size={14} color={look.ink} fallback="⌃" />
            </Pressable>
            {howTo && (
              <View style={styles.steps}>
                <View style={styles.step}>
                  <View style={styles.sample}>
                    <View style={styles.sampleLine} />
                    {[1, 2, 3].map((value) => <View key={value} style={styles.sampleDot}><Text style={styles.sampleText}>{value}</Text></View>)}
                  </View>
                  <Text style={[styles.stepText, { color: look.ink }]}>Connect the dots in order</Text>
                </View>
                <View style={styles.step}>
                  <View style={styles.sample}>
                    {[0, 1, 2, 3].map((value) => <View key={value} style={[styles.sampleCell, { backgroundColor: lineColor, borderColor: ringColor }]} />)}
                  </View>
                  <Text style={[styles.stepText, { color: look.ink }]}>Fill every cell</Text>
                </View>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  game: { gap: 12, paddingTop: 4 },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  clock: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  clockText: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  reset: { minHeight: 34, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 17, borderWidth: 1 },
  resetText: { fontSize: 15, fontWeight: '600' },
  board: { borderRadius: 26, borderWidth: 2, overflow: 'hidden' },
  gridline: { position: 'absolute' },
  mark: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },
  markStart: { borderWidth: 3, borderColor: ringColor },
  markText: { color: '#FFFFFF', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19 },
  outline: { borderWidth: 1 },
  actionText: { fontSize: 15, fontWeight: '600' },
  howTo: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 16 },
  howToHead: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  howToTitle: { fontSize: 15, fontWeight: '600' },
  steps: { flexDirection: 'row', paddingBottom: 18, gap: 12 },
  step: { flex: 1, alignItems: 'center', gap: 8 },
  sample: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 4 },
  sampleLine: { position: 'absolute', left: 8, right: 8, height: 16, backgroundColor: lineColor },
  sampleDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },
  sampleText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  sampleCell: { width: 16, height: 30, borderRadius: 4, borderWidth: 1 },
  stepText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
