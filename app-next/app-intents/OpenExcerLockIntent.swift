import AppIntents

/// Minimal main-app intent: opens ExcerLock. No Family Controls, no app-group
/// reads; the intent only launches the app (`openAppWhenRun`).
struct OpenExcerLockIntent: AppIntent {
  static var title: LocalizedStringResource = "Open ExcerLock"
  static var openAppWhenRun: Bool = true

  func perform() async throws -> some IntentResult {
    .result()
  }
}
