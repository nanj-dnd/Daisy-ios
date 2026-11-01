import XCTest
@testable import DailyArcadeCore

final class DailyEngineTests: XCTestCase {
    func testMidnightUTCAndNegativeDates() {
        XCTAssertEqual(DailyEdition(date: Date(timeIntervalSince1970: 86_399.99)).day, 0)
        XCTAssertEqual(DailyEdition(date: Date(timeIntervalSince1970: 86_400)).day, 1)
        XCTAssertEqual(DailyEdition(date: Date(timeIntervalSince1970: -1)).day, -1)
        XCTAssertEqual(DailyEdition(day: -4).index(count: 3), 2)
        XCTAssertEqual(DailyEdition(day: 20_759).dateLabel, "Monday, November 2")
    }
    func testRepeatedLettersConsumeOnlyAvailableMatches() {
        XCTAssertEqual(WordRules.marks(guess: "ALLEY", answer: "APPLE"), [.correct, .present, .absent, .present, .absent])
        XCTAssertEqual(WordRules.marks(guess: "SHEEP", answer: "SPEED"), [.correct, .absent, .correct, .correct, .present])
        XCTAssertEqual(WordRules.marks(guess: "AAAAA", answer: "CRANE"), [.absent, .absent, .correct, .absent, .absent])
        XCTAssertEqual(WordRules.marks(guess: "WORD", answer: "CRANE"), [])
    }
    func testEstimateInputAndSymmetricScoring() {
        XCTAssertEqual(EstimateRules.parse(" 1,250 "), 1250)
        for value in ["0", "-2", "NaN", "inf", "1e300", "", "ten"] { XCTAssertNil(EstimateRules.parse(value)) }
        XCTAssertEqual(EstimateRules.multiple(guess: 50, answer: 100), 2)
        XCTAssertEqual(EstimateRules.multiple(guess: 200, answer: 100), 2)
        XCTAssertEqual(EstimateRules.multiple(guess: 100, answer: 100), 1)
    }
    func testGroupRulesAndNoDailyDuplicateWords() {
        let groups = [WordGroup("A", ["A", "B", "C", "D"]), WordGroup("B", ["E", "F", "G", "H"])]
        XCTAssertEqual(GroupRules.check(Set(["A", "B", "C", "D"]), groups: groups, solved: []), .solved(0))
        XCTAssertEqual(GroupRules.check(Set(["A", "B", "C", "E"]), groups: groups, solved: []), .oneAway)
        XCTAssertEqual(GroupRules.check(Set(["A", "B", "C", "D"]), groups: groups, solved: [0]), .incorrect)
        for day in 20_700..<21_100 {
            let daily = PuzzleContent.groups(for: DailyEdition(day: day))
            XCTAssertEqual(daily.count, 4)
            XCTAssertEqual(Set(daily.flatMap(\.words)).count, 16)
        }
    }
    func testSudokuGenerationIsDeterministicAndUnique() {
        for seed in 0..<40 {
            let puzzle = SudokuPuzzle.make(seed: seed)
            XCTAssertEqual(puzzle, SudokuPuzzle.make(seed: seed))
            XCTAssertTrue(SudokuPuzzle.isComplete(puzzle.solution))
            XCTAssertEqual(SudokuPuzzle.solutionCount(puzzle.givens), 1)
            XCTAssertTrue(puzzle.givens.enumerated().allSatisfy { $0.element == 0 || $0.element == puzzle.solution[$0.offset] })
            XCTAssertLessThanOrEqual(puzzle.givens.filter { $0 != 0 }.count, 18)
        }
    }
    func testSudokuConflictsAndCompletion() {
        var board = SudokuPuzzle.make(seed: 98).solution
        board[0] = board[1]
        XCTAssertTrue(SudokuPuzzle.conflicts(board).contains(0))
        XCTAssertFalse(SudokuPuzzle.isComplete(board))
        XCTAssertFalse(SudokuPuzzle.isComplete([]))
    }
    func testEditorialPackIntegrity() {
        XCTAssertGreaterThanOrEqual(PuzzleContent.cryptics.count, 30)
        XCTAssertEqual(Set(PuzzleContent.wordAnswers).count, PuzzleContent.wordAnswers.count)
        XCTAssertTrue(PuzzleContent.wordAnswers.allSatisfy { $0.count == 5 && WordRules.normalized($0) == $0 })
        for day in 20_759..<21_124 {
            let edition = DailyEdition(day: day)
            XCTAssertEqual(PuzzleContent.trivia(for: edition).count, 7)
            let estimates = PuzzleContent.estimates(for: edition)
            XCTAssertEqual(estimates.count, 3)
            XCTAssertTrue(estimates.allSatisfy { $0.answer.isFinite && $0.answer > 0 })
        }
        for prompt in PuzzleContent.triviaPrompts {
            for answer in prompt.answers {
                XCTAssertEqual(prompt.match(answer.name.lowercased())?.points, answer.points)
                for alias in answer.aliases { XCTAssertEqual(prompt.match(alias)?.points, answer.points) }
            }
            XCTAssertNil(prompt.match(""))
            XCTAssertNil(prompt.match("not an answer"))
        }
    }
    func testStreakGraceAndArchiveExclusion() {
        XCTAssertEqual(ProgressStats.streak(days: [8, 9], today: 10), 2)
        XCTAssertEqual(ProgressStats.streak(days: [7, 8], today: 10), 0)
        XCTAssertEqual(ProgressStats.bestStreak(days: [1, 2, 4, 5, 6, 8]), 3)
        var save = SaveData(), progress = GameProgress()
        progress.finish(won: true, now: DailyEdition(day: 10).date)
        save.set(progress, kind: .word, edition: DailyEdition(day: 9))
        XCTAssertTrue(save.playedOnDays.isEmpty)
        save.set(progress, kind: .word, edition: DailyEdition(day: 10))
        XCTAssertEqual(save.playedOnDays, [10])
    }
    func testAtomicPersistenceRoundtripAndCorruption() throws {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: folder) }
        let repository = ProgressRepository(url: folder.appendingPathComponent("save.json"))
        XCTAssertEqual(try repository.load(), SaveData())
        var save = SaveData(), progress = GameProgress()
        progress.board = Array(repeating: 0, count: 36); progress.notes = [2: [1, 6]]
        progress.roundDeadline = Date(timeIntervalSince1970: 1234); progress.pendingAnswer = "Neon"
        save.set(progress, kind: .trivia, edition: DailyEdition(day: 300))
        try repository.save(save)
        XCTAssertEqual(try repository.load(), save)
        try Data("bad-json".utf8).write(to: repository.url)
        XCTAssertThrowsError(try repository.load())
    }
    func testSharesDoNotRevealWordOrCrypticAnswers() {
        let edition = DailyEdition(day: 20_759)
        var progress = GameProgress(); progress.guesses = [PuzzleContent.word(for: edition)]; progress.finish(won: true)
        let text = ResultShare.text(kind: .word, edition: edition, progress: progress)
        XCTAssertFalse(text.contains(PuzzleContent.word(for: edition)))
        XCTAssertTrue(text.contains("1/6"))
        XCTAssertFalse(ResultShare.text(kind: .cryptic, edition: edition, progress: progress).contains(PuzzleContent.cryptic(for: edition).answer))
    }
    func testTriviaDeadlineCannotBeResetAndExpiredAnswersScoreZero() {
        let now = Date(timeIntervalSince1970: 1000)
        let prompt = TriviaPrompt("Name a planet", ["Earth", "Uranus"])
        var state = GameProgress()
        TriviaRules.begin(&state, now: now)
        TriviaRules.begin(&state, now: now.addingTimeInterval(20))
        XCTAssertEqual(state.roundDeadline, now.addingTimeInterval(25))
        XCTAssertFalse(TriviaRules.submit(&state, prompt: prompt, answer: "Uranus", now: now, timeout: true))
        XCTAssertTrue(TriviaRules.submit(&state, prompt: prompt, answer: "Uranus", now: now.addingTimeInterval(26)))
        XCTAssertEqual(state.triviaPoints, [0])
        XCTAssertFalse(TriviaRules.submit(&state, prompt: prompt, answer: "Uranus", now: now))
        TriviaRules.advance(&state, now: now.addingTimeInterval(30))
        XCTAssertEqual(state.round, 1)
        XCTAssertEqual(state.roundDeadline, now.addingTimeInterval(55))
        for round in 1..<7 {
            XCTAssertTrue(TriviaRules.submit(&state, prompt: prompt, answer: "Uranus", now: now.addingTimeInterval(Double(round) * 30)))
            TriviaRules.advance(&state, now: now.addingTimeInterval(Double(round + 1) * 30))
        }
        XCTAssertTrue(state.completed)
        XCTAssertTrue(state.won)
        XCTAssertEqual(state.triviaPoints.reduce(0, +), 600)
        XCTAssertNil(state.roundDeadline)
    }

    func testMalformedButValidJSONIsRejected() throws {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: folder) }
        let repository = ProgressRepository(url: folder.appendingPathComponent("save.json"))
        var invalid = SaveData(), progress = GameProgress()
        progress.board = [1, 2, 3]
        invalid.set(progress, kind: .sudoku, edition: DailyEdition(day: 42))
        try repository.save(invalid)
        XCTAssertThrowsError(try repository.load())
    }

}
