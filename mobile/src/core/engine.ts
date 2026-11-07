// A line-for-line port of DailyArcade/Core. Every player must get the same edition on either app, so
// scripts/parity.ts checks this file against output from the Swift engine.
import content from './content.json';
import { borderDistance, countries, countryIndex, globleAnswer, heatEmoji } from './globle';

export const gameKinds = ['trivia', 'estimation', 'cryptic', 'word', 'groups', 'sudoku', 'zip', 'globle'] as const;
export type GameKind = (typeof gameKinds)[number];

type GameMeta = { title: string; subtitle: string; duration: string; rules: string; invitation: string; footnote: string };
export const games: Record<GameKind, GameMeta> = {
  trivia: {
    title: 'Krillion', subtitle: 'The less obvious, the better.', duration: '3 min', invitation: 'Go for the unexpected.', footnote: '7 rounds · 25 seconds each',
    rules: 'Seven prompts. You have 25 seconds per prompt to name one valid answer. Less obvious answers earn more points, using our curated 10–100 point ratings. Ratings are editorial, not live player percentages. The timer continues if you leave the app.',
  },
  estimation: {
    title: 'Fermi', subtitle: 'Big questions. Best guesses.', duration: '2 min', invitation: 'Trust your best guess.', footnote: '3 questions · One guess each',
    rules: 'Make one positive numerical estimate for each of three questions. Your error is a multiple of the answer: 1× is perfect and 2× means double or half. Your daily result is the average of all three. Lower is better.',
  },
  cryptic: {
    title: 'Minute Cryptic', subtitle: 'One clue. Think sideways.', duration: '1 min', invitation: 'A little twist of thought.', footnote: 'One original clue · Hints included',
    rules: 'Solve one cryptic clue. Part of the clue defines the answer; the rest explains how to build it. Reveal a hint, a first letter, or the answer when you need a hand. Every clue includes a full explanation.',
  },
  word: {
    title: 'Wordle', subtitle: 'Five letters. Six chances.', duration: '3 min', invitation: 'Find your five.', footnote: '5 letters · 6 chances',
    rules: 'Guess the five-letter word in six tries. Green means the right letter in the right place. Gold means the letter belongs somewhere else. Gray means it is not needed. Repeated letters are counted only as often as they occur in the answer.',
  },
  groups: {
    title: 'Connections', subtitle: 'Sixteen words. Four connections.', duration: '3 min', invitation: 'Make the connection.', footnote: '16 words · 4 hidden groups',
    rules: 'Find four groups of four related words. Select four and submit. You have four mistakes; a set with three correct words earns a one-away nudge. Shuffle and deselect whenever you like.',
  },
  sudoku: {
    title: 'Mini Sudoku', subtitle: 'A small grid. A fresh start.', duration: '4 min', invitation: 'Small grid. Big satisfaction.', footnote: '6 × 6 · One unique solution',
    rules: 'Fill this 6 × 6 grid with 1 through 6. Each row, column, and outlined 2 × 3 box must contain every digit exactly once. Original clues are locked. Turn on notes for pencil marks. Digits that clash turn red. Hint places one correct digit.',
  },
  zip: {
    title: 'Zip', subtitle: 'One line. Every cell.', duration: '2 min', invitation: 'Complete the path.', footnote: '6 × 6 · One unbroken line',
    rules: 'Draw one line from 1 through every number in order, filling every cell of the grid. Drag back along your line to undo it. Your time counts, and each hint adds 15 seconds.',
  },
  globle: {
    title: 'Globle', subtitle: 'Find the mystery country.', duration: '3 min', invitation: 'Warmer, warmer…', footnote: 'Unlimited guesses · Closest border counts',
    rules: 'Guess the mystery country. Each guess is shaded on the globe by how close its border comes to the answer: the paler, the farther away, and the redder, the closer. A neighbour that shares a border turns deep red. Guess as many times as you need; fewer is better. Drag to spin the globe and pinch to zoom.',
  },
};

