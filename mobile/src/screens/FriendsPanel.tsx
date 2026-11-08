import { ReactNode, useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { gameKinds, games } from '../core/engine';
import { dailyTable, rankGame } from '../social/standings';
import { useSocial } from '../social/store';
import { useArcade } from '../store';
import { cardColor, fonts, shellType as type, useColors } from '../theme';
import { ActionButton, FeedbackLine, GameSymbol, InputField, TextAction } from '../ui';

function Group({ header, footer, children }: { header?: string; footer?: string; children: ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      {header !== undefined && <Text style={[type.subheadline, styles.header, { color: colors.muted }]}>{header}</Text>}
      <View style={[styles.group, { backgroundColor: colors.sheetRow }]}>{children}</View>
      {footer !== undefined && <Text style={[type.footnote, styles.footer, { color: colors.muted }]}>{footer}</Text>}
    </View>
  );
}

function SignIn() {
  const social = useSocial();
  const colors = useColors();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const send = async () => {
    setBusy(true); setError('');
    const failed = await social.sendCode(email);
    setBusy(false);
    if (failed) setError(failed); else setSent(true);
  };
  const verify = async () => {
    setBusy(true); setError('');
    const failed = await social.verifyCode(email, code);
    setBusy(false);
    if (failed) setError(failed);
  };
  return (
    <Group header="Compete with friends" footer="Your games still work without an account. An account only shares your daily results with friends you add.">
      <View style={styles.form}>
        <Text style={[type.body, { color: colors.ink }]}>{sent ? `We sent a code to ${email.trim()}.` : 'Sign in or create an account with your email. No password needed.'}</Text>
        {sent ? (
          <>
            <InputField title="Code from the email" value={code} onChangeText={setCode} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" />
            <ActionButton title={busy ? 'Checking…' : 'Sign in'} disabled={busy || code.trim().length < 6} onPress={() => void verify()} />
            <TextAction title="Use a different email" onPress={() => { setSent(false); setCode(''); setError(''); }} />
          </>
        ) : (
          <>
            <InputField title="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" textContentType="emailAddress" autoComplete="email" />
            <ActionButton title={busy ? 'Sending…' : 'Send code'} disabled={busy || !/.+@.+\..+/.test(email.trim())} onPress={() => void send()} />
          </>
        )}
        <FeedbackLine text={error} />
      </View>
    </Group>
  );
}

function NamePicker() {
  const social = useSocial();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const valid = name.trim().length >= 2 && name.trim().length <= 24;
  return (
    <Group header="Pick a name" footer="Friends see this next to your results.">
      <View style={styles.form}>
        <InputField title="Your name" value={name} onChangeText={setName} maxLength={24} autoCapitalize="words" textContentType="nickname" />
        <ActionButton title="Continue" disabled={!valid} onPress={() => void social.saveName(name).then((failed) => setError(failed ?? ''))} />
        <FeedbackLine text={error} />
      </View>
    </Group>
  );
}

function Board() {
  const social = useSocial();
  const arcade = useArcade();
  const colors = useColors();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const me = social.profile!;
  const day = arcade.today;
  useEffect(() => { void social.refresh(day); }, [day, social]);
  const names = Object.fromEntries([me, ...social.friends].map((person) => [person.id, person.id === me.id ? 'You' : person.name]));
  const table = dailyTable(social.results, names);
  const played = gameKinds.filter((kind) => social.results.some((result) => result.game === kind));
  const separator = { borderBottomColor: `${colors.muted}33`, borderBottomWidth: StyleSheet.hairlineWidth };
  const add = async () => {
    setError('');
    const failed = await social.addFriend(code);
    if (failed) setError(failed); else setCode('');
  };
  const remove = (id: string, name: string) => Alert.alert(`Remove ${name}?`, 'You will stop seeing each other’s results.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => void social.removeFriend(id) },
  ]);
  const deleteAccount = () => Alert.alert('Delete your account?', 'This removes your name, friends and posted results for good. Your games on this device stay.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete account', style: 'destructive', onPress: () => void social.deleteAccount() },
  ]);
  return (
    <>
      <Group header="Today" footer={social.friends.length === 0 ? 'Add a friend to start a table.' : 'A win is the best result in a game at least two of you played.'}>
        {table.map((row, index) => (
          <View key={row.userId} style={[styles.row, index < table.length - 1 && separator]} accessible accessibilityLabel={`${row.rank}, ${row.name}, ${row.wins} wins, ${row.played} played`}>
            <Text style={[type.headline, styles.rank, { color: colors.muted }]}>{row.rank}</Text>
            <Text numberOfLines={1} style={[type.headline, styles.name, { color: colors.ink }]}>{row.name}</Text>
            <Text style={[type.subheadline, { color: colors.muted }]}>{row.played}/{gameKinds.length}</Text>
            <Text style={[type.headline, styles.wins, { color: colors.ink }]}>{row.wins} {row.wins === 1 ? 'win' : 'wins'}</Text>
          </View>
        ))}
      </Group>
      {played.map((kind) => {
        const ranked = rankGame(social.results, names, kind);
        return (
          <Group key={kind}>
            <View style={[styles.row, separator]}>
              <GameSymbol kind={kind} size={19} color={cardColor(kind)} />
              <Text style={[type.headline, { color: colors.ink }]}>{games[kind].title}</Text>
            </View>
            {ranked.map((entry, index) => (
              <View key={entry.userId} style={[styles.row, index < ranked.length - 1 && separator]}>
                <Text style={[type.callout, styles.rank, { color: colors.muted }]}>{entry.rank}</Text>
                <Text numberOfLines={1} style={[type.callout, styles.name, { color: colors.ink }]}>{entry.name}</Text>
                <Text style={[type.callout, { color: colors.ink, fontVariant: ['tabular-nums'] }]}>{entry.label}</Text>
              </View>
            ))}
          </Group>
        );
      })}
      <Group header="Your friend code" footer="Friends add you with this. Nobody can find you any other way.">
        <View style={styles.form}>
          <Text selectable style={[styles.code, { color: colors.ink }]}>{me.friend_code}</Text>
          <ActionButton title="Share code" onPress={() => void Share.share({ message: `Play the daily games with me on X. My friend code is ${me.friend_code}.` })} />
        </View>
      </Group>
      <Group header="Add a friend">
        <View style={styles.form}>
          <InputField title="Friend code" value={code} onChangeText={setCode} autoCapitalize="characters" maxLength={8} />
          <ActionButton title="Add friend" disabled={code.trim().length !== 8} onPress={() => void add()} />
          <FeedbackLine text={error} />
        </View>
      </Group>
      {social.friends.length > 0 && (
        <Group header="Friends">
          {social.friends.map((friend, index) => (
            <View key={friend.id} style={[styles.row, index < social.friends.length - 1 && separator]}>
              <Text numberOfLines={1} style={[type.body, styles.name, { color: colors.ink }]}>{friend.name}</Text>
              <TextAction title="Remove" size="subheadline" onPress={() => remove(friend.id, friend.name)} />
            </View>
          ))}
        </Group>
      )}
      <Group header={me.name}>
        <Pressable onPress={() => void social.signOut()} accessibilityRole="button" style={[styles.row, separator]}><Text style={[type.body, { color: colors.tint }]}>Sign out</Text></Pressable>
        <Pressable onPress={deleteAccount} accessibilityRole="button" style={styles.row}><Text style={[type.body, { color: '#D92D20' }]}>Delete account</Text></Pressable>
      </Group>
    </>
  );
}

export function FriendsPanel() {
  const social = useSocial();
  const colors = useColors();
  if (!social.available) {
    return (
      <Group header="Compete with friends" footer="Results stay on this device until accounts are set up.">
        <View style={styles.form}><Text style={[type.body, { color: colors.ink }]}>Accounts aren’t switched on in this build yet.</Text></View>
      </Group>
    );
  }
  if (!social.session) return <SignIn />;
  if (!social.profile) return social.loaded ? <NamePicker /> : null;
  return <Board />;
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  header: { paddingHorizontal: 16, fontFamily: fonts.editorial, fontSize: 20, fontWeight: '600' },
  footer: { paddingHorizontal: 16 },
  group: { borderRadius: 16, borderCurve: 'continuous', overflow: 'hidden' },
  form: { padding: 16, gap: 12 },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  rank: { width: 20 },
  name: { flex: 1 },
  wins: { minWidth: 58, textAlign: 'right' },
  code: { fontSize: 32, fontWeight: '800', letterSpacing: 4, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
