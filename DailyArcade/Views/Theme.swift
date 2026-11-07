import SwiftUI

enum ArcadeTheme {
    static let paper = Color("Paper")
    static let ink = Color("Ink")
    static let muted = Color("Muted")
    static let surface = Color("Surface")
    static let tint = Color.accentColor
    static let cardInk = Color("CardInk")
    static let cardMuted = Color("CardMuted")
    static let cardFill = LinearGradient(colors: [Color("CardTop"), Color("CardBottom")], startPoint: .topLeading, endPoint: .bottomTrailing)
    static func display(_ size: CGFloat, relativeTo style: Font.TextStyle = .title) -> Font { .system(style, design: .rounded).weight(.heavy) }
    static let press = Animation.spring(response: 0.22, dampingFraction: 0.7)
    static let step = Animation.spring(response: 0.42, dampingFraction: 0.88)
}

struct ActionButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled
    func makeBody(configuration: Configuration) -> some View {
        let shape = RoundedRectangle(cornerRadius: 14)
        configuration.label.font(.headline).frame(maxWidth: .infinity).padding(.vertical, 15)
            .foregroundStyle(isEnabled ? ArcadeTheme.paper : ArcadeTheme.muted)
            .background(isEnabled ? ArcadeTheme.tint : ArcadeTheme.muted.opacity(0.2), in: shape)
            .contentShape(shape)
            .scaleEffect(configuration.isPressed ? 0.98 : 1).opacity(configuration.isPressed ? 0.85 : 1)
            .animation(ArcadeTheme.press, value: configuration.isPressed)
    }
}
/// Secondary actions: the whole 44-point row is the target, not just the glyphs.
struct TextActionStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.foregroundStyle(ArcadeTheme.tint).frame(minHeight: 44).contentShape(Rectangle())
            .opacity(isEnabled ? (configuration.isPressed ? 0.55 : 1) : 0.38)
    }
}
/// Filled game keys: the Sudoku pad and the Wordle keyboard.
struct KeyStyle: ButtonStyle {
    var fill = ArcadeTheme.surface
    var ink = ArcadeTheme.ink
    @Environment(\.isEnabled) private var isEnabled
    func makeBody(configuration: Configuration) -> some View {
        let shape = RoundedRectangle(cornerRadius: 10)
        configuration.label.frame(maxWidth: .infinity, maxHeight: .infinity).foregroundStyle(ink).background(fill, in: shape).contentShape(shape)
            .scaleEffect(configuration.isPressed ? 0.93 : 1).opacity(isEnabled ? 1 : 0.42)
            .animation(ArcadeTheme.press, value: configuration.isPressed)
    }
}
struct InputField: View {
    let title: String
    @Binding var text: String
    var numeric = false
    var suffix: String?
    var body: some View {
        HStack(spacing: 10) {
            TextField(title, text: $text, prompt: Text(title).foregroundColor(ArcadeTheme.muted))
                .font(.title3).textInputAutocapitalization(numeric ? .never : .characters)
                .autocorrectionDisabled().keyboardType(numeric ? .decimalPad : .default)
                .accessibilityIdentifier("answer-input")
            if let suffix { Text(suffix).font(.callout.weight(.semibold)).foregroundStyle(ArcadeTheme.muted).lineLimit(1).layoutPriority(1) }
        }
        .padding(16).background(ArcadeTheme.surface, in: RoundedRectangle(cornerRadius: 14))
    }
}
struct FeedbackLine: View {
    let text: String
    var body: some View {
        if !text.isEmpty {
            Text(text).font(.callout).foregroundStyle(ArcadeTheme.tint).frame(maxWidth: .infinity, alignment: .leading)
                .accessibilityIdentifier("feedback").accessibilityAddTraits(.updatesFrequently)
        }
    }
}
struct ProgressDots: View {
    let count: Int
    let filled: Int
    var body: some View {
        HStack(spacing: 9) {
            ForEach(0..<count, id: \.self) { index in
                Circle().fill(index < filled ? ArcadeTheme.tint : ArcadeTheme.tint.opacity(0.16))
                    .frame(width: 9, height: 9)
            }
        }.animation(.snappy, value: filled).accessibilityElement(children: .ignore).accessibilityLabel("\(filled) of \(count) completed")
    }
}
/// A short horizontal shake; advance `shakes` inside an animation to play one.
struct ShakeEffect: GeometryEffect {
    var shakes: CGFloat
    var animatableData: CGFloat {
        get { shakes }
        set { shakes = newValue }
    }
    func effectValue(size: CGSize) -> ProjectionTransform {
        ProjectionTransform(CGAffineTransform(translationX: 7 * sin(shakes * .pi * 4), y: 0))
    }
}
extension AnyTransition {
    /// One question replacing another.
    static func round(reduceMotion: Bool) -> AnyTransition {
        reduceMotion ? .opacity : .asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity), removal: .move(edge: .leading).combined(with: .opacity))
    }
}
