import Foundation

public struct SaveData: Codable, Equatable {
    public var schemaVersion = 1
    public var games: [String: GameProgress] = [:]
    public init() {}
    public static func key(_ kind: GameKind, _ edition: DailyEdition) -> String { "\(edition.day):\(kind.rawValue)" }
    public func progress(_ kind: GameKind, _ edition: DailyEdition) -> GameProgress { games[Self.key(kind, edition)] ?? GameProgress() }
    public mutating func set(_ progress: GameProgress, kind: GameKind, edition: DailyEdition) { games[Self.key(kind, edition)] = progress }
    public var playedOnDays: Set<Int> {
        Set(games.compactMap { key, progress in
            guard progress.completed, let finish = progress.completedAt, let rawDay = key.split(separator: ":").first, let day = Int(rawDay), DailyEdition(date: finish).day == day else { return nil }
            return day
        })
    }
}

/// The previous save remains intact if the atomic replacement fails.
public struct ProgressRepository {
    public let url: URL
    public init(url: URL) { self.url = url }
    public func load() throws -> SaveData {
        guard FileManager.default.fileExists(atPath: url.path) else { return SaveData() }
        let data = try Data(contentsOf: url)
        let save = try JSONDecoder().decode(SaveData.self, from: data)
        guard save.schemaVersion == 1 else { throw CocoaError(.coderReadCorrupt) }
        return save
    }
    public func save(_ value: SaveData) throws {
        let folder = url.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let data = try JSONEncoder().encode(value)
        try data.write(to: url, options: .atomic)
    }
}

public enum ResultShare {
    public static func text(kind: GameKind, edition: DailyEdition, progress: GameProgress) -> String {
        let heading = "Daily Arcade · \(kind.title)\n\(edition.dateLabel) · #\(edition.number)"
        guard progress.completed else { return heading + "\nToday's puzzle is waiting." }
        let result: String
        switch kind {
        case .word:
            let rows = progress.guesses.map { guess in WordRules.marks(guess: guess, answer: PuzzleContent.word(for: edition)).map { mark in mark == .correct ? "🟩" : mark == .present ? "🟨" : "⬜" }.joined() }.joined(separator: "\n")
            result = "\(progress.won ? String(progress.guesses.count) : "X")/6\n\(rows)"
        case .estimation:
            let questions = PuzzleContent.estimates(for: edition)
            let factors = zip(progress.values, questions).map { EstimateRules.multiple(guess: $0.0, answer: $0.1.answer) }
            let average = factors.reduce(0, +) / Double(max(1, factors.count))
            result = String(format: "%.2f× average error", average)
        case .trivia: result = "\(progress.triviaPoints.reduce(0, +))/700 points · \(progress.triviaPoints.filter { $0 > 0 }.count)/7 valid answers"
        case .cryptic: result = progress.revealed ? "Answer revealed" : "Solved · \(progress.hints) hint\(progress.hints == 1 ? "" : "s")"
        case .groups:
            let icons = ["🟨", "🟩", "🟦", "🟪"]
            result = progress.solvedGroups.map { String(repeating: icons[$0 % 4], count: 4) }.joined(separator: "\n") + "\n\(progress.won ? "Solved" : "Finished") · \(progress.mistakes) mistake\(progress.mistakes == 1 ? "" : "s")"
        case .sudoku: result = progress.revealed ? "Solution revealed" : "6 × 6 solved"
        }
        return heading + "\n" + result + "\nA little play, every day."
    }
}
