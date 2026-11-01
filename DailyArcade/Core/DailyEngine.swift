import Foundation

public enum GameKind: String, Codable, CaseIterable, Identifiable, Sendable {
    case trivia, estimation, cryptic, word, groups, sudoku
    public var id: String { rawValue }
    public var title: String {
        switch self {
        case .trivia: return "Deep Cut"
        case .estimation: return "Ballpark"
        case .cryptic: return "Little Cryptic"
        case .word: return "Five Letters"
        case .groups: return "Fourfold"
        case .sudoku: return "Mini Sudoku"
        }
    }
    public var subtitle: String {
        switch self {
        case .trivia: return "The less obvious, the better."
        case .estimation: return "Big questions. Best guesses."
        case .cryptic: return "One clue. Think sideways."
        case .word: return "Five letters. Six chances."
        case .groups: return "Sixteen words. Four connections."
        case .sudoku: return "A small grid. A fresh start."
        }
    }
    public var duration: String {
        switch self {
        case .trivia: return "3 min"
        case .estimation: return "2 min"
        case .cryptic: return "1 min"
        case .word, .groups: return "3 min"
        case .sudoku: return "4 min"
        }
    }
    public var symbol: String {
        switch self {
        case .trivia: return "water.waves"
        case .estimation: return "number"
        case .cryptic: return "quote.opening"
        case .word: return "character.cursor.ibeam"
        case .groups: return "square.grid.2x2"
        case .sudoku: return "square.grid.3x3"
        }
    }
    public var rules: String {
        switch self {
        case .trivia: return "Seven prompts. You have 25 seconds per prompt to name one valid answer. Less obvious answers earn more points, using our curated 10–100 point ratings. Ratings are editorial, not live player percentages. The timer continues if you leave the app."
        case .estimation: return "Make one positive numerical estimate for each of three questions. Your error is a multiple of the answer: 1× is perfect and 2× means double or half. Your daily result is the average of all three. Lower is better."
        case .cryptic: return "Solve one cryptic clue. Part of the clue defines the answer; the rest explains how to build it. Reveal a hint, a first letter, or the answer when you need a hand. Every clue includes a full explanation."
        case .word: return "Guess the five-letter word in six tries. Green means the right letter in the right place. Gold means the letter belongs somewhere else. Gray means it is not needed. Repeated letters are counted only as often as they occur in the answer."
        case .groups: return "Find four groups of four related words. Select four and submit. You have four mistakes; a set with three correct words earns a one-away nudge. Shuffle and deselect whenever you like."
        case .sudoku: return "Fill this 6 × 6 grid with 1 through 6. Each row, column, and outlined 2 × 3 box must contain every digit exactly once. Original clues are locked. Use pencil mode for notes, and Check to highlight rule conflicts."
        }
    }
}

/// Every player gets the same edition; the boundary is midnight UTC.
public struct DailyEdition: Hashable, Codable, Identifiable, Sendable {
    public let day: Int
    public var id: Int { day }
    public static let secondsPerDay: TimeInterval = 86_400
    public init(day: Int) { self.day = day }
    public init(date: Date = Date()) { day = Int(floor(date.timeIntervalSince1970 / Self.secondsPerDay)) }
    public var date: Date { Date(timeIntervalSince1970: Double(day) * Self.secondsPerDay) }
    public var nextDate: Date { Date(timeIntervalSince1970: Double(day + 1) * Self.secondsPerDay) }
    public var key: String { "edition-\(day)" }
    public var number: Int { max(1, day - 20_759 + 1) }
    public func index(count: Int, salt: Int = 0) -> Int { ((day + salt) % count + count) % count }
    public var dateLabel: String {
        let formatter = DateFormatter()
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "EEEE, MMMM d"
        return formatter.string(from: date)
    }
}

public struct SeededRandom: RandomNumberGenerator {
    private var state: UInt64
    public init(seed: Int) { state = UInt64(bitPattern: Int64(seed)) &+ 0x9E3779B97F4A7C15 }
    public mutating func next() -> UInt64 {
        state &+= 0x9E3779B97F4A7C15
        var value = state
        value = (value ^ (value >> 30)) &* 0xBF58476D1CE4E5B9
        value = (value ^ (value >> 27)) &* 0x94D049BB133111EB
        return value ^ (value >> 31)
    }
}

public enum LetterMark: Int, Codable, Sendable { case absent, present, correct }
public enum WordRules {
    public static func marks(guess: String, answer: String) -> [LetterMark] {
        let guessed = Array(guess.uppercased()), target = Array(answer.uppercased())
        guard guessed.count == target.count else { return [] }
        var result = Array(repeating: LetterMark.absent, count: target.count)
        var remaining: [Character: Int] = [:]
        for i in target.indices {
            if guessed[i] == target[i] { result[i] = .correct }
            else { remaining[target[i], default: 0] += 1 }
        }
        for i in target.indices where result[i] != .correct {
            if remaining[guessed[i], default: 0] > 0 {
                result[i] = .present
                remaining[guessed[i], default: 0] -= 1
            }
        }
        return result
    }
    public static func normalized(_ value: String) -> String {
        value.uppercased().filter { $0.isASCII && $0.isLetter }
    }
}