// Editions change at midnight UTC.
const secondsPerDay = 86_400;
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const dayOf = (now: number = Date.now()) => Math.floor(now / 1000 / secondsPerDay);
/** Edition #1, on October 1, 2026. The archive goes back this far and no further. */
export const firstEditionDay = 20_727;
export const editionNumber = (day: number) => Math.max(1, day - firstEditionDay + 1);
export const nextEditionAt = (day: number) => (day + 1) * secondsPerDay * 1000;
export const editionIndex = (day: number, count: number, salt = 0) => (((day + salt) % count) + count) % count;
export function dateLabel(day: number) {
  const date = new Date(day * secondsPerDay * 1000);
  return `${weekdays[date.getUTCDay()]}, ${months[date.getUTCMonth()]} ${date.getUTCDate()}`;
}
export function monthLabel(day: number) {
  const date = new Date(day * secondsPerDay * 1000);
  return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
/** The day number of the 1st of the month that holds `day`, and how many days that month has. */
export function monthOf(day: number) {
  const date = new Date(day * secondsPerDay * 1000);
  return { first: day - date.getUTCDate() + 1, length: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate() };
}

const mask = (1n << 64n) - 1n;
const gamma = 0x9e3779b97f4a7c15n;

/** SplitMix64, as in Swift's SeededRandom. */
export class SeededRandom {
  private state: bigint;
  constructor(seed: number) {
    this.state = (BigInt.asUintN(64, BigInt(seed)) + gamma) & mask;
  }
  next() {
    this.state = (this.state + gamma) & mask;
    let value = this.state;
    value = ((value ^ (value >> 30n)) * 0xbf58476d1ce4e5b9n) & mask;
    value = ((value ^ (value >> 27n)) * 0x94d049bb133111ebn) & mask;
    return value ^ (value >> 31n);
  }
  /** Swift's RandomNumberGenerator.next(upperBound:), Lemire's nearly divisionless method. */
  below(bound: number) {
    const upper = BigInt(bound);
    let product = this.next() * upper;
    if ((product & mask) < upper) {
      const threshold = ((1n << 64n) - upper) % upper;
      while ((product & mask) < threshold) product = this.next() * upper;
    }
    return Number(product >> 64n);
  }
}

/** Swift's shuffled(using:), which walks forward and swaps with a later element. */
export function shuffled<T>(items: readonly T[], random: SeededRandom) {
  const result = [...items];
  for (let current = 0, amount = result.length; amount > 1; current += 1, amount -= 1) {
    const other = current + random.below(amount);
    [result[current], result[other]] = [result[other], result[current]];
  }
  return result;
}

export type LetterMark = 0 | 1 | 2; // absent, present, correct
export function letterMarks(guess: string, answer: string): LetterMark[] {
  const guessed = [...guess.toUpperCase()], target = [...answer.toUpperCase()];
  if (guessed.length !== target.length) return [];
  const result: LetterMark[] = target.map(() => 0);
  const remaining: Record<string, number> = {};
  target.forEach((letter, index) => {
    if (guessed[index] === letter) result[index] = 2;
    else remaining[letter] = (remaining[letter] ?? 0) + 1;
  });
  target.forEach((_, index) => {
    if (result[index] !== 2 && (remaining[guessed[index]] ?? 0) > 0) {
      result[index] = 1;
      remaining[guessed[index]] -= 1;
    }
  });
  return result;
}
export const normalizedLetters = (value: string) => value.toUpperCase().replace(/[^A-Z]/g, '');

export function parseEstimate(text: string) {
  const clean = text.replaceAll(',', '').trim();
  if (clean === '') return null;
  const number = Number(clean);
  return Number.isFinite(number) && number > 0 && number <= 1e100 ? number : null;
}
export function estimateMultiple(guess: number, answer: number) {
  if (!(guess > 0) || !(answer > 0) || !Number.isFinite(guess) || !Number.isFinite(answer)) return Infinity;
  return Math.max(guess / answer, answer / guess);
}
export const displayNumber = (value: number) => value.toLocaleString(undefined, { maximumSignificantDigits: 6 });

export type WordGroup = { title: string; words: string[] };
export type GroupVerdict = { kind: 'solved'; index: number } | { kind: 'oneAway' } | { kind: 'incorrect' };
export function checkGroup(selection: Set<string>, groups: WordGroup[], solved: number[]): GroupVerdict {
  if (selection.size !== 4) return { kind: 'incorrect' };
  const overlap = (group: WordGroup) => group.words.filter((word) => selection.has(word)).length;
  const open = groups.map((group, index) => ({ group, index })).filter(({ index }) => !solved.includes(index));
  const match = open.find(({ group }) => overlap(group) === 4);
  if (match) return { kind: 'solved', index: match.index };
  return open.some(({ group }) => overlap(group) === 3) ? { kind: 'oneAway' } : { kind: 'incorrect' };
}

const peerTable = Array.from({ length: 36 }, (_, index) => {
  const row = Math.floor(index / 6), col = index % 6;
  return Array.from({ length: 36 }, (_, other) => other).filter((other) => {
    const otherRow = Math.floor(other / 6), otherCol = other % 6;
    return other !== index && (otherRow === row || otherCol === col || (Math.floor(otherRow / 2) === Math.floor(row / 2) && Math.floor(otherCol / 3) === Math.floor(col / 3)));
  });
});
export const sudokuPeers = (index: number) => peerTable[index] ?? [];
export function sudokuConflicts(board: number[]) {
  const found = new Set<number>();
  if (board.length !== 36) return found;
  board.forEach((value, index) => {
    if (value !== 0 && sudokuPeers(index).some((peer) => board[peer] === value)) found.add(index);
  });
  return found;
}
export const sudokuComplete = (board: number[]) => board.length === 36 && board.every((value) => value >= 1 && value <= 6) && sudokuConflicts(board).size === 0;
export function sudokuSolutionCount(input: number[], limit = 2) {
  if (input.length !== 36 || input.some((value) => value < 0 || value > 6) || sudokuConflicts(input).size > 0) return 0;
  const board = [...input];
  let count = 0;
  const solve = () => {
    if (count >= limit) return;
    let best: number | null = null, candidates: number[] = [];
    for (let index = 0; index < 36; index += 1) {
      if (board[index] !== 0) continue;
      const used = new Set(sudokuPeers(index).map((peer) => board[peer]));
      const available = [1, 2, 3, 4, 5, 6].filter((value) => !used.has(value));
      if (available.length === 0) return;
      if (best === null || available.length < candidates.length) { best = index; candidates = available; }
    }
    if (best === null) { count += 1; return; }
    for (const value of candidates) {
      board[best] = value;
      solve();
      if (count >= limit) break;
    }
    board[best] = 0;
  };
  solve();
  return count;
}
export type SudokuPuzzle = { givens: number[]; solution: number[] };
export function makeSudoku(seed: number): SudokuPuzzle {
  const random = new SeededRandom(seed);
  const digits = shuffled([1, 2, 3, 4, 5, 6], random);
  const bands = shuffled([0, 1, 2], random);
  const stacks = shuffled([0, 1], random);
  const rows = bands.flatMap((band) => shuffled([0, 1], random).map((value) => band * 2 + value));
  const columns = stacks.flatMap((stack) => shuffled([0, 1, 2], random).map((value) => stack * 3 + value));
  const solution = rows.flatMap((row) => columns.map((column) => digits[(row * 3 + Math.floor(row / 2) + column) % 6]));
  const givens = [...solution];
  for (const index of shuffled(Array.from({ length: 36 }, (_, value) => value), random)) {
    const old = givens[index];
    givens[index] = 0;
    if (sudokuSolutionCount(givens) !== 1) givens[index] = old;
    if (givens.filter((value) => value !== 0).length <= 15) break;
  }
  return { givens, solution };
}

export type ZipPuzzle = { size: number; solution: number[]; marks: Record<number, number> };
export const zipAdjacent = (a: number, b: number, size = 6) => {
  const rows = Math.abs(Math.floor(a / size) - Math.floor(b / size)), columns = Math.abs((a % size) - (b % size));
  return rows + columns === 1;
};
/** Starts from a plain zigzag and scrambles it with backbite moves, which always keep it one unbroken line. */
export function makeZip(day: number, size = 6): ZipPuzzle {
  const random = new SeededRandom(day + 211);
  const count = size * size;
  const path = Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / size), offset = index % size;
    return row * size + (row % 2 === 0 ? offset : size - 1 - offset);
  });
  for (let step = 0; step < count * 40; step += 1) {
    if (random.below(2) === 0) path.reverse();
    const head = path[count - 1];
    const options = path.slice(0, count - 2).filter((cell) => zipAdjacent(cell, head, size));
    if (options.length === 0) continue;
    const pivot = path.indexOf(options[random.below(options.length)]);
    const tail = path.splice(pivot + 1);
    path.push(...tail.reverse());
  }
  const interior = shuffled(Array.from({ length: count - 2 }, (_, index) => index + 1), random).slice(0, 7 + random.below(5)).sort((a, b) => a - b);
  const marks: Record<number, number> = {};
  [0, ...interior, count - 1].forEach((position, order) => { marks[path[position]] = order + 1; });
  return { size, solution: path, marks };
}
/** Whether the line may step onto this cell: next to its head, unused, and not skipping a number. */
export function zipCanStep(puzzle: ZipPuzzle, path: number[], cell: number) {
  const head = path[path.length - 1];
  if (head === undefined) return puzzle.marks[cell] === 1;
  if (path.includes(cell) || !zipAdjacent(head, cell, puzzle.size)) return false;
  const passed = path.filter((entry) => puzzle.marks[entry] !== undefined).length;
  const mark = puzzle.marks[cell];
  return mark === undefined || mark === passed + 1;
}
export const zipComplete = (puzzle: ZipPuzzle, path: number[]) => {
  const marks = Object.keys(puzzle.marks).length;
  return path.length === puzzle.size * puzzle.size && puzzle.marks[path[path.length - 1]] === marks;
};

