# Architecture

- `DailyArcade/Core`: Foundation-only rules, deterministic daily content, seeded randomness, unique-solution 6×6 Sudoku generator, save format and share formatting. The same files compile as a Swift package for fast tests.
- `ArcadeStore.swift`: observable main-thread app state. Atomic JSON saves live in the application's private Application Support directory. Read failures preserve the original file and require recovery before mutations. Timed trivia stores an absolute deadline, so leaving and reopening cannot reset the clock.
- `Views`: native SwiftUI navigation and game interfaces. Views read the edition they were opened with. Timer updates in the shell refresh today's edition on foreground and while running.
- `Resources`: semantic light/dark colors and offline dictionary.
- `project.yml`: reproducible XcodeGen specification. The generated `.xcodeproj` is committed so XcodeGen is optional for normal use.

There are no runtime packages, network calls, analytics or account requirements. Local JSON includes a schema version; unknown formats fail safely instead of overwriting progress.

The public app name is X. The internal target/module, bundle identifier and existing Git repository retain DailyArcade naming. Public naming and implementation identity are independent.
