# Daisy game review — November 8, 2026

This pass covers the eight-game Expo app in `mobile/`. It preserves the overlapping home deck and each game's established visual identity. The separate SwiftUI app was not changed by this pass.

## Mechanics first

| Game | Mechanics reviewed and corrected | Visual and motion work |
| --- | --- | --- |
| Krillion | Absolute 25-second deadlines remain authoritative across navigation and backgrounding. A submitted prompt cannot score twice. | Shorter, bounded descents; fish outside the visible depth range are not animated; ambient loops stop offscreen. Larger text no longer clips the HUD. The wordmark stays above the waterline, introductory instructions have a dark backing, and long prompts can scroll above the answer bar. |
| Fermi | Rapid taps cannot record a second estimate or skip an unanswered question. Calculator expressions must be complete and finite, support precedence and signed operands, and can only supply positive estimates. | More readable coral, gentler shadow, better question leading and long-unit fitting. Submission dismisses the keyboard. Large-text readers see the question before being asked to type. The answer scale uses measuring ticks rather than a distribution-shaped decoration. |
| Minute Cryptic | Hints cannot decrease or change a completed clue. The first-letter hint fills the first position; delete preserves that letter. Incomplete and incorrect answers cannot finish the clue. | The hint picker protects focus in a native modal with a dismissible backdrop. Compact screens use tighter spacing and can scroll. Key presses honor Reduce Motion; the par label keeps its word intact at larger sizes. |
| Wordle | Input is locked during the reveal, including taps arriving before React redraws. Duplicate guesses and invalid words do not spend attempts. Repeated letters retain the engine's finite-count behavior. | A 120 ms tile stagger with 360 ms flips; keyboard colors update after the final flip at 840 ms. Victory bounce finishes before the result appears. The final keyboard stays in place through the reveal. VoiceOver row labels include each letter's result. |
| Connections | Exact repeated sets are remembered without spending another mistake. Selection order does not bypass that check. Shuffle uses Fisher–Yates. Share text includes attempted rows without exposing the words; old saves still work. | Solved rows fade into place while remaining tiles rearrange. Reduce Motion removes the layout travel. Controls fit narrow widths and enlarged labels; Deselect All wraps at the word boundary. |
| Mini Sudoku | Given cells cannot be edited. Notes cannot overwrite a digit. Both ordinary digits and hints remove impossible peer notes. Clear resets undo history. Scored hint cost was already 30 seconds and is now disclosed. | Grid rules and selection rings use the actual inner board dimensions. Row, column, box and matching-digit highlights agree. Entered and given digits have distinct weights/colors; given-cell selection correctly disables entry keys. |
| Zip | Straight fast drags fill skipped cells without inventing an L-shaped route. Rewinding truncates the path. The final number cannot be reached before every cell is filled, and completion checks the entire path. Reset preserves time and hint count. | Live cell count, consistent grid edges, larger action targets, visible +15-second hint cost and matching timer. Each cell exposes an accessible action so drawing is not the only input path. Reset asks before clearing the line. |
| Globle | Country matching and unlimited guesses are preserved. Equal-distance guesses get an accurate message; neighboring countries are identified consistently, and the closest distance reaches zero on a win. Pan and pinch have independent starting states. | Shorter, interruptible country flights with projection updates bounded to 30 fps. Long rows and country suggestions have larger targets. The globe exposes accessible zoom/rotation actions, a reset control, and brief gesture guidance. The original 1–6× zoom range remains. |

Shared changes: fresh game/day routes reset transient component state; results are mounted after board feedback rather than flashing before a delayed entrance; native edge-back navigation is enabled; unavailable Friends links are hidden. The home countdown now updates its own small component instead of re-rendering the deck once a second. Rejected/no-op actions do not redraw every subscriber or write another save.

## Visual evidence

Captured on an iPhone 17 Pro Simulator, iOS 26.5, using the actual Expo Go app:

- [Light appearance](daisy-review/light.jpg)
- [Dark appearance](daisy-review/dark.jpg)
- [Larger text: accessibility-medium](daisy-review/large.jpg)

