import AppIntents

// PENDING (T01): empty intent preserving the planned App Intents capability.
// No Family Controls, no app-group reads beyond the shared group. Not linked
// into Xcode until the fifth-target detail is resolved.
struct EmptyIntent: AppIntent {
  static var title: LocalizedStringResource = "ExcerLock"
  func perform() async throws -> some IntentResult {
    .result()
  }
}
