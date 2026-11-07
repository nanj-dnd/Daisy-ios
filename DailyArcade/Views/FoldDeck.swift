import SwiftUI

/// Every leaf's pose is a pure function of one continuous deck position, so a drag, a release and a
/// second swipe caught mid-flight are all the same motion. The next game waits at the very back: dealing
/// it slips it down behind the stack, then raises it from below the screen onto the front, pushing the
/// rest back a place. Dismissing the front leaf runs the same path in reverse. `position` runs past the
/// deck size without ever wrapping, which keeps springs from unwinding through the stack.
struct DeckLayout {
    static let count = 6
    /// The share of a step spent off the stack; the rest is spent slipping behind it at the back.
    static let exitShare = 0.9
    static let below = CGVector(dx: 0, dy: 1)
    /// How far the front leaf must travel to clear the bottom of the screen.
    let reach: CGFloat
    let band: CGFloat
    let frontDrop: CGFloat
    let cardHeight: CGFloat
    let cardWidth: CGFloat
    let flat: Bool
    /// Distance covered by one full position step along the off-stack path, which the finger tracks one to one.
    var travel: CGFloat { reach / CGFloat(Self.exitShare) }

    struct Pose {
        var offset = CGSize.zero
        var scale = 1.0
        var tilt = 0.0
        var roll = 0.0
        var openness = 0.0
        var layer = 0.0
    }

    /// Depth 0 is the front; -1 and 5 are the same place, the rear slot.
    static func depth(of index: Int, at position: Double) -> Double {
        var depth = (position - Double(index)).truncatingRemainder(dividingBy: Double(count))
        if depth < -1 { depth += Double(count) }
        if depth >= Double(count - 1) { depth -= Double(count) }
        return depth
    }

    func pose(depth: Double, exit: CGVector) -> Pose {
        guard depth < 0 else { return slot(depth) }
        let away = -depth
        if away >= Self.exitShare {
            // Hidden behind the next leaf by the time it swaps ends, so the jump below the screen is never seen.
            var pose = slot(Double(Self.count - 2) + (away - Self.exitShare) / (1 - Self.exitShare))
            pose.layer = 0
            return pose
        }
        var pose = slot(0)
        let distance = CGFloat(away) * travel
        pose.offset.width += exit.dx * distance
        pose.offset.height += exit.dy * distance
        pose.roll += flat ? 0 : Double(max(-16, min(16, exit.dx * distance / 18))) + away * 5
        pose.scale += 0.05 * min(1, away * 3)
        pose.layer = 20
        return pose
    }

    private func slot(_ depth: Double) -> Pose {
        let scale = 1 - depth * 0.019
        let tilt = flat ? 0 : depth * 2.6
        let roll = flat ? 0 : (depth < 1 ? 2.4 - depth * 3.7 : depth * -1.3)
        // The tilt foreshortens the leaf toward its bottom hinge, so pull it back up to keep every band equal.
        let radians = tilt * .pi / 180
        let viewer = max(Double(cardWidth), Double(cardHeight)) / 0.42
        let height = Double(cardHeight) * scale
        let visible = height * cos(radians) / (1 + height * sin(radians) / viewer)
        let drop = (Double(Self.count - 1) - depth) * Double(band) + Double(frontDrop) * max(0, 1 - depth) - (Double(cardHeight) - visible)
        return Pose(offset: CGSize(width: 0, height: drop), scale: scale, tilt: tilt, roll: roll, openness: max(0, 1 - depth), layer: 10 - depth)
    }
}

/// The one view that animates: SwiftUI hands it each interpolated `position`, so stacking order can change mid-flight.
private struct DeckStack: View, Animatable {
    let games: [GameKind]
    let front: Int
    let layout: DeckLayout
    let exits: [CGVector]
    let pressed: Bool
    let edition: DailyEdition
    let zoom: Namespace.ID
    let compact: Bool
    let onPlay: (GameKind) -> Void
    let onCycle: (Int) -> Void
    var position: Double
    @Environment(ArcadeStore.self) private var store
    var animatableData: Double {
        get { position }
        set { position = newValue }
    }
    var body: some View {
        ZStack(alignment: .top) {
            ForEach(Array(games.enumerated()), id: \.element) { index, kind in
                let pose = layout.pose(depth: DeckLayout.depth(of: index, at: position), exit: exits[index])
                let isFront = index == front
                GameLeaf(kind: kind, progress: store.progress(kind, edition), openness: pose.openness, compact: compact)
                    .frame(width: layout.cardWidth, height: layout.cardHeight)
                    .deckZoomSource(kind, in: zoom)
                    .scaleEffect(pose.scale * (isFront && pressed ? 0.985 : 1), anchor: .bottom)
                    .rotation3DEffect(.degrees(pose.tilt), axis: (x: 1, y: 0, z: 0), anchor: .bottom, perspective: 0.42)
                    .rotationEffect(.degrees(pose.roll))
                    .offset(pose.offset)
                    .zIndex(pose.layer)
                    .accessibilityHidden(!isFront)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("\(kind.title). \(kind.subtitle). \(store.status(kind, edition)).")
                    .accessibilityHint("Double tap to play. Swipe up or down to choose another game.")
                    .accessibilityAddTraits(.isButton)
                    .accessibilityAction { onPlay(kind) }
                    .accessibilityAdjustableAction { direction in onCycle(direction == .increment ? 1 : -1) }
                    .accessibilityIdentifier(isFront ? "active-game-card" : "stack-\(index)")
            }
        }
    }
}

