import ExpoModulesCore
import FBSDKCoreKit

public final class ExcerlockMetaEventsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExcerlockMetaEvents")
    Function("isConfigured") { () -> Bool in ExcerlockMetaConfiguration.isConfigured }
    AsyncFunction("setAdvertiserIDCollection") { (enabled: Bool) in
      guard ExcerlockMetaConfiguration.isConfigured else { return }
      Settings.shared.isAdvertiserIDCollectionEnabled = enabled
    }.runOnQueue(.main)
    AsyncFunction("anonymousID") { () -> String? in
      guard ExcerlockMetaConfiguration.isConfigured else { return nil }
      return AppEvents.shared.anonymousID
    }.runOnQueue(.main)
    AsyncFunction("log") { (name: String, value: Double?, currency: String?, flush: Bool) in
      guard ExcerlockMetaConfiguration.isConfigured else { return }
      var parameters: [AppEvents.ParameterName: Any] = [:]
      if let currency { parameters[.currency] = currency }
      if let value {
        AppEvents.shared.logEvent(AppEvents.Name(rawValue: name), valueToSum: value, parameters: parameters)
      } else {
        AppEvents.shared.logEvent(AppEvents.Name(rawValue: name), parameters: parameters)
      }
      if flush { AppEvents.shared.flush() }
    }.runOnQueue(.main)
  }
}
