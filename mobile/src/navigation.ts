import { GameKind } from './core/engine';

export type RootStack = {
  Home: undefined;
  Game: { kind: GameKind; day: number };
  Rules: { kind: GameKind };
  Collection: { section?: number } | undefined;
};
