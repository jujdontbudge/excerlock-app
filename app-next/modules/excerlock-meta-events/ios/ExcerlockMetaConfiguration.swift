import Foundation

enum ExcerlockMetaConfiguration {
  // The config plugin writes FacebookAppID only for builds with real Meta credentials.
  // Without it the SDK is never started, so a placeholder build makes no Meta network calls.
  static var isConfigured: Bool {
    guard let appID = Bundle.main.object(forInfoDictionaryKey: "FacebookAppID") as? String,
          let token = Bundle.main.object(forInfoDictionaryKey: "FacebookClientToken") as? String else { return false }
    return appID.range(of: "^[0-9]{5,20}$", options: .regularExpression) != nil && !token.isEmpty
  }
}
