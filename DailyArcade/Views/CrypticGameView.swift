import SwiftUI

struct CrypticGameView: View {
    let edition: DailyEdition
    @Environment(ArcadeStore.self) private var store
    @FocusState private var answering: Bool
    @State private var feedback = ""
    @State private var showReveal = false
    private var progress: GameProgress { store.progress(.cryptic, edition) }
    private var clue: CrypticClue { PuzzleContent.cryptic(for: edition) }
    private var input: Binding<String> { Binding(get: { progress.pendingAnswer }, set: { value in store.update(.cryptic, edition) { $0.pendingAnswer = String(WordRules.normalized(value).prefix(clue.answer.count)) } }) }
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            // Keeps the letter count on the line with the clue's last word.
            Text(clue.clue.replacingOccurrences(of: " (", with: "\u{00A0}(")).font(.system(.title2, design: .rounded).weight(.bold)).lineSpacing(5).padding(20)
                .frame(maxWidth: .infinity, alignment: .leading).background(ArcadeTheme.surface, in: RoundedRectangle(cornerRadius: 20))
            if !progress.completed {
                InputField(title: "\(clue.answer.count)-letter answer", text: input).submitLabel(.go).onSubmit(submit).focused($answering)
                Button("Check answer", action: submit).buttonStyle(ActionButtonStyle()).disabled(progress.pendingAnswer.count != clue.answer.count).accessibilityIdentifier("submit-answer")
                HStack {
                    Button(progress.hints == 0 ? "Get a hint" : "First letter") { withAnimation(.snappy) { store.update(.cryptic, edition) { $0.hints = min(2, $0.hints + 1) } } }.disabled(progress.hints >= 2).accessibilityIdentifier("get-hint")
                    Spacer(); Button("Reveal") { showReveal = true }
                }.font(.subheadline.bold()).buttonStyle(TextActionStyle())
            }
            if progress.hints >= 1 { Label(clue.hint, systemImage: "lightbulb").font(.callout).transition(.opacity) }
            if progress.hints >= 2 { Text("The first letter is \(String(clue.answer.prefix(1))).").font(.headline).transition(.opacity) }
            FeedbackLine(text: feedback)
            if progress.completed {
                Text(clue.answer).font(.system(.largeTitle, design: .rounded).weight(.heavy)).accessibilityIdentifier("cryptic-solution")
                Text("Here's the wordplay").font(.headline)
                Text(clue.explanation).font(.body).lineSpacing(5)
            }
        }.confirmationDialog("Reveal the answer?", isPresented: $showReveal, titleVisibility: .visible) {
            Button("Reveal answer") { store.update(.cryptic, edition) { $0.revealed = true; $0.finish(won: false) } }
        } message: { Text("This finishes today's clue. You can read the full explanation.") }
        .task {
            guard !progress.completed else { return }
            try? await Task.sleep(for: .milliseconds(450))
            answering = !Task.isCancelled
        }
    }
    private func submit() {
        guard !progress.completed, progress.pendingAnswer.count == clue.answer.count else { return }
        if progress.pendingAnswer == clue.answer {
            store.update(.cryptic, edition) { $0.finish(won: true) }; feedback = "That's the twist."
        } else { feedback = "Not quite. Look for a definition at one end of the clue." }
    }
}
