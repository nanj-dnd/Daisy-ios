import { CommonActions, LinkingOptions } from '@react-navigation/native';
import { dayOf } from './core/engine';
import { RootStack } from './navigation';

/** Local simulator entry points for reproducible screen reviews. Excluded from published builds. */
export const reviewLinks: LinkingOptions<RootStack> | undefined = __DEV__ ? {
  prefixes: ['exp://127.0.0.1:8081/--/', 'exp://localhost:8081/--/'],
  // Review links describe the whole stack. Navigating while Collection is open can
  // push Home into its modal, retaining the sheet and then adding Home's safe area.
  getActionFromState: state => CommonActions.reset(state),
  config: {
    initialRouteName: 'Home',
    screens: {
      Home: '',
      Game: {
        path: 'game/:kind(trivia|estimation|cryptic|word|groups|sudoku|zip|globle)/:day(\\d+)',
        parse: { day: value => Number.isSafeInteger(Number(value)) ? Number(value) : dayOf() },
      },
    },
  },
} : undefined;
