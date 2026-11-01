import SwiftUI

struct CrypticGameView: View {
    let edition: DailyEdition
    @Environment(ArcadeStore.self) private var store
    @State private var feedback = ""
    @State private var showReveal = false
    private var progress: GameProgress { store.progress(.cryptic, edition) }
    private var clue: CrypticClue { PuzzleContent.cryptic(for: edition) }
    private var input: Binding<String> { Binding(get: { progress.pendingAnswer }, set: { value in store.update(.cryptic, edition) { $0.pendingAnswer = String(WordRules.normalized(value).prefix(clue.answer.count)) } }) }
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("A little twist of thought.").font(.system(.title, design: .rounded).weight(.heavy))
            Text(clue.clue).font(.system(.title2, design: .rounded).weight(.bold)).lineSpacing(5).padding(23)
                .frame(maxWidth: .infinity, minHeight: 150, alignment: .leading).background(ArcadeTheme.surface, in: RoundedRectangle(cornerRadius: 20))
            if !progress.completed {
                InputField(title: "\(clue.answer.count)-letter answer", text: input).submitLabel(.go).onSubmit(submit)
                Button("Check answer", action: submit).buttonStyle(ActionButtonStyle()).disabled(progress.pendingAnswer.count != clue.answer.count).accessibilityIdentifier("submit-answer")
                HStack {
                    Button(progress.hints == 0 ? "Get a hint" : "First letter") { store.update(.cryptic, edition) { $0.hints = min(2, $0.hints + 1) } }.disabled(progress.hints >= 2).frame(minHeight: 44).accessibilityIdentifier("get-hint")
                    Spacer(); Button("Reveal") { showReveal = true }.frame(minHeight: 44)
                }.font(.subheadline.bold())
            }
            if progress.hints >= 1 { Label(clue.hint, systemImage: "lightbulb").font(.callout) }
            if progress.hints >= 2 { Text("The first letter is \(String(clue.answer.prefix(1))).").font(.headline) }
            FeedbackLine(text: feedback)
            if progress.completed {
                Text(clue.answer).font(.system(.largeTitle, design: .rounded).weight(.heavy)).accessibilityIdentifier("cryptic-solution")
                Text("Here's the wordplay").font(.headline)
                Text(clue.explanation).font(.body).lineSpacing(5)
            }
        }.confirmationDialog("Reveal the answer?", isPresented: $showReveal, titleVisibility: .visible) {
            Button("Reveal answer") { store.update(.cryptic, edition) { $0.revealed = true; $0.finish(won: false) } }
        } message: { Text("This finishes today's clue. You can read the full explanation.") }
    }
    private func submit() {
        guard !progress.completed, progress.pendingAnswer.count == clue.answer.count else { return }
        if progress.pendingAnswer == clue.answer {
            store.update(.cryptic, edition) { $0.finish(won: true) }; feedback = "That's the twist."
        } else { feedback = "Not quite. Look for a definition at one end of the clue." }
    }
}