export type CrypticClue = { clue: string; answer: string; hint: string; explanation: string };
export type TriviaAnswer = { name: string; points: number; aliases: string[] };
export type TriviaPrompt = { question: string; answers: TriviaAnswer[] };
export type EstimateQuestion = { question: string; answer: number; unit: string; explanation: string };

const normalizeAnswer = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
export function matchTrivia(prompt: TriviaPrompt, text: string) {
  const clean = normalizeAnswer(text);
  if (clean === '') return undefined;
  return prompt.answers.find((answer) => normalizeAnswer(answer.name) === clean || answer.aliases.some((alias) => normalizeAnswer(alias) === clean));
}

export const crypticFor = (day: number) => content.cryptics[editionIndex(day, content.cryptics.length)] as CrypticClue;
export const wordFor = (day: number) => content.wordAnswers[editionIndex(day, content.wordAnswers.length, 31)];
export const triviaFor = (day: number) => shuffled(content.triviaPrompts as TriviaPrompt[], new SeededRandom(day + 73)).slice(0, 7);
export function groupsFor(day: number) {
  const used = new Set<string>(), selected: WordGroup[] = [];
  for (const group of shuffled(content.groupBank as WordGroup[], new SeededRandom(day + 91))) {
    if (group.words.some((word) => used.has(word))) continue;
    selected.push(group);
    group.words.forEach((word) => used.add(word));
    if (selected.length === 4) break;
  }
  return selected;
}
export function estimatesFor(day: number): EstimateQuestion[] {
  const days = 7 + editionIndex(day, 35);
  const distance = 100 + editionIndex(day, 90) * 10;
  const recipe = (question: string, answer: number, unit: string, explanation: string) => ({ question, answer, unit, explanation });
  const recipes = [
    recipe(`How many minutes are there in ${days} days?`, days * 24 * 60, 'minutes', `${days} days × 24 hours × 60 minutes = ${days * 1440} minutes.`),
    recipe(`How many seconds does light take to travel ${distance} million kilometers in a vacuum?`, (distance * 1e6) / 299_792.458, 'seconds', `Light travels at 299,792.458 km/s. Divide ${distance} million km by that speed.`),
    recipe(`How many liters of water fit in a cube with sides of ${days} centimeters?`, Math.pow(days, 3) / 1000, 'liters', 'Volume is side³. There are 1,000 cubic centimeters in a liter.'),
    recipe('How many squares of all sizes are on a standard 8 × 8 chessboard?', 204, 'squares', 'Count 1² + 2² + … + 8² = 204, including the larger overlapping squares.'),
    recipe('How many different five-card hands can be dealt from a standard 52-card deck?', 2_598_960, 'hands', 'Order does not matter: 52 choose 5 = (52 × 51 × 50 × 49 × 48) ÷ 120.'),
    recipe(`How many millimeters of rain would cover a ${distance} m² roof if 1,000 liters fell on it?`, 1000 / distance, 'millimeters', `One liter per square meter makes a depth of one millimeter. Divide 1,000 by ${distance}.`),
    recipe(`How many degrees does the minute hand turn in ${days} minutes?`, days * 6, 'degrees', 'A minute hand covers 360° in 60 minutes: 6° per minute.'),
    recipe('How many ways can you arrange all the letters of the word PLANET?', 720, 'arrangements', 'All six letters differ. There are 6! = 6 × 5 × 4 × 3 × 2 × 1 = 720 arrangements.'),
    recipe(`How many tennis balls, each 6.7 cm across, fit in a ${distance} cm straight line, without overlap?`, Math.floor(distance / 6.7), 'balls', 'Divide the line length by 6.7 cm, then round down to count whole balls.'),
    recipe(`How many pages are there in ${days} books if each has 320 pages?`, days * 320, 'pages', `Multiply ${days} books by 320 pages per book.`),
    recipe(`How many individual small cubes make a ${days} × ${days} × ${days} cube?`, Math.pow(days, 3), 'small cubes', `Multiply the number along each of the three dimensions: ${days}³.`),
    recipe(`How many milliliters are in ${days} US fluid ounces?`, days * 29.5735295625, 'milliliters', `One US fluid ounce is 29.5735295625 mL. Multiply by ${days}.`),
  ];
  const start = editionIndex(day, recipes.length);
  return [recipes[start], recipes[(start + 4) % recipes.length], recipes[(start + 8) % recipes.length]];
}

