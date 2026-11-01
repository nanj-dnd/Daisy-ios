import SwiftUI

@main
struct DailyArcadeApp: App {
    @State private var store: ArcadeStore
    init() {
        #if DEBUG
        if ProcessInfo.processInfo.environment["ARCADE_UI_TESTS"] == "1" {
            let url = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("UITests/progress.json")
            if ProcessInfo.processInfo.environment["ARCADE_RESET"] == "1" { try? FileManager.default.removeItem(at: url) }
            _store = State(initialValue: ArcadeStore(repository: ProgressRepository(url: url)))
        } else { _store = State(initialValue: ArcadeStore()) }
        #else
        _store = State(initialValue: ArcadeStore())
        #endif
    }
    var body: some Scene {
        WindowGroup {
            ArcadeRootView().environment(store).tint(ArcadeTheme.tint)
        }
    }
}
