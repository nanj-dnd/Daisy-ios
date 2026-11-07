# Daisy on React Native

The Expo version of Daisy, and now the fuller of the two apps. It shares six games and their daily puzzles with the SwiftUI app in the repo root, and adds Zip, Globle, each game's original look, archive packs, a countdown to the next editions, and accounts with friend leaderboards.

## Run

```sh
cd mobile
npm install
npx expo start
```

Press `i` for the iOS Simulator, or scan the QR code with Expo Go on a phone. No Apple signing is needed that way.

## Share with testers

Testers open Daisy in Expo Go from a link, with no Mac or dev server running. The project lives in the `nanj-dnds-team` Expo organization, and since May 2026 Expo Go only opens published apps for members of the organization that owns them. So each tester needs a free Expo account, an invite to the team (expo.dev, then the organization, then Members), and to be signed in to Expo Go.

The link always loads the newest version on the `preview` channel:

```
exp://u.expo.dev/f4bfca40-73af-4502-a5c9-08869a7059b5?channel-name=preview
```

Publish a new version with `npm run share -- --message "what changed"`. `runtimeVersion` uses the `sdkVersion` policy so Expo Go accepts the update; switch to a fingerprint or app-version policy before making real builds.

## Keeping the two apps in step

`src/core/engine.ts` is a port of `DailyArcade/Core`. Editions are seeded, so the two engines must agree exactly, including Swift's shuffle and bounded-random algorithms. `npm run parity` checks the port against `scripts/fixtures/swift-editions.json`, which holds 401 editions produced by the real Swift engine.

`src/core/content.json` and `src/core/words.ts` are generated from the Swift content bank and `allowed-words.txt`. Don't edit them by hand. After changing `DailyArcade/Core`, regenerate them and the fixture from the repo root:

```sh
swiftc DailyArcade/Core/*.swift mobile/scripts/fixtures/export-from-swift.swift -o /tmp/export
```

The script file must be named `main.swift` when compiled, so copy it first. Run the binary with two paths: the content output, then the fixture output.

The same freeze applies here as in `docs/CONTENT.md`: keep the v1 bank order and lengths fixed.

## Each game's look

Every game screen copies its original rather than sharing one style, and `useGameLook` in `src/theme.ts` holds the colours. Krillion, Fermi, Minute Cryptic and Globle have one appearance, as they do at the source; Wordle, Connections, Mini Sudoku and Zip follow light and dark. All sprites in `src/games/Sprites.tsx` are original art, and the fonts (VT323, Caveat, Sansita, Mulish, Montserrat) are open-licensed Google Fonts. Copying this closely adds trade dress risk to the existing naming risk, so see `docs/CONTENT.md` before any public release.

Krillion and Fermi show real player data at the source: rarity from live answers, and a histogram of everyone's guesses. Daisy has no such data, so Krillion's ratings stay curated and Fermi shows only your guess against the answer on a log scale.

Zip and Globle have no Swift counterpart. `makeZip` scrambles a zigzag with backbite moves, which always keep it a single line, so every puzzle is solvable. `npm run parity` checks that for all 401 editions.

Globle draws an orthographic globe with `d3-geo` and `react-native-svg`, both of which run in Expo Go. The map is Natural Earth's public-domain 1:50m countries from `world-atlas`, simplified to about 23,000 points by `scripts/build-world.ts` into `src/core/world.json`; run `npm run world` after changing its names or answer rules. Somaliland and Northern Cyprus are folded into Somalia and Cyprus, and three slivers with no country of their own are dropped. Of the 236 guessable places, 170 can be the answer: territories and anything under about 2,500 km² are left out. Answers walk through a fresh shuffle each cycle, so a country can't repeat until all 170 have had a turn. Distances are the closest gap between two borders, worked out on the phone; countries that touch share points in the map, so neighbours come out at exactly 0 km. Overseas parts count, as they do in the original, so France borders Brazil through French Guiana. `npm run parity` checks a handful of distances against an atlas.

## Archive packs and the countdown

The archive holds every edition since #1 on October 1, 2026, grouped into one pack per month with a progress bar, a calendar of its days and each day's games. Archive plays still save separately and don't count towards streaks. The home screen, the Games list and each result show a live countdown to midnight UTC, and the app moves to the new day the moment it hits zero.

## Accounts and friends

Accounts are optional, and the app runs offline with the Friends tab switched off until a project's keys are set. To turn them on:

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. In Authentication, edit the Magic Link email template so it contains `{{ .Token }}`. Sign-in uses a typed code, not a link.
3. Add an SMTP provider. Supabase's built-in email is rate limited to a few messages an hour.
4. Copy `.env.example` to `.env`, fill in the project URL and publishable key, and restart Expo.

`npm run schema` runs the schema on an embedded Postgres and checks the rules: strangers are invisible, a result can't be posted for someone else or a past day, and can't be edited. Friends join by a shared code, so nobody can be searched for.

Scores are computed on the phone, so a modified client could post a false one. That is fine among friends, and it would need server-side validation before any public leaderboard.

## The deck

`src/deck/layout.ts` is the deck's motion model, ported from `DailyArcade/Views/FoldDeck.swift`. Every leaf's pose is a pure function of one continuous position held in a Reanimated shared value, so swipes run on the UI thread and can be interrupted mid-flight.

The front leaf is thrown: it follows the finger one to one in any direction, flies off the screen the way it was thrown, and fades in at the back while the rest step forward. Tapping a rear band flicks away the leaves in front of it. `docs/deck-motion.html` compares this with the old rise from below and two other options.

Three things keep it working:

- `GameLeaf` derives one pose per frame with `useDerivedValue`, and every animated style reads that. Calling a helper from each style left the styles out of step.
- Leaves are memoized, and React's front-card state updates when the spring lands. A re-render mid-flight froze the deck.
- `zIndex` changes only at whole slots, because each change forces a full tree commit.

## Touch

Don't subscribe `App.tsx` to the whole store. Rebuilding the navigator on each update re-creates the native header, which cancels touches and drops taps. The Wordle keys use native gestures rather than `Pressable` so they fire on touch-down, one per finger.

## Differences from the SwiftUI app

- Opening a game uses the standard push, not the iOS 18 zoom from the card.
- The SwiftUI app has no Zip, Globle, accounts, archive packs, countdown or per-game looks. Its archive is the previous 30 days.
- The SwiftUI deck still deals the next game by raising it from below the screen. This one throws the front leaf away instead.
- Progress lives in AsyncStorage and does not carry over from the SwiftUI app.
- Navigation uses React Navigation directly, not Expo Router.
- There is no UI test suite yet. `npm run parity` covers the engine, and `npm run schema` covers the account rules and standings.
- The gear in the corner is Expo Go's developer button. It isn't in a real build.
- `Wordle`, `Connections`, `Zip` and the other game names belong to their owners. See `docs/CONTENT.md` before any public release.
