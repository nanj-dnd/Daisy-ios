import SwiftUI

struct GameScreen: View {
    let kind: GameKind
    let edition: DailyEdition
    @Environment(ArcadeStore.self) private var store
    @State private var showRules = false
    @State private var finishedHere = false
    private var completed: Bool { store.progress(kind, edition).completed }
    private var subtitle: String { edition == store.today ? edition.dateLabel : "Archive · \(edition.dateLabel)" }
    /// The result waits for Wordle' tiles to finish turning over.
    private var resultDelay: Double { kind == .word ? 0.85 : 0.1 }
    var body: some View {
        GeometryReader { proxy in
            ScrollViewReader { scroller in
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        if store.recoverableLoadError {
                            ContentUnavailableView("Recover your saved progress", systemImage: "externaldrive.badge.exclamationmark", description: Text("Use the recovery controls above before starting a game."))
                        } else {
                            switch kind {
                            case .word: WordGameView(edition: edition, availableHeight: proxy.size.height)
                            case .cryptic: CrypticGameView(edition: edition)
                            case .estimation: EstimationGameView(edition: edition)
                            case .trivia: TriviaGameView(edition: edition)
                            case .groups: GroupsGameView(edition: edition)
                            case .sudoku: SudokuGameView(edition: edition)
                            }
                            if completed { ResultPanel(kind: kind, edition: edition, delay: finishedHere ? resultDelay : nil).id("result") }
                        }
                    }
                    .padding(.horizontal, 22).padding(.top, 10).padding(.bottom, 12).frame(maxWidth: 600)
                    .frame(maxWidth: .infinity).frame(minHeight: proxy.size.height, alignment: .top)
                }
                .scrollBounceBehavior(.basedOnSize).scrollDismissesKeyboard(.interactively)
                .scrollDisabled(kind == .word && !completed)
                .onChange(of: completed) { _, isComplete in
                    guard isComplete else { return }
                    finishedHere = true
                    withAnimation(ArcadeTheme.step.delay(resultDelay)) { scroller.scrollTo("result", anchor: .bottom) }
                }
            }
        }.background(ArcadeTheme.paper).foregroundStyle(ArcadeTheme.ink)
            .navigationTitle(kind.title).navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    VStack(spacing: 1) {
                        Text(kind.title).font(.headline).foregroundStyle(ArcadeTheme.ink)
                        Text(subtitle).font(.caption).foregroundStyle(ArcadeTheme.muted)
                    }.lineLimit(1).minimumScaleFactor(0.8).accessibilityElement(children: .combine)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showRules = true } label: { Image(systemName: "questionmark.circle").frame(width: 44, height: 44) }.accessibilityLabel("How to play \(kind.title)")
                }
            }
            .sheet(isPresented: $showRules) { RulesSheet(kind: kind) }
            .onAppear { if kind != .trivia { store.start(kind, edition) } }
            .sensoryFeedback(.success, trigger: store.progress(kind, edition).won)
    }
}

struct RulesSheet: View {
    let kind: GameKind
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Image(systemName: kind.symbol).font(.largeTitle).foregroundStyle(kind.cardColor)
                    Text(kind.title).font(.system(.largeTitle, design: .rounded).weight(.heavy))
                    Text(kind.rules).font(.body).lineSpacing(5)
                    Text("New puzzles arrive at midnight UTC. Progress is saved on this device as you play.").font(.callout).foregroundStyle(ArcadeTheme.muted)
                }.padding(24)
            }.background(ArcadeTheme.paper).foregroundStyle(ArcadeTheme.ink)
                .navigationTitle("How to play").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }.presentationDragIndicator(.visible)
    }
}

struct ResultPanel: View {
    let kind: GameKind
    let edition: DailyEdition
    /// Set when the game was finished on this screen; a result reopened later is simply there.
    let delay: Double?
    @Environment(ArcadeStore.self) private var store
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shown = false
    var body: some View {
        let progress = store.progress(kind, edition)
        VStack(alignment: .leading, spacing: 13) {
            Label(progress.won ? "Nicely done." : "Today's round is complete.", systemImage: progress.won ? "checkmark.seal.fill" : "flag.checkered")
                .font(.system(.title2, design: .rounded).weight(.heavy))
            Text("\(store.completedCount(edition)) of 6 daily games completed.").font(.subheadline).foregroundStyle(ArcadeTheme.muted)
            ShareLink(item: ResultShare.text(kind: kind, edition: edition, progress: progress)) { Label("Share result", systemImage: "square.and.arrow.up") }
                .buttonStyle(ActionButtonStyle()).accessibilityIdentifier("share-result")
            if edition == store.today {
                TimelineView(.periodic(from: .now, by: 60)) { _ in
                    HStack(spacing: 4) { Text("Next edition"); Text(edition.nextDate, style: .relative) }.font(.caption).foregroundStyle(ArcadeTheme.muted)
                }
            }
        }.padding(20).frame(maxWidth: .infinity, alignment: .leading).background(ArcadeTheme.surface, in: RoundedRectangle(cornerRadius: 18))
            .opacity(shown || delay == nil ? 1 : 0).offset(y: shown || delay == nil || reduceMotion ? 0 : 16)
            .onAppear { if let delay { withAnimation(ArcadeTheme.step.delay(delay)) { shown = true } } }
    }
}
