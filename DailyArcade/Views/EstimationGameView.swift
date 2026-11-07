import SwiftUI

struct EstimationGameView: View {
    let edition: DailyEdition
    @Environment(ArcadeStore.self) private var store
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @FocusState private var answering: Bool
    @State private var feedback = ""
    private var progress: GameProgress { store.progress(.estimation, edition) }
    private var questions: [EstimateQuestion] { PuzzleContent.estimates(for: edition) }
    private var awaitingAnswer: Bool { !progress.completed && progress.values.count == progress.round }
    private var input: Binding<String> { Binding(get: { progress.pendingAnswer }, set: { value in store.update(.estimation, edition) { $0.pendingAnswer = String(value.prefix(100)) } }) }
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            if progress.completed {
                Text("Your best guesses.").font(.system(.title, design: .rounded).weight(.heavy))
                let factors = zip(progress.values, questions).map { EstimateRules.multiple(guess: $0.0, answer: $0.1.answer) }
                VStack(alignment: .leading, spacing: 2) {
                    Text(String(format: "%.2f×", factors.reduce(0, +) / Double(max(1, factors.count)))).font(.system(.largeTitle, design: .rounded).weight(.heavy)).monospacedDigit()
                    Text("Average error · Lower is better").font(.subheadline).foregroundStyle(ArcadeTheme.muted)
                }
                ForEach(Array(progress.values.enumerated()), id: \.offset) { index, guess in
                    answerReview(questions[index], guess: guess)
                }
            } else {
                HStack { Text("Question \(progress.round + 1) of 3").font(.headline); Spacer(); ProgressDots(count: 3, filled: progress.values.count) }
                let question = questions[min(progress.round, 2)]
                VStack(alignment: .leading, spacing: 20) {
                    Text(question.question).font(.system(.title2, design: .rounded).weight(.bold)).lineSpacing(5)
                    if progress.values.count == progress.round {
                        Text("No searching. A little reasoning goes a long way.").font(.callout).foregroundStyle(ArcadeTheme.muted)
                        InputField(title: "Your estimate", text: input, numeric: true, suffix: question.unit).focused($answering)
                        Button("Lock in estimate", action: submit).buttonStyle(ActionButtonStyle()).disabled(EstimateRules.parse(progress.pendingAnswer) == nil).accessibilityIdentifier("submit-answer")
                        FeedbackLine(text: feedback)
                    } else {
                        answerReview(question, guess: progress.values[progress.round], asked: true).transition(.opacity)
                        Button("Next question") {
                            withAnimation(ArcadeTheme.step) { store.update(.estimation, edition) { $0.round += 1; $0.pendingAnswer = "" } }
                            feedback = ""
                        }.buttonStyle(ActionButtonStyle()).accessibilityIdentifier("next-question")
                    }
                }.id(progress.round).transition(.round(reduceMotion: reduceMotion))
            }
        }
        .task(id: "\(progress.round)-\(awaitingAnswer)") {
            guard awaitingAnswer else { return }
            try? await Task.sleep(for: .milliseconds(450))
            answering = !Task.isCancelled
        }
    }
    private func answerReview(_ question: EstimateQuestion, guess: Double, asked: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            if !asked { Text(question.question).font(.headline) }
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) { Text("Your estimate").font(.caption); Text(EstimateRules.display(guess)).font(.title3.bold()) }
                Spacer(minLength: 10)
                VStack(alignment: .trailing, spacing: 4) { Text("Answer").font(.caption); Text(EstimateRules.display(question.answer)).font(.title3.bold()) }
            }
            Text(String(format: "%.2f× error", EstimateRules.multiple(guess: guess, answer: question.answer))).font(.headline).foregroundStyle(ArcadeTheme.tint)
            Text(question.explanation).font(.callout).foregroundStyle(ArcadeTheme.muted).lineSpacing(3)
        }.padding(20).frame(maxWidth: .infinity, alignment: .leading).background(ArcadeTheme.surface, in: RoundedRectangle(cornerRadius: 18))
    }
    private func submit() {
        guard !progress.completed, progress.values.count == progress.round, let value = EstimateRules.parse(progress.pendingAnswer) else { feedback = "Enter a positive number, such as 1,250."; return }
        withAnimation(.snappy) { store.update(.estimation, edition) { $0.values.append(value); $0.pendingAnswer = ""; if $0.values.count == 3 { $0.finish(won: true) } } }
    }
}
