import ExpoModulesCore
import FBSDKCoreKit

// AEM needs the SDK started at launch and every incoming URL and Universal Link forwarded to it.
// Each call returns the SDK's answer, and Expo still hands the URL to every other subscriber and to expo-router.
public final class ExcerlockMetaAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    guard ExcerlockMetaConfiguration.isConfigured else { return false }
    Settings.shared.isMetaDataCollectionEnabled = false
    Settings.shared.isAutoLogProductImprovementEnabled = false
    Settings.shared.isSKAdNetworkReportEnabled = false
    #if DEBUG
    Settings.shared.enableLoggingBehavior(.appEvents)
    NSLog("[ExcerLockAds] meta configured; app-event diagnostics enabled")
    NSLog("[ExcerLockAds] meta privacy metadata=%@ productImprovement=%@ skan=%@", String(Settings.shared.isMetaDataCollectionEnabled), String(Settings.shared.isAutoLogProductImprovementEnabled), String(Settings.shared.isSKAdNetworkReportEnabled))
    #endif
    _ = ApplicationDelegate.shared.application(application, didFinishLaunchingWithOptions: launchOptions)
    return false
  }

  public func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    guard ExcerlockMetaConfiguration.isConfigured else { return false }
    return ApplicationDelegate.shared.application(app, open: url, options: options)
  }

  public func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    guard ExcerlockMetaConfiguration.isConfigured else { return false }
    _ = ApplicationDelegate.shared.application(application, continue: userActivity)
    return false
  }
}
