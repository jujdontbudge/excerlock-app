import Foundation

@main
struct ShieldCopyOverridesHarness {
  static func main() throws {
    let valid = try ShieldCopyOverrides.parse(
      #"{"fullLock":{"title":"Move first, scroll after.","subtitle":"A 20-min walk gets you 30 more minutes."},"lockWindow":{"title":"Apps are asleep."}}"#
    )
    precondition(valid["fullLock"]?["title"] == "Move first, scroll after.")
    precondition(valid["fullLock"]?["subtitle"] == "A 20-min walk gets you 30 more minutes.")
    precondition(valid["lockWindow"]?["title"] == "Apps are asleep.")
    precondition(valid["lockWindow"]?["subtitle"] == nil)
    let empty = try ShieldCopyOverrides.parse("{}")
    precondition(empty.isEmpty)

    expectInvalid("{")
    expectInvalid(#""title""#)
    expectInvalid("[]")
    expectInvalid("null")
    expectInvalid(#"{"fullLock":"Move first"}"#)
    expectInvalid(#"{"fullLock":{"title":7}}"#)
    expectInvalid(#"{"fullLock":{"title":true}}"#)
    expectInvalid(#"{"fullLock":null}"#)

    let suiteName = "com.johansardar.excerlock.shield-copy-harness"
    let defaults = UserDefaults(suiteName: suiteName)!
    defer { defaults.removePersistentDomain(forName: suiteName) }
    try ShieldCopyOverrides.write(#"{"balanceEmpty":{"title":"Time's up — for now."}}"#, defaults: defaults)
    let stored = defaults.dictionary(forKey: excerlockShieldCopyOverridesDefaultsKey)
    precondition(stored?["balanceEmpty"] is [String: Any])
    precondition((stored?["balanceEmpty"] as? [String: Any])?["title"] as? String == "Time's up — for now.")
    print("shield copy overrides harness passed")
  }

  private static func expectInvalid(_ json: String) {
    do {
      _ = try ShieldCopyOverrides.parse(json)
      preconditionFailure("expected invalid payload: \(json)")
    } catch ShieldCopyOverridesError.invalidPayload {
    } catch {
      preconditionFailure("unexpected error for \(json): \(error)")
    }
  }
}
