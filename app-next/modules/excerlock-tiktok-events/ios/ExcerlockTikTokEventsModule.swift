import ExpoModulesCore
import TikTokBusinessSDK

public final class ExcerlockTikTokEventsModule: Module {
  private var started = false

  public func definition() -> ModuleDefinition {
    Name("ExcerlockTikTokEvents")
    Events("onPaymentTrackingOverridden")

    // appSecret is the App Secret from TikTok Events Manager; appStoreId is the numeric App Store ID.
    // testMode turns on the SDK's debug mode, whose events carry a test event code and never reach TikTok reporting.
    AsyncFunction("start") { (appSecret: String, appStoreId: String, tiktokAppId: String, testMode: Bool, promise: Promise) in
      if self.started { promise.resolve(true); return }
      guard let config = TikTokConfig(accessToken: appSecret, appId: appStoreId, tiktokAppId: tiktokAppId) else {
        promise.reject("ERR_TIKTOK_CONFIG", "TikTok configuration rejected"); return
      }
      // Adapty owns every StoreKit transaction; TikTok's observer would log trials and renewals a second time.
      config.disablePaymentTracking()
      if testMode { config.enableDebugMode() }
      TikTokBusiness.initializeSdk(config) { success, error in
        if success {
          self.started = true
          self.guardPaymentTracking()
          promise.resolve(true)
        } else {
          promise.reject("ERR_TIKTOK_START", error?.localizedDescription ?? "TikTok SDK did not start")
        }
      }
    }.runOnQueue(.main)

    AsyncFunction("track") { (name: String, value: Double?, currency: String?, flush: Bool) in
      guard self.started else { return }
      let event = TikTokBaseEvent(eventName: name)
      if let value { event.addProperty(withKey: "value", value: NSNumber(value: value)) }
      if let currency { event.addProperty(withKey: "currency", value: currency) }
      TikTokBusiness.trackTTEvent(event)
      if flush { TikTokBusiness.explicitlyFlush() }
    }.runOnQueue(.main)
  }

  // The SDK's global config can switch StoreKit observation back on after disablePaymentTracking
  // (TikTokBusiness.m, auto_track_Payment_enable). It does so once per launch, after the config fetch,
  // so check a few times and stop the observer if the server turned it on.
  private func guardPaymentTracking() {
    let instance = TikTokBusiness.getInstance() as NSObject
    let flag = NSSelectorFromString("paymentTrackingEnabled")
    let stop = NSSelectorFromString("stopStoreKitObserve")
    guard instance.responds(to: flag), instance.responds(to: stop) else { return }
    for delay in [2.0, 5.0, 10.0, 30.0, 60.0, 120.0] {
      DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
        guard let enabled = instance.value(forKey: "paymentTrackingEnabled") as? Bool, enabled else { return }
        instance.setValue(false, forKey: "paymentTrackingEnabled")
        instance.perform(stop)
        self?.sendEvent("onPaymentTrackingOverridden", ["afterSeconds": delay])
      }
    }
  }
}
