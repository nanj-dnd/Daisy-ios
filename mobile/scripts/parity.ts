// Checks the TypeScript engine against output from the real Swift engine, across 401 daily editions.
// Regenerate the fixture with scripts/fixtures/export-from-swift.swift after any change to DailyArcade/Core.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  SeededRandom, crypticFor, dateLabel, editionNumber, estimatesFor, groupsFor, letterMarks, makeSudoku, makeZip, sudokuSolutionCount, triviaFor, wordFor, zipAdjacent, zipCanStep, zipComplete,
} from '../src/core/engine';
import { borderDistance, countries, countryIndex, findCountry, globleAnswer } from '../src/core/globle';

const fixture = JSON.parse(readFileSync(join(__dirname, 'fixtures/swift-editions.json'), 'utf8'));
let checks = 0, failures = 0;
function same(label: string, actual: unknown, expected: unknown) {
  checks += 1;
  if (JSON.stringify(actual) === JSON.stringify(expected)) return;
  failures += 1;
  if (failures <= 10) console.error(`MISMATCH ${label}\n  js:    ${JSON.stringify(actual)}\n  swift: ${JSON.stringify(expected)}`);
}
function close(label: string, actual: number, expected: number) {
  checks += 1;
  if (Math.abs(actual - expected) <= Math.abs(expected) * 1e-12) return;
  failures += 1;
  if (failures <= 10) console.error(`MISMATCH ${label}: js ${actual}, swift ${expected}`);
}

const random = new SeededRandom(12345);
same('rng stream', fixture.stream.map(() => random.next().toString()), fixture.stream);
for (const entry of fixture.marks) same(`marks ${entry.g}/${entry.a}`, letterMarks(entry.g, entry.a), entry.m);

for (const edition of fixture.days) {
  const day: number = edition.day;
  // Zip has no Swift counterpart, so its check is that the line it hides really solves it.
  const zip = makeZip(day);
  same(`${day} zip cells`, [...new Set(zip.solution)].length, 36);
  same(`${day} zip line`, zip.solution.every((cell, index) => index === 0 || zipAdjacent(zip.solution[index - 1], cell)), true);
  same(`${day} zip order`, zip.solution.every((cell, index) => zipCanStep(zip, zip.solution.slice(0, index), cell)), true);
  same(`${day} zip solved`, zipComplete(zip, zip.solution), true);
  same(`${day} number`, editionNumber(day), edition.number);
  same(`${day} label`, dateLabel(day), edition.label);
  same(`${day} word`, wordFor(day), edition.word);
  same(`${day} cryptic`, crypticFor(day).answer, edition.cryptic);
  same(`${day} trivia`, triviaFor(day).map((prompt) => prompt.question), edition.trivia);
  same(`${day} groups`, groupsFor(day).map((group) => group.title), edition.groups);
  const sudoku = makeSudoku(day);
  same(`${day} givens`, sudoku.givens, edition.givens);
  same(`${day} solution`, sudoku.solution, edition.solution);
  same(`${day} unique`, sudokuSolutionCount(sudoku.givens), 1);
  estimatesFor(day).forEach((question, index) => {
    const expected = edition.estimates[index];
    same(`${day} estimate ${index}`, [question.question, question.unit, question.explanation], [expected.q, expected.u, expected.x]);
    close(`${day} estimate ${index} answer`, question.answer, expected.a);
  });
}
// Globle has no Swift counterpart either. Its answers must be real targets that don't repeat within a
// cycle, and its distances must agree with an atlas.
const answers = fixture.days.map((edition: { day: number }) => globleAnswer(edition.day));
same('globle answers are targets', answers.every((index: number) => countries[index].target), true);
const targetCount = countries.filter((country) => country.target).length;
const cycleStart = Math.ceil(20_727 / targetCount) * targetCount;
const cycle = Array.from({ length: targetCount }, (_, offset) => globleAnswer(cycleStart + offset));
same('globle cycle has no repeats', new Set(cycle).size, cycle.length);
const km = (a: string, b: string) => borderDistance(countryIndex(a), countryIndex(b));
for (const [a, b] of [['France', 'Spain'], ['Brazil', 'France'], ['United States', 'Canada'], ['Russia', 'China'], ['India', 'Bangladesh']]) same(`globle ${a}–${b} neighbours`, km(a, b), 0);
const within = (label: string, value: number, low: number, high: number) => same(label, value >= low && value <= high ? 'in range' : value, 'in range');
within('globle Japan–South Korea', km('Japan', 'South Korea'), 30, 250);
// Macquarie Island to the Auckland Islands, not the Tasman Sea.
within('globle Australia–New Zealand', km('Australia', 'New Zealand'), 550, 750);
within('globle United Kingdom–France', km('United Kingdom', 'France'), 20, 60);
// Northern Chile to the Canary Islands.
within('globle Chile–Spain', km('Chile', 'Spain'), 7000, 8000);
same('globle symmetric', km('Peru', 'Kenya'), km('Kenya', 'Peru'));
same('globle names', ['usa', 'Ivory Coast', 'the bahamas', 'czech republic', 'Türkiye'].map((name) => countries[findCountry(name) ?? 0].name), ['United States', "Côte d'Ivoire", 'Bahamas', 'Czechia', 'Turkey']);

console.log(`${checks - failures} of ${checks} checks match the Swift engine across ${fixture.days.length} editions`);
process.exit(failures === 0 ? 0 : 1);
