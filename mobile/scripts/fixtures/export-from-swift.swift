import Foundation
// Exports content and expected daily puzzles so the JavaScript port can be checked against the real engine.
func json(_ value: Any) -> Data { try! JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]) }
let content: [String: Any] = [
  "cryptics": PuzzleContent.cryptics.map { ["clue": $0.clue, "answer": $0.answer, "hint": $0.hint, "explanation": $0.explanation] },
  "wordAnswers": PuzzleContent.wordAnswers,
  "triviaPrompts": PuzzleContent.triviaPrompts.map { p in ["question": p.question, "answers": p.answers.map { ["name": $0.name, "points": $0.points, "aliases": $0.aliases] as [String: Any] }] as [String: Any] },
  "groupBank": PuzzleContent.groupBank.map { ["title": $0.title, "words": $0.words] as [String: Any] },
]
try! json(content).write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
var days: [[String: Any]] = []
for day in 20_727...21_127 {
  let e = DailyEdition(day: day), s = SudokuPuzzle.make(seed: day)
  days.append(["day": day, "number": e.number, "label": e.dateLabel, "word": PuzzleContent.word(for: e), "cryptic": PuzzleContent.cryptic(for: e).answer,
    "trivia": PuzzleContent.trivia(for: e).map(\.question), "groups": PuzzleContent.groups(for: e).map(\.title),
    "estimates": PuzzleContent.estimates(for: e).map { ["q": $0.question, "a": $0.answer, "u": $0.unit, "x": $0.explanation] as [String: Any] },
    "givens": s.givens, "solution": s.solution])
}
var rng = SeededRandom(seed: 12345); var stream: [String] = []
for _ in 0..<20 { stream.append(String(rng.next())) }
let marks = [("ALLOY","LLAMA"),("SPEED","ERASE"),("ROBOT","FLOOR"),("CRANE","CRANE")].map { ["g": $0.0, "a": $0.1, "m": WordRules.marks(guess: $0.0, answer: $0.1).map(\.rawValue)] as [String: Any] }
let display = [1, 100, 1250, 325.309, 2598960, 0.5, 1234567.8, 33.3333333].map { ["v": $0, "s": EstimateRules.display($0)] as [String: Any] }
try! json(["days": days, "stream": stream, "marks": marks, "display": display] as [String: Any]).write(to: URL(fileURLWithPath: CommandLine.arguments[2]))
