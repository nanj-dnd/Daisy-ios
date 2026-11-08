import type { GameProgress } from './engine';

/** Accumulated play time. Legacy completed results retain their original wall-clock duration. */
export function elapsedSeconds(state: GameProgress, now = Date.now()) {
  if (!state.timer) return Math.max(0, ((state.completedAt ?? now) - (state.startedAt ?? now)) / 1000);
  const live = !state.completed && state.timer.runningSince !== null ? Math.max(0, now - state.timer.runningSince) : 0;
  return (state.timer.elapsedMs + live) / 1000;
}

export function initializeZipTimer(state: GameProgress, now = Date.now()) {
  if (state.timer) return;
  const played = state.completed || (state.path?.length ?? 0) > 0 || state.hints > 0;
  // Merely opening an older untouched grid never constituted play. Keep genuine old results.
  const elapsedMs = played ? elapsedSeconds(state, now) * 1000 : 0;
  state.timer = { elapsedMs, started: played, runningSince: null };
}
export function resumeZipTimer(state: GameProgress, now = Date.now()) {
  if (state.completed) return;
  initializeZipTimer(state, now);
  if (state.timer!.started && state.timer!.runningSince === null) state.timer!.runningSince = now;
}
export function startZipTimer(state: GameProgress, now = Date.now()) {
  if (state.completed) return;
  initializeZipTimer(state, now);
  state.timer!.started = true;
  resumeZipTimer(state, now);
}
export function pauseTimer(state: GameProgress, now = Date.now()) {
  if (!state.timer || state.timer.runningSince === null) return;
  state.timer.elapsedMs += Math.max(0, now - state.timer.runningSince);
  state.timer.runningSince = null;
}
export function checkpointTimer(state: GameProgress, now = Date.now()) {
  if (!state.timer || state.timer.runningSince === null) return;
  pauseTimer(state, now);
  state.timer.runningSince = now;
}
/** A persisted running timestamp belongs to a previous process, never to an offline interval. */
export function restoreTimer(state: GameProgress) {
  if (state.timer) state.timer.runningSince = null;
}
