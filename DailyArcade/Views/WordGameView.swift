import SwiftUI

struct WordGameView: View {
    let edition: DailyEdition
    let availableHeight: CGFloat
    @Environment(ArcadeStore.self) private var store
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var feedback = ""
    @State private var rejected = 0
    private var progress: GameProgress { store.progress(.word, edition) }
    private var answer: String { PuzzleContent.word(for: edition) }
    private static let tileGap: CGFloat = 7
    private static let keyboardHeight: CGFloat = 178
    /// Square tiles, sized so the board and keyboard share one screen without scrolling.
    private var boardWidth: CGFloat {
        let tile = max(44, (availableHeight - Self.keyboardHeight - 82 - Self.tileGap * 5) / 6)
        return tile * 5 + Self.tileGap * 4
    }
    private var status: String {
        if !feedback.isEmpty { return feedback }
        if progress.completed { return progress.won ? "You found it: \(answer)." : "Today's word was \(answer)." }
        let left = 6 - progress.guesses.count
        return progress.guesses.isEmpty ? "Green: right place. Gold: elsewhere." : "\(left) guess\(left == 1 ? "" : "es") left"
    }
    /// The strongest result seen for each letter so far.
    private var letterMarks: [Character: LetterMark] {
        var known: [Character: LetterMark] = [:]
        for guess in progress.guesses {
            for (letter, mark) in zip(guess, WordRules.marks(guess: guess, answer: answer)) {
                known[letter] = max(known[letter]?.rawValue ?? 0, mark.rawValue) == mark.rawValue ? mark : known[letter]
            }
        }
        return known
    }
    var body: some View {
        VStack(spacing: 0) {
            VStack(spacing: Self.tileGap) {
                ForEach(0..<6) { row in
                    let word = row < progress.guesses.count ? progress.guesses[row] : (row == progress.guesses.count ? progress.pendingAnswer : "")
                    let letters = Array(word)
                    let marks = row < progress.guesses.count ? WordRules.marks(guess: word, answer: answer) : []
                    HStack(spacing: Self.tileGap) {
                        ForEach(0..<5) { col in
                            WordTile(letter: col < letters.count ? String(letters[col]) : "", mark: marks.isEmpty ? nil : marks[col], delay: Double(col) * 0.12)
                        }
                    }
                    .modifier(ShakeEffect(shakes: row == progress.guesses.count && !reduceMotion ? CGFloat(rejected) : 0))
                    .accessibilityElement(children: .ignore).accessibilityLabel(rowLabel(word, row: row, marks: marks))
                }
            }.frame(maxWidth: boardWidth).frame(maxWidth: .infinity).accessibilityIdentifier("word-grid")
            Text(status).font(.callout.weight(.semibold)).foregroundStyle(feedback.isEmpty ? ArcadeTheme.muted : ArcadeTheme.tint)
                .multilineTextAlignment(.center).frame(maxWidth: .infinity, minHeight: 44)
                .accessibilityIdentifier("feedback").accessibilityAddTraits(.updatesFrequently)
            if !progress.completed {
                Spacer(minLength: 0)
                LetterKeyboard(marks: letterMarks, reveal: progress.guesses.count, canCheck: progress.pendingAnswer.count == 5, canDelete: !progress.pendingAnswer.isEmpty, type: type, delete: delete, check: submit)
                    .frame(height: Self.keyboardHeight)
            }
        }
        .frame(maxHeight: progress.completed ? nil : .infinity, alignment: .top)
        .sensoryFeedback(.error, trigger: rejected)
    }
    private func rowLabel(_ word: String, row: Int, marks: [LetterMark]) -> String {
        if word.isEmpty { return "Guess \(row + 1), empty" }
        guard !marks.isEmpty else { return "Current guess: \(word)" }
        return "Guess \(row + 1): " + zip(Array(word), marks).map { letter, mark in "\(letter), \(mark == .correct ? "correct position" : mark == .present ? "different position" : "absent")" }.joined(separator: "; ")
    }
    private func type(_ letter: Character) {
        guard !progress.completed, progress.pendingAnswer.count < 5 else { return }
        feedback = ""
        store.update(.word, edition) { $0.pendingAnswer.append(letter) }
    }
    private func delete() {
        feedback = ""
        store.update(.word, edition) { if !$0.pendingAnswer.isEmpty { $0.pendingAnswer.removeLast() } }
    }
    private func reject(_ message: String) {
        feedback = message
        withAnimation(.linear(duration: 0.38)) { rejected += 1 }
    }
    private func submit() {
        let guess = progress.pendingAnswer
        guard !progress.completed, guess.count == 5 else { return }
        guard store.isWord(guess) else { return reject("That word isn't in our dictionary. Try another.") }
        guard !progress.guesses.contains(guess) else { return reject("You already tried that word. Try another.") }
        feedback = ""
        store.update(.word, edition) {
            $0.guesses.append(guess); $0.pendingAnswer = ""
            if guess == answer || $0.guesses.count == 6 { $0.finish(won: guess == answer) }
        }
    }
}

private extension LetterMark {
    var fill: Color {
        switch self {
        case .correct: return Color(red: 0.12, green: 0.43, blue: 0.29)
        case .present: return Color(red: 0.56, green: 0.36, blue: 0.04)
        case .absent: return ArcadeTheme.muted.opacity(0.28)
        }
    }
    var ink: Color { self == .absent ? ArcadeTheme.ink : .white }
}

