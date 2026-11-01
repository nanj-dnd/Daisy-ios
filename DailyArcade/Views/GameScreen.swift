import SwiftUI

struct GameScreen: View {
    let kind: GameKind
    let edition: DailyEdition
    @Environment(ArcadeStore.self) private var store
    @State private var showRules = false
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                HStack {
                    Text(edition.dateLabel).font(.subheadline.weight(.semibold))
                    Spacer(minLength: 4)
                    if edition != store.today { Text("Archive").font(.caption.bold()).padding(7).background(ArcadeTheme.surface, in: Capsule()) }
                }.foregroundStyle(ArcadeTheme.muted)
                if store.recoverableLoadError {
                    ContentUnavailableView("Recover your saved progress", systemImage: "externaldrive.badge.exclamationmark", description: Text("Use the recovery controls above before starting a game."))
                } else {
                    switch kind {
                    case .word: WordGameView(edition: edition)
                    case .cryptic: CrypticGameView(edition: edition)
                    case .estimation: EstimationGameView(edition: edition)
                    case .trivia: TriviaGameView(edition: edition)
                    case .groups: GroupsGameView(edition: edition)
                    case .sudoku: SudokuGameView(edition: edition)
                    }
                    if store.progress(kind, edition).completed { ResultPanel(kind: kind, edition: edition) }
                }
            }.padding(22).frame(maxWidth: 600)
                .frame(maxWidth: .infinity)
        }.background(ArcadeTheme.paper).foregroundStyle(ArcadeTheme.ink)
            .navigationTitle(kind.title).navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) {
                Button { showRules = true } label: { Image(systemName: "questionmark.circle").frame(width: 44, height: 44) }.accessibilityLabel("How to play \(kind.title)")
            } }
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
    @Environment(ArcadeStore.self) private var store
    var body: some View {
        let progress = store.progress(kind, edition)
        VStack(alignment: .leading, spacing: 13) {
            Label(progress.won ? "Nicely done." : "Today's round is complete.", systemImage: progress.won ? "checkmark.seal.fill" : "flag.checkered")
                .font(.system(.title2, design: .rounded).weight(.heavy))
            Text("\(store.completedCount(edition)) of 6 daily games completed.").font(.subheadline).foregroundStyle(ArcadeTheme.muted)
            ShareLink(item: ResultShare.text(kind: kind, edition: edition, progress: progress)) { Label("Share result", systemImage: "square.and.arrow.up").frame(minHeight: 44) }
                .font(.headline).accessibilityIdentifier("share-result")
            if edition == store.today {
                TimelineView(.periodic(from: .now, by: 60)) { _ in
                    HStack(spacing: 4) { Text("Next edition"); Text(edition.nextDate, style: .relative) }.font(.caption).foregroundStyle(ArcadeTheme.muted)
                }
            }
        }.padding(20).frame(maxWidth: .infinity, alignment: .leading).background(ArcadeTheme.surface, in: RoundedRectangle(cornerRadius: 18))

    }
}
