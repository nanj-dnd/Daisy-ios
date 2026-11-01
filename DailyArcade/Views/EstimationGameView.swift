import SwiftUI

struct EstimationGameView: View {
    let edition: DailyEdition
    @Environment(ArcadeStore.self) private var store
    @State private var feedback = ""
    private var progress: GameProgress { store.progress(.estimation, edition) }
    private var questions: [EstimateQuestion] { PuzzleContent.estimates(for: edition) }
    private var input: Binding<String> { Binding(get: { progress.pendingAnswer }, set: { value in store.update(.estimation, edition) { $0.pendingAnswer = String(value.prefix(100)) } }) }
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            if progress.completed {
                Text("Your best guesses.").font(.system(.title, design: .rounded).weight(.heavy))
                let factors = zip(progress.values, questions).map { EstimateRules.multiple(guess: $0.0, answer: $0.1.answer) }
                Text(String(format: "%.2f×", factors.reduce(0, +) / Double(max(1, factors.count)))).font(.system(.largeTitle, design: .rounded).weight(.heavy)).monospacedDigit()
                Text("Average error · Lower is better").font(.subheadline).foregroundStyle(ArcadeTheme.muted)
                ForEach(Array(progress.values.enumerated()), id: \.offset) { index, guess in
                    answerReview(questions[index], guess: guess)
                }
            } else {
                HStack { Text("Question \(progress.round + 1) of 3").font(.headline); Spacer(); ProgressDots(count: 3, filled: progress.values.count) }
                let question = questions[min(progress.round, 2)]
                Text(question.question).font(.system(.title2, design: .rounded).weight(.bold)).lineSpacing(5)
                if progress.values.count == progress.round {
                    Text("No searching. A little reasoning goes a long way.").font(.callout).foregroundStyle(ArcadeTheme.muted)
                    InputField(title: "Your estimate in \(question.unit)", text: input, numeric: true)
                    Text(question.unit).font(.caption).foregroundStyle(ArcadeTheme.muted)
                    Button("Lock in estimate", action: submit).buttonStyle(ActionButtonStyle()).disabled(EstimateRules.parse(progress.pendingAnswer) == nil).accessibilityIdentifier("submit-answer")
                    FeedbackLine(text: feedback)
                } else {
                    answerReview(question, guess: progress.values[progress.round])
                    Button("Next question") { store.update(.estimation, edition) { $0.round += 1; $0.pendingAnswer = "" }; feedback = "" }.buttonStyle(ActionButtonStyle()).accessibilityIdentifier("next-question")
                }
            }
        }
    }
    private func answerReview(_ question: EstimateQuestion, guess: Double) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(question.question).font(.headline)
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) { Text("Your estimate").font(.caption); Text(EstimateRules.display(guess)).font(.title3.bold()) }
                Spacer(minLength: 10)
                VStack(alignment: .trailing, spacing: 4) { Text("Answer").font(.caption); Text(EstimateRules.display(question.answer)).font(.title3.bold()) }
            }
            Text(String(format: "%.2f× error", EstimateRules.multiple(guess: guess, answer: question.answer))).font(.headline).foregroundStyle(ArcadeTheme.tint)
            Text(question.explanation).font(.callout).foregroundStyle(ArcadeTheme.muted).lineSpacing(3)
        }.padding(20).background(ArcadeTheme.surface, in: RoundedRectangle(cornerRadius: 18))
    }
    private func submit() {
        guard !progress.completed, progress.values.count == progress.round, let value = EstimateRules.parse(progress.pendingAnswer) else { feedback = "Enter a positive number, such as 1,250."; return }
        store.update(.estimation, edition) { $0.values.append(value); $0.pendingAnswer = ""; if $0.values.count == 3 { $0.finish(won: true) } }
    }
}
