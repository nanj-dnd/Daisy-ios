import XCTest

final class ArcadeUITests: XCTestCase {
    private var app: XCUIApplication!
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchEnvironment["ARCADE_UI_TESTS"] = "1"
        app.launchEnvironment["ARCADE_RESET"] = "1"
        app.launch()
        XCTAssertTrue(app.buttons["open-collection"].waitForExistence(timeout: 10))
    }
    private func open(_ kind: String) {
        app.buttons["open-collection"].tap()
        let game = app.buttons["game-\(kind)"]
        XCTAssertTrue(game.waitForExistence(timeout: 5)); game.tap()
    }
    private func home() { app.navigationBars.buttons.element(boundBy: 0).tap(); XCTAssertTrue(app.buttons["open-collection"].waitForExistence(timeout: 5)) }
    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot()); attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
    private func guess(_ word: String) {
        for letter in word { app.buttons["key-\(letter)"].tap() }
        app.buttons["submit-answer"].tap()
    }
    func testFoldDeckDirectManipulation() {
        let card = app.descendants(matching: .any)["active-game-card"].firstMatch
        for (index, title) in ["Krillion", "Fermi", "Minute Cryptic", "Wordle", "Connections", "Mini Sudoku"].enumerated() {
            XCTAssertTrue(card.waitForExistence(timeout: 5)); XCTAssertTrue(card.label.contains(title))
            capture("Deck-\(index)")
            card.swipeUp()
        }
        XCTAssertTrue(card.label.contains("Krillion"))
        card.swipeDown()
        XCTAssertTrue(card.label.contains("Mini Sudoku"))
        card.swipeLeft()
        XCTAssertTrue(card.label.contains("Krillion"))
        card.tap(); XCTAssertTrue(app.navigationBars["Krillion"].waitForExistence(timeout: 5))
    }
    func testAllSixGamesOpenAndRulesDismiss() {
        for (kind, title) in [("trivia", "Krillion"), ("estimation", "Fermi"), ("cryptic", "Minute Cryptic"), ("word", "Wordle"), ("groups", "Connections"), ("sudoku", "Mini Sudoku")] {
            open(kind)
            XCTAssertTrue(app.navigationBars[title].waitForExistence(timeout: 5))
            capture("Game-\(kind)")
            app.buttons["How to play \(title)"].tap()
            XCTAssertTrue(app.navigationBars["How to play"].waitForExistence(timeout: 5))
            app.buttons["Done"].tap()
            home()
        }
    }
    func testWordValidationAndProgressSurvivesRelaunch() {
        open("word")
        guess("ZZZZZ")
        XCTAssertTrue(app.staticTexts["feedback"].label.contains("dictionary"))
        capture("Word-rejected")
        for _ in 0..<5 { app.buttons["delete-letter"].tap() }
        guess("SLEEP")
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@", "Guess 1: S,")).firstMatch.waitForExistence(timeout: 2), "Repeated letters must all register")
        capture("Word-played")
        XCTAssertTrue(app.staticTexts["feedback"].label.contains("left") || app.staticTexts["feedback"].label.contains("found it"))
        app.terminate(); app.launchEnvironment["ARCADE_RESET"] = "0"; app.launch()
        XCTAssertTrue(app.buttons["open-collection"].waitForExistence(timeout: 5)); open("word")
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@", "Guess 1: S,")).firstMatch.waitForExistence(timeout: 5))
    }
    func testCrypticHintsRevealAndShare() {
        open("cryptic")
        app.buttons["get-hint"].tap()
        XCTAssertTrue(app.buttons["get-hint"].label.contains("First letter"))
        capture("Cryptic-hint")
        app.buttons["Reveal"].tap(); app.buttons["Reveal answer"].tap()
        app.swipeUp()
        XCTAssertTrue(app.staticTexts["cryptic-solution"].exists)
        XCTAssertTrue(app.buttons["share-result"].waitForExistence(timeout: 5))
        capture("Cryptic-result")
    }
    func testThreeEstimatesFinishAndArchiveIsSeparate() {
        open("estimation")
        for index in 0..<3 {
            let field = app.textFields["answer-input"]; XCTAssertTrue(field.waitForExistence(timeout: 3)); field.tap(); field.typeText("100")
            if index == 0 { capture("Estimate-input") }
            app.buttons["submit-answer"].tap()
            if index == 0 { capture("Estimate-review") }
            if index < 2 { app.swipeUp(); app.buttons["next-question"].tap() }
        }
        app.swipeUp()
        XCTAssertTrue(app.buttons["share-result"].waitForExistence(timeout: 5))
        capture("Estimate-result")
        home(); app.buttons["open-collection"].tap(); capture("Collection-games"); app.segmentedControls.buttons["Archive"].tap()
        XCTAssertTrue(app.collectionViews["archive-list"].exists || app.descendants(matching: .any)["archive-list"].exists)
    }
    func testTriviaRoundPersistsAndCannotBeResubmitted() {
        open("trivia"); app.buttons["start-trivia"].tap()
        XCTAssertTrue(app.textFields["answer-input"].waitForExistence(timeout: 5))
        sleep(1); capture("Trivia-round")
        app.buttons["Skip this round"].tap()
        XCTAssertTrue(app.buttons["next-question"].waitForExistence(timeout: 3))
        capture("Trivia-answered")
        app.terminate(); app.launchEnvironment["ARCADE_RESET"] = "0"; app.launch()
        XCTAssertTrue(app.buttons["open-collection"].waitForExistence(timeout: 5)); open("trivia")
        XCTAssertTrue(app.buttons["next-question"].exists)
        app.buttons["next-question"].tap()
        XCTAssertTrue(app.staticTexts["Round 2 of 7"].exists)
    }
    func testGroupsSelectionAndSudokuPadRespond() {
        open("groups")
        let tiles = app.descendants(matching: .any)["groups-grid"].buttons
        XCTAssertEqual(tiles.count, 16)
        for index in 0..<4 { tiles.element(boundBy: index).tap() }
        XCTAssertTrue(app.buttons["submit-answer"].isEnabled)
        capture("Groups-selected")
        app.buttons["submit-answer"].tap()
        XCTAssertTrue(app.staticTexts["feedback"].waitForExistence(timeout: 3))
        capture("Groups-feedback")
        home(); open("sudoku")
        app.buttons["Enter 1"].tap()
        app.switches["Pencil notes"].tap()
        XCTAssertTrue(app.buttons["Check for conflicts"].isHittable, "Sudoku's controls must fit on one screen")
        capture("Sudoku-played")
    }
}
