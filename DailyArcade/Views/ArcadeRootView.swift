import SwiftUI
import UIKit
import Combine

struct GameDestination: Hashable { let kind: GameKind; let edition: DailyEdition; var fromDeck = false }

struct ArcadeRootView: View {
    @Environment(ArcadeStore.self) private var store
    @Environment(\.scenePhase) private var scenePhase
    @State private var path: [GameDestination] = []
    @State private var collection = false
    @State private var confirmRecovery = false
    @Namespace private var zoom
    private let timer = Timer.publish(every: 15, on: .main, in: .common).autoconnect()
    var body: some View {
        NavigationStack(path: $path) {
            FoldDeckView(edition: store.today, zoom: zoom) { kind in path.append(GameDestination(kind: kind, edition: store.today, fromDeck: true)) } openCollection: { collection = true }
                .navigationBarHidden(true)
                .navigationDestination(for: GameDestination.self) { destination in
                    GameScreen(kind: destination.kind, edition: destination.edition).toolbar(.visible, for: .navigationBar)
                        .deckZoomDestination(destination.kind, in: zoom, when: destination.fromDeck)
                }
        }
        .sheet(isPresented: $collection) {
            CollectionSheet { kind, edition in
                collection = false
                path.append(GameDestination(kind: kind, edition: edition))
            }
        }
        .safeAreaInset(edge: .top) {
            if let error = store.persistenceError {
                VStack(alignment: .leading, spacing: 8) {
                    Text(error).font(.callout)
                    HStack {
                        Button("Retry", action: store.retry).frame(minHeight: 44)
                        if store.recoverableLoadError { Button("Back up and start again") { confirmRecovery = true }.frame(minHeight: 44) }
                    }.font(.callout.bold())
                }.padding().background(ArcadeTheme.surface)
            }
        }
        .confirmationDialog("Keep a backup of the old save and start again?", isPresented: $confirmRecovery, titleVisibility: .visible) {
            Button("Back up and start again", action: store.backupAndReset)
        }
        .onChange(of: scenePhase) { _, phase in if phase == .active { store.refreshDay() } }
        .onReceive(timer) { store.refreshDay(now: $0) }
    }
}

extension GameKind {
    var cardColor: Color {
        switch self {
        case .trivia: return Color(red: 0.035, green: 0.43, blue: 0.83)
        case .estimation: return Color(red: 0.37, green: 0.86, blue: 0.66)
        case .cryptic: return Color(red: 1, green: 0.83, blue: 0.30)
        case .word: return Color(red: 0.68, green: 0.53, blue: 0.98)
        case .groups: return Color(red: 1, green: 0.43, blue: 0.47)
        case .sudoku: return Color(red: 0.64, green: 0.75, blue: 0.90)
        }
    }
    var cardText: Color { self == .trivia ? .white : Color(red: 0.04, green: 0.13, blue: 0.29) }
    var invitation: String {
        switch self {
        case .trivia: return "Go for the unexpected."
        case .estimation: return "Trust your best guess."
        case .cryptic: return "A little twist of thought."
        case .word: return "Find your five."
        case .groups: return "Make the connection."
        case .sudoku: return "Small grid. Big satisfaction."
        }
    }
    /// Real progress for games played in steps; nil where there is nothing to count.
    func steps(_ progress: GameProgress) -> (total: Int, done: Int)? {
        switch self {
        case .trivia: return (7, progress.triviaPoints.count)
        case .estimation: return (3, progress.values.count)
        case .word: return (6, progress.guesses.count)
        case .groups: return (4, progress.solvedGroups.count)
        case .cryptic, .sudoku: return nil
        }
    }
    var cardFootnote: String {
        switch self {
        case .trivia: return "7 rounds · 25 seconds each"
        case .estimation: return "3 questions · One guess each"
        case .cryptic: return "One original clue · Hints included"
        case .word: return "5 letters · 6 chances"
        case .groups: return "16 words · 4 hidden groups"
        case .sudoku: return "6 × 6 · One unique solution"
        }
    }
}

