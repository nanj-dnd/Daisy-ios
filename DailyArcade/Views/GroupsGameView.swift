import SwiftUI

struct GroupsGameView: View {
    let edition: DailyEdition
    @Environment(ArcadeStore.self) private var store
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var selection: Set<String> = []
    @State private var shuffled: [String] = []
    @State private var feedback = ""
    @State private var wrongTries = 0
    private var progress: GameProgress { store.progress(.groups, edition) }
    private var groups: [WordGroup] { PuzzleContent.groups(for: edition) }
    private var remaining: [String] {
        let solved = Set(progress.solvedGroups.flatMap { groups[$0].words })
        return shuffled.filter { !solved.contains($0) }
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Find four groups of four related words.").font(.callout).foregroundStyle(ArcadeTheme.muted)
            VStack(spacing: 7) {
                ForEach(progress.solvedGroups, id: \.self) { index in solvedRow(index).transition(.scale(scale: 0.92).combined(with: .opacity)) }
            }
            if !progress.completed {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 7), count: 4), spacing: 7) {
                    ForEach(remaining, id: \.self) { word in
                        let chosen = selection.contains(word)
                        Button { toggle(word) } label: {
                            Text(word).font(.system(.subheadline, design: .rounded).weight(.heavy)).minimumScaleFactor(0.6).lineLimit(1).padding(.horizontal, 4)
                                .frame(maxWidth: .infinity).frame(minHeight: 66)
                                .foregroundStyle(chosen ? ArcadeTheme.paper : ArcadeTheme.ink)
                                .background(chosen ? ArcadeTheme.tint : ArcadeTheme.surface, in: RoundedRectangle(cornerRadius: 12))
                                .contentShape(RoundedRectangle(cornerRadius: 12))
                                .scaleEffect(chosen && !reduceMotion ? 0.95 : 1)
                                .animation(ArcadeTheme.press, value: chosen)
                        }.buttonStyle(.plain).accessibilityLabel(word).accessibilityAddTraits(chosen ? .isSelected : [])
                            .modifier(ShakeEffect(shakes: chosen && !reduceMotion ? CGFloat(wrongTries) : 0))
                            .transition(.opacity)
                    }
                }.accessibilityIdentifier("groups-grid")
                HStack {
                    Button("Shuffle") { withAnimation(reduceMotion ? nil : .snappy) { shuffled.shuffle() } }
                    Spacer(minLength: 8)
                    VStack(spacing: 5) {
                        ProgressDots(count: 4, filled: max(0, 4 - progress.mistakes))
                        Text("Mistakes left").font(.caption2).foregroundStyle(ArcadeTheme.muted)
                    }.accessibilityElement(children: .ignore).accessibilityLabel("\(max(0, 4 - progress.mistakes)) mistakes left")
                    Spacer(minLength: 8)
                    Button("Deselect") { selection = []; persistSelection() }.disabled(selection.isEmpty)
                }.font(.callout.bold()).buttonStyle(TextActionStyle())
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
        .sensoryFeedback(.error, trigger: wrongTries)
        .sensoryFeedback(.impact(weight: .medium), trigger: progress.solvedGroups.count)
    }
    private func solvedRow(_ index: Int) -> some View {
        VStack(spacing: 5) { Text(groups[index].title).font(.headline); Text(groups[index].words.joined(separator: " · ")).font(.caption.weight(.semibold)).multilineTextAlignment(.center) }
            .frame(maxWidth: .infinity).padding(.vertical, 14).padding(.horizontal, 12).background([Color("TileGold"), Color("TileGreen"), Color("TileBlue"), Color("TileRose")][index], in: RoundedRectangle(cornerRadius: 14))
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
            feedback = "Connection found."
            withAnimation(reduceMotion ? .easeOut(duration: 0.2) : .spring(response: 0.42, dampingFraction: 0.82)) {
                store.update(.groups, edition) { $0.solvedGroups.append(index); $0.pendingAnswer = ""; if $0.solvedGroups.count == 4 { $0.finish(won: true) } }
                selection = []
            }
        case .oneAway:
            feedback = "One away. Three of those belong together."; mistake()
        case .incorrect:
            feedback = "Those don't share a connection. Try another combination."; mistake()
        }
    }
    private func mistake() {
        withAnimation(.linear(duration: 0.38)) { wrongTries += 1 }
        store.update(.groups, edition) { $0.mistakes += 1; if $0.mistakes == 4 { $0.pendingAnswer = ""; $0.finish(won: false) } }
    }
}