struct FoldDeck: View {
    let games: [GameKind]
    let edition: DailyEdition
    let layout: DeckLayout
    let height: CGFloat
    let zoom: Namespace.ID
    let play: (GameKind) -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var target = 0
    @State private var position = 0.0
    @State private var exits = Array(repeating: DeckLayout.below, count: DeckLayout.count)
    @State private var grab: CGSize?
    @State private var feedback = 0
    @GestureState private var touching = false
    private var front: Int { ((target % games.count) + games.count) % games.count }
    private func game(_ offset: Int) -> Int { (((target + offset) % games.count) + games.count) % games.count }
    private static let settle = Animation.spring(response: 0.5, dampingFraction: 0.86)

    var body: some View {
        DeckStack(games: games, front: front, layout: layout, exits: exits, pressed: touching && grab == nil, edition: edition, zoom: zoom, compact: layout.cardHeight < 330, onPlay: play, onCycle: { cycle($0) }, position: position)
            .id(reduceMotion ? front : 0)
            .transition(.opacity)
            .animation(.spring(response: 0.26, dampingFraction: 0.72), value: touching && grab == nil)
            .frame(maxWidth: .infinity, alignment: .top).frame(height: height, alignment: .top)
            .contentShape(Rectangle())
            .gesture(deckGesture)
            .sensoryFeedback(.selection, trigger: feedback)
            .onChange(of: touching) { _, isTouching in if !isTouching, grab != nil { grab = nil; settle() } }
    }

    private var deckGesture: some Gesture {
        DragGesture(minimumDistance: 0)
            .updating($touching) { _, state, _ in state = true }
            .onChanged { value in
                if grab == nil {
                    guard hypot(value.translation.width, value.translation.height) > 8 else { return }
                    grab = value.translation
                }
                if !reduceMotion { track(moved(value.translation)) }
            }
            .onEnded { value in
                if grab == nil { tap(at: value.location) }
                else { release(value) }
            }
    }

    /// Translation since the finger cleared the slop, so the leaf never jumps to catch up with it.
    private func moved(_ translation: CGSize) -> CGSize {
        CGSize(width: translation.width - (grab?.width ?? 0), height: translation.height - (grab?.height ?? 0))
    }
    /// Up and left deal the next game from below; down and right send the front leaf away.
    private func direction(of move: CGSize) -> Int {
        let dominant = abs(move.height) >= abs(move.width) ? move.height : move.width
        return dominant <= 0 ? 1 : -1
    }
    private func track(_ move: CGSize) {
        let distance = hypot(move.width, move.height)
        guard distance > 0 else { return }
        let forward = direction(of: move) > 0
        let unit = CGVector(dx: move.width / distance, dy: move.height / distance)
        if forward { exits[game(1)] = CGVector(dx: -unit.dx * 0.3, dy: 1) } else { exits[game(0)] = unit }
        let travelled = Double(distance / layout.travel)
        let eased = 0.5 * (1 - exp(-travelled / 0.5))
        withAnimation(.interactiveSpring(response: 0.13, dampingFraction: 0.9)) { position = Double(target) + (forward ? eased : -eased) }
    }
    private func release(_ value: DragGesture.Value) {
        let dragged = moved(value.translation), thrown = moved(value.predictedEndTranslation)
        let steps = direction(of: thrown)
        let committed = hypot(thrown.width, thrown.height) > 170 || (direction(of: dragged) == steps && hypot(dragged.width, dragged.height) > 72)
        grab = nil
        guard committed else { return settle() }
        guard !reduceMotion else { return cycle(steps) }
        // Hand the finger's speed to the spring, in units of the distance it still has to cover.
        let remaining = abs(Double(target + steps) - position)
        let speed = Double(hypot(value.velocity.width, value.velocity.height) / layout.travel)
        step(steps, animation: .interpolatingSpring(stiffness: 210, damping: 28, initialVelocity: min(4, speed / max(0.2, remaining))))
    }
    private func settle() { withAnimation(Self.settle) { position = Double(target) } }
    private func tap(at location: CGPoint) {
        let bandEdge = CGFloat(DeckLayout.count - 1) * layout.band
        guard location.y < bandEdge else { return play(games[front]) }
        let depth = DeckLayout.count - 1 - max(0, Int(location.y / layout.band))
        cycle(depth >= 3 ? DeckLayout.count - depth : -depth)
    }
    private func cycle(_ steps: Int) {
        for offset in steps > 0 ? Array(1...steps) : Array(stride(from: 0, to: steps, by: -1)) { exits[game(offset)] = DeckLayout.below }
        step(steps, animation: .spring(response: abs(steps) > 1 ? 0.62 : 0.5, dampingFraction: 0.86))
    }
    private func step(_ steps: Int, animation: Animation) {
        if reduceMotion {
            withAnimation(.easeInOut(duration: 0.2)) { target += steps; position = Double(target) }
        } else {
            target += steps
            withAnimation(animation) { position = Double(target) }
        }
        feedback += 1
    }
}

extension View {
    /// The card opens into its game with the system zoom where it exists; iOS 17 keeps the standard push.
    @ViewBuilder func deckZoomSource(_ kind: GameKind, in namespace: Namespace.ID) -> some View {
        if #available(iOS 18.0, *) {
            matchedTransitionSource(id: kind, in: namespace) { $0.background(.clear) }
        } else { self }
    }
    @ViewBuilder func deckZoomDestination(_ kind: GameKind, in namespace: Namespace.ID, when active: Bool) -> some View {
        if #available(iOS 18.0, *), active { navigationTransition(.zoom(sourceID: kind, in: namespace)) } else { self }
    }
}
