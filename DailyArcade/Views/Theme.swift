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
}

struct ActionButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.headline).frame(maxWidth: .infinity).padding(.vertical, 15)
            .foregroundStyle(Color("Paper")).background(ArcadeTheme.tint, in: RoundedRectangle(cornerRadius: 14))
            .opacity(isEnabled ? (configuration.isPressed ? 0.75 : 1) : 0.42)
    }
}
struct InputField: View {
    let title: String
    @Binding var text: String
    var numeric = false
    var body: some View {
        TextField(title, text: $text, prompt: Text(title).foregroundColor(ArcadeTheme.muted))
            .font(.title3).textInputAutocapitalization(numeric ? .never : .characters)
            .autocorrectionDisabled().keyboardType(numeric ? .decimalPad : .default)
            .padding(16).background(ArcadeTheme.surface, in: RoundedRectangle(cornerRadius: 14))
            .accessibilityIdentifier("answer-input")
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
        }.accessibilityElement(children: .ignore).accessibilityLabel("\(filled) of \(count) completed")
    }
}
