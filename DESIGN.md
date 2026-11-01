---
name: "X"
description: "Joyful native daily puzzle cards with an open-fold deck."
colors:
  paper: "#EFF7FF"
  paper-dark: "#0D1D30"
  ink: "#102951"
  ink-dark: "#F1F6FF"
  muted: "#4B6081"
  muted-dark: "#B4C6DC"
  surface: "#DDEBFA"
  surface-dark: "#1B3149"
  tint: "#135CA9"
  tint-dark: "#9ED5FF"
  tile-green: "#D8E9F7"
  tile-green-dark: "#183553"
  tile-gold: "#E2E9F6"
  tile-gold-dark: "#243752"
  tile-blue: "#DFECFA"
  tile-blue-dark: "#163258"
  tile-rose: "#DFE9F6"
  tile-rose-dark: "#1B3051"
  deck-blue: "rgb(3.5% 43% 83%)"
  deck-mint: "rgb(37% 86% 66%)"
  deck-yellow: "rgb(100% 83% 30%)"
  deck-lilac: "rgb(68% 53% 98%)"
  deck-coral: "rgb(100% 43% 47%)"
  deck-slate: "rgb(64% 75% 90%)"
  card-navy: "rgb(4% 13% 29%)"
  white: "#FFFFFF"
  collection-navy: "rgb(3.5% 14% 31%)"
  collection-rim: "rgb(8% 47% 90%)"
  word-correct: "rgb(12% 43% 29%)"
  word-present: "rgb(56% 36% 4%)"
typography:
  brand:
    fontFamily: "SF Pro Rounded"
    fontSize: "57pt"
    fontWeight: 900
  display:
    fontFamily: "SF Pro Rounded"
    fontSize: "largeTitle (Dynamic Type)"
    fontWeight: 800
  headline:
    fontFamily: "SF Pro Rounded"
    fontSize: "title (Dynamic Type)"
    fontWeight: 800
  question:
    fontFamily: "SF Pro Rounded"
    fontSize: "title2 (Dynamic Type)"
    fontWeight: 700
  title:
    fontFamily: "SF Pro Rounded"
    fontSize: "title3 (Dynamic Type)"
    fontWeight: 800
  body:
    fontFamily: "SF Pro"
    fontSize: "body (Dynamic Type)"
  input:
    fontFamily: "SF Pro"
    fontSize: "title3 (Dynamic Type)"
  label:
    fontFamily: "SF Pro"
    fontSize: "headline (Dynamic Type)"
    fontWeight: 600
  support:
    fontFamily: "SF Pro"
    fontSize: "callout (Dynamic Type)"
  caption:
    fontFamily: "SF Pro"
    fontSize: "caption (Dynamic Type)"
    fontWeight: 600
rounded:
  tile: "10pt"
  group: "12pt"
  control: "14pt"
  panel: "18pt"
  clue: "20pt"
  leaf: "24pt"
spacing:
  fine: "4pt"
  small: "6pt"
  tight: "7pt"
  row: "8pt"
  dots: "9pt"
  list: "12pt"
  field: "16pt"
  leaf: "18pt"
  panel: "20pt"
  page: "22pt"
  sheet: "24pt"
components:
  button-primary:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "15pt 0"
  answer-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.input}"
    rounded: "{rounded.control}"
    padding: "{spacing.field}"
  game-leaf:
    rounded: "{rounded.leaf}"
    padding: "18pt"
    backgroundColor: "{colors.deck-blue}"
    textColor: "{colors.white}"
  result-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel}"
  collection-control:
    backgroundColor: "{colors.collection-navy}"
    textColor: "{colors.white}"
    width: "62pt"
    height: "62pt"
---

# Design System: X

## Overview

**Creative North Star: "Joyful, tactile puzzle cards"**

X feels like a handful of bright puzzle cards: friendly rounded type, visible edges, and direct manipulation. Saturated leaves sit on a quiet adaptive sky canvas. The open fold gives the collection its identity; readable native game screens give each puzzle room to work.

SwiftUI draws every interface surface, diagram, word tile, and control. SF Symbols, system navigation, native sheets, and Dynamic Type are part of this iPhone design language. The approved open-fold direction replaces the earlier glossy and serif explorations.

**Key Characteristics:**
- Bright game-specific leaves with a tactile lower rim.
- Rounded native headlines with plain, readable supporting text.
- One collection circle and native navigation.
- Equivalent readable access through Dynamic Type, VoiceOver, and Reduce Motion.

