import SwiftUI

struct CollectionSheet: View {
    let play: (GameKind, DailyEdition) -> Void
    @Environment(ArcadeStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var section = 0
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Collection section", selection: $section) {
                    Text("Games").tag(0); Text("Archive").tag(1); Text("You").tag(2)
                }.pickerStyle(.segmented).padding(.horizontal).padding(.bottom, 12)
                if section == 0 {
                    List {
                        Section {
                            ForEach(GameKind.allCases) { kind in
                                Button { play(kind, store.today) } label: {
                                    HStack(spacing: 14) {
                                        Image(systemName: kind.symbol).font(.title3.weight(.bold)).foregroundStyle(kind.cardColor).frame(width: 28)
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(kind.title).font(.headline).foregroundStyle(ArcadeTheme.ink)
                                            Text(kind.subtitle).font(.subheadline).foregroundStyle(ArcadeTheme.muted)
                                        }
                                        Spacer(minLength: 4)
                                        Text(store.status(kind, store.today)).font(.caption.weight(.semibold)).foregroundStyle(ArcadeTheme.muted)
                                    }.padding(.vertical, 8)
                                }.accessibilityIdentifier("game-\(kind.rawValue)")
                            }
                        } header: { Text(store.today.dateLabel) } footer: { Text("All six games refresh at midnight UTC. Play offline, come back tomorrow.") }
                    }.scrollContentBackground(.hidden)
                } else if section == 1 {
                    List {
                        Section {
                            ForEach(1...30, id: \.self) { offset in
                                let edition = DailyEdition(day: store.today.day - offset)
                                NavigationLink {
                                    ArchiveEditionView(edition: edition, play: play)
                                } label: {
                                    HStack {
                                        VStack(alignment: .leading, spacing: 4) { Text(edition.dateLabel).font(.headline); Text("Edition \(edition.number)").font(.caption).foregroundStyle(ArcadeTheme.muted) }
                                        Spacer(); Text("\(store.completedCount(edition))/6").font(.subheadline.monospacedDigit()).foregroundStyle(ArcadeTheme.muted)
                                    }.padding(.vertical, 5)
                                }
                            }
                        } footer: { Text("The previous 30 days are included. Archive games save separately and do not backfill your daily streak.") }
                    }.scrollContentBackground(.hidden).accessibilityIdentifier("archive-list")
                } else {
                    List {
                        Section("Your play") {
                            LabeledContent("Current daily streak", value: "\(store.streak) day\(store.streak == 1 ? "" : "s")")
                            LabeledContent("Longest streak", value: "\(store.bestStreak) days")
                            LabeledContent("Puzzles completed", value: "\(store.totalCompleted)")
                        }
                        Section("This week") {
                            HStack(spacing: 10) {
                                ForEach((0..<7).reversed(), id: \.self) { offset in
                                    let day = store.today.day - offset
                                    VStack(spacing: 8) {
                                        Image(systemName: store.saveData.playedOnDays.contains(day) ? "checkmark.circle.fill" : "circle").foregroundStyle(ArcadeTheme.tint)
                                        Text(String(DailyEdition(day: day).dateLabel.prefix(1))).font(.caption)
                                    }.frame(maxWidth: .infinity)
                                }
                            }.padding(.vertical, 9).accessibilityElement(children: .ignore).accessibilityLabel("\(store.saveData.playedOnDays.filter { $0 > store.today.day - 7 }.count) days played in the last week")
                        }
                        Section("About Daisy") {
                            Text("Six little games. One good daily habit.").font(.headline)
                            Text("Your progress stays on this device. No account, ads, analytics, or network connection required.")
                            Text("Krillion uses curated answer ratings, not live player statistics. The offline editorial starter pack rotates; future releases can add more original content.").font(.footnote).foregroundStyle(ArcadeTheme.muted)
                            Text("Independent puzzles with original content, named after the daily games that inspired them. Not affiliated with or endorsed by the makers of Krillion, Fermi, Minute Cryptic, Wordle, Connections or Mini Sudoku. Those names belong to their owners.").font(.footnote).foregroundStyle(ArcadeTheme.muted)
                        }
                    }.scrollContentBackground(.hidden)
                }
            }
            .background(ArcadeTheme.paper).foregroundStyle(ArcadeTheme.ink)
            .navigationTitle("Your collection").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }.presentationDragIndicator(.visible).presentationBackground(ArcadeTheme.paper)
    }
}

struct ArchiveEditionView: View {
    let edition: DailyEdition
    let play: (GameKind, DailyEdition) -> Void
    @Environment(ArcadeStore.self) private var store
    var body: some View {
        List {
            Section {
                ForEach(GameKind.allCases) { kind in
                    Button { play(kind, edition) } label: {
                        HStack {
                            Label { Text(kind.title).font(.headline).foregroundStyle(ArcadeTheme.ink) } icon: { Image(systemName: kind.symbol).foregroundStyle(kind.cardColor) }
                            Spacer(minLength: 4); Text(store.status(kind, edition)).font(.caption.weight(.semibold)).foregroundStyle(ArcadeTheme.muted)
                        }.padding(.vertical, 9)
                    }
                }
            } header: { Text(edition.dateLabel) }
        }.scrollContentBackground(.hidden).background(ArcadeTheme.paper).navigationTitle("Edition \(edition.number)").navigationBarTitleDisplayMode(.inline)
    }
}
