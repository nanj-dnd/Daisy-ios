import SwiftUI
import Combine

struct TriviaGameView: View {
    let edition: DailyEdition
    @Environment(ArcadeStore.self) private var store
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @FocusState private var answering: Bool
    @State private var now = Date()
    private let clock = Timer.publish(every: 0.5, on: .main, in: .common).autoconnect()
    private var progress: GameProgress { store.progress(.trivia, edition) }
    private var prompts: [TriviaPrompt] { PuzzleContent.trivia(for: edition) }
    private var awaitingAnswer: Bool { progress.started && !progress.completed && progress.triviaPoints.count == progress.round }
    private var input: Binding<String> { Binding(get: { progress.pendingAnswer }, set: { value in store.update(.trivia, edition) { $0.pendingAnswer = String(value.prefix(80)) } }) }
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            if !progress.started {
                Text("Go for the unexpected.").font(.system(.title, design: .rounded).weight(.heavy))
                CardPreview(kind: .trivia).padding(20).background(GameKind.trivia.cardColor, in: RoundedRectangle(cornerRadius: 22))
                Text("Seven prompts. Twenty-five seconds each. Name a valid answer, and reach for the less obvious one.").font(.body).lineSpacing(4)
                Text("Scores are curated 10–100 point ratings, not live player percentages. Your timer keeps running if you leave the app.").font(.callout).foregroundStyle(ArcadeTheme.muted)
                Button("Start seven rounds") { withAnimation(ArcadeTheme.step) { store.beginTriviaRound(edition) } }.buttonStyle(ActionButtonStyle()).accessibilityIdentifier("start-trivia")
            } else if progress.completed {
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(progress.triviaPoints.reduce(0, +)) / 700").font(.system(.largeTitle, design: .rounded).weight(.heavy)).monospacedDigit()
                    Text("\(progress.triviaPoints.filter { $0 > 0 }.count) of 7 valid answers · Curated ratings").font(.subheadline).foregroundStyle(ArcadeTheme.muted)
                }
                ForEach(Array(progress.triviaPoints.enumerated()), id: \.offset) { index, points in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(prompts[index].question).font(.headline)
                        HStack { Text(progress.guesses[index].isEmpty ? "Time out / skipped" : progress.guesses[index]); Spacer(); Text("\(points) pts").fontWeight(.bold) }.font(.callout)
                        if let rare = prompts[index].answers.last { Text("A less obvious answer: \(rare.name)").font(.caption).foregroundStyle(ArcadeTheme.muted) }
                    }.padding(17).frame(maxWidth: .infinity, alignment: .leading).background(ArcadeTheme.surface, in: RoundedRectangle(cornerRadius: 16))
                }
            } else {
                HStack {
                    Text("Round \(progress.round + 1) of 7").font(.headline)
                    Spacer()
                    if awaitingAnswer, let deadline = progress.roundDeadline {
                        let seconds = max(0, Int(ceil(deadline.timeIntervalSince(now))))
                        Label("\(seconds)s", systemImage: "timer").font(.title3.monospacedDigit().bold()).foregroundStyle(seconds <= 5 ? Color.red : ArcadeTheme.tint)
                            .contentTransition(.numericText(countsDown: true)).animation(.snappy, value: seconds)
                            .accessibilityLabel("\(seconds) seconds remaining")
                    }
                }
                ProgressDots(count: 7, filled: progress.triviaPoints.count)
                VStack(alignment: .leading, spacing: 20) {
                    Text(prompts[progress.round].question).font(.system(.title2, design: .rounded).weight(.bold)).lineSpacing(5)
                    if progress.triviaPoints.count == progress.round {
                        InputField(title: "One answer", text: input).submitLabel(.go).onSubmit { submit() }.focused($answering)
                        Button("Lock in answer") { submit() }.buttonStyle(ActionButtonStyle()).disabled(progress.pendingAnswer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty).accessibilityIdentifier("submit-answer")
                        Button("Skip this round") { withAnimation(.snappy) { store.submitTrivia(edition, answer: "") } }.buttonStyle(TextActionStyle()).font(.callout.bold()).frame(maxWidth: .infinity)
                    } else {
                        let points = progress.triviaPoints[progress.round]
                        VStack(alignment: .leading, spacing: 6) {
                            Text(points > 0 ? "+\(points) points" : "No points this round").font(.system(.title, design: .rounded).weight(.heavy))
                            if !progress.guesses[progress.round].isEmpty { Text("You said: \(progress.guesses[progress.round])").font(.headline) }
                            Text(points > 0 ? "A valid answer. Ready for the next one?" : "The accepted answers are listed below. Every round is a fresh chance.").font(.callout).foregroundStyle(ArcadeTheme.muted)
                        }.transition(.opacity)
                        DisclosureGroup("Accepted answers and ratings") {
                            VStack(spacing: 10) {
                                ForEach(prompts[progress.round].answers, id: \.name) { answer in HStack { Text(answer.name); Spacer(); Text("\(answer.points)") }.font(.callout) }
                            }.padding(.top, 10)
                        }.font(.callout.weight(.semibold))
                        Button("Next round") { withAnimation(ArcadeTheme.step) { store.nextTriviaRound(edition) } }.buttonStyle(ActionButtonStyle()).accessibilityIdentifier("next-question")
                        Text("Curated answer ratings · One try per prompt").font(.caption).foregroundStyle(ArcadeTheme.muted)
                    }
                }.id(progress.round).transition(.round(reduceMotion: reduceMotion))
            }
        }.onReceive(clock) { tick($0) }
            .onAppear { tick(Date()) }
            .onChange(of: scenePhase) { _, phase in if phase == .active { tick(Date()) } }
            .task(id: "\(progress.round)-\(awaitingAnswer)") {
                guard awaitingAnswer else { return }
                try? await Task.sleep(for: .milliseconds(450))
                answering = !Task.isCancelled
            }
    }
    private func submit() { withAnimation(.snappy) { store.submitTrivia(edition, answer: progress.pendingAnswer) } }
    private func tick(_ date: Date) {
        now = date
        if let deadline = progress.roundDeadline, date >= deadline { store.submitTrivia(edition, answer: "", now: date, timeout: true) }
    }
}