The four fixed-appearance games retain their own palettes in dark system appearance. Puzzle glyphs and wordmarks have bounded scaling where their geometry requires it; supporting instructions and scrollable content continue to scale. The floating blue gear is Expo Go's developer control, not a Daisy production control.

Full-resolution captures and export output are local artifacts under `build/daisy-review/`, which is ignored by Git. The review script restores the simulator's previous appearance and text size.

## Validation

- `npm run typecheck` and `npm run lint`: pass.
- `npm test`: 20 gameplay regression tests pass, including solving 401 Zip editions through the touch-step logic.
- `npm run parity`: 7,637 of 7,637 checks pass across 401 editions; daily puzzle content remains unchanged.
- `npm run schema`: 39 of 39 account/friend checks pass.
- `npx expo export --platform ios --output-dir ../build/daisy-review/export-final`: production iOS JavaScript/Hermes export passes. This is not a signed native build or an App Store submission.
- Impeccable's source detector returned no findings. Native screenshots provided the actual layout evidence.

The export originally included 63 asset files totaling 9,877,796 bytes. Direct font-variant imports reduce that to 22 files totaling 1,062,260 bytes, including exactly the six font faces in use: about 89% fewer asset bytes. No dependencies were added to the app.

## Reproduce the screen review

```sh
cd ~/Downloads/daily-arcade-ios/mobile
npm run ios -- --localhost
# In another terminal, substitute your Simulator UDID:
python3 scripts/review-screens.py <UDID>
```

Pillow is optional for generating contact sheets; individual native screenshots do not require it. Development-only local links, for example `exp://127.0.0.1:8081/--/game/word/20765`, make these views reproducible. These local review entry points are disabled in production.

## References and remaining checks

The public pages at [Krillion](https://krillion.io/), [Fermi](https://fermi.gg/), [Minute Cryptic](https://www.minutecryptic.com/), [Globle](https://globle-game.com/), [LinkedIn Zip](https://www.linkedin.com/games/zip/) and [LinkedIn Mini Sudoku](https://www.linkedin.com/games/mini-sudoku/) were consulted. Several expose only an initial JavaScript shell to the research browser. NYT game/help pages could not be fetched, so Wordle and Connections changes were checked against Daisy's existing rules and deterministic engine rather than represented as a fresh live-site comparison.

All eight games were opened for the initial native visual review. After desktop window control became unavailable, final screen verification used simulator deep links and native captures. The regression suite is logic testing, not an automated end-to-end touch suite, and this report does not claim a new manual win in every game after the edits.

A physical phone still needs a check of two-thumb typing, drawing/back-gesture interaction, globe pinch/drag, haptics, VoiceOver navigation and sustained frame pacing. Reduce Motion alternatives are implemented but were not manually exercised on hardware. Existing map/content decisions in `CONTENT.md` remain in place. This pass has not been published to Expo or pushed to GitHub; the tester channel remains on its previously published version.

## Krillion control follow-up

The full-screen stage wrappers could intercept Back and Help even though those controls were visible. The navigation row now renders last, above every stage, with touch-through space between its controls. Decorative world/HUD layers do not take touches. Back dismisses the keyboard and falls back to Home if there is no previous route. Intro/Descend/Surface actions were raised 32 points; the answer bar was raised 16 points. Back and Help were exercised successfully from the round-result screen in the iPhone Simulator; typecheck and lint pass.

The subsequent screenshot check exposed that KeyboardAvoidingView's padding behavior replaces paddingBottom on its own wrapper. The answer row now has a separate opaque tray with its own padding: 16-point side margins, 50-point timer, 48-point field/action heights, and clearance of bottom safe area plus 40 points when the keyboard is hidden (16 points above a visible keyboard). The keyboard-hidden prompt was visually verified in an archive edition; the software-keyboard variant still needs a phone check.

Game content now clips inside the viewport below the fixed header. This prevents Globle's scrolled or completed content from drawing over its wordmark and status bar. All eight games use the same keyboard-dismiss/back-stack/Home fallback. Actual Back taps were checked successfully in Fermi, Minute Cryptic, Wordle, Connections, Mini Sudoku, Zip, Globle's completed view, and Krillion's active archive prompt. Typecheck and lint pass after these changes.
