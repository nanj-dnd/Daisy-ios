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
    func testFoldDeckDirectManipulation() {
        let card = app.descendants(matching: .any)["active-game-card"].firstMatch
        for (index, title) in ["Deep Cut", "Ballpark", "Little Cryptic", "Five Letters", "Fourfold", "Mini Sudoku"].enumerated() {
            XCTAssertTrue(card.waitForExistence(timeout: 5)); XCTAssertTrue(card.label.contains(title))
            capture("Deck-\(index)")
            card.swipeUp()
        }
        XCTAssertTrue(card.label.contains("Deep Cut"))
        card.tap(); XCTAssertTrue(app.navigationBars["Deep Cut"].waitForExistence(timeout: 5))
    }
    func testAllSixGamesOpenAndRulesDismiss() {
        for (kind, title) in [("trivia", "Deep Cut"), ("estimation", "Ballpark"), ("cryptic", "Little Cryptic"), ("word", "Five Letters"), ("groups", "Fourfold"), ("sudoku", "Mini Sudoku")] {
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
        let field = app.textFields["answer-input"]
        field.tap(); field.typeText("ZZZZZ\n")
        XCTAssertTrue(app.staticTexts["feedback"].label.contains("dictionary"))
        field.tap(); field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: 5) + "CRANE\n")
        XCTAssertTrue(app.staticTexts["feedback"].label.contains("Keep going") || app.staticTexts["feedback"].label.contains("Exactly"))
        app.terminate(); app.launchEnvironment["ARCADE_RESET"] = "0"; app.launch()
        XCTAssertTrue(app.buttons["open-collection"].waitForExistence(timeout: 5)); open("word")
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@", "Guess 1: C,")).firstMatch.waitForExistence(timeout: 5))
    }
    func testCrypticHintsRevealAndShare() {
        open("cryptic")
        app.buttons["get-hint"].tap()
        XCTAssertTrue(app.buttons["get-hint"].label.contains("First letter"))
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
            app.buttons["submit-answer"].tap()
            if index < 2 { app.swipeUp(); app.buttons["next-question"].tap() }
        }
        app.swipeUp()
        XCTAssertTrue(app.buttons["share-result"].waitForExistence(timeout: 5))
        home(); app.buttons["open-collection"].tap(); app.segmentedControls.buttons["Archive"].tap()
        XCTAssertTrue(app.collectionViews["archive-list"].exists || app.descendants(matching: .any)["archive-list"].exists)
    }
    func testTriviaRoundPersistsAndCannotBeResubmitted() {
        open("trivia"); app.buttons["start-trivia"].tap()
        XCTAssertTrue(app.textFields["answer-input"].waitForExistence(timeout: 5))
        app.buttons["Skip this round"].tap()
        XCTAssertTrue(app.buttons["next-question"].exists)
        app.terminate(); app.launchEnvironment["ARCADE_RESET"] = "0"; app.launch()
        XCTAssertTrue(app.buttons["open-collection"].waitForExistence(timeout: 5)); open("trivia")
        XCTAssertTrue(app.buttons["next-question"].exists)
        app.buttons["next-question"].tap()
        XCTAssertTrue(app.staticTexts["Round 2 of 7"].exists)
    }
}
