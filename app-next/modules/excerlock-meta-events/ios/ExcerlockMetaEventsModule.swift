import ExpoModulesCore
import FBSDKCoreKit
#if EXCER_DEVICE_PROOF
import AdSupport
import AppTrackingTransparency
#endif

public final class ExcerlockMetaEventsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExcerlockMetaEvents")
    Function("isConfigured") { () -> Bool in ExcerlockMetaConfiguration.isConfigured }
    AsyncFunction("setAdvertiserIDCollection") { (enabled: Bool) in
      guard ExcerlockMetaConfiguration.isConfigured else { return }
      Settings.shared.isAdvertiserIDCollectionEnabled = enabled
      #if EXCER_DEVICE_PROOF
      // Owner-device proof only: local console, never an analytics event or server property.
      let status = ATTrackingManager.trackingAuthorizationStatus
      let identifier = enabled && status == .authorized
        ? ASIdentifierManager.shared().advertisingIdentifier.uuidString : "none"
      NSLog("[ExcerLockAds] tracking status=%ld idfa=%@", status.rawValue, identifier)
      #endif
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
      #if DEBUG || EXCER_DEVICE_PROOF
      NSLog("[ExcerLockAds] meta event=%@ value=%@ currency=%@", name, value.map(String.init(describing:)) ?? "none", currency ?? "none")
      #endif
    }.runOnQueue(.main)
  }
}
