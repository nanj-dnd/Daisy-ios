// swift-tools-version: 6.0
import PackageDescription
let package = Package(name: "DailyArcadeCore", platforms: [.macOS(.v14), .iOS(.v17)], products: [.library(name: "DailyArcadeCore", targets: ["DailyArcadeCore"])], targets: [.target(name: "DailyArcadeCore", path: "DailyArcade/Core"), .testTarget(name: "DailyArcadeCoreTests", dependencies: ["DailyArcadeCore"], path: "DailyArcadeTests")], swiftLanguageModes: [.v5])