## Colors

The palette pairs saturated game leaves with blue-tinted adaptive neutrals. Frontmatter is the normative extracted token layer; the sidecar maps light and dark appearances. Asset catalog colors are expressed as their nearest 8-bit sRGB hex; source-defined leaf colors retain their percentage RGB precision.

### Primary

- **Action blue** (`tint`): native actions, answer feedback, selected game controls, and progress dots. Its light and dark variants come from `AccentColor`.
- **Deep Cut blue** (`deck-blue`): the trivia leaf, with white text. The collection's blue lower rim is a separate native color.

### Secondary

- **Ballpark mint, Little Cryptic yellow, Five Letters lilac, Fourfold coral, Mini Sudoku slate**: fixed game identity colors; all use card navy text. These leaves retain their palette in both appearances.
- **Correct-position green / present-letter gold**: word-game feedback, with white letters. These differ from the lighter solved-group fills.
- **Solved group fills** (`tile-green`, `tile-gold`, `tile-blue`, `tile-rose`): adaptive blue-toned surfaces used for completed word groups. Their historical asset names are not an instruction to paint them green, gold, blue, and rose.

### Neutral

- **Sky canvas** (`paper`): page background and primary-action label foreground, resolved per appearance.
- **Navy ink** (`ink`): functional page text; lightens in dark appearance.
- **Quiet blue** (`muted`): explanatory copy, dates, and explicit answer-field prompt.
- **Inset sky** (`surface`): fields, result panels, empty word tiles, and given Sudoku cells.
- **Card navy / card white**: fixed foregrounds on bright leaves. **Collection navy** fills the circular collection control.

**The Honest Color Rule.** Game colors identify leaves; completion, selection, and answer feedback must also have readable text or accessibility descriptions.

## Typography

**Display Font:** Apple's system rounded face (SF Pro Rounded).
**Body Font:** Apple's system default face (SF Pro).

Heavy rounded titles carry the playful character. Supporting instructions and inputs use familiar native styles. Semantic styles scale with Dynamic Type; point measurements in layout refer to native points rather than CSS pixels. Do not freeze the semantic ramp into fixed web font sizes.

- **Brand:** fixed black-weight X mark; this is the lone header identity treatment, not a reusable functional headline size.
- **Display:** rounded heavy `largeTitle` for large answers and score summaries.
- **Headline:** rounded heavy `title` for game invitations and front-leaf names; rear names use rounded heavy `callout`.
- **Question:** rounded bold `title2` for questions and clues; rounded heavy `title2` for grid letters.
- **Title:** rounded heavy `title3` for front-leaf invitations.
- **Body / support:** native `body`, `callout`, and `subheadline` for rules, explanations, and metadata. Rules and several question blocks add native line spacing (5 points).
- **Label / caption:** `headline` for actions; semibold `caption` for compact metadata. Counts, timers, and score summaries use monospaced digits where observed.

## Layout

Home uses safe-area geometry rather than a web breakpoint grid. Header and list margins use the page spacing token. The deck width is the smaller of available width minus 44 points and 390 points. Stack height is `max(300, availableHeight - 190)`. Each header gap is `min(42, stackHeight × 0.075)`; leaf height is `min(366, stackHeight - gap × 5 - 18)`. These formulas preserve the staggered top edges rather than a pile of obscured titles.

Front-leaf horizontal and vertical padding use the leaf token; rear leaves retain horizontal leaf padding with zero vertical padding so their callout names and body-size symbols fit the exposed band. Front conceptual previews occupy 160 points, reduced to 125 when leaf height is below 330 points. Game content scrolls inside a centered maximum width of 600 points with page padding and a 22-point primary vertical rhythm. Result panels use panel spacing; rules sheets use sheet spacing.

At `.xxLarge` Dynamic Type and above, or available home height below 600 points, use the scrollable six-game list. List rows use panel padding, panel rounding, 12-point gaps, full labels, status, and a chevron. The X identity mark keeps its intrinsic size and layout priority. Header progress visually scales only through `.xxxLarge` while its full accessibility label remains available. The decorative tagline is hidden from `.xxLarge` upward; the gesture instruction is hidden for accessibility sizes. The collection control has no redundant visible caption.

**The Readable Fold Rule.** Keep every rear game title visible; switch to the native list when text size or available height makes the fold unsuitable.

## Elevation & Depth

Depth is structural on the deck: the lower edge suggests a thick card, while overlap, small opposing angles, scale, and perspective make the fold legible. Plain game surfaces use tonal layering rather than card shadows.

