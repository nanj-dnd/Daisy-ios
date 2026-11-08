import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceTrivia, beginTrivia, clockLabel, finishGame, groupsFor, isValidSave, letterMarks, makeSudoku, makeZip, newProgress, resultScore, shareText, submitTrivia, sudokuPeers, triviaFor, zipCanStep, zipComplete } from '../src/core/engine';
import { checkpointTimer, elapsedSeconds, initializeZipTimer, pauseTimer, restoreTimer, resumeZipTimer, startZipTimer } from '../src/core/timer';
import { borderDistance, countries, findCountry, globleAnswer } from '../src/core/globle';
import { checkCryptic, crypticHint, evaluateCalculator, lockEstimate, moveZip, nextEstimate, shuffledWords, submitConnections, writeSudoku } from '../src/core/play';

const day = 20_765;

test('calculator respects precedence, signed operands and decimals', () => {
  for (const [expression, expected] of [['2+3×4', 14], ['12÷3×2', 8], ['8-3-2', 3], ['-2×3+10', 4], ['2×-3', -6], ['.5+.25', .75], ['0.1+0.2', .3], ['10.', 10]] as const) assert.equal(evaluateCalculator(expression), expected, expression);
});
test('calculator refuses incomplete or malformed expressions and non-finite results', () => {
  for (const expression of ['', '2×', '1..2', '1 2', '2÷0', '2××3', '.', 'hello', '1e3', '2+']) {
    assert.equal(evaluateCalculator(expression), null, expression);
  }
});
test('Fermi double taps cannot duplicate a guess or skip a question', () => {
  const state = newProgress();
  state.pendingAnswer = '1,250';
  assert.equal(lockEstimate(state), true);
  state.pendingAnswer = '500';
  assert.equal(lockEstimate(state), false);
  assert.deepEqual(state.values, [1250]);
  assert.equal(nextEstimate(state), true);
  assert.equal(nextEstimate(state), false);
  state.pendingAnswer = '10'; assert.equal(lockEstimate(state), true);
  assert.equal(nextEstimate(state), true);
  state.pendingAnswer = '20'; assert.equal(lockEstimate(state, 1234), true);
  assert.equal(state.completedAt, 1234);
  assert.equal(state.won, true);
  assert.equal(nextEstimate(state), false);
  assert.equal(lockEstimate(state), false);
});
test('Fermi refuses zero, negative, non-finite and blank estimates', () => {
  for (const value of ['0', '-1', '', 'Infinity', '1e101']) {
    const state = newProgress(); state.pendingAnswer = value;
    assert.equal(lockEstimate(state), false);
    assert.deepEqual(state.values, []);
  }
});
test('Connections remembers failed sets regardless of selection order', () => {
  const state = newProgress(), groups = groupsFor(day);
  const words = [...groups[0].words.slice(0, 3), groups[1].words[0]];
  state.pendingAnswer = words.join('|');
  assert.equal(submitConnections(state, groups), 'oneAway');
  state.pendingAnswer = [...words].reverse().join('|');
  assert.equal(submitConnections(state, groups), 'duplicate');
  assert.equal(state.mistakes, 1);
  assert.equal(state.guesses.length, 1);
});
test('Connections completes only after four valid groups and shares spoiler-free attempt history', () => {
  const state = newProgress(), groups = groupsFor(day);
  state.pendingAnswer = [...groups[0].words.slice(0, 3), groups[1].words[0]].join('|');
  submitConnections(state, groups);
  for (const group of groups) {
    state.pendingAnswer = group.words.join('|');
    assert.equal(submitConnections(state, groups), 'solved');
  }
  assert.equal(state.completed, true); assert.equal(state.won, true);
  assert.equal(submitConnections(state, groups), 'finished');
  const shared = shareText('groups', day, state);
  for (const group of groups) for (const word of group.words) assert.equal(shared.includes(word), false);
  assert.equal(shared.split('\n').filter(line => /^[🟨🟩🟦🟪]+$/u.test(line)).length, 5);
  assert.equal(isValidSave({ schemaVersion: 1, games: { [`${day}:groups`]: state } }), true);
});
test('Connections ends on the fourth distinct mistake without corrupting the save', () => {
  const state = newProgress(), groups = groupsFor(day);
  for (let i = 0; i < 4; i++) {
    state.pendingAnswer = [groups[0].words[i], groups[1].words[i], groups[2].words[i], groups[3].words[i]].join('|');
    assert.equal(submitConnections(state, groups), 'incorrect');
  }
  assert.equal(state.completed, true); assert.equal(state.won, false); assert.equal(state.mistakes, 4);
});
test('shuffle preserves every word and leaves the original order untouched', () => {
  const before = ['A', 'B', 'C', 'D'];
  const result = shuffledWords(before, () => 0);
  assert.deepEqual([...result].sort(), before); assert.notDeepEqual(result, before);
  assert.deepEqual(before, ['A', 'B', 'C', 'D']);
});
test('Cryptic hints are monotonic, fill the first letter and cannot change a finished clue', () => {
  const state = newProgress();
  crypticHint(state, 'MELON', 1); assert.equal(state.hints, 1);
  state.pendingAnswer = 'LEMON';
  crypticHint(state, 'MELON', 2); assert.equal(state.pendingAnswer, 'MEMON');
  crypticHint(state, 'MELON', 1); assert.equal(state.hints, 2);
  state.pendingAnswer = 'MELON'; assert.equal(checkCryptic(state, 'MELON'), 'solved');
  const completed = structuredClone(state);
  crypticHint(state, 'MELON', 2); assert.deepEqual(state, completed);
  assert.equal(checkCryptic(state, 'MELON'), 'finished');
});
test('Cryptic checks never finish a wrong or incomplete answer', () => {
  const state = newProgress(); state.pendingAnswer = 'ME';
  assert.equal(checkCryptic(state, 'MELON'), 'incomplete');
  state.pendingAnswer = 'LEMON'; assert.equal(checkCryptic(state, 'MELON'), 'incorrect');
  assert.equal(state.completed, false);
});
test('Sudoku locks givens and notes cannot overwrite an entered digit', () => {
  const puzzle = makeSudoku(day), state = newProgress(); state.board = [...puzzle.givens];
  const given = puzzle.givens.findIndex(value => value !== 0), empty = puzzle.givens.indexOf(0);
  assert.equal(writeSudoku(state, puzzle, given, 0), false);
  assert.equal(writeSudoku(state, puzzle, empty, puzzle.solution[empty]), true);
  assert.equal(writeSudoku(state, puzzle, empty, 3, true), false);
  assert.equal(state.board[empty], puzzle.solution[empty]);
});
test('Sudoku digits and hints clear notes in rows, columns and boxes; erasing clears own notes', () => {
  const puzzle = makeSudoku(day), state = newProgress(); state.board = [...puzzle.givens];
  const index = puzzle.givens.indexOf(0), digit = puzzle.solution[index];
  for (const peer of sudokuPeers(index)) state.notes[peer] = [digit, 7 - digit].filter((value, i, all) => all.indexOf(value) === i);
  state.notes[index] = [digit];
  assert.equal(writeSudoku(state, puzzle, index, digit), true);
  assert.equal(state.notes[index], undefined);
  for (const peer of sudokuPeers(index)) assert.equal(state.notes[peer].includes(digit), false);
  assert.equal(writeSudoku(state, puzzle, index, 0), true);
  assert.equal(state.board[index], 0);
});
test('Sudoku note toggles and final digit produce a genuine solved result', () => {
  const puzzle = makeSudoku(day), state = newProgress(); state.board = [...puzzle.givens];
  const index = puzzle.givens.indexOf(0);
  writeSudoku(state, puzzle, index, 2, true); assert.deepEqual(state.notes[index], [2]);
  writeSudoku(state, puzzle, index, 2, true); assert.deepEqual(state.notes[index], []);
  for (let i = 0; i < 36; i++) if (!puzzle.givens[i]) writeSudoku(state, puzzle, i, puzzle.solution[i]);
  assert.equal(state.completed, true); assert.equal(state.won, true);
});
test('Zip rejects invalid starts, diagonals, out-of-bounds cells and an early finish', () => {
  const puzzle = { size: 3, solution: [0,1,2,5,4,3,6,7,8], marks: { 0: 1, 8: 2 } };
  assert.deepEqual(moveZip(puzzle, [], 1), []);
  assert.deepEqual(moveZip(puzzle, [0], 4), [0]);
  assert.deepEqual(moveZip(puzzle, [0], -1), [0]);
  assert.deepEqual(moveZip(puzzle, [0], 2), [0,1,2]);
  assert.equal(zipCanStep(puzzle, [0,1,2,5], 8), false);
  assert.deepEqual(moveZip(puzzle, [0,1,2,5,4], 1), [0,1]);
});
test('Zip completion rejects forged paths even if length and final number match', () => {
  const puzzle = makeZip(day);
  const forged = Array(36).fill(puzzle.solution.at(-1));
  assert.equal(zipComplete(puzzle, forged), false);
  assert.equal(zipComplete(puzzle, puzzle.solution), true);
});
test('Zip touch stepping can solve 401 daily grids and always retains a valid prefix', () => {
  for (let day = 20_527; day <= 20_927; day++) {
    const puzzle = makeZip(day);
    let path: number[] = [];
    for (const cell of puzzle.solution) path = moveZip(puzzle, path, cell);
    assert.deepEqual(path, puzzle.solution, String(day));
    assert.equal(zipComplete(puzzle, path), true);
  }
});
test('Zip result includes the 15-second penalty per hint', () => {
  const state = newProgress(); state.startedAt = 1000; state.completedAt = 61_000; state.completed = state.won = true; state.hints = 2;
  assert.equal(resultScore('zip', day, state).label, '1:30 · 2 hints');
});
test('timer format rolls into hours and never displays unbounded minutes', () => {
  for (const [seconds, label] of [[0, '0:00'], [9.9, '0:09'], [60, '1:00'], [3599, '59:59'], [3600, '1:00:00'], [34_539, '9:35:39'], [-5, '0:00'], [NaN, '0:00'], [Infinity, '0:00']] as const) assert.equal(clockLabel(seconds), label);
});
test('opening an untouched Zip grid overnight never starts its play clock', () => {
  const state = newProgress(); state.started = true; state.startedAt = 1000;
  initializeZipTimer(state, 36_001_000);
  resumeZipTimer(state, 36_001_000);
  assert.equal(elapsedSeconds(state, 36_101_000), 0);
  assert.equal(state.timer?.started, false);
});
test('Zip counts active play only, across a long pause and repeated resume calls', () => {
  const state = newProgress();
  startZipTimer(state, 1000);
  resumeZipTimer(state, 2000);
  assert.equal(elapsedSeconds(state, 6000), 5);
  pauseTimer(state, 6000);
  assert.equal(elapsedSeconds(state, 3_606_000), 5);
  resumeZipTimer(state, 3_606_000);
  assert.equal(elapsedSeconds(state, 3_613_000), 12);
  pauseTimer(state, 3_613_000);
  pauseTimer(state, 9_000_000);
  assert.equal(elapsedSeconds(state, 9_000_000), 12);
});
test('saved clock checkpoints do not count process downtime after a cold launch', () => {
  const state = newProgress(); startZipTimer(state, 1000); checkpointTimer(state, 6000);
  const restored = JSON.parse(JSON.stringify(state));
  restoreTimer(restored); resumeZipTimer(restored, 3_600_000);
  assert.equal(elapsedSeconds(restored, 3_601_000), 6);
});
test('finishing Zip freezes active time and adds each hint penalty exactly once', () => {
  const state = newProgress(); state.startedAt = 1000; state.hints = 2;
  initializeZipTimer(state, 1000); startZipTimer(state, 1000);
  finishGame(state, true, 61_000);
  assert.equal(elapsedSeconds(state, 9_000_000), 60);
  assert.equal(state.timer?.runningSince, null);
  assert.equal(resultScore('zip', day, state).label, '1:30 · 2 hints');
  resumeZipTimer(state, 9_000_000);
  assert.equal(elapsedSeconds(state, 9_000_000), 60);
});
test('resetting a Zip path preserves its started clock, while legacy completed scores remain intact', () => {
  const state = newProgress(); state.path = [1]; startZipTimer(state, 1000);
  state.path = []; pauseTimer(state, 6000); resumeZipTimer(state, 10_000);
  assert.equal(elapsedSeconds(state, 11_000), 6);
  const old = newProgress(); old.startedAt = 1000; old.completedAt = 91_000; old.completed = old.won = true;
  assert.equal(resultScore('zip', day, old).label, '1:30');
  initializeZipTimer(old, 999_000);
  assert.equal(resultScore('zip', day, old).label, '1:30');
});
test('play clock clamps backwards system-clock adjustments and rejects corrupt timer saves', () => {
  const state = newProgress(); startZipTimer(state, 10_000); pauseTimer(state, 9000);
  assert.equal(elapsedSeconds(state), 0);
  assert.equal(isValidSave({ schemaVersion: 1, games: { [`${day}:zip`]: state } }), true);
  state.timer!.elapsedMs = -1;
  assert.equal(isValidSave({ schemaVersion: 1, games: { [`${day}:zip`]: state } }), false);
});
test('Wordle repeated letters consume only the answer’s available occurrences', () => {
  assert.deepEqual(letterMarks('ARRAY', 'ABBEY'), [2,0,0,0,2]);
  assert.deepEqual(letterMarks('EERIE', 'SHEEP'), [1,1,0,0,0]);
});
test('Krillion keeps its absolute deadline and accepts only one result per prompt', () => {
  const state = newProgress(), prompts = triviaFor(day);
  beginTrivia(state, 1000);
  beginTrivia(state, 2000);
  assert.equal(state.roundDeadline, 26_000);
  assert.equal(submitTrivia(state, prompts[0], prompts[0].answers[0].name, 26_000), true);
  assert.deepEqual(state.triviaPoints, [0]);
  assert.equal(submitTrivia(state, prompts[0], 'again', 26_001), false);
  advanceTrivia(state, 27_000);
  assert.equal(state.round, 1); assert.equal(state.roundDeadline, 52_000);
});
test('Globle aliases resolve and border proximity remains symmetric', () => {
  assert.equal(countries[findCountry('usa')!].name, 'United States');
  const answer = globleAnswer(day), france = findCountry('France')!;
  assert.equal(borderDistance(france, answer), borderDistance(answer, france));
  assert.equal(borderDistance(answer, answer), 0);
});
