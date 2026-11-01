# Validation

Verified on 2026-11-02 using Xcode 27.2, Swift 6.4.2 and an iPhone 17 Pro Simulator with iOS 26.5. The app's deployment target is iOS 17.0; a physical-device run and older-runtime testing are still required before distribution.

- `swift test`: 12 tests passed, zero failures. This includes deterministic and uniquely solvable Sudoku across 40 seeds, daily boundaries, content integrity, 400 editions of disjoint word groups, repeated letters, input parsing, score symmetry, save round-trips/corruption checks, streak behavior, spoiler-free shares and non-resettable trivia deadlines.
- `xcodebuild … build`: succeeded for iOS Simulator without signing.
- `xcodebuild … test`: six UI tests passed, zero failures. All six game screens and rules open; cryptic hints/reveal/share, three-question estimation completion, archive access, saved word validation/progress and trivia continuation were exercised.
- A targeted deck pass is recorded separately after the final motion/layout changes. See `.impeccable/review/` for the actual Simulator screenshots and motion video.

No source-game API, live player data or backend was used. No App Store or TestFlight upload was performed. Screenshots are Simulator evidence, not renders of HTML or image mockups.