struct FoldDeckView: View {
    let edition: DailyEdition
    let zoom: Namespace.ID
    let play: (GameKind) -> Void
    let openCollection: () -> Void
    @Environment(ArcadeStore.self) private var store
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    private let games = GameKind.allCases
    var body: some View {
        GeometryReader { geometry in
            let width = min(geometry.size.width - 44, 390)
            let stackHeight = max(300, geometry.size.height - 206)
            let frontDrop: CGFloat = 9
            let cardHeight = min(352, stackHeight - 36 * 5 - frontDrop - 14)
            let band = min(44, (stackHeight - cardHeight - frontDrop - 14) / 5)
            let reach = geometry.size.height - (100 + band * 5 + frontDrop) + 46
            VStack(spacing: 0) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text("Daisy").font(.system(size: 50, weight: .black, design: .rounded)).fixedSize().layoutPriority(1).accessibilityLabel("Daisy")
                        if typeSize < .xxLarge { Text("Your daily brain break.").font(.subheadline.weight(.bold)) }
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 9) {
                        HStack(spacing: 6) {
                            ForEach(games) { kind in
                                Circle().fill(store.progress(kind, edition).completed ? kind.cardColor : kind.cardColor.opacity(0.3)).frame(width: 10, height: 10)
                            }
                        }.accessibilityHidden(true)
                        Text("\(store.completedCount(edition)) of 6").font(.subheadline.weight(.heavy)).monospacedDigit().lineLimit(1)
                            .contentTransition(.numericText())
                    }.dynamicTypeSize(...DynamicTypeSize.xxxLarge).padding(.top, 15).accessibilityLabel("\(store.completedCount(edition)) of 6 games completed today")
                }.padding(.horizontal, 22).frame(minHeight: 88, alignment: .top)

                if typeSize >= .xxLarge || geometry.size.height < 600 {
                    ScrollView {
                        VStack(spacing: 12) {
                            ForEach(games) { kind in
                                Button { play(kind) } label: {
                                    HStack {
                                        Image(systemName: kind.symbol)
                                        VStack(alignment: .leading) { Text(kind.title).font(.headline); Text(store.status(kind, edition)).font(.callout) }
                                        Spacer(); Image(systemName: "chevron.right")
                                    }.padding(20).foregroundStyle(kind.cardText).background(kind.cardColor, in: RoundedRectangle(cornerRadius: 18))
                                }.buttonStyle(.plain).accessibilityIdentifier("game-\(kind.rawValue)")
                            }
                        }.padding(.horizontal, 22)
                    }
                } else {
                    FoldDeck(games: games, edition: edition, layout: DeckLayout(reach: reach, band: band, frontDrop: frontDrop, cardHeight: cardHeight, cardWidth: width, flat: reduceMotion), height: stackHeight, zoom: zoom, play: play)
                        .padding(.top, 12).zIndex(1)
                }
                Spacer(minLength: 4)
                VStack(spacing: 7) {
                    if !typeSize.isAccessibilitySize {
                        Text("Swipe to unfold. Tap to play.").font(.footnote.weight(.semibold)).foregroundStyle(ArcadeTheme.muted)
                    }
                    Button(action: openCollection) {
                        Image(systemName: "square.3.layers.3d").font(.system(size: 26, weight: .bold))
                            .foregroundStyle(.white).frame(width: 62, height: 62)
                            .background(Color(red: 0.035, green: 0.14, blue: 0.31), in: Circle())
                            .background(Circle().fill(Color(red: 0.08, green: 0.47, blue: 0.9)).offset(y: 5))
                    }.buttonStyle(CollectionButtonStyle()).accessibilityLabel("Open collection").accessibilityIdentifier("open-collection")
                }.padding(.bottom, 9)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }.background(ArcadeTheme.paper).foregroundStyle(ArcadeTheme.ink)
    }
}

/// The circle presses down onto its rim.
private struct CollectionButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.scaleEffect(configuration.isPressed ? 0.94 : 1)
            .animation(.spring(response: 0.24, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

/// `openness` runs from 0 at the back of the deck to 1 at the front, so a leaf opens as it arrives rather than swapping layouts.
struct GameLeaf: View {
    let kind: GameKind
    let progress: GameProgress
    let openness: Double
    let compact: Bool
    private var contentOpacity: Double { openness * openness }
    var body: some View {
        let shape = RoundedRectangle(cornerRadius: 24)
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .center) {
                Text(kind.title).font(.system(.title, design: .rounded).weight(.heavy)).lineLimit(1).minimumScaleFactor(0.8)
                    .scaleEffect(0.72 + 0.28 * openness, anchor: .leading)
                Spacer(minLength: 4)
                Image(systemName: progress.completed ? "checkmark.seal.fill" : kind.symbol).font(.title2.weight(.bold)).opacity(0.8)
                    .scaleEffect(0.74 + 0.26 * openness, anchor: .trailing)
            }
            if openness > 0 {
                VStack(alignment: .leading, spacing: 0) {
                    if let steps = kind.steps(progress) {
                        HStack(spacing: 7) {
                            ForEach(0..<steps.total, id: \.self) { index in
                                Circle().fill(kind.cardText.opacity(index < steps.done ? 0.95 : 0.3)).frame(width: 9, height: 9)
                            }
                        }.padding(.top, 6).accessibilityHidden(true)
                    }
                    CardPreview(kind: kind, expanded: true).frame(maxWidth: .infinity).frame(height: compact ? 125 : 160).padding(.top, 12)
                    Spacer(minLength: 0)
                    Text(progress.completed ? (progress.won ? "Nicely done. See your result." : "That's today's round.") : kind.invitation)
                        .font(.system(.title3, design: .rounded).weight(.heavy)).lineLimit(1).minimumScaleFactor(0.8)
                    Text(progress.started && !progress.completed ? "Pick up where you left off." : kind.cardFootnote).font(.caption.weight(.semibold)).padding(.top, 3)
                }.opacity(contentOpacity)
            }
        }
        .padding(.horizontal, 18).padding(.top, 10 + 8 * openness).padding(.bottom, 18)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .foregroundStyle(kind.cardText)
        .background(kind.cardColor, in: shape)
        .overlay(shape.strokeBorder(.white.opacity(0.22 + 0.14 * openness), lineWidth: 1.5))
        .background(
            shape.fill(kind.cardColor).brightness(-0.16).offset(y: 7)
                .shadow(color: .black.opacity(0.04 + 0.09 * openness), radius: 4 + 9 * openness, x: 0, y: 4 + 8 * openness)
        )
    }
}

