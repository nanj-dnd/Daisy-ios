# Content and research

Checked 2026-11-02. These are mechanic references, not licensed content feeds:

- https://krillion.io/ — timed daily trivia; the original uses rare-answer scoring.
- https://fermi.gg/ — three daily estimates; lower multiplicative error is better.
- https://www.minutecryptic.com/ — a daily cryptic clue and learning tools.
- https://www.linkedin.com/games/ — additional daily logic formats including Mini Sudoku.

X has original names, clues and question text. It does not embed these sites or use their daily answers, artwork, logos or APIs. No affiliation is claimed.

## Starter library

The Swift content bank is `DailyArcade/Core/PuzzleContent.swift`. It ships a rotating editorial starter library, not an infinite editorial service. Cryptics rotate after the number of clues in `cryptics`; word answers rotate after `wordAnswers.count` days. Trivia chooses seven prompts from the available bank; Fourfold chooses four disjoint authored groups. The content selection is deterministic and versioned by the app, so keep the v1 bank order and lengths frozen; use a new versioned bank with an explicit UTC cutover day when expanding published content. Sudoku generates a uniquely solvable board from the UTC day. Ballpark combines factual math questions and date-varying numerical scenarios.

All six games select a daily edition at midnight UTC, including across time zone changes. An already open game remains tied to its original edition so guesses cannot leak into the new day. Archive plays are separate from today's progress and cannot backfill streaks.

Before a public launch, commission more original cryptic clues, trivia topics and group sets; add explicit date-based content manifests and a publishing service if the team needs to update content without an app release. This starter app deliberately has no remote content service, accounts, cross-device sync, global leaderboard or real population-derived rarity model.

Deep Cut's 10–100 point rarity ratings are authored editorial values. They are explicitly labeled curated in the UI. The accepted answer list is finite; the rules use exact answers and documented aliases rather than fuzzy validation.

## Dictionary provenance

`allowed-words.txt` is the lowercase, ASCII, five-letter subset of macOS `/usr/share/dict/words` (Webster's Second International, via Berkeley/FreeBSD). The accompanying system README says the 1934 copyright has lapsed according to its supplier. It contains historical and uncommon vocabulary; review and replace with a contemporary licensed wordlist before commercial release. The answer list is a separate hand-authored list of familiar words. No NYT word or puzzle list is included.