export type GameProgress = {
  started: boolean; completed: boolean; won: boolean; guesses: string[]; values: number[]; solvedGroups: number[];
  mistakes: number; hints: number; revealed: boolean; board: number[]; path?: number[]; notes: Record<number, number[]>; round: number;
  roundDeadline: number | null; pendingAnswer: string; triviaPoints: number[]; startedAt: number | null; completedAt: number | null;
};
export const newProgress = (): GameProgress => ({
  started: false, completed: false, won: false, guesses: [], values: [], solvedGroups: [], mistakes: 0, hints: 0, revealed: false,
  board: [], notes: {}, round: 0, roundDeadline: null, pendingAnswer: '', triviaPoints: [], startedAt: null, completedAt: null,
});
export function finishGame(progress: GameProgress, won: boolean, now = Date.now()) {
  progress.started = true; progress.completed = true; progress.won = won; progress.completedAt = now; progress.roundDeadline = null;
}

export const triviaRounds = 7;
const triviaSeconds = 25;
export function beginTrivia(progress: GameProgress, now = Date.now()) {
  if (progress.completed || progress.round >= triviaRounds || progress.roundDeadline !== null || progress.triviaPoints.length !== progress.round) return;
  progress.started = true; progress.startedAt ??= now;
  progress.roundDeadline = now + triviaSeconds * 1000; progress.pendingAnswer = '';
}
export function submitTrivia(progress: GameProgress, prompt: TriviaPrompt, answer: string, now = Date.now(), timeout = false) {
  const deadline = progress.roundDeadline;
  if (progress.completed || progress.round >= triviaRounds || progress.triviaPoints.length !== progress.round || deadline === null) return false;
  const expired = now >= deadline;
  if (timeout && !expired) return false;
  const text = expired ? '' : answer;
  progress.guesses.push(text);
  progress.triviaPoints.push(matchTrivia(prompt, text)?.points ?? 0);
  progress.roundDeadline = null; progress.pendingAnswer = '';
  if (progress.round === triviaRounds - 1) finishGame(progress, progress.triviaPoints.some((points) => points > 0), now);
  return true;
}
export function advanceTrivia(progress: GameProgress, now = Date.now()) {
  if (progress.completed || progress.triviaPoints.length !== progress.round + 1 || progress.round >= triviaRounds - 1) return;
  progress.round += 1;
  beginTrivia(progress, now);
}

