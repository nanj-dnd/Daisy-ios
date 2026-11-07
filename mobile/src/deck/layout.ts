// Every leaf's pose is a pure function of one continuous deck position, so a drag, a release and a
// second swipe caught mid-flight are all the same motion. The front leaf is thrown off the screen in
// whatever direction the finger sends it, then fades in at the back while the rest step forward a place.
// Bringing a leaf back runs the same path in reverse. Position runs past the deck size without ever
// wrapping, which keeps springs from unwinding through the stack.
export const deckCount = 8;
/** The share of a step spent flying off the screen; the rest is spent fading in at the back. */
const exitShare = 0.8;
/** Where a leaf goes when nothing threw it, as when a tap flicks the leaves in front of a rear band away. */
export const tossed = (index: number): Exit => {
  'worklet';
  return { dx: index % 2 === 0 ? -0.6 : 0.6, dy: 0.8 };
};
export const perspective = 852;

export type Exit = { dx: number; dy: number };
export type DeckLayout = {
  /** How far the front leaf must travel to clear the screen in any direction. */
  reach: number;
  band: number;
  frontDrop: number;
  cardHeight: number;
  cardWidth: number;
  flat: boolean;
};
export type Pose = { x: number; y: number; scale: number; tilt: number; roll: number; openness: number; layer: number; opacity: number };

/** Distance covered by one full position step along the throw, which the finger tracks one to one. */
export const travelOf = (layout: DeckLayout) => {
  'worklet';
  return layout.reach / exitShare;
};

/** Depth 0 is the front; -1 and the deck size less one are the same place, the rear slot. */
export function depthOf(index: number, position: number) {
  'worklet';
  let depth = (position - index) % deckCount;
  if (depth < -1) depth += deckCount;
  if (depth >= deckCount - 1) depth -= deckCount;
  return depth;
}

function slot(layout: DeckLayout, depth: number): Pose {
  'worklet';
  const scale = 1 - depth * 0.019;
  const tilt = layout.flat ? 0 : depth * 2.6;
  const roll = layout.flat ? 0 : depth < 1 ? 2.4 - depth * 3.7 : depth * -1.3;
  // The tilt foreshortens the leaf toward its bottom hinge, so pull it back up to keep every band equal.
  const radians = (tilt * Math.PI) / 180;
  const height = layout.cardHeight * scale;
  const visible = (height * Math.cos(radians)) / (1 + (height * Math.sin(radians)) / perspective);
  const y = (deckCount - 1 - depth) * layout.band + layout.frontDrop * Math.max(0, 1 - depth) - (layout.cardHeight - visible);
  return { x: 0, y, scale, tilt, roll, openness: Math.max(0, 1 - depth), layer: 10 - depth, opacity: 1 };
}

/** Which leaf a touch lands on: the frontmost one whose top edge is above the finger. `x` is measured from the deck's centre. */
export function depthAt(layout: DeckLayout, x: number, y: number) {
  'worklet';
  for (let depth = 0; depth < deckCount - 1; depth += 1) {
    // slot() lifts each leaf so its foreshortened top edge lands on this line, and the roll tips that edge about the centre.
    const roll = (slot(layout, depth).roll * Math.PI) / 180;
    const top = (deckCount - 1 - depth) * layout.band + (depth === 0 ? layout.frontDrop : 0) + x * Math.sin(roll);
    if (y >= top) return depth;
  }
  return deckCount - 1;
}

export function poseOf(layout: DeckLayout, depth: number, exit: Exit): Pose {
  'worklet';
  if (depth >= 0) return slot(layout, depth);
  const away = -depth;
  if (away >= exitShare) {
    // Off the screen by now, so it can reappear at the back without being seen to jump.
    const pose = slot(layout, deckCount - 1);
    pose.opacity = (away - exitShare) / (1 - exitShare);
    pose.layer = 0;
    return pose;
  }
  const pose = slot(layout, 0);
  const distance = away * travelOf(layout);
  pose.x += exit.dx * distance;
  pose.y += exit.dy * distance;
  if (!layout.flat) pose.roll += Math.max(-22, Math.min(22, (exit.dx * distance) / 14)) + away * 4;
  pose.layer = 20;
  return pose;
}
