import SwiftUI

struct GroupsGameView: View {
    let edition: DailyEdition
    @Environment(ArcadeStore.self) private var store
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var selection: Set<String> = []
    @State private var shuffled: [String] = []
    @State private var feedback = ""
    private var progress: GameProgress { store.progress(.groups, edition) }
    private var groups: [WordGroup] { PuzzleContent.groups(for: edition) }
    private var remaining: [String] {
        let solved = Set(progress.solvedGroups.flatMap { groups[$0].words })
        return shuffled.filter { !solved.contains($0) }
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Make the connection.").font(.system(.title, design: .rounded).weight(.heavy))
            Text("Find four groups of four related words.").font(.callout).foregroundStyle(ArcadeTheme.muted)
            ForEach(progress.solvedGroups, id: \.self) { index in solvedRow(index) }
            if !progress.completed {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 7), count: 4), spacing: 7) {
                    ForEach(remaining, id: \.self) { word in
                        Button { toggle(word) } label: {
                            Text(word).font(.system(.caption, design: .rounded).weight(.heavy)).minimumScaleFactor(0.7).lineLimit(1)
                                .frame(maxWidth: .infinity).frame(minHeight: 59)
                                .foregroundStyle(selection.contains(word) ? Color("Paper") : ArcadeTheme.ink)
                                .background(selection.contains(word) ? ArcadeTheme.tint : ArcadeTheme.surface, in: RoundedRectangle(cornerRadius: 12))
                        }.buttonStyle(.plain).accessibilityLabel(word).accessibilityAddTraits(selection.contains(word) ? .isSelected : [])
                    }
                }.accessibilityIdentifier("groups-grid")
                HStack {
                    Text("Mistakes left").font(.callout)
                    ProgressDots(count: 4, filled: max(0, 4 - progress.mistakes))
                    Spacer()
                }
                HStack {
                    Button("Shuffle") { withAnimation(reduceMotion ? nil : .snappy) { shuffled.shuffle() } }.frame(minHeight: 44)
                    Spacer()
                    Button("Deselect") { selection = []; persistSelection() }.frame(minHeight: 44).disabled(selection.isEmpty)
                }.font(.callout.bold())
                Button("Submit group", action: submit).buttonStyle(ActionButtonStyle()).disabled(selection.count != 4).accessibilityIdentifier("submit-answer")
            } else if !progress.won {
                Text("The remaining connections").font(.headline)
                ForEach((0..<4).filter { !progress.solvedGroups.contains($0) }, id: \.self) { solvedRow($0) }
            }
            FeedbackLine(text: feedback)
        }.onAppear {
            if shuffled.isEmpty { var rng = SeededRandom(seed: edition.day + 101); shuffled = groups.flatMap(\.words).shuffled(using: &rng) }
            selection = Set(progress.pendingAnswer.split(separator: "|").map(String.init)).intersection(Set(remaining))
        }
    }
    private func solvedRow(_ index: Int) -> some View {
        VStack(spacing: 7) { Text(groups[index].title).font(.headline); Text(groups[index].words.joined(separator: " · ")).font(.caption.weight(.semibold)).multilineTextAlignment(.center) }
            .frame(maxWidth: .infinity).padding(18).background([Color("TileGold"), Color("TileGreen"), Color("TileBlue"), Color("TileRose")][index], in: RoundedRectangle(cornerRadius: 14))
    }
    private func toggle(_ word: String) {
        if selection.contains(word) { selection.remove(word) }
        else if selection.count < 4 { selection.insert(word) }
        persistSelection()
    }
    private func persistSelection() { store.update(.groups, edition) { $0.pendingAnswer = selection.sorted().joined(separator: "|") } }
    private func submit() {
        guard !progress.completed, selection.count == 4 else { return }
        switch GroupRules.check(selection, groups: groups, solved: progress.solvedGroups) {
        case .solved(let index):
            store.update(.groups, edition) { $0.solvedGroups.append(index); $0.pendingAnswer = ""; if $0.solvedGroups.count == 4 { $0.finish(won: true) } }
            selection = []; feedback = "Connection found."
        case .oneAway:
            feedback = "One away. Three of those belong together."; mistake()
        case .incorrect:
            feedback = "Those don't share a connection. Try another combination."; mistake()
        }
    }
    private func mistake() { store.update(.groups, edition) { $0.mistakes += 1; if $0.mistakes == 4 { $0.pendingAnswer = ""; $0.finish(won: false) } } }
}
