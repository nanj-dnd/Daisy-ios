import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ComponentType, ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GameKind, dateLabel, editionNumber, firstEditionDay, gameKinds, games, monthLabel, monthOf } from '../core/engine';
import { RootStack } from '../navigation';
import { useArcade } from '../store';
import { FriendsPanel } from './FriendsPanel';
import { cardColor, fonts, shellType as type, useColors } from '../theme';
import { GameSymbol, Icon, TextAction, useCountdown } from '../ui';

// The package's class typings predate the React 19 JSX types.
const Segments = SegmentedControl as unknown as ComponentType<{ values: string[]; selectedIndex: number; accessibilityLabel: string; onChange: (event: { nativeEvent: { selectedSegmentIndex: number } }) => void }>;

function Section({ header, footer, children }: { header?: string; footer?: string; children: ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      {header !== undefined && <Text style={[type.subheadline, styles.header, { color: colors.muted }]}>{header}</Text>}
      <View style={[styles.group, { backgroundColor: colors.sheetRow }]}>{children}</View>
      {footer !== undefined && <Text style={[type.footnote, styles.footer, { color: colors.muted }]}>{footer}</Text>}
    </View>
  );
}

function GameRow({ kind, day, onPress, last }: { kind: GameKind; day: number; onPress: () => void; last: boolean }) {
  const arcade = useArcade();
  const colors = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${games[kind].title}, ${arcade.status(kind, day)}`} style={({ pressed }) => [styles.row, !last && { borderBottomColor: `${colors.muted}33`, borderBottomWidth: StyleSheet.hairlineWidth }, pressed && { opacity: 0.6 }]}>
      <View style={styles.symbol}><GameSymbol kind={kind} size={21} color={cardColor(kind)} /></View>
      <View style={styles.rowText}>
        <Text style={[type.headline, styles.gameName, { color: colors.ink }]}>{games[kind].title}</Text>
        <Text style={[type.subheadline, { color: colors.muted }]}>{games[kind].subtitle}</Text>
      </View>
      <Text style={[type.caption, styles.status, { color: colors.muted }]}>{arcade.status(kind, day)}</Text>
    </Pressable>
  );
}

type Pack = { first: number; days: number[] };
/** One pack per month, newest first, holding every finished edition from #1 up to yesterday. */
function packsBefore(today: number) {
  const packs: Pack[] = [];
  for (let day = today - 1; day >= firstEditionDay; day -= 1) {
    const { first } = monthOf(day);
    if (packs[packs.length - 1]?.first !== first) packs.push({ first, days: [] });
    packs[packs.length - 1].days.push(day);
  }
  return packs;
}
/** The month's days laid out Sunday first, with blanks before the 1st. */
function calendar(first: number) {
  const { length } = monthOf(first);
  const blanks = new Date(first * 86_400_000).getUTCDay();
  return [...Array.from({ length: blanks }, () => null), ...Array.from({ length }, (_, index) => first + index)];
}
const monthDay = (day: number) => new Date(day * 86_400_000).getUTCDate();

function Fact({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.fact}>
      <Text style={[type.body, { color: colors.ink }]}>{label}</Text>
      <Text style={[type.body, { color: colors.muted }]}>{value}</Text>
    </View>
  );
}

export function CollectionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStack>>();
  const arcade = useArcade();
  const colors = useColors();
  const route = useRoute<RouteProp<RootStack, 'Collection'>>();
  const [section, setSection] = useState(route.params?.section ?? 0);
  const [edition, setEdition] = useState<number | null>(null);
  const [pack, setPack] = useState<number | null>(null);
  const countdown = useCountdown();
  const today = arcade.today;
  const play = (kind: GameKind, day: number) => {
    navigation.goBack();
    navigation.navigate('Game', { kind, day });
  };
  const weekDays = [6, 5, 4, 3, 2, 1, 0].map((offset) => today - offset);
  const played = arcade.playedDays;
  const packs = packsBefore(today);

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <View style={styles.picker}>
        <Segments
          values={['Games', 'Archive', 'You', 'Friends']} selectedIndex={section} accessibilityLabel="Collection section"
          onChange={(event) => { setSection(event.nativeEvent.selectedSegmentIndex); setEdition(null); setPack(null); }}
        />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {section === 0 && (
          <Section header={dateLabel(today)} footer={`All ${gameKinds.length} games refresh at midnight UTC, in ${countdown}. Play offline, come back tomorrow.`}>
            {gameKinds.map((kind, index) => <GameRow key={kind} kind={kind} day={today} last={index === gameKinds.length - 1} onPress={() => play(kind, today)} />)}
          </Section>
        )}
        {section === 1 && pack === null && edition === null && (
          <Section header="Archive packs" footer="A pack for every month since edition #1. Archive games save separately and do not backfill your daily streak.">
            {packs.map((entry, index) => {
              const total = entry.days.length * gameKinds.length;
              const done = entry.days.reduce((sum, day) => sum + arcade.completedCount(day), 0);
              return (
                <Pressable key={entry.first} onPress={() => setPack(entry.first)} accessibilityRole="button" accessibilityLabel={`${monthLabel(entry.first)} pack, ${done} of ${total} puzzles done`} style={({ pressed }) => [styles.row, index < packs.length - 1 && { borderBottomColor: `${colors.muted}33`, borderBottomWidth: StyleSheet.hairlineWidth }, pressed && { opacity: 0.6 }]}>
                  <View style={styles.rowText}>
                    <Text style={[type.headline, styles.gameName, { color: colors.ink }]}>{monthLabel(entry.first)}</Text>
                    <Text style={[type.caption, { color: colors.muted }]}>{entry.days.length} edition{entry.days.length === 1 ? '' : 's'} · {total} puzzles</Text>
                    <View style={[styles.bar, { backgroundColor: `${colors.muted}26` }]}>
                      <View style={[styles.barFill, { width: `${(done / total) * 100}%`, backgroundColor: colors.tint }]} />
                    </View>
                  </View>
                  {done === total
                    ? <View style={styles.packCount}><Icon name="checkmark.seal.fill" size={20} color={colors.tint} fallback="✓" /></View>
                    : <Text style={[type.subheadline, styles.packCount, { color: colors.muted }]}>{done}/{total}</Text>}
                  <Icon name="chevron.right" size={13} color={colors.muted} fallback="›" />
                </Pressable>
              );
            })}
          </Section>
        )}
        {section === 1 && pack !== null && edition === null && (
          <>
            <View style={styles.back}><TextAction title="All packs" onPress={() => setPack(null)} /></View>
            <Section header={`${monthLabel(pack)} pack`} footer="Tap a day to play its games. A full circle means all of that day's games are done.">
              <View style={styles.calendar}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((letter, index) => <Text key={index} style={[type.caption, styles.weekday, { color: colors.muted }]}>{letter}</Text>)}
                {calendar(pack).map((day, index) => {
                  if (day === null) return <View key={`blank-${index}`} style={styles.cell} />;
                  const open = day >= firstEditionDay && day < today;
                  const done = open ? arcade.completedCount(day) : 0;
                  const full = done === gameKinds.length;
                  return (
                    <Pressable key={day} disabled={!open} onPress={() => setEdition(day)} accessibilityRole="button" accessibilityState={{ disabled: !open }} accessibilityLabel={`${dateLabel(day)}${open ? `, ${done} of ${gameKinds.length} done` : ', not available'}`} style={({ pressed }) => [styles.cell, pressed && { opacity: 0.6 }]}>
                      <View style={[styles.dayCircle, full && { backgroundColor: colors.tint }, !full && done > 0 && { borderColor: colors.tint, borderWidth: 2 }]}>
                        <Text style={[type.callout, { color: full ? colors.sheetRow : colors.ink, opacity: open ? 1 : 0.3, fontWeight: '600' }]}>{monthDay(day)}</Text>
                      </View>
                      <Text style={[styles.dayCount, { color: colors.muted, opacity: open && done > 0 && !full ? 1 : 0 }]}>{done}/{gameKinds.length}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Section>
          </>
        )}
        {section === 1 && edition !== null && (
          <>
            <View style={styles.back}><TextAction title={pack === null ? 'All packs' : `${monthLabel(pack)} pack`} onPress={() => setEdition(null)} /></View>
            <Section header={`${dateLabel(edition)} · Edition ${editionNumber(edition)}`}>
              {gameKinds.map((kind, index) => <GameRow key={kind} kind={kind} day={edition} last={index === gameKinds.length - 1} onPress={() => play(kind, edition)} />)}
            </Section>
          </>
        )}
        {section === 3 && <FriendsPanel />}
        {section === 2 && (
          <>
            <Section header="Your play">
              <Fact label="Current daily streak" value={`${arcade.streak} day${arcade.streak === 1 ? '' : 's'}`} />
              <Fact label="Longest streak" value={`${arcade.longestStreak} day${arcade.longestStreak === 1 ? '' : 's'}`} />
              <Fact label="Puzzles completed" value={`${arcade.totalCompleted}`} />
            </Section>
            <Section header="This week">
              <View style={styles.week} accessible accessibilityLabel={`${weekDays.filter((day) => played.has(day)).length} days played in the last week`}>
                {weekDays.map((day) => (
                  <View key={day} style={styles.weekDay}>
                    <Icon name={played.has(day) ? 'checkmark.circle.fill' : 'circle'} size={20} color={colors.tint} fallback={played.has(day) ? '●' : '○'} weight="regular" />
                    <Text style={[type.caption, { color: colors.ink }]}>{dateLabel(day)[0]}</Text>
                  </View>
                ))}
              </View>
            </Section>
            <Section header="About Daisy">
              <View style={styles.about}>
                <Text style={[type.headline, { color: colors.ink }]}>Eight little games. One good daily habit.</Text>
                <Text style={[type.body, { color: colors.ink }]}>Your progress stays on this device. Games need no account or connection. An account is optional and only shares your daily results with friends you add. No ads or analytics.</Text>
                <Text style={[type.footnote, { color: colors.muted }]}>Krillion uses curated answer ratings, not live player statistics. The offline editorial starter pack rotates; future releases can add more original content.</Text>
                <Text style={[type.footnote, { color: colors.muted }]}>Independent puzzles with original content, named after the daily games that inspired them. Not affiliated with or endorsed by the makers of Krillion, Fermi, Minute Cryptic, Wordle, Connections, Mini Sudoku, Zip or Globle. Those names belong to their owners.</Text>
              </View>
            </Section>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  picker: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 24 },
  section: { gap: 8 },
  header: { paddingHorizontal: 16, fontFamily: fonts.editorial, fontSize: 20, fontWeight: '600' },
  gameName: { fontFamily: fonts.editorial, fontWeight: '600', fontSize: 19 },
  footer: { paddingHorizontal: 16 },
  group: { borderRadius: 16, borderCurve: 'continuous', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  symbol: { width: 28, alignItems: 'center' },
  rowText: { flex: 1, gap: 3 },
  status: { fontWeight: '600' },
  fact: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  week: { flexDirection: 'row', paddingVertical: 14 },
  weekDay: { flex: 1, alignItems: 'center', gap: 8 },
  about: { padding: 16, gap: 10 },
  back: { paddingHorizontal: 4, marginBottom: -16 },
  packCount: { minWidth: 64, alignItems: 'flex-end', textAlign: 'right', fontVariant: ['tabular-nums'] },
  bar: { height: 5, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  calendar: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingVertical: 12 },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', fontWeight: '600', marginBottom: 6 },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  dayCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dayCount: { fontFamily: fonts.sans, fontSize: 10, fontWeight: '600', fontVariant: ['tabular-nums'], marginTop: 1 },
});
