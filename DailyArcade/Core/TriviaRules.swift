import Foundation

public enum TriviaRules {
    public static let roundCount = 7
    public static let roundSeconds: TimeInterval = 25
    public static func begin(_ progress: inout GameProgress, now: Date = Date()) {
        guard !progress.completed, progress.round < roundCount, progress.roundDeadline == nil, progress.triviaPoints.count == progress.round else { return }
        progress.started = true; progress.startedAt = progress.startedAt ?? now
        progress.roundDeadline = now.addingTimeInterval(roundSeconds); progress.pendingAnswer = ""
    }
    @discardableResult public static func submit(_ progress: inout GameProgress, prompt: TriviaPrompt, answer: String, now: Date = Date(), timeout: Bool = false) -> Bool {
        guard !progress.completed, progress.round < roundCount, progress.triviaPoints.count == progress.round, let deadline = progress.roundDeadline else { return false }
        let expired = now >= deadline
        if timeout && !expired { return false }
        let text = expired ? "" : answer
        progress.guesses.append(text)
        progress.triviaPoints.append(prompt.match(text)?.points ?? 0)
        progress.roundDeadline = nil; progress.pendingAnswer = ""
        if progress.round == roundCount - 1 { progress.finish(won: progress.triviaPoints.contains { $0 > 0 }, now: now) }
        return true
    }
    public static func advance(_ progress: inout GameProgress, now: Date = Date()) {
        guard !progress.completed, progress.triviaPoints.count == progress.round + 1, progress.round < roundCount - 1 else { return }
        progress.round += 1
        begin(&progress, now: now)
    }
}
