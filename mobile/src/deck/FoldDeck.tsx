import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { GestureDetector, useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { GameKind, games, gameKinds } from '../core/engine';
import { useArcade } from '../store';
import { GameLeaf } from './GameLeaf';
import { DeckLayout, Exit, deckCount, depthAt, tossed, travelOf } from './layout';

const toss = { stiffness: 260, damping: 30, mass: 1 };
const riffle = { stiffness: 103, damping: 17.4, mass: 1 };
const slop = 8;

const wrapped = (value: number) => {
  'worklet';
  return ((value % deckCount) + deckCount) % deckCount;
};

export function FoldDeck({ day, layout, height, play }: { day: number; layout: DeckLayout; height: number; play: (kind: GameKind) => void }) {
  const arcade = useArcade();
  const { width } = useWindowDimensions();
  const [front, setFront] = useState(0);
  const position = useSharedValue(0);
  const target = useSharedValue(0);
  const origin = useSharedValue(0);
  const grabX = useSharedValue(0);
  const grabY = useSharedValue(0);
  const exits = useSharedValue<Exit[]>(gameKinds.map((_, index) => tossed(index)));
  const pressed = useSharedValue(0);
  const fade = useSharedValue(1);
  const flat = layout.flat;

  const haptic = () => void Haptics.selectionAsync();
  // React waits for the spring; a re-render landing mid-flight has frozen the deck.
  const landed = (index: number) => setFront(index);
  const openFront = (index: number) => play(gameKinds[index]);

  const moveTo = (steps: number, spring: typeof toss & { velocity?: number }) => {
    'worklet';
    target.value += steps;
    scheduleOnRN(haptic);
    if (flat) {
      position.value = target.value;
      scheduleOnRN(landed, wrapped(target.value));
      fade.value = withSequence(withTiming(0.35, { duration: 70 }), withTiming(1, { duration: 150 }));
    } else {
      position.value = withSpring(target.value, spring, (finished) => {
        if (finished) scheduleOnRN(landed, wrapped(target.value));
      });
    }
  };
  const setExit = (index: number, exit: Exit) => {
    'worklet';
    exits.modify((all) => {
      'worklet';
      all[index] = exit;
      return all;
    });
  };
  const cycle = (steps: number) => {
    'worklet';
    const count = Math.abs(steps);
    for (let step = 0; step < count; step += 1) {
      setExit(wrapped(target.value + (steps > 0 ? step + 1 : -step)), tossed(step));
    }
    moveTo(steps, count > 1 ? riffle : toss);
  };

  /** The front leaf follows the finger in any direction, and a throw sends it off that way to the back of the deck. */
  const pan = usePanGesture({
    minDistance: slop,
    onActivate: (event) => {
      'worklet';
      grabX.value = event.translationX;
      grabY.value = event.translationY;
      origin.value = position.value;
    },
    onUpdate: (event) => {
      'worklet';
      if (flat) return;
      const x = event.translationX - grabX.value, y = event.translationY - grabY.value;
      const distance = Math.hypot(x, y);
      if (distance === 0) return;
      setExit(wrapped(target.value), { dx: x / distance, dy: y / distance });
      // Stops just short of the hand-off to the back, so the leaf never fades while it is held.
      position.value = origin.value - Math.min(0.79, distance / travelOf(layout));
    },
    onDeactivate: (event) => {
      'worklet';
      const x = event.translationX - grabX.value, y = event.translationY - grabY.value;
      const thrown = Math.hypot(x + event.velocityX * 0.22, y + event.velocityY * 0.22);
      if (thrown < 160 && Math.hypot(x, y) < 90) { position.value = withSpring(target.value, toss); return; }
      // Hand the finger's speed to the spring.
      const speed = Math.hypot(event.velocityX, event.velocityY) / travelOf(layout);
      moveTo(-1, { ...toss, velocity: -Math.min(6, speed) });
    },
  });
  const tap = useTapGesture({
    maxDistance: slop,
    // The rearmost leaves tilt up past the top of this view.
    hitSlop: { top: 60 },
    onBegin: () => {
      'worklet';
      pressed.value = withSpring(1, { stiffness: 584, damping: 44, mass: 1 });
    },
    onActivate: (event) => {
      'worklet';
      const depth = depthAt(layout, event.x - width / 2, event.y);
      if (depth === 0) { scheduleOnRN(openFront, wrapped(target.value)); return; }
      cycle(-depth);
    },
    onFinalize: () => {
      'worklet';
      pressed.value = withSpring(0, { stiffness: 584, damping: 44, mass: 1 });
    },
  });
  const gesture = useCompetingGestures(pan, tap);
  const stackFade = useAnimatedStyle(() => ({ opacity: fade.value }));

  const kind = gameKinds[front];
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        collapsable={false}
        style={[styles.stack, { height }, stackFade]}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`${games[kind].title}. ${games[kind].subtitle}. ${arcade.status(kind, day)}.`}
        accessibilityHint="Double tap to play. Swipe up or down to choose another game."
        accessibilityActions={[{ name: 'activate' }, { name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === 'activate') play(kind);
          else {
            const steps = nativeEvent.actionName === 'increment' ? 1 : -1;
            setFront((value) => (value + steps + deckCount) % deckCount);
            exits.set(gameKinds.map((_, index) => tossed(index)));
            target.set(target.get() + steps);
            position.set(target.get());
          }
        }}
      >
        {gameKinds.map((game, index) => (
          <GameLeaf key={game} kind={game} index={index} progress={arcade.progress(game, day)} layout={layout} position={position} target={target} exits={exits} pressed={pressed} />
        ))}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({ stack: { alignSelf: 'stretch' } });