private struct WordTile: View {
    let letter: String
    let mark: LetterMark?
    let delay: Double
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var turn: Double
    init(letter: String, mark: LetterMark?, delay: Double) {
        self.letter = letter; self.mark = mark; self.delay = delay
        _turn = State(initialValue: mark == nil ? 0 : 180)
    }
    var body: some View {
        TurningTile(letter: letter, mark: mark, flat: reduceMotion, turn: turn)
            .onChange(of: mark) { _, new in
                let settled: Double = new == nil ? 0 : 180
                withAnimation(new == nil ? nil : .easeInOut(duration: reduceMotion ? 0.2 : 0.32).delay(delay)) { turn = settled }
            }
    }
}

/// Keeps its old colours until it is edge-on, then shows the result on the way back round.
private struct TurningTile: View, Animatable {
    let letter: String
    let mark: LetterMark?
    let flat: Bool
    var turn: Double
    var animatableData: Double {
        get { turn }
        set { turn = newValue }
    }
    var body: some View {
        let shown = turn >= 90 ? mark : nil
        let shape = RoundedRectangle(cornerRadius: 10)
        ZStack {
            shape.fill(shown?.fill ?? ArcadeTheme.surface)
            if shown == nil && !letter.isEmpty { shape.strokeBorder(ArcadeTheme.ink.opacity(0.3), lineWidth: 1.5) }
            if !letter.isEmpty {
                Text(letter).font(.system(.title2, design: .rounded).weight(.heavy)).foregroundStyle(shown?.ink ?? ArcadeTheme.ink)
                    .transition(.scale(scale: 0.5).combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.2, dampingFraction: 0.55), value: letter)
        .aspectRatio(1, contentMode: .fit)
        .rotation3DEffect(.degrees(flat ? 0 : (turn >= 90 ? turn - 180 : turn)), axis: (x: 1, y: 0, z: 0), perspective: 0.4)
    }
}

private struct LetterKeyboard: View {
    let marks: [Character: LetterMark]
    let reveal: Int
    let canCheck: Bool
    let canDelete: Bool
    let type: (Character) -> Void
    let delete: () -> Void
    let check: () -> Void
    private let gap: CGFloat = 5
    var body: some View {
        GeometryReader { geometry in
            let key = (geometry.size.width - gap * 9) / 10
            let wide = key * 1.5 + gap / 2
            VStack(spacing: 8) {
                row("QWERTYUIOP", key: key)
                row("ASDFGHJKL", key: key)
                HStack(spacing: gap) {
                    LetterKey(fill: ArcadeTheme.tint, ink: ArcadeTheme.paper, enabled: canCheck, press: check) { Image(systemName: "return").font(.body.weight(.bold)) }
                        .frame(width: wide).accessibilityLabel("Check word").accessibilityIdentifier("submit-answer")
                    row("ZXCVBNM", key: key)
                    LetterKey(enabled: canDelete, press: delete) { Image(systemName: "delete.left").font(.body.weight(.bold)) }
                        .frame(width: wide).accessibilityLabel("Delete letter").accessibilityIdentifier("delete-letter")
                }
            }.sensoryFeedback(.impact(flexibility: .soft, intensity: 0.5), trigger: reveal)
        }.dynamicTypeSize(...DynamicTypeSize.xLarge)
    }
    private func row(_ letters: String, key: CGFloat) -> some View {
        HStack(spacing: gap) {
            ForEach(Array(letters), id: \.self) { letter in
                let mark = marks[letter]
                LetterKey(fill: mark?.fill ?? ArcadeTheme.surface, ink: mark?.ink ?? ArcadeTheme.ink, press: { type(letter) }) { Text(String(letter)).font(.system(.body, design: .rounded).weight(.heavy)) }
                    .frame(width: key)
                    .animation(.easeOut(duration: 0.2).delay(0.7), value: mark)
                    .accessibilityLabel("\(String(letter))\(mark.map { $0 == .correct ? ", correct" : $0 == .present ? ", in the word" : ", not in the word" } ?? "")")
                    .accessibilityIdentifier("key-\(letter)")
            }
        }
    }
}

/// Fires on touch-down, one per finger, so fast two-thumb typing never loses a repeated letter.
private struct LetterKey<Face: View>: View {
    var fill = ArcadeTheme.surface
    var ink = ArcadeTheme.ink
    var enabled = true
    let press: () -> Void
    @ViewBuilder let face: () -> Face
    @GestureState private var held = false
    var body: some View {
        let shape = RoundedRectangle(cornerRadius: 10)
        face().frame(maxWidth: .infinity, maxHeight: .infinity).foregroundStyle(ink).background(fill, in: shape).contentShape(shape)
            .scaleEffect(held ? 0.93 : 1).opacity(enabled ? 1 : 0.42)
            .animation(ArcadeTheme.press, value: held)
            .gesture(DragGesture(minimumDistance: 0).updating($held) { _, state, _ in
                if !state && enabled { press() }
                state = true
            })
            .accessibilityElement(children: .ignore).accessibilityAddTraits(.isButton)
            .accessibilityAction { if enabled { press() } }
    }
}