export type SaveData = { schemaVersion: 1; games: Record<string, GameProgress> };
export const saveKey = (kind: GameKind, day: number) => `${day}:${kind}`;
export function playedOnDays(save: SaveData) {
  const days = new Set<number>();
  for (const [key, progress] of Object.entries(save.games)) {
    const day = Number(key.split(':')[0]);
    if (progress.completed && progress.completedAt !== null && dayOf(progress.completedAt) === day) days.add(day);
  }
  return days;
}
export function currentStreak(days: Set<number>, today: number) {
  let cursor = days.has(today) ? today : today - 1, count = 0;
  while (days.has(cursor)) { count += 1; cursor -= 1; }
  return count;
}
export function bestStreak(days: Set<number>) {
  let best = 0, current = 0, previous: number | null = null;
  for (const day of [...days].sort((a, b) => a - b)) {
    current = previous === day - 1 ? current + 1 : 1;
    best = Math.max(best, current);
    previous = day;
  }
  return best;
}
/** Refuses a save that could crash a game screen, as the Swift repository does. */
export function isValidSave(value: unknown): value is SaveData {
  const save = value as SaveData;
  if (!save || save.schemaVersion !== 1 || typeof save.games !== 'object') return false;
  return Object.entries(save.games).every(([key, game]) => {
    const [day, kind] = key.split(':');
    return Number.isInteger(Number(day)) && gameKinds.includes(kind as GameKind)
      && (game.board.length === 0 || (game.board.length === 36 && game.board.every((cell) => cell >= 0 && cell <= 6)))
      && game.round >= 0 && game.round < 7 && game.triviaPoints.length <= 7
      && game.solvedGroups.length <= 4 && new Set(game.solvedGroups).size === game.solvedGroups.length
      && game.solvedGroups.every((group) => group >= 0 && group < 4)
      && game.mistakes >= 0 && game.mistakes <= 4 && game.hints >= 0 && game.hints <= 36
      && game.values.length <= 3 && game.values.every((entry) => entry > 0 && Number.isFinite(entry))
      && game.guesses.length <= (kind === 'globle' ? countries.length : 7);
  });
}

