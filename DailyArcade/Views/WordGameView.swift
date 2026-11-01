import SwiftUI

struct WordGameView: View {
    let edition: DailyEdition
    @Environment(ArcadeStore.self) private var store
    @State private var feedback = ""
    private var progress: GameProgress { store.progress(.word, edition) }
    private var answer: String { PuzzleContent.word(for: edition) }
    private var input: Binding<String> {
        Binding(get: { progress.pendingAnswer }, set: { value in store.update(.word, edition) { $0.pendingAnswer = String(WordRules.normalized(value).prefix(5)) } })
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Find your five.").font(.system(.title, design: .rounded).weight(.heavy))
            Text("Green: right place. Gold: elsewhere. Six guesses.").font(.callout).foregroundStyle(ArcadeTheme.muted)
            VStack(spacing: 7) {
                ForEach(0..<6) { row in
                    let word = row < progress.guesses.count ? progress.guesses[row] : (row == progress.guesses.count ? progress.pendingAnswer : "")
                    let letters = Array(word)
                    let marks = row < progress.guesses.count ? WordRules.marks(guess: word, answer: answer) : []
                    HStack(spacing: 7) {
                        ForEach(0..<5) { col in
                            Text(col < letters.count ? String(letters[col]) : "")
                                .font(.system(.title2, design: .rounded).weight(.heavy))
                                .frame(maxWidth: .infinity).frame(height: 49)
                                .foregroundStyle(marks.isEmpty ? ArcadeTheme.ink : (marks[col] == .absent ? ArcadeTheme.ink : .white))
                                .background(marks.isEmpty ? ArcadeTheme.surface : tileColor(marks[col]), in: RoundedRectangle(cornerRadius: 10))
                        }
                    }.accessibilityElement(children: .ignore).accessibilityLabel(rowLabel(word, row: row, marks: marks))
                }
            }.accessibilityIdentifier("word-grid")
            if !progress.completed {
                InputField(title: "Five-letter word", text: input).submitLabel(.go).onSubmit(submit)
                Button("Check word", action: submit).buttonStyle(ActionButtonStyle()).disabled(progress.pendingAnswer.count != 5).accessibilityIdentifier("submit-answer")
            } else { Text(progress.won ? "You found it: \(answer)." : "Today's word was \(answer).").font(.title3.bold()) }
            FeedbackLine(text: feedback)
            if !progress.guesses.isEmpty && !progress.completed {
                Text("\(6 - progress.guesses.count) guesses left").font(.caption.weight(.semibold)).foregroundStyle(ArcadeTheme.muted)
            }
        }
    }
    private func tileColor(_ mark: LetterMark) -> Color {
        switch mark { case .correct: return Color(red: 0.12, green: 0.43, blue: 0.29); case .present: return Color(red: 0.56, green: 0.36, blue: 0.04); case .absent: return ArcadeTheme.surface }
    }
    private func rowLabel(_ word: String, row: Int, marks: [LetterMark]) -> String {
        if word.isEmpty { return "Guess \(row + 1), empty" }
        guard !marks.isEmpty else { return "Current guess: \(word)" }
        return "Guess \(row + 1): " + zip(Array(word), marks).map { letter, mark in "\(letter), \(mark == .correct ? "correct position" : mark == .present ? "different position" : "absent")" }.joined(separator: "; ")
    }
    private func submit() {
        let guess = progress.pendingAnswer
        guard !progress.completed, guess.count == 5 else { return }
        guard store.isWord(guess) else { feedback = "That word isn't in our dictionary. Try another."; return }
        guard !progress.guesses.contains(guess) else { feedback = "You already tried that word. Try another."; return }
        store.update(.word, edition) {
            $0.guesses.append(guess); $0.pendingAnswer = ""
            if guess == answer || $0.guesses.count == 6 { $0.finish(won: guess == answer) }
        }
        feedback = guess == answer ? "Exactly right." : "Keep going. Your colors are a clue."
    }
}
