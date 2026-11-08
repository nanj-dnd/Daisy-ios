import { GameProgress, SudokuPuzzle, WordGroup, ZipPuzzle, checkGroup, finishGame, parseEstimate, sudokuComplete, sudokuPeers, zipCanStep } from './engine';

/** Complete arithmetic only. Never evaluates JavaScript or silently drops a trailing operator. */
export function evaluateCalculator(expression: string): number | null {
  if (/\d\s+\d/.test(expression)) return null;
  const text = expression.replace(/\s/g, '').replaceAll('×', '*').replaceAll('÷', '/');
  if (!text) return null;
  const tokens = text.match(/(?:\d+(?:\.\d*)?|\.\d+)|[+*/-]/g);
  if (!tokens || tokens.join('') !== text) return null;
  let cursor = 0;
  const number = (): number => {
    let sign = 1;
    if (tokens[cursor] === '-' || tokens[cursor] === '+') sign = tokens[cursor++] === '-' ? -1 : 1;
    const token = tokens[cursor++];
    return token !== undefined && /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token) ? sign * Number(token) : NaN;
  };
  const product = (): number => {
    let value = number();
    while (tokens[cursor] === '*' || tokens[cursor] === '/') {
      const op = tokens[cursor++], next = number();
      value = op === '*' ? value * next : value / next;
    }
    return value;
  };
  let result = product();
  while (cursor < tokens.length) {
    const op = tokens[cursor++];
    if (op !== '+' && op !== '-') return null;
    const next = product();
    result = op === '+' ? result + next : result - next;
  }
  return Number.isFinite(result) ? Number(result.toPrecision(12)) : null;
}

/** Reads the current draft, so two taps cannot spend two guesses or skip a question. */
export function lockEstimate(state: GameProgress, now = Date.now()) {
  const value = parseEstimate(state.pendingAnswer);
  if (state.completed || state.round > 2 || state.values.length !== state.round || value === null) return false;
  state.values.push(value);
  state.pendingAnswer = '';
  if (state.values.length === 3) finishGame(state, true, now);
  return true;
}
export function nextEstimate(state: GameProgress) {
  if (state.completed || state.round >= 2 || state.values.length !== state.round + 1) return false;
  state.round += 1;
  state.pendingAnswer = '';
  return true;
}

export function crypticHint(state: GameProgress, answer: string, level: 1 | 2) {
  if (state.completed) return;
  state.hints = Math.max(state.hints, level);
  if (level === 2) state.pendingAnswer = answer[0] + state.pendingAnswer.slice(1);
}
export function checkCryptic(state: GameProgress, answer: string) {
  if (state.completed) return 'finished';
  if (state.pendingAnswer.length !== answer.length) return 'incomplete';
  if (state.pendingAnswer !== answer) return 'incorrect';
  finishGame(state, true);
  return 'solved';
}

export function submitConnections(state: GameProgress, groups: WordGroup[], now = Date.now()) {
  if (state.completed) return 'finished';
  const selection = [...new Set(state.pendingAnswer.split('|').filter(Boolean))].sort();
  const remaining = new Set(groups.filter((_, index) => !state.solvedGroups.includes(index)).flatMap(group => group.words));
  if (selection.length !== 4 || selection.some(word => !remaining.has(word))) return 'incomplete';
  const guess = selection.join('|');
  if (state.guesses.includes(guess)) return 'duplicate';
  const verdict = checkGroup(new Set(selection), groups, state.solvedGroups);
  state.guesses.push(guess);
  if (verdict.kind === 'solved') {
    state.solvedGroups.push(verdict.index);
    state.pendingAnswer = '';
    if (state.solvedGroups.length === 4) finishGame(state, true, now);
  } else {
    state.mistakes += 1;
    if (state.mistakes === 4) { state.pendingAnswer = ''; finishGame(state, false, now); }
  }
  return verdict.kind;
}

/** Both a typed digit and a hint remove impossible peer notes. Notes never replace a filled cell. */
export function writeSudoku(state: GameProgress, puzzle: SudokuPuzzle, index: number, digit: number, notesMode = false) {
  if (state.completed || !Number.isInteger(index) || index < 0 || index >= 36 || puzzle.givens[index] !== 0 || !Number.isInteger(digit) || digit < 0 || digit > 6) return false;
  if (state.board.length === 0) state.board = [...puzzle.givens];
  if (notesMode && digit !== 0) {
    if (state.board[index] !== 0) return false;
    const notes = new Set(state.notes[index] ?? []);
    if (notes.has(digit)) notes.delete(digit); else notes.add(digit);
    state.notes[index] = [...notes].sort();
    return true;
  }
  if (state.board[index] === digit && !state.notes[index]?.length) return false;
  state.board[index] = digit;
  delete state.notes[index];
  if (digit !== 0) for (const peer of sudokuPeers(index)) {
    if (state.notes[peer]) state.notes[peer] = state.notes[peer].filter(note => note !== digit);
  }
  if (sudokuComplete(state.board)) finishGame(state, true);
  return true;
}

/** Fill skipped cells on straight swipes; never invent an L-shaped path for a diagonal touch. */
export function moveZip(puzzle: ZipPuzzle, previous: readonly number[], target: number) {
  const line = [...previous];
  if (!Number.isInteger(target) || target < 0 || target >= puzzle.size ** 2) return line;
  const existing = line.indexOf(target);
  if (existing >= 0) return line.slice(0, existing + 1);
  const start = line.at(-1);
  if (start === undefined) return zipCanStep(puzzle, line, target) ? [target] : line;
  let head: number = start;
  const row = Math.floor(head / puzzle.size), column = head % puzzle.size;
  if (row !== Math.floor(target / puzzle.size) && column !== target % puzzle.size) return line;
  const step = row === Math.floor(target / puzzle.size) ? Math.sign(target - head) : Math.sign(target - head) * puzzle.size;
  while (head !== target) {
    const next: number = head + step;
    if (!zipCanStep(puzzle, line, next)) break;
    line.push(next);
    head = next;
  }
  return line;
}

export function shuffledWords<T>(items: readonly T[], random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const other = Math.floor(random() * (i + 1));
    [result[i], result[other]] = [result[other], result[i]];
  }
  return result;
}