export function shareText(kind: GameKind, day: number, progress: GameProgress) {
  const heading = `Daisy · ${games[kind].title}\n${dateLabel(day)} · #${editionNumber(day)}`;
  if (!progress.completed) return `${heading}\nToday's puzzle is waiting.`;
  let result: string;
  switch (kind) {
    case 'word': {
      const rows = progress.guesses.map((guess) => letterMarks(guess, wordFor(day)).map((mark) => (mark === 2 ? '🟩' : mark === 1 ? '🟨' : '⬜')).join('')).join('\n');
      result = `${progress.won ? progress.guesses.length : 'X'}/6\n${rows}`;
      break;
    }
    case 'estimation': {
      const factors = progress.values.map((value, index) => estimateMultiple(value, estimatesFor(day)[index].answer));
      result = `${(factors.reduce((sum, factor) => sum + factor, 0) / Math.max(1, factors.length)).toFixed(2)}× average error`;
      break;
    }
    case 'trivia':
      result = `${progress.triviaPoints.reduce((sum, points) => sum + points, 0)}/700 points · ${progress.triviaPoints.filter((points) => points > 0).length}/7 valid answers`;
      break;
    case 'cryptic':
      result = progress.revealed ? 'Answer revealed' : `Solved · ${progress.hints} hint${progress.hints === 1 ? '' : 's'}`;
      break;
    case 'groups': {
      const icons = ['🟨', '🟩', '🟦', '🟪'];
      result = `${progress.solvedGroups.map((group) => icons[group % 4].repeat(4)).join('\n')}\n${progress.won ? 'Solved' : 'Finished'} · ${progress.mistakes} mistake${progress.mistakes === 1 ? '' : 's'}`;
      break;
    }
    case 'sudoku':
      result = progress.revealed ? 'Solution revealed' : '6 × 6 solved';
      break;
    case 'zip':
      result = resultScore(kind, day, progress).label;
      break;
    case 'globle': {
      const answer = globleAnswer(day);
      const squares = progress.guesses.map((name) => (countryIndex(name) === answer ? '🟩' : heatEmoji(borderDistance(countryIndex(name), answer)))).join('');
      result = `${progress.won ? `Found in ${progress.guesses.length} guess${progress.guesses.length === 1 ? '' : 'es'}` : 'Not found'}\n${squares}`;
      break;
    }
  }
  return `${heading}\n${result}\nA little play, every day.`;
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
export const clockLabel = clock;
/** One comparable number per game, where higher always beats lower, and the label friends see. */
export function resultScore(kind: GameKind, day: number, progress: GameProgress) {
  const seconds = Math.max(0, ((progress.completedAt ?? 0) - (progress.startedAt ?? progress.completedAt ?? 0)) / 1000);
  switch (kind) {
    case 'trivia': {
      const points = progress.triviaPoints.reduce((sum, value) => sum + value, 0);
      return { score: points, label: `${points} pts · ${(points * 10).toLocaleString('en-US')}m` };
    }
    case 'estimation': {
      const factors = progress.values.map((value, index) => estimateMultiple(value, estimatesFor(day)[index].answer));
      const average = factors.reduce((sum, factor) => sum + factor, 0) / Math.max(1, factors.length);
      return { score: -average, label: `${average.toFixed(2)}× off` };
    }
    case 'cryptic':
      return progress.revealed ? { score: -9, label: 'Revealed' } : { score: -progress.hints, label: progress.hints === 0 ? 'No hints' : `${progress.hints} hint${progress.hints === 1 ? '' : 's'}` };
    case 'word':
      return progress.won ? { score: 7 - progress.guesses.length, label: `${progress.guesses.length}/6` } : { score: 0, label: 'X/6' };
    case 'groups':
      return progress.won
        ? { score: 5 - progress.mistakes, label: progress.mistakes === 0 ? 'Perfect' : `${progress.mistakes} mistake${progress.mistakes === 1 ? '' : 's'}` }
        : { score: progress.solvedGroups.length / 4, label: `${progress.solvedGroups.length} of 4 groups` };
    case 'globle':
      return progress.won ? { score: -progress.guesses.length, label: `${progress.guesses.length} guess${progress.guesses.length === 1 ? '' : 'es'}` } : { score: -1e6, label: 'Not found' };
    case 'sudoku':
    case 'zip': {
      const penalty = kind === 'zip' ? 15 : 30;
      if (progress.revealed) return { score: -1e6, label: 'Revealed' };
      const total = seconds + progress.hints * penalty;
      return { score: -total, label: progress.hints > 0 ? `${clock(total)} · ${progress.hints} hint${progress.hints === 1 ? '' : 's'}` : clock(total) };
    }
  }
}
