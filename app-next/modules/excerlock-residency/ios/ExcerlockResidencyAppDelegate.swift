import ExpoModulesCore
import UIKit

public class ExcerlockResidencyAppDelegate: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    Residency.shared.launched(options: launchOptions)
    return true
  }
}