struct CardPreview: View {
    let kind: GameKind
    var expanded = false
    private let navy = Color(red: 0.04, green: 0.13, blue: 0.29)
    var body: some View {
        switch kind {
        case .trivia:
            VStack(spacing: 7) {
                ForEach(Array(zip(["Obvious", "Clever", "Unexpected"], [10, 50, 100])), id: \.0) { label, points in
                    HStack {
                        Text(label).font(.system(.subheadline, design: .rounded).weight(.heavy))
                        Spacer(minLength: 8)
                        Text("\(points)").font(.caption.weight(.heavy)).padding(.horizontal, 9).padding(.vertical, 4)
                            .background(points == 100 ? Color(red: 0.75, green: 0.65, blue: 1) : Color(red: 1, green: 0.86, blue: 0.35), in: Capsule())
                    }.foregroundStyle(navy).padding(.horizontal, 14).padding(.vertical, expanded ? 13 : 4).background(.white, in: RoundedRectangle(cornerRadius: 14))
                }
            }
        case .estimation:
            VStack(spacing: 10) {
                HStack(alignment: .lastTextBaseline, spacing: 4) { Text("1").font(.system(size: expanded ? 64 : 48, weight: .black, design: .rounded)); Text("×").font(.largeTitle.weight(.black)) }
                HStack { Text("Spot on"); Spacer(); Text("2×"); Spacer(); Text("10×") }.font(.subheadline.weight(.bold))
                Capsule().fill(navy.opacity(0.18)).frame(height: 6).overlay(alignment: .leading) { Circle().fill(navy).frame(width: 18, height: 18) }
            }.foregroundStyle(navy)
        case .cryptic:
            VStack(spacing: 15) {
                Text("A little wordplay.").font(.system(.title3, design: .rounded).weight(.heavy))
                HStack(spacing: 6) { ForEach(Array("AHA!"), id: \.self) { letter in Text(String(letter)).font(.title.weight(.heavy)).frame(maxWidth: .infinity).frame(height: expanded ? 68 : 49).background(.white.opacity(0.75), in: RoundedRectangle(cornerRadius: 10)) } }
            }
        case .word:
            VStack(spacing: 7) {
                ForEach(0..<2) { row in HStack(spacing: 6) {
                    ForEach(0..<5) { col in Text(row == 0 ? String(Array("HELLO")[col]) : "")
                        .font(.title3.weight(.heavy)).frame(maxWidth: .infinity).frame(height: expanded ? 64 : 45)
                        .background(row == 0 ? .white.opacity(0.85) : .white.opacity(0.25), in: RoundedRectangle(cornerRadius: 9))
                    }
                } }
            }
        case .groups:
            HStack(spacing: 8) { ForEach(0..<4) { col in VStack(spacing: 8) {
                ForEach(0..<3) { _ in RoundedRectangle(cornerRadius: 8).fill(.white.opacity(col == 1 ? 0.9 : 0.4)).frame(height: expanded ? 44 : 29) }
            } } }
        case .sudoku:
            VStack(spacing: 4) { ForEach(0..<3) { row in HStack(spacing: 4) {
                ForEach(0..<6) { col in Text((row + col) % 3 == 0 ? "\((row * 3 + col) % 6 + 1)" : "")
                    .font(.headline.weight(.bold)).frame(maxWidth: .infinity).frame(height: expanded ? 44 : 32).background(.white.opacity(0.65), in: RoundedRectangle(cornerRadius: 5))
                }
            } } }
        }
    }
}
