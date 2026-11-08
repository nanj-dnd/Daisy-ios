import { Caveat_700Bold } from '@expo-google-fonts/caveat/700Bold';
import { Montserrat_300Light } from '@expo-google-fonts/montserrat/300Light';
import { Mulish_400Regular } from '@expo-google-fonts/mulish/400Regular';
import { Mulish_700Bold } from '@expo-google-fonts/mulish/700Bold';
import { Sansita_800ExtraBold_Italic } from '@expo-google-fonts/sansita/800ExtraBold_Italic';
import { VT323_400Regular } from '@expo-google-fonts/vt323/400Regular';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { AppState, Pressable, StyleSheet, Text, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootStack } from './src/navigation';
import { reviewLinks } from './src/reviewLinks';
import { CollectionScreen } from './src/screens/CollectionScreen';
import { GameScreen } from './src/screens/GameScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { RulesScreen } from './src/screens/RulesScreen';
import { social } from './src/social/store';
import { store } from './src/store';
import { fonts, shellType as type, useColors } from './src/theme';

const Stack = createNativeStackNavigator<RootStack>();

export default function App() {
  // Only readiness: rebuilding the navigator on every store update re-creates the native header, which cancels touches.
  const ready = useSyncExternalStore(store.subscribe, () => store.ready);
  const [fontsLoaded, fontError] = useFonts({
    VT323_400Regular, Caveat_700Bold, Sansita_800ExtraBold_Italic, Mulish_400Regular, Mulish_700Bold, Montserrat_300Light,
    DaisyEditorial: require('./assets/fonts/Fraunces-Soft.ttf'),
    DaisySans: require('./assets/fonts/DM-Sans.ttf'),
  });
  const colors = useColors();
  const scheme = useColorScheme();

  useEffect(() => {
    void store.load();
    const timer = setInterval(() => store.refreshDay(), 15_000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') store.refreshDay(); });
    store.onFinished = social.post;
    const stopSocial = social.start();
    return () => { clearInterval(timer); subscription.remove(); stopSocial(); store.onFinished = null; };
  }, []);

  const theme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: colors.paper, card: colors.paper, text: colors.ink, primary: colors.tint } };
  }, [scheme, colors]);
  const done = (navigation: { goBack: () => void }) => () => (
    <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" style={styles.done}>
      <Text style={[type.headline, { color: colors.tint }]}>Done</Text>
    </Pressable>
  );
  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.paper }]}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        {ready && (fontsLoaded || fontError) && (
          <NavigationContainer theme={theme} linking={reviewLinks}>
            <Stack.Navigator screenOptions={{ headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal', headerTintColor: colors.ink }}>
              <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Game" component={GameScreen} options={{ headerShown: false, gestureEnabled: true }} />
              <Stack.Screen name="Rules" component={RulesScreen} options={({ navigation }) => ({ presentation: 'modal', title: 'How to play', headerRight: done(navigation) })} />
              <Stack.Screen name="Collection" component={CollectionScreen} options={({ navigation }) => ({ presentation: 'modal', title: 'Your collection', headerTitleStyle: { fontFamily: fonts.editorial, fontSize: 20, fontWeight: '600' }, headerRight: done(navigation) })} />
            </Stack.Navigator>
          </NavigationContainer>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  done: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
});
