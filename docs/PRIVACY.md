# Privacy

The current app works offline. It does not create accounts, collect analytics, show ads, contact a server, access contacts, or request location. Puzzle progress is stored in the app's private local container. Sharing a result opens the iOS share sheet, and only sends it if the user chooses a destination and completes that action.

Deleting the app removes its local progress, subject to the device's backup settings. There is no cross-device account or sync service. A privacy manifest declaring no tracking, no collected data, and no required-reason API usage is bundled with the app. Revisit that manifest and App Store privacy declarations if new dependencies or network features are added.
