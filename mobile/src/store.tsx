import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import {
  GameKind, GameProgress, SaveData, SudokuPuzzle, bestStreak, currentStreak, dayOf, finishGame, gameKinds, games, isValidSave, makeSudoku, newProgress,
  playedOnDays, saveKey,
} from './core/engine';
import { allowedWords } from './core/words';
import content from './core/content.json';

const storageKey = 'progress';

class ArcadeStore {
  save: SaveData = { schemaVersion: 1, games: {} };
  today = dayOf();
  ready = false;
  persistenceError: string | null = null;
  recoverableLoadError = false;
  private version = 0;
  private listeners = new Set<() => void>();
  private sudokuCache = new Map<number, SudokuPuzzle>();
  private dictionary: Set<string> | null = null;
  /** Called once when a game finishes, so results can reach friends without the store knowing about accounts. */
  onFinished: ((kind: GameKind, day: number, progress: GameProgress) => void) | null = null;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  getVersion = () => this.version;
  private changed() {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }

  load = async () => {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        if (!isValidSave(parsed)) throw new Error('corrupt');
        this.save = parsed;
      }
      this.recoverableLoadError = false; this.persistenceError = null;
    } catch {
      this.recoverableLoadError = true;
      this.persistenceError = 'Your saved progress could not be read. It has been kept on this device. You can retry loading it or save a backup and start again.';
    }
    this.ready = true;
    this.changed();
  };
  retry = () => {
    if (this.recoverableLoadError) void this.load();
    else void this.persist();
  };
  backupAndReset = async () => {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw !== null) await AsyncStorage.setItem(`progress-backup-${Date.now()}`, raw);
      this.save = { schemaVersion: 1, games: {} };
      await AsyncStorage.setItem(storageKey, JSON.stringify(this.save));
      this.recoverableLoadError = false; this.persistenceError = null;
    } catch {
      this.persistenceError = 'A backup could not be saved. Your original data has been kept. Free up storage and try again.';
    }
    this.changed();
  };
  private async persist() {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(this.save));
      if (this.persistenceError) { this.persistenceError = null; this.changed(); }
    } catch {
      this.persistenceError = 'Progress could not be saved. Free up storage and tap Retry. Your current game is still in memory.';
      this.changed();
    }
  }

  refreshDay = (now = Date.now()) => {
    const day = dayOf(now);
    if (day !== this.today) { this.today = day; this.changed(); }
  };
  progress = (kind: GameKind, day: number): GameProgress => this.save.games[saveKey(kind, day)] ?? newProgress();
  update = (kind: GameKind, day: number, change: (progress: GameProgress) => void) => {
    if (this.recoverableLoadError) return;
    const before = this.progress(kind, day);
    const next: GameProgress = JSON.parse(JSON.stringify(before));
    change(next);
    // Rejected board gestures and duplicate taps should not redraw every screen or write a save.
    if (JSON.stringify(before) === JSON.stringify(next)) return;
    this.save = { ...this.save, games: { ...this.save.games, [saveKey(kind, day)]: next } };
    this.changed();
    void this.persist();
    if (next.completed && !before.completed) this.onFinished?.(kind, day, next);
  };
  start = (kind: GameKind, day: number) => {
    if (this.progress(kind, day).started) return;
    this.update(kind, day, (progress) => { progress.started = true; progress.startedAt = Date.now(); });
  };
  finish = (progress: GameProgress, won: boolean) => finishGame(progress, won);
  isWord = (value: string) => {
    // Built on first use so a cold start never pays for 8,500 words.
    this.dictionary ??= new Set([...allowedWords.split(' '), ...content.wordAnswers]);
    return this.dictionary.has(value);
  };
  sudoku = (day: number) => {
    let puzzle = this.sudokuCache.get(day);
    if (!puzzle) { puzzle = makeSudoku(day); this.sudokuCache.set(day, puzzle); }
    return puzzle;
  };
  completedCount = (day: number) => gameKinds.filter((kind) => this.progress(kind, day).completed).length;
  get playedDays() { return playedOnDays(this.save); }
  get streak() { return currentStreak(this.playedDays, this.today); }
  get longestStreak() { return bestStreak(this.playedDays); }
  get totalCompleted() { return Object.values(this.save.games).filter((game) => game.completed).length; }
  status = (kind: GameKind, day: number) => {
    const state = this.progress(kind, day);
    if (state.completed) return state.won ? 'Solved' : 'Finished';
    return state.started ? 'Continue' : games[kind].duration;
  };
}

export const store = new ArcadeStore();

export function useArcade() {
  useSyncExternalStore(store.subscribe, store.getVersion);
  return store;
}
