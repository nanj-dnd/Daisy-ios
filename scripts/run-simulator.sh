#!/bin/bash
set -euo pipefail
project_root="$(cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$project_root"
if [[ ! -d DailyArcade.xcodeproj ]]; then xcodegen generate; fi
simulator_id="${1:-$(xcrun simctl list devices available --json | python3 -c 'import json,sys; d=json.load(sys.stdin); a=[x for v in d["devices"].values() for x in v if "iPhone" in x["name"]]; a.sort(key=lambda x:x["state"]!="Booted"); print(a[0]["udid"])')}"
if ! xcrun simctl list devices booted | grep -q "$simulator_id"; then xcrun simctl boot "$simulator_id"; fi
xcrun simctl bootstatus "$simulator_id" -b
xcodebuild -project DailyArcade.xcodeproj -scheme DailyArcade -configuration Debug -destination "platform=iOS Simulator,id=$simulator_id" -derivedDataPath build CODE_SIGNING_ALLOWED=NO build
xcrun simctl install "$simulator_id" build/Build/Products/Debug-iphonesimulator/DailyArcade.app
xcrun simctl launch "$simulator_id" in.dailyarcade.app
open -a Simulator 2>/dev/null || true
