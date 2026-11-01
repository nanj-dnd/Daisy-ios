import Foundation
import Observation

@MainActor @Observable
final class ArcadeStore {
    private(set) var saveData = SaveData()
    private(set) var today = DailyEdition()
    var persistenceError: String?
    var recoverableLoadError = false
    private let repository: ProgressRepository
    private var sudokuCache: [Int: SudokuPuzzle] = [:]
    private let dictionary: Set<String>

    init(repository: ProgressRepository? = nil) {
        let root = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("DailyArcade", isDirectory: true)
        self.repository = repository ?? ProgressRepository(url: root.appendingPathComponent("progress.json"))
        if let url = Bundle.main.url(forResource: "allowed-words", withExtension: "txt"), let text = try? String(contentsOf: url, encoding: .utf8) {
            dictionary = Set(text.components(separatedBy: .newlines)).union(PuzzleContent.wordAnswers)
        } else { dictionary = Set(PuzzleContent.wordAnswers) }
        do { saveData = try self.repository.load() }
        catch {
            recoverableLoadError = true
            persistenceError = "Your saved progress could not be read. It has been kept on disk. You can retry loading it or save a backup and start again."
        }
    }
    func refreshDay(now: Date = Date()) { today = DailyEdition(date: now) }
    func progress(_ kind: GameKind, _ edition: DailyEdition) -> GameProgress { saveData.progress(kind, edition) }
    func update(_ kind: GameKind, _ edition: DailyEdition, _ change: (inout GameProgress) -> Void) {
        guard !recoverableLoadError else { return }
        var progress = progress(kind, edition)
        change(&progress)
        saveData.set(progress, kind: kind, edition: edition)
        persist()
    }
    func start(_ kind: GameKind, _ edition: DailyEdition) {
        guard !progress(kind, edition).started else { return }
        update(kind, edition) { $0.started = true; $0.startedAt = Date() }
    }
    func persist() {
        do { try repository.save(saveData); persistenceError = nil }
        catch { persistenceError = "Progress could not be saved. Free up storage and tap Retry. Your current game is still in memory." }
    }
    func retry() {
        if recoverableLoadError {
            do { saveData = try repository.load(); recoverableLoadError = false; persistenceError = nil }
            catch { persistenceError = "Your saved progress still cannot be read. The original file has been preserved." }
        } else { persist() }
    }
    func backupAndReset() {
        do {
            if FileManager.default.fileExists(atPath: repository.url.path) {
                let backup = repository.url.deletingLastPathComponent().appendingPathComponent("progress-backup-\(Int(Date().timeIntervalSince1970)).json")
                try FileManager.default.copyItem(at: repository.url, to: backup)
            }
            try repository.save(SaveData())
            saveData = SaveData(); recoverableLoadError = false; persistenceError = nil
        } catch { persistenceError = "A backup could not be saved. Your original file has been kept. Free up storage and try again." }
    }
    func isWord(_ value: String) -> Bool { dictionary.contains(value) }
    func sudoku(_ edition: DailyEdition) -> SudokuPuzzle {
        if let cached = sudokuCache[edition.day] { return cached }
        let puzzle = SudokuPuzzle.make(seed: edition.day)
        sudokuCache[edition.day] = puzzle
        return puzzle
    }
    func completedCount(_ edition: DailyEdition) -> Int { GameKind.allCases.filter { progress($0, edition).completed }.count }
    var streak: Int { ProgressStats.streak(days: saveData.playedOnDays, today: today.day) }
    var bestStreak: Int { ProgressStats.bestStreak(days: saveData.playedOnDays) }
    var totalCompleted: Int { saveData.games.values.filter(\.completed).count }
    func status(_ kind: GameKind, _ edition: DailyEdition) -> String {
        let state = progress(kind, edition)
        if state.completed { return state.won ? "Solved" : "Finished" }
        return state.started ? "Continue" : kind.duration
    }
    func beginTriviaRound(_ edition: DailyEdition) {
        let p = progress(.trivia, edition)
        guard !p.completed, p.round < 7, p.roundDeadline == nil, p.triviaPoints.count == p.round else { return }
        update(.trivia, edition) { $0.started = true; $0.startedAt = $0.startedAt ?? Date(); $0.roundDeadline = Date().addingTimeInterval(25); $0.pendingAnswer = "" }
    }
    /// Timer submits at most once, including after a background/resume transition.
    func submitTrivia(_ edition: DailyEdition, answer: String, now: Date = Date(), timeout: Bool = false) {
        let p = progress(.trivia, edition)
        guard !p.completed, p.round < 7, p.triviaPoints.count == p.round, let deadline = p.roundDeadline else { return }
        let expired = now >= deadline
        if timeout && !expired { return }
        let text = expired ? "" : answer
        let points = PuzzleContent.trivia(for: edition)[p.round].match(text)?.points ?? 0
        update(.trivia, edition) { state in
            state.guesses.append(text); state.triviaPoints.append(points); state.roundDeadline = nil; state.pendingAnswer = ""
            if state.round == 6 { state.finish(won: state.triviaPoints.contains { $0 > 0 }, now: now) }
        }
    }
    func nextTriviaRound(_ edition: DailyEdition) {
        let p = progress(.trivia, edition)
        guard !p.completed, p.triviaPoints.count == p.round + 1, p.round < 6 else { return }
        update(.trivia, edition) { $0.round += 1 }
        beginTriviaRound(edition)
    }
}
