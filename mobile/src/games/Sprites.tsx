import { memo, useMemo } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

export type Art = readonly string[];
/** Draws rows of characters as square pixels, merging runs so a sprite stays a handful of shapes. */
export const Sprite = memo(function Sprite({ art, palette, pixel, flip, style }: { art: Art; palette: Record<string, string>; pixel: number; flip?: boolean; style?: StyleProp<ViewStyle> }) {
  const width = art[0].length, height = art.length;
  const runs = useMemo(() => art.flatMap((row, y) => {
    const found: { x: number; y: number; length: number; fill: string }[] = [];
    let x = 0;
    while (x < width) {
      const fill = palette[row[x]];
      let end = x + 1;
      while (end < width && row[end] === row[x]) end += 1;
      if (fill) found.push({ x, y, length: end - x, fill });
      x = end;
    }
    return found;
  }), [art, palette, width]);
  return (
    <View style={[{ width: width * pixel, height: height * pixel }, flip && { transform: [{ scaleX: -1 }] }, style]} pointerEvents="none">
      <Svg width={width * pixel} height={height * pixel} viewBox={`0 0 ${width} ${height}`}>
        {runs.map((run) => <Rect key={`${run.x}.${run.y}`} x={run.x} y={run.y} width={run.length + 0.02} height={1.02} fill={run.fill} />)}
      </Svg>
    </View>
  );
});

export const shrimp: Art = [
  '.....aaaa.........',
  '...aa....a........',
  '..a.......a.......',
  '..a.......a.......',
  '.......rrrrrr.....',
  '.....rrRrrRrrr....',
  '....wkrRrrRrrrr...',
  '...rrrrRrrRrrrrr..',
  '..rrrrrrrrRrrRrr..',
  '..pp..rrrrrrrRrr..',
  '...p.p..rrrrRrrr..',
  '.....p.p...rRrrr..',
  '..........rrRrr...',
  '........rrrrr.....',
  '.......rrr........',
];
export const shrimpColors = { a: '#FF7FA8', r: '#FF3B4E', R: '#B81F38', k: '#14060A', w: '#FFFFFF', p: '#FF8A73' };

export const fish: Art = [
  '....dddd.....',
  '..dddddddd..d',
  '.dkdddddddddd',
  'ddddddddddddd',
  '.dddddddddd.d',
  '...ddddd.....',
];

/** One creature per rarity tier, drawn in that tier's colour, with `k` for the eye. */
export const creatures: Art[] = [
  ['..d...d..', 'd..ddd..d', '.ddkdkdd.', '..ddddd..', '.d.ddd.d.', 'd...d...d'],
  ['....dddd.....', '..dddddddd..d', '.dkdddddddddd', 'ddddddddddddd', '.dddddddddd.d', '...ddddd.....'],
  ['.....ddddd.....', '...ddddddddd...', '.ddddddddddddd.', 'dkddddddddddddd', 'ddddddddddddddd', '.dd..ddddd..dd.', 'dd.........dd..'],
  ['..........d....', '.......dd......', '.....dddddd....', '...ddddddddd..d', '..dkddddddddddd', 'dddddddddddddd.', 'd.d.ddddddd...d', 'ddddddddd......', '...dddd........'],
  ['d.d.d.d.d.d.d.d.d.d.......', 'dddddddddddddddddddddddd..', 'dkdddddddddddddddddddddddd', 'dddddddddddddddddddddddd..', '..........................'],
  ['.....dd.....', '....dddd....', '...dddddd...', '..dddddddd..', '..dddddddd..', '..dkddddkd..', '..dddddddd..', '...dddddd...', '..d.dddd.d..', '.d.d.dd.d.d.', '.d.d.dd.d.d.', 'd..d.dd.d..d', 'd.d..dd..d.d', '...d.dd.d...', '...d....d...'],
];

export const boat: Art = [
  '..........pp.........',
  '..........ppp........',
  '..........s..........',
  '..........s..........',
  '.......hhhhhh........',
  '.......hwhwhh........',
  '..hhhhhhhhhhhhhhhhhh.',
  '...hhhhhhhhhhhhhhhh..',
  '....hhhhhhhhhhhhh....',
];
export const boatColors = { p: '#FF5D8F', s: '#0D1A2E', h: '#0D1A2E', w: '#9CCBEB' };

export const cloud: Art = [
  '.......www.........',
  '.....wwwwwww..ww...',
  '...wwwwwwwwwwwwww..',
  '.wwwwwwwwwwwwwwwwww',
  'wwwwwwwwwwwwwwwwwww',
];
export const cloudColors = { w: '#FFFFFF' };

const frond = [
  '.....ll.....',
  '...llll.....',
  '..lllll..l..',
  '.llllll.ll..',
  '....lllll...',
  '.....lllll..',
  '.l...llllll.',
  '.ll..lllllll',
  '..lllll..ll.',
  '...lll......',
];
/** A stem of kelp, repeating one frond as tall as it needs to be. */
export const kelp = (fronds: number): Art => Array.from({ length: fronds }, () => frond).flat();
