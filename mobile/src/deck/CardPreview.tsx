import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline, Text as SvgText } from 'react-native-svg';
import { GameKind } from '../core/engine';
import { countryIndex, heatColor } from '../core/globle';
import { Globe } from '../games/Globe';
import { cardNavy, rounded, type } from '../theme';

// A made-up round over South America: far guesses pale, the neighbour of the answer deep red.
const globePaint = new Map([['Mexico', 5200], ['Brazil', 1400], ['Peru', 600], ['Bolivia', 0]].map(([name, km]) => [countryIndex(name as string), heatColor(km as number)]));

/** Diagrams of each game. They are not evidence of a player's progress. */
export function CardPreview({ kind, compact }: { kind: GameKind; compact?: boolean }) {
  switch (kind) {
    case 'trivia':
      return (
        <View style={styles.stack}>
          {([['Obvious', 10], ['Clever', 50], ['Unexpected', 100]] as const).map(([label, points]) => (
            <View key={label} style={[styles.rating, { paddingVertical: compact ? 7 : 13 }]}>
              <Text style={styles.ratingLabel}>{label}</Text>
              <View style={[styles.points, { backgroundColor: points === 100 ? 'rgb(191,166,255)' : 'rgb(255,219,89)' }]}>
                <Text style={styles.pointsText}>{points}</Text>
              </View>
            </View>
          ))}
        </View>
      );
    case 'estimation':
      return (
        <View style={styles.estimate}>
          <View style={styles.multiple}>
            <Text style={styles.one}>1</Text>
            <Text style={styles.times}>×</Text>
          </View>
          <View style={styles.scale}>
            {['Spot on', '2×', '10×'].map((label) => <Text key={label} style={styles.scaleLabel}>{label}</Text>)}
          </View>
          <View style={styles.track}><View style={styles.thumb} /></View>
        </View>
      );
    case 'cryptic':
      return (
        <View style={styles.cryptic}>
          <Text style={[type.subtitle, { color: cardNavy }]}>A little wordplay.</Text>
          <View style={styles.row}>
            {['A', 'H', 'A', '!'].map((letter, index) => (
              <View key={index} style={[styles.letter, { height: 68, backgroundColor: 'rgba(255,255,255,0.75)' }]}>
                <Text style={styles.letterText}>{letter}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    case 'word':
      return (
        <View style={styles.stack}>
          {[0, 1].map((row) => (
            <View key={row} style={styles.row}>
              {[0, 1, 2, 3, 4].map((col) => (
                <View key={col} style={[styles.letter, { height: 64, backgroundColor: `rgba(255,255,255,${row === 0 ? 0.85 : 0.25})` }]}>
                  {row === 0 && <Text style={styles.wordText}>{'HELLO'[col]}</Text>}
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    case 'groups':
      return (
        <View style={styles.grid}>
          {[0, 1, 2, 3].map((col) => (
            <View key={col} style={styles.column}>
              {[0, 1, 2].map((row) => <View key={row} style={[styles.tile, { backgroundColor: `rgba(255,255,255,${col === 1 ? 0.9 : 0.4})` }]} />)}
            </View>
          ))}
        </View>
      );
    case 'sudoku':
      return (
        <View style={styles.sudoku}>
          {[0, 1, 2].map((row) => (
            <View key={row} style={styles.sudokuRow}>
              {[0, 1, 2, 3, 4, 5].map((col) => (
                <View key={col} style={styles.cell}>
                  {(row + col) % 3 === 0 && <Text style={styles.cellText}>{((row * 3 + col) % 6) + 1}</Text>}
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    case 'zip':
      return (
        <View style={styles.zip}>
          <Svg width="100%" height="100%" viewBox="0 0 300 150">
            <Polyline points="30,28 270,28 270,75 30,75 30,122 270,122" fill="none" stroke={cardNavy} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
            {[[30, 28, 1], [270, 75, 2], [270, 122, 3]].map(([x, y, value]) => (
              <Fragment key={value}>
                <Circle cx={x} cy={y} r={19} fill="#FFFFFF" />
                <SvgText x={x} y={y + 7} fontSize={20} fontWeight="800" fill={cardNavy} textAnchor="middle">{value}</SvgText>
              </Fragment>
            ))}
          </Svg>
        </View>
      );
    case 'globle':
      return (
        <View style={styles.globle}>
          <Globe size={compact ? 150 : 170} centre={[-68, -12]} fills={globePaint} />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  stack: { gap: 7 },
  rating: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, backgroundColor: '#FFFFFF', borderRadius: 14 },
  ratingLabel: { ...rounded, fontSize: 15, fontWeight: '800', color: cardNavy },
  points: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12 },
  pointsText: { fontSize: 12, fontWeight: '800', color: cardNavy },
  estimate: { flex: 1, justifyContent: 'center', gap: 10 },
  multiple: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
  one: { ...rounded, fontSize: 64, lineHeight: 70, fontWeight: '900', color: cardNavy },
  times: { fontSize: 34, lineHeight: 50, fontWeight: '900', color: cardNavy },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleLabel: { fontSize: 15, fontWeight: '700', color: cardNavy },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(10,33,74,0.18)', justifyContent: 'center' },
  thumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: cardNavy },
  cryptic: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 15 },
  row: { flexDirection: 'row', gap: 6, alignSelf: 'stretch' },
  letter: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  letterText: { fontSize: 28, fontWeight: '800', color: cardNavy },
  wordText: { fontSize: 20, fontWeight: '800', color: cardNavy },
  grid: { flexDirection: 'row', gap: 8 },
  column: { flex: 1, gap: 8 },
  tile: { height: 44, borderRadius: 8 },
  sudoku: { gap: 4 },
  sudokuRow: { flexDirection: 'row', gap: 4 },
  cell: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.65)' },
  cellText: { fontSize: 17, fontWeight: '700', color: cardNavy },
  zip: { height: 150 },
  globle: { alignItems: 'center', marginTop: -10 },
});
