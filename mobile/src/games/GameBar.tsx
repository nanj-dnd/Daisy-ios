import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameKind, dateLabel, games } from '../core/engine';
import { RootStack } from '../navigation';
import { fonts, useGameLook } from '../theme';
import { Icon } from '../ui';

/** The strip above each board, drawn the way the original game draws its own. */
export function GameBar({ kind, day, right }: { kind: GameKind; day: number; right?: ReactNode }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStack>>();
  const look = useGameLook(kind);
  const insets = useSafeAreaInsets();
  const title = games[kind].title;
  const help = () => navigation.navigate('Rules', { kind });
  const backLabel = { accessibilityRole: 'button', accessibilityLabel: 'Back' } as const;
  const helpLabel = { accessibilityRole: 'button', accessibilityLabel: `How to play ${title}` } as const;

  if (kind === 'estimation') {
    return (
      <View style={[styles.bar, styles.padded, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={navigation.goBack} {...backLabel} style={[styles.round, { backgroundColor: '#FFFFFF' }]}><Icon name="chevron.left" size={18} color={look.ink} fallback="‹" /></Pressable>
        <Pressable onPress={help} {...helpLabel} style={[styles.round, { backgroundColor: look.action }]}><Icon name="questionmark" size={18} color="#FFFFFF" fallback="?" /></Pressable>
      </View>
    );
  }
  if (kind === 'cryptic') {
    return (
      <View style={[styles.bar, styles.padded, { paddingTop: insets.top + 2 }]}>
        <Pressable onPress={navigation.goBack} {...backLabel} style={styles.icon}><Icon name="arrow.left" size={24} color={look.ink} fallback="←" /></Pressable>
        <View style={styles.dated}>
          <Text style={[styles.mulishBold, { color: look.ink }]}>{dateLabel(day)}</Text>
          <Text style={[styles.mulishSmall, { color: look.ink }]}>{title}</Text>
        </View>
        <Pressable onPress={help} {...helpLabel} style={styles.icon}><Icon name="info.circle" size={25} color={look.ink} fallback="i" weight="medium" /></Pressable>
      </View>
    );
  }
  if (kind === 'sudoku') {
    return (
      <View style={[styles.bar, styles.padded, { paddingTop: insets.top + 2, backgroundColor: look.panel }]}>
        <Pressable onPress={navigation.goBack} {...backLabel} style={styles.icon}><Icon name="arrow.left" size={20} color={look.muted} fallback="←" weight="regular" /></Pressable>
        <Text style={[styles.titleSmall, styles.grow, { color: look.ink }]}>{title}</Text>
        {right}
        <Pressable onPress={help} {...helpLabel} style={styles.icon}><Icon name="questionmark.circle" size={21} color={look.muted} fallback="?" weight="regular" /></Pressable>
      </View>
    );
  }
  if (kind === 'globle') {
    return (
      <View style={[styles.bar, styles.padded, { paddingTop: insets.top + 2 }]}>
        <Pressable onPress={navigation.goBack} {...backLabel} style={styles.icon}><Icon name="arrow.left" size={20} color={look.ink} fallback="←" weight="regular" /></Pressable>
        <View style={[styles.centre, styles.ruled, { borderBottomColor: look.line }]}>
          <Text accessibilityRole="header" accessibilityLabel={title} style={[styles.wordmark, { color: look.ink }]}>{title.toUpperCase()}</Text>
        </View>
        <Pressable onPress={help} {...helpLabel} style={styles.icon}><Icon name="questionmark.circle" size={22} color={look.ink} fallback="?" weight="regular" /></Pressable>
      </View>
    );
  }
  // Wordle, Connections and Zip centre their name between the back arrow and the help button.
  const serif = kind !== 'zip';
  return (
    <View style={[styles.bar, styles.padded, { paddingTop: insets.top + 2 }, kind === 'word' && { borderBottomWidth: 1, borderBottomColor: look.line }]}>
      <Pressable onPress={navigation.goBack} {...backLabel} style={styles.icon}><Icon name="arrow.left" size={20} color={look.ink} fallback="←" weight="regular" /></Pressable>
      <Text numberOfLines={1} accessibilityRole="header" style={[serif ? styles.serif : styles.titleSmall, styles.centre, { color: look.ink }]}>{title}</Text>
      <Pressable onPress={help} {...helpLabel} style={styles.icon}><Icon name="questionmark.circle" size={22} color={look.ink} fallback="?" weight="regular" /></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 },
  padded: { paddingHorizontal: 12 },
  round: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000000', shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dated: { flex: 1, marginLeft: 6 },
  grow: { flex: 1 },
  centre: { flex: 1, textAlign: 'center' },
  mulishBold: { fontFamily: fonts.mulishBold, fontSize: 16 },
  mulishSmall: { fontFamily: fonts.mulish, fontSize: 12 },
  serif: { fontFamily: fonts.serif, fontSize: 30, fontWeight: '700', letterSpacing: -0.6 },
  titleSmall: { fontSize: 19, fontWeight: '700' },
  ruled: { borderBottomWidth: 1, alignItems: 'center', paddingBottom: 2 },
  wordmark: { fontFamily: fonts.montserrat, fontSize: 30, letterSpacing: 1.5 },
});
