# Daisy
<!-- impeccable:product-schema 1 -->
## Platform
ios
## Stack
User confirmed native SwiftUI. iOS 17+, Foundation core, no runtime dependencies. Xcode project plus a reproducible XcodeGen specification.
## Users
People who enjoy a short daily collection of trivia, estimation, word and logic games.
## Product Purpose
The user requested an iOS app inspired by Krillion.io, Fermi.gg, Minute Cryptic and other viral daily web games, plus a Git repository. X brings six original versions of those familiar mechanics into one native collection.
## Capabilities and Constraints
Six playable games, deterministic daily editions at midnight UTC, offline use, local atomic progress saves, a 30-day archive, streaks, rules, hints and native result sharing. The editorial starter library rotates; it is not a live content service. Krillion rarity scores are curated rather than based on real player distributions. The SwiftUI app has no accounts, analytics, backend, leaderboard, cross-device sync or App Store submission. The React Native app in `mobile/` adds Zip, each game's original look, and optional accounts with friend leaderboards on Supabase, chosen by the user on 2026-11-02; those need a live project before they work. On 2026-11-06 it also gained Globle as an eighth game, monthly archive packs covering every edition since #1, and a live countdown to the next editions.
## Brand Commitments
The user selected the working name X, image mockups first, an open-fold central card stack, Duolingo-like bright coloring and playful elements, minimal buttons and one circular collection control instead of three tabs. Native Apple navigation and accessibility remain important. The user approved `.impeccable/mocks/x-open-fold.png` with “perfect”. This latest direction replaces the earlier warm editorial and glossy blue explorations. The user chose on 2026-11-02 to show the source games' real names (Krillion, Fermi, Minute Cryptic, Wordle, Connections, Mini Sudoku) instead of the invented ones; those names need permission or replacing before a public release.
## Product Principles
- Swipe cards to explore; tap the front card to play.
- Daily progress and results must reflect actual play.
- Make every game usable offline and easy to resume.
- Use original puzzle content under the games' real names, and never claim affiliation with source publishers.
## Open Decisions
Monetization, a larger ongoing editorial program, App Store developer identity and final public branding. The working name X became Daisy on 2026-11-06.
