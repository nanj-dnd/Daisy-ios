import { Platform, TextStyle, useColorScheme } from 'react-native';
import { GameKind } from './core/engine';

const light = {
  paper: '#EFF7FF', ink: '#102951', muted: '#4B6081', surface: '#DDEBFA', tint: '#135CA9', sheetRow: '#FFFFFF',
  solved: ['#E2E9F6', '#D8E9F7', '#DFECFA', '#DFE9F6'],
};
const dark: typeof light = {
  paper: '#0D1D30', ink: '#F1F6FF', muted: '#B4C6DC', surface: '#1B3149', tint: '#9ED5FF', sheetRow: '#1B3149',
  solved: ['#243752', '#183553', '#163258', '#1B3051'],
};
export type Palette = typeof light;
export const useColors = () => (useColorScheme() === 'dark' ? dark : light);

const navy = '#0A214A';
const channels: Record<GameKind, [number, number, number]> = {
  trivia: [0.035, 0.43, 0.83], estimation: [0.37, 0.86, 0.66], cryptic: [1, 0.83, 0.3],
  word: [0.68, 0.53, 0.98], groups: [1, 0.43, 0.47], sudoku: [0.64, 0.75, 0.9], zip: [0.96, 0.55, 0.26], globle: [0.55, 0.8, 0.3],
};
const css = (values: number[]) => `rgb(${values.map((value) => Math.round(Math.max(0, value) * 255)).join(',')})`;
export const cardColor = (kind: GameKind) => css(channels[kind]);
/** The leaf's lower edge: the same fill, darkened. */
export const cardRim = (kind: GameKind) => css(channels[kind].map((value) => value - 0.16));
export const cardText = (kind: GameKind) => (kind === 'trivia' ? '#FFFFFF' : navy);
export const cardNavy = navy;


export const fonts = {
  editorial: 'DaisyEditorial', sans: 'DaisySans',
  pixel: 'VT323_400Regular', hand: 'Caveat_700Bold', chunky: 'Sansita_800ExtraBold_Italic', mulish: 'Mulish_400Regular', mulishBold: 'Mulish_700Bold', montserrat: 'Montserrat_300Light',
  serif: Platform.select({ ios: 'Georgia', default: 'serif' }), plain: Platform.select({ ios: 'Helvetica Neue', default: 'sans-serif' }),
};

export type GameLook = { page: string; ink: string; muted: string; panel: string; action: string; actionInk: string; line: string; status: 'light' | 'dark' };
const newsprint: GameLook = { page: '#FFFFFF', ink: '#1A1A1B', muted: '#5A594E', panel: '#EFEFE6', action: '#1A1A1B', actionInk: '#FFFFFF', line: '#D3D6DA', status: 'dark' };
const newsprintDark: GameLook = { page: '#121213', ink: '#F8F8F8', muted: '#B5B5AC', panel: '#2B2B2D', action: '#F8F8F8', actionInk: '#121213', line: '#3A3A3C', status: 'light' };
const professional: GameLook = { page: '#F4F2EE', ink: '#1A1A1A', muted: '#666666', panel: '#FFFFFF', action: '#1A1A1A', actionInk: '#FFFFFF', line: '#D6D3CD', status: 'dark' };
const professionalDark: GameLook = { page: '#1B1F23', ink: '#F0F2F4', muted: '#A7ADB3', panel: '#272C31', action: '#F0F2F4', actionInk: '#1B1F23', line: '#3E454B', status: 'light' };
/** Each game keeps the look of the original. Krillion, Fermi, Minute Cryptic and Globle have one appearance, as they do at the source. */
export function useGameLook(kind: GameKind): GameLook {
  const dark = useColorScheme() === 'dark';
  switch (kind) {
    case 'trivia': return { page: '#050A14', ink: '#E8F1FF', muted: '#7D93B8', panel: '#101D33', action: '#4DE3FF', actionInk: '#050A14', line: '#1F3350', status: 'light' };
    case 'estimation': return { page: '#E9E6DE', ink: '#1A1F2B', muted: '#5C5F66', panel: '#FFFFFF', action: '#C84328', actionInk: '#FFFFFF', line: '#D5D1C7', status: 'dark' };
    case 'cryptic': return { page: '#ADD3FF', ink: '#000000', muted: '#26384F', panel: '#FFFFFF', action: '#FFF2B1', actionInk: '#000000', line: '#000000', status: 'dark' };
    case 'word': case 'groups': return dark ? newsprintDark : newsprint;
    case 'sudoku': return dark ? professionalDark : professional;
    case 'zip': return dark ? professionalDark : { ...professional, page: '#F9FAFE' };
    case 'globle': return { page: '#CFE8F4', ink: '#111111', muted: '#4C5866', panel: '#FFFFFF', action: '#2F4BE2', actionInk: '#FFFFFF', line: '#111111', status: 'dark' };
  }
}

export const rounded: TextStyle = Platform.select({ ios: { fontFamily: 'ui-rounded' }, default: {} });
export const type = {
  display: { ...rounded, fontSize: 34, fontWeight: '800' },
  title: { ...rounded, fontSize: 28, fontWeight: '800' },
  question: { ...rounded, fontSize: 22, lineHeight: 30, fontWeight: '700' },
  subtitle: { ...rounded, fontSize: 20, fontWeight: '800' },
  headline: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 25 },
  callout: { fontSize: 16, lineHeight: 22 },
  subheadline: { fontSize: 15 },
  footnote: { fontSize: 13 },
  caption: { fontSize: 12 },
} satisfies Record<string, TextStyle>;

/** Daisy's home/collection voice. Game screens retain their own established type. */
export const shellType = {
  display: { ...type.display, fontFamily: fonts.editorial, fontWeight: '700' },
  title: { ...type.title, fontFamily: fonts.editorial, fontWeight: '700' },
  question: { ...type.question, fontFamily: fonts.sans },
  subtitle: { ...type.subtitle, fontFamily: fonts.sans, fontWeight: '700' },
  headline: { ...type.headline, fontFamily: fonts.sans },
  body: { ...type.body, fontFamily: fonts.sans },
  callout: { ...type.callout, fontFamily: fonts.sans },
  subheadline: { ...type.subheadline, fontFamily: fonts.sans },
  footnote: { ...type.footnote, fontFamily: fonts.sans },
  caption: { ...type.caption, fontFamily: fonts.sans },
} satisfies Record<string, TextStyle>;

export const springs = {
  press: { stiffness: 820, damping: 40, mass: 1 },
  step: { stiffness: 224, damping: 26, mass: 1 },
};

/** One clock for tile faces, keyboard feedback and the result that follows them. */
export const wordMotion = { flip: 360, stagger: 120, reveal: 840, celebration: 620 };