public enum EstimateRules {
    public static func parse(_ text: String) -> Double? {
        let clean = text.replacingOccurrences(of: ",", with: "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard let number = Double(clean), number.isFinite, number > 0, number <= 1e100 else { return nil }
        return number
    }
    public static func multiple(guess: Double, answer: Double) -> Double {
        guard guess > 0, answer > 0, guess.isFinite, answer.isFinite else { return .infinity }
        return max(guess / answer, answer / guess)
    }
    public static func display(_ value: Double) -> String {
        value.formatted(.number.precision(.significantDigits(1...6)))
    }
}

public struct WordGroup: Codable, Equatable, Sendable {
    public let title: String
    public let words: [String]
    public init(_ title: String, _ words: [String]) { self.title = title; self.words = words }
}
public enum GroupVerdict: Equatable { case solved(Int), oneAway, incorrect }
public enum GroupRules {
    public static func check(_ selection: Set<String>, groups: [WordGroup], solved: [Int]) -> GroupVerdict {
        guard selection.count == 4 else { return .incorrect }
        for (index, group) in groups.enumerated() where !solved.contains(index) {
            let count = selection.intersection(group.words).count
            if count == 4 { return .solved(index) }
        }
        if groups.enumerated().contains(where: { !solved.contains($0.offset) && selection.intersection($0.element.words).count == 3 }) { return .oneAway }
        return .incorrect
    }
}

public struct SudokuPuzzle: Equatable, Sendable {
    public let givens: [Int]
    public let solution: [Int]
    public static func make(seed: Int) -> SudokuPuzzle {
        var rng = SeededRandom(seed: seed)
        let digits = Array(1...6).shuffled(using: &rng)
        let bands = Array(0..<3).shuffled(using: &rng)
        let stacks = Array(0..<2).shuffled(using: &rng)
        let rows = bands.flatMap { band in [0, 1].shuffled(using: &rng).map { band * 2 + $0 } }
        let columns = stacks.flatMap { stack in [0, 1, 2].shuffled(using: &rng).map { stack * 3 + $0 } }
        let solution = rows.flatMap { row in columns.map { column in digits[(row * 3 + row / 2 + column) % 6] } }
        var givens = solution
        for index in Array(0..<36).shuffled(using: &rng) {
            let old = givens[index]
            givens[index] = 0
            if solutionCount(givens, limit: 2) != 1 { givens[index] = old }
            if givens.filter({ $0 != 0 }).count <= 15 { break }
        }
        return SudokuPuzzle(givens: givens, solution: solution)
    }
    public static func peers(_ index: Int) -> Set<Int> {
        guard (0..<36).contains(index) else { return [] }
        let row = index / 6, col = index % 6
        return Set((0..<36).filter { other in
            other != index && (other / 6 == row || other % 6 == col || (other / 6 / 2 == row / 2 && other % 6 / 3 == col / 3))
        })
    }
    public static func conflicts(_ board: [Int]) -> Set<Int> {
        guard board.count == 36 else { return [] }
        return Set((0..<36).filter { index in board[index] != 0 && peers(index).contains(where: { board[$0] == board[index] }) })
    }
    public static func isComplete(_ board: [Int]) -> Bool {
        board.count == 36 && board.allSatisfy { (1...6).contains($0) } && conflicts(board).isEmpty
    }
    public static func solutionCount(_ input: [Int], limit: Int = 2) -> Int {
        guard input.count == 36, input.allSatisfy({ (0...6).contains($0) }), conflicts(input).isEmpty else { return 0 }
        var board = input, count = 0
        func solve() {
            if count >= limit { return }
            var best: Int?, candidates: [Int] = []
            for index in 0..<36 where board[index] == 0 {
                let used = Set(peers(index).map { board[$0] })
                let available = (1...6).filter { !used.contains($0) }
                if available.isEmpty { return }
                if best == nil || available.count < candidates.count { best = index; candidates = available }
            }
            guard let cell = best else { count += 1; return }
            for value in candidates { board[cell] = value; solve(); if count >= limit { break } }
            board[cell] = 0
        }
        solve()
        return count
    }
}

public struct GameProgress: Codable, Equatable, Sendable {
    public var started = false
    public var completed = false
    public var won = false
    public var guesses: [String] = []
    public var values: [Double] = []
    public var solvedGroups: [Int] = []
    public var mistakes = 0
    public var hints = 0
    public var revealed = false
    public var board: [Int] = []
    public var notes: [Int: [Int]] = [:]
    public var round = 0
    public var roundDeadline: Date?
    public var pendingAnswer = ""
    public var triviaPoints: [Int] = []
    public var startedAt: Date?
    public var completedAt: Date?
    public init() {}
    public mutating func finish(won: Bool, now: Date = Date()) {
        started = true; completed = true; self.won = won; completedAt = now; roundDeadline = nil
    }
}

public enum ProgressStats {
    public static func streak(days: Set<Int>, today: Int) -> Int {
        var cursor = days.contains(today) ? today : today - 1, count = 0
        while days.contains(cursor) { count += 1; cursor -= 1 }
        return count
    }
    public static func bestStreak(days: Set<Int>) -> Int {
        var best = 0, current = 0, previous: Int?
        for day in days.sorted() {
            current = previous == day - 1 ? current + 1 : 1
            best = max(best, current); previous = day
        }
        return best
    }
}
