import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameKind, gameKinds, games } from '../core/engine';
import { FoldDeck } from '../deck/FoldDeck';
import { DeckLayout, deckCount } from '../deck/layout';
import { RootStack } from '../navigation';
import { useArcade } from '../store';
import { cardColor, cardText, fonts, shellType as type, useColors } from '../theme';
import { GameSymbol, Icon, Press, TextAction, useCountdown } from '../ui';

const frontDrop = 9;
const headerHeight = 88;

/** The once-a-second clock must not re-render the deck in the middle of a throw. */
function HomeCountdown() {
  const countdown = useCountdown();
  const colors = useColors();
  return <Text style={[type.caption, styles.countdown, { color: colors.muted }]} accessibilityLabel={`New games in ${countdown}`}>New in {countdown}</Text>;
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStack>>();
  const arcade = useArcade();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const window = useWindowDimensions();
  const day = arcade.today;
  const usable = window.height - insets.top - insets.bottom;
  const listOnly = window.fontScale >= 1.35 || usable < 600;
  const open = useCallback((kind: GameKind) => navigation.navigate('Game', { kind, day }), [navigation, day]);

  const stackHeight = Math.max(300, usable - 206);
  const layout = useMemo<DeckLayout>(() => {
    const cardHeight = Math.min(352, stackHeight - 32 * (deckCount - 1) - frontDrop - 14);
    const band = Math.min(44, (stackHeight - cardHeight - frontDrop - 14) / (deckCount - 1));
    return {
      // A full screen's height clears the edge from the front slot whichever way the leaf is thrown.
      reach: usable, band, frontDrop, cardHeight,
      cardWidth: Math.min(window.width - 44, 390), flat: reduced,
    };
  }, [stackHeight, usable, window.width, reduced]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={[styles.header, listOnly && styles.listHeader]}>
        <View>
          <Text style={[styles.mark, { color: colors.ink }]} accessibilityRole="header" allowFontScaling={false}>Daisy</Text>
          {window.fontScale < 1.35 && <Text style={[type.subheadline, styles.tagline, { color: colors.ink }]}>Your daily brain break.</Text>}
        </View>
        <View style={styles.tally}>
          <View style={styles.tallyDots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {gameKinds.map((kind) => (
              <View key={kind} style={[styles.tallyDot, { backgroundColor: cardColor(kind), opacity: arcade.progress(kind, day).completed ? 1 : 0.3 }]} />
            ))}
          </View>
          <Text accessibilityLabel={`${arcade.completedCount(day)} of ${gameKinds.length} games completed today`} style={[type.subheadline, styles.count, { color: colors.ink }]}>{arcade.completedCount(day)} of {gameKinds.length}</Text>
          <HomeCountdown />
        </View>
      </View>

      {arcade.persistenceError && (
        <View style={[styles.banner, { backgroundColor: colors.surface }]}>
          <Text style={[type.callout, { color: colors.ink }]}>{arcade.persistenceError}</Text>
          <View style={styles.bannerActions}>
            <TextAction title="Retry" onPress={arcade.retry} />
            {arcade.recoverableLoadError && (
              <TextAction
                title="Back up and start again"
                onPress={() => Alert.alert('Keep a backup of the old save and start again?', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Back up and start again', onPress: () => void arcade.backupAndReset() },
                ])}
              />
            )}
          </View>
        </View>
      )}

      {listOnly ? (
        <ScrollView contentContainerStyle={styles.list}>
          {gameKinds.map((kind) => (
            <Press key={kind} onPress={() => open(kind)} scale={0.98} style={[styles.row, { backgroundColor: cardColor(kind) }]} accessibilityLabel={`${games[kind].title}, ${arcade.status(kind, day)}`}>
              <GameSymbol kind={kind} size={22} color={cardText(kind)} />
              <View style={styles.rowText}>
                <Text style={[type.headline, styles.gameName, { color: cardText(kind) }]}>{games[kind].title}</Text>
                <Text style={[type.callout, { color: cardText(kind) }]}>{arcade.status(kind, day)}</Text>
              </View>
              <Icon name="chevron.right" size={16} color={cardText(kind)} fallback="›" />
            </Press>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.deck}>
          <FoldDeck day={day} layout={layout} height={stackHeight} play={open} />
        </View>
      )}
      <View style={styles.spacer} />
      <View style={styles.footer}>
        {window.fontScale < 1.35 && <Text style={[type.footnote, styles.hint, { color: colors.muted }]}>Swipe to unfold. Tap to play.</Text>}
        <Press onPress={() => navigation.navigate('Collection')} scale={0.94} accessibilityLabel="Open collection" style={styles.circleWrap}>
          <View style={styles.circleRim} />
          <View style={styles.circle}><Icon name="square.3.layers.3d" size={26} color="#FFFFFF" fallback="≡" /></View>
        </Press>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 22, height: headerHeight },
  listHeader: { height: 'auto', minHeight: headerHeight, paddingBottom: 16 },
  mark: { fontFamily: fonts.editorial, fontSize: 50, lineHeight: 62, fontWeight: '700', letterSpacing: -0.5 },
  gameName: { fontFamily: fonts.editorial, fontWeight: '600', fontSize: 20 },
  tagline: { fontWeight: '700', marginTop: 1 },
  tally: { alignItems: 'flex-end', gap: 7, paddingTop: 12 },
  tallyDots: { flexDirection: 'row', gap: 6 },
  tallyDot: { width: 10, height: 10, borderRadius: 5 },
  count: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  countdown: { fontWeight: '600', fontVariant: ['tabular-nums'], marginTop: -4 },
  banner: { padding: 16, gap: 4 },
  bannerActions: { flexDirection: 'row', gap: 20 },
  deck: { marginTop: 12, zIndex: 1 },
  list: { paddingHorizontal: 22, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderRadius: 18, borderCurve: 'continuous' },
  rowText: { flex: 1 },
  spacer: { flex: 1, minHeight: 4 },
  footer: { alignItems: 'center', gap: 7, paddingBottom: 9 },
  hint: { fontWeight: '600' },
  circleWrap: { width: 62, height: 67 },
  circleRim: { position: 'absolute', top: 5, width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgb(20,120,230)' },
  circle: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgb(9,36,79)' },
});
