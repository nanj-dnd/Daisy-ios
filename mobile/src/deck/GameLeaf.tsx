import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';
import { GameKind, GameProgress, games } from '../core/engine';
import { cardColor, cardRim, cardText, rounded, type } from '../theme';
import { GameSymbol } from '../ui';
import { CardPreview } from './CardPreview';
import { DeckLayout, Exit, deckCount, depthOf, perspective, poseOf } from './layout';

/** Real progress for games played in steps; nothing for games with nothing to count. */
function stepsOf(kind: GameKind, progress: GameProgress) {
  switch (kind) {
    case 'trivia': return { total: 7, done: progress.triviaPoints.length };
    case 'estimation': return { total: 3, done: progress.values.length };
    case 'word': return { total: 6, done: progress.guesses.length };
    case 'groups': return { total: 4, done: progress.solvedGroups.length };
    default: return null;
  }
}

type Props = {
  kind: GameKind;
  index: number;
  progress: GameProgress;
  layout: DeckLayout;
  position: SharedValue<number>;
  target: SharedValue<number>;
  exits: SharedValue<Exit[]>;
  pressed: SharedValue<number>;
};

/**
 * Openness runs from 0 at the back of the deck to 1 at the front, so a leaf opens as it arrives rather than swapping layouts.
 * Memoized so a change of front card never re-renders the leaves while they are moving.
 */
export const GameLeaf = memo(function GameLeaf({ kind, index, progress, layout, position, target, exits, pressed }: Props) {
  // One pose per frame, with its dependencies in plain sight; every style below reads this.
  const pose = useDerivedValue(() => poseOf(layout, depthOf(index, position.value), exits.value[index]));
  const placed = useAnimatedStyle(() => ({
    // Whole slots only: zIndex forces a tree commit, so it must not change on every frame.
    zIndex: Math.ceil(pose.value.layer),
    opacity: pose.value.opacity,
    transform: [{ translateX: pose.value.x }, { translateY: pose.value.y }, { rotateZ: `${pose.value.roll}deg` }],
  }));
  const hinged = useAnimatedStyle(() => {
    const isFront = ((target.value % deckCount) + deckCount) % deckCount === index;
    return { transform: [{ perspective }, { rotateX: `${pose.value.tilt}deg` }, { scale: pose.value.scale * (isFront ? 1 - 0.015 * pressed.value : 1) }] };
  });
  const content = useAnimatedStyle(() => ({ opacity: pose.value.openness * pose.value.openness }));
  const header = useAnimatedStyle(() => ({ transform: [{ translateY: (pose.value.openness - 1) * 8 }] }));
  const title = useAnimatedStyle(() => ({ transform: [{ scale: 0.72 + 0.28 * pose.value.openness }] }));
  const symbol = useAnimatedStyle(() => ({ transform: [{ scale: 0.74 + 0.26 * pose.value.openness }] }));
  const edge = useAnimatedStyle(() => ({ opacity: 0.22 + 0.14 * pose.value.openness }));
  const lift = useAnimatedStyle(() => {
    const open = pose.value.openness;
    return { shadowOpacity: 0.04 + 0.09 * open, shadowRadius: 4 + 9 * open, shadowOffset: { width: 0, height: 4 + 8 * open } };
  });

  const ink = cardText(kind);
  const steps = stepsOf(kind, progress);
  const started = progress.started && !progress.completed;
  return (
    <Animated.View style={[styles.place, { width: layout.cardWidth, height: layout.cardHeight, marginLeft: -layout.cardWidth / 2 }, placed]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.hinge, hinged]}>
        <Animated.View style={[styles.rim, { backgroundColor: cardRim(kind) }, lift]} />
        <View style={[styles.leaf, { backgroundColor: cardColor(kind) }]}>
          <Animated.View style={[styles.header, header]}>
            <Animated.Text numberOfLines={1} style={[styles.name, { color: ink }, title]}>{games[kind].title}</Animated.Text>
            <Animated.View style={[styles.symbol, symbol]}>
              <GameSymbol kind={kind} size={24} color={ink} done={progress.completed} />
            </Animated.View>
          </Animated.View>
          <Animated.View style={[styles.body, content]}>
            {steps && (
              <View style={styles.steps}>
                {Array.from({ length: steps.total }, (_, step) => (
                  <View key={step} style={[styles.step, { backgroundColor: ink, opacity: step < steps.done ? 0.95 : 0.3 }]} />
                ))}
              </View>
            )}
            <View style={[styles.preview, { height: layout.cardHeight < 330 ? 125 : 160 }]}>
              <CardPreview kind={kind} compact={layout.cardHeight < 330} />
            </View>
            <View style={styles.spacer} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[type.subtitle, { color: ink }]}>
              {progress.completed ? (progress.won ? 'Nicely done. See your result.' : "That's today's round.") : games[kind].invitation}
            </Text>
            <Text style={[type.caption, styles.footnote, { color: ink }]}>{started ? 'Pick up where you left off.' : games[kind].footnote}</Text>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.edge, edge]} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}, (before, after) => before.layout === after.layout && JSON.stringify(before.progress) === JSON.stringify(after.progress));

const radius = 24;
const styles = StyleSheet.create({
  place: { position: 'absolute', top: 0, left: '50%' },
  hinge: { transformOrigin: 'bottom' },
  rim: { position: 'absolute', left: 0, right: 0, top: 7, bottom: -7, borderRadius: radius, borderCurve: 'continuous', shadowColor: '#000' },
  leaf: { flex: 1, borderRadius: radius, borderCurve: 'continuous', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 18, overflow: 'hidden' },
  edge: { ...StyleSheet.absoluteFill, borderRadius: radius, borderCurve: 'continuous', borderWidth: 1.5, borderColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 34 },
  name: { ...rounded, fontSize: 28, fontWeight: '800', flexShrink: 1, transformOrigin: 'left' },
  symbol: { opacity: 0.8, transformOrigin: 'right' },
  body: { flex: 1 },
  steps: { flexDirection: 'row', gap: 7, marginTop: 6 },
  step: { width: 9, height: 9, borderRadius: 4.5 },
  preview: { marginTop: 12 },
  spacer: { flex: 1 },
  footnote: { fontWeight: '600', marginTop: 3 },
});
