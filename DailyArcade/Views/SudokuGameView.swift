import SwiftUI

struct SudokuGameView: View {
    let edition: DailyEdition
    @Environment(ArcadeStore.self) private var store
    @State private var selected: Int?
    @State private var pencil = false
    @State private var feedback = ""
    @State private var showConflicts = false
    @State private var reveal = false
    private var progress: GameProgress { store.progress(.sudoku, edition) }
    private var puzzle: SudokuPuzzle { store.sudoku(edition) }
    private var board: [Int] { progress.board.isEmpty ? puzzle.givens : progress.board }
    private var conflicts: Set<Int> { showConflicts ? SudokuPuzzle.conflicts(board) : [] }
    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            Text("Small grid. Big satisfaction.").font(.system(.title, design: .rounded).weight(.heavy))
            Text("Use 1–6 once in every row, column, and 2 × 3 box.").font(.callout).foregroundStyle(ArcadeTheme.muted)
            GeometryReader { geometry in
                VStack(spacing: 0) {
                    ForEach(0..<6) { row in HStack(spacing: 0) {
                        ForEach(0..<6) { col in
                            let index = row * 6 + col
                            Button { if !progress.completed && puzzle.givens[index] == 0 { selected = index } } label: {
                                ZStack {
                                    Rectangle().fill(cellFill(index))
                                    if board[index] != 0 {
                                        Text("\(board[index])").font(.system(.title2, design: .rounded).weight(puzzle.givens[index] == 0 ? .medium : .heavy))
                                            .foregroundStyle(conflicts.contains(index) ? Color.red : (puzzle.givens[index] != 0 ? ArcadeTheme.ink : ArcadeTheme.tint))
                                    } else {
                                        let notes = progress.notes[index] ?? []
                                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 0), count: 3), spacing: 0) {
                                            ForEach(1...6, id: \.self) { value in Text(notes.contains(value) ? "\(value)" : " ").font(.caption2).foregroundStyle(ArcadeTheme.muted) }
                                        }.padding(2)
                                    }
                                }.frame(width: geometry.size.width / 6, height: geometry.size.width / 6)
                            }.buttonStyle(UndimmedCellStyle()).disabled(progress.completed || puzzle.givens[index] != 0)
                                .accessibilityLabel("Row \(row + 1), column \(col + 1), \(board[index] == 0 ? "empty" : String(board[index])), \(puzzle.givens[index] == 0 ? "editable" : "given")")
                                .accessibilityValue((progress.notes[index] ?? []).isEmpty ? "" : "Notes: \((progress.notes[index] ?? []).map(String.init).joined(separator: ", "))")
                                .accessibilityAddTraits(selected == index ? .isSelected : [])
                                .accessibilityIdentifier("sudoku-cell-\(index)")
                        }
                    } }
                }
                .overlay {
                    Path { path in
                        for index in 0...6 {
                            let point = geometry.size.width * CGFloat(index) / 6
                            path.move(to: CGPoint(x: point, y: 0)); path.addLine(to: CGPoint(x: point, y: geometry.size.width))
                            path.move(to: CGPoint(x: 0, y: point)); path.addLine(to: CGPoint(x: geometry.size.width, y: point))
                        }
                    }.stroke(ArcadeTheme.muted.opacity(0.32), lineWidth: 0.5)
                        .allowsHitTesting(false)
                }
                .overlay {
                    Path { path in
                        for row in [0, 2, 4, 6] {
                            let y = geometry.size.width * CGFloat(row) / 6
                            path.move(to: CGPoint(x: 0, y: y)); path.addLine(to: CGPoint(x: geometry.size.width, y: y))
                        }
                        for col in [0, 3, 6] {
                            let x = geometry.size.width * CGFloat(col) / 6
                            path.move(to: CGPoint(x: x, y: 0)); path.addLine(to: CGPoint(x: x, y: geometry.size.width))
                        }
                    }.stroke(ArcadeTheme.ink, lineWidth: 2).allowsHitTesting(false)
                }
            }.aspectRatio(1, contentMode: .fit).accessibilityIdentifier("sudoku-grid")
            if !progress.completed {
                HStack(spacing: 4) {
                    ForEach(1...6, id: \.self) { value in
                        Button("\(value)") { enter(value) }.font(.title3.weight(.bold)).frame(maxWidth: .infinity).frame(minHeight: 48)
                            .background(ArcadeTheme.surface, in: RoundedRectangle(cornerRadius: 10)).accessibilityLabel("Enter \(value)")
                    }
                    Button { enter(0) } label: { Image(systemName: "delete.left").frame(maxWidth: .infinity).frame(minHeight: 48) }.accessibilityLabel("Erase selected cell")
                }.disabled(selected == nil)
                Toggle("Pencil notes", isOn: $pencil).font(.callout.weight(.semibold))
                HStack {
                    Button("Check for conflicts") {
                        showConflicts = true
                        feedback = SudokuPuzzle.conflicts(board).isEmpty ? "No rule conflicts so far. Keep going." : "The highlighted cells repeat a digit in a row, column, or box."
                    }.frame(minHeight: 44)
                    Spacer()
                    Button("Reveal") { reveal = true }.frame(minHeight: 44)
                }.font(.callout.bold())
                if selected == nil { Text("Tap an empty cell, then a number.").font(.caption).foregroundStyle(ArcadeTheme.muted) }
            }
            FeedbackLine(text: feedback)
        }
        .onAppear { if progress.board.isEmpty { let initial = puzzle.givens; store.update(.sudoku, edition) { $0.board = initial } } }
        .confirmationDialog("Reveal this grid's solution?", isPresented: $reveal, titleVisibility: .visible) {
            Button("Reveal solution") { let solution = puzzle.solution; store.update(.sudoku, edition) { $0.board = solution; $0.notes = [:]; $0.revealed = true; $0.finish(won: false) }; selected = nil }
        } message: { Text("This finishes today's grid. Your result will say that the solution was revealed.") }
    }
    private func cellFill(_ index: Int) -> Color {
        if selected == index { return ArcadeTheme.tint.opacity(0.22) }
        if conflicts.contains(index) { return .red.opacity(0.12) }
        if puzzle.givens[index] != 0 { return ArcadeTheme.surface }
        if let selected, SudokuPuzzle.peers(selected).contains(index) { return ArcadeTheme.surface.opacity(0.5) }
        return ArcadeTheme.paper
    }
    private func enter(_ value: Int) {
        guard let selected, !progress.completed, puzzle.givens[selected] == 0 else { return }
        store.update(.sudoku, edition) { state in
            if state.board.isEmpty { state.board = puzzle.givens }
            if pencil && value > 0 && state.board[selected] == 0 {
                var notes = Set(state.notes[selected] ?? [])
                if notes.contains(value) { notes.remove(value) } else { notes.insert(value) }
                state.notes[selected] = notes.sorted()
            } else {
                state.board[selected] = value; state.notes[selected] = nil
                if value > 0 {
                    for peer in SudokuPuzzle.peers(selected) { state.notes[peer] = state.notes[peer]?.filter { $0 != value } }
                }
                if SudokuPuzzle.isComplete(state.board) { state.finish(won: true) }
            }
        }
        feedback = progress.completed ? "Every row, column, and box. Beautifully done." : ""
    }
}

private struct UndimmedCellStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View { configuration.label }
}
