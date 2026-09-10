import UserNotifications

enum ShieldDeepLinkNotification {
  static func enqueue(cause: String, deepLink: String) {
    let content = UNMutableNotificationContent()
    content.title = "Open ExcerLock"
    content.body = "Tap to continue in ExcerLock."
    content.sound = nil
    content.userInfo = [
      "url": deepLink,
      "shieldCause": cause,
    ]
    let request = UNNotificationRequest(
      identifier: "shield_open",
      content: content,
      trigger: nil
    )
    UNUserNotificationCenter.current().add(request)
  }
}