- **Leaf rim:** same game fill, brightness reduced by 0.16, offset downward by 7 points.
- **Front shadow:** black at 13% opacity, native blur radius 13, downward offset 12 points. Rear leaves use 4% opacity, radius 4, downward offset 4.
- **Leaf edge:** white stroke at 36% opacity on the front and 22% on rear leaves, 1.5 points wide.
- **Collection rim:** blue circular backing offset downward by 5 points.

At rest the front rotates 2.4 degrees; rear rotation is depth multiplied by -1.3 degrees. Rear scaling decreases by 0.019 per depth from a bottom anchor. Native 3D tilt increases 3 degrees per depth with bottom anchoring and perspective 0.42. Drag translation directly modifies the front leaf. Settling uses a spring; Reduce Motion removes deck rotation, 3D tilt, direct drag transforms, and animation while preserving static depth scaling, leaf offsets, and selection changes. Exact motion values live in the sidecar.

## Shapes

Rounded rectangles are the default language: leaf corners are the largest reused radius, panels are gentler, and fields and primary actions share control rounding. Word cells use tile rounding; group selections use group rounding. Sudoku remains a square grid with stronger box divisions. Capsules contain compact preview scores and archive labels. Circles show compact progress and the sole collection control. Shape communicates function; SF Symbols remain native icons rather than emoji or baked images.

## Components

### Buttons

Primary game actions are full-width, native headline labels on action blue, with page-background foreground and vertical padding of 15 points. `ActionButtonStyle` uses control rounding; pressed opacity is 0.75 and disabled opacity is 0.42. Secondary help, reveal, shuffle, and navigation actions use native text or toolbar buttons with at least 44-point targets where explicitly sized. There is no separate Play button on a leaf.

### Inputs / Fields

`InputField` uses native `TextField`, input typography, field padding, and an inset-sky rounded background. The prompt explicitly uses the muted token. Letter answers capitalize characters and disable autocorrection; estimates use decimal input. Native focus, keyboard, and submission behavior remain authoritative. Feedback appears as a callout in the action tint and exposes frequent updates to accessibility.

### Cards / Containers

`GameLeaf` is the signature saturated card with rounded heavy name, native symbol or completion seal, a conceptual preview, invitation, and concise game format. The whole front leaf opens its game. Decorative preview dots and shapes do not represent live progress; the header's completion count and dots do. Result and estimate panels use adaptive surface fill, panel radius, and panel padding. Clues use the larger clue radius.

### Navigation

Home has one collection circle with a white `square.3.layers.3d` SF Symbol. It opens a native sheet with a segmented Games / Archive / You picker. Games push through `NavigationStack`; game titles are inline with a native back control and a toolbar rules button. Rules and collection use native Done buttons and visible sheet drag indicators. Result sharing uses `ShareLink`.

### Open-fold deck

Only the front leaf receives pointer events and accessibility focus. It exposes a button action plus VoiceOver adjustable next/previous selection. Drag begins after 16 points and cycles when dominant-axis displacement exceeds 45 points; a selection haptic accompanies cycling. The deck may cycle in either direction and retains actual per-game status. The large-text list provides ordinary native buttons instead of transforms.

**The Native Surface Rule.** Build text, diagrams, and controls in SwiftUI; keep raster imagery out of the interface.

### Game feedback

Word grids announce each letter's position result, not just its fill. Sudoku cells expose row, column, editability, value, notes, and selection; given digits remain legible without disabled dimming. Progress dots expose a combined completed-count label. Native confirmation dialogs handle reveals and save recovery. Do not invent a bespoke web focus, hover, or dialog system for these controls.

## Do's and Don'ts

### Do:

- Do use the adaptive named colors for page text, inputs, and supporting surfaces.
- Do preserve visible rear headers, the bottom hinge, opposing leaf angles, and one collection circle on the deck.
- Do use native semantic text styles for functional copy and retain the readable list fallback.
- Do announce actual progress and provide VoiceOver adjustment and activation for the front card.
- Do respect Reduce Motion and use native navigation, sheets, keyboards, and sharing.

### Don't:

- Don't add a tab bar or a separate Play button to the home deck.
- Don't rasterize interface text, cards, diagrams, or controls.
- Don't replace the approved rounded native language with the retired serif or glossy explorations.
- Don't use a preview diagram as evidence of a player's progress.
- Don't treat web-only composition gates as native verification.
