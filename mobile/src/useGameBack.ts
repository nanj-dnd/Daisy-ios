import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { Keyboard } from 'react-native';
import { RootStack } from './navigation';

/** The same exit behavior for every game, including a direct entry without a back stack. */
export function useGameBack() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStack>>();
  return useCallback(() => {
    Keyboard.dismiss();
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Home');
  }, [navigation]);
}
