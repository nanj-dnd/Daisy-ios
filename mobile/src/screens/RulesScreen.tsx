import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { games } from '../core/engine';
import { RootStack } from '../navigation';
import { cardColor, type, useColors } from '../theme';
import { GameSymbol } from '../ui';

export function RulesScreen({ route }: NativeStackScreenProps<RootStack, 'Rules'>) {
  const { kind } = route.params;
  const colors = useColors();
  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={styles.content}>
      <GameSymbol kind={kind} size={34} color={cardColor(kind)} />
      <Text style={[type.display, { color: colors.ink }]}>{games[kind].title}</Text>
      <Text style={[type.body, { color: colors.ink }]}>{games[kind].rules}</Text>
      <Text style={[type.callout, { color: colors.muted }]}>New puzzles arrive at midnight UTC. Progress is saved on this device as you play.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: 24, gap: 24 } });
