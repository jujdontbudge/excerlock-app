import ManagedSettings

private func handle(
  action: ShieldAction,
  completionHandler: @escaping (ShieldActionResponse) -> Void
) {
  if action == .primaryButtonPressed {
    let route = ShieldActionRoute.current()
    ShieldDeepLinkNotification.enqueue(cause: route.cause, deepLink: route.deepLink)
  }

  completionHandler(.close)
}

final class ShieldActionExtension: ShieldActionDelegate {
  override func handle(
    action: ShieldAction,
    for application: ApplicationToken,
    completionHandler: @escaping (ShieldActionResponse) -> Void
  ) {
    handle(action: action, completionHandler: completionHandler)
  }

  override func handle(
    action: ShieldAction,
    for webDomain: WebDomainToken,
    completionHandler: @escaping (ShieldActionResponse) -> Void
  ) {
    handle(action: action, completionHandler: completionHandler)
  }

  override func handle(
    action: ShieldAction,
    for category: ActivityCategoryToken,
    completionHandler: @escaping (ShieldActionResponse) -> Void
  ) {
    handle(action: action, completionHandler: completionHandler)
  }
}
