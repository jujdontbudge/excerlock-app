import XCTest

final class DeviceDriver: XCTestCase {
  let app = XCUIApplication(bundleIdentifier: "com.johansardar.excerlock")
  let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
  var environment: [String: String] { ProcessInfo.processInfo.environment }
  func redacted(_ text: String) -> String {
    let safeText = text.replacingOccurrences(of: "(label: 'Verification code'[^\n]*value: )[0-9]{6}", with: "$1<redacted>", options: .regularExpression)
    return ["EXCER_SANDBOX_PASSWORD", "EXCER_EMAIL_CODE"].reduce(safeText) { result, key in
      guard let value = environment[key], !value.isEmpty else { return result }
      return result.replacingOccurrences(of: value, with: "<redacted>")
    }
  }

  override func setUpWithError() throws {
    continueAfterFailure = false
  }

  func capture(_ name: String, application: XCUIApplication? = nil) {
    let utc = ISO8601DateFormatter().string(from: Date())
    print("DEVICE_PROOF UTC=\(utc) checkpoint=\(name)")
    let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
    image.name = "\(utc)-\(name)"
    image.lifetime = .keepAlways
    add(image)
    let tree = XCTAttachment(string: redacted((application ?? app).debugDescription))
    tree.name = "\(utc)-\(name)-accessibility"
    tree.lifetime = .keepAlways
    add(tree)
    if springboard.alerts.firstMatch.exists {
      let alerts = XCTAttachment(string: redacted(springboard.alerts.debugDescription))
      alerts.name = "\(utc)-\(name)-system-alerts"
      alerts.lifetime = .keepAlways
      add(alerts)
    }
  }

  func element(_ text: String, in application: XCUIApplication? = nil) -> XCUIElement {
    let buttons = (application ?? app).buttons.matching(NSPredicate(format: "label == %@", text)).allElementsBoundByIndex
    if let button = buttons.reversed().first(where: { $0.isHittable }) { return button }
    let query = (application ?? app).descendants(matching: .any)
      .matching(NSPredicate(format: "label == %@", text))
    return query.allElementsBoundByIndex.reversed().first(where: { $0.isHittable && $0.isEnabled }) ?? query.firstMatch
  }

  func tap(_ label: String, in application: XCUIApplication? = nil) throws {
    let target = element(label, in: application)
    guard target.waitForExistence(timeout: 10), target.isHittable, target.isEnabled else {
      capture("blocked-missing-control", application: application)
      throw XCTSkip("Missing or obscured control: \(label)")
    }
    target.tap()
  }

  func requireSafePurchase() throws {
    guard environment["EXCER_SANDBOX_CONFIRMED"] == "1",
      environment["EXCER_NO_ACTIVE_ACCESS_CONFIRMED"] == "1",
      environment["EXCER_OWNER_DATA_SAFE"] == "1" else {
      throw XCTSkip("Requires observed sandbox tester, no active access, and owner-data safety assessment")
    }
  }

  func testTapObservedControl() throws {
    guard let label = environment["EXCER_OBSERVED_CONTROL"],
      !["subscribe", "buy", "purchase", "start free trial", "confirm", "delete app", "delete account", "sign out"].contains(label.lowercased()) else {
      throw XCTSkip("Only an observed non-purchase control may be tapped")
    }
    app.activate()
    capture("before-observed-control")
    if environment["EXCER_SYSTEM_CONTROL"] == "1" {
      guard let context = environment["EXCER_SYSTEM_CONTEXT"], !context.isEmpty,
        springboard.alerts.descendants(matching: .staticText).matching(NSPredicate(format: "label CONTAINS[c] %@", context)).firstMatch.exists else {
        throw XCTSkip("Observed system alert context is missing")
      }
      try tap(label, in: springboard)
    } else {
      try tap(label)
    }
    capture("after-observed-control")
  }

  func testRequestTestEmailCode() throws {
    guard let email = environment["EXCER_TEST_EMAIL"],
      ["johansardar77+excertrial1@gmail.com", "johansardar77+excerpaid1@gmail.com", "johansardar77+excertest2@gmail.com", "johansardar77+excertest3@gmail.com"].contains(email) else {
      throw XCTSkip("Only owner-authorized app test accounts may authenticate")
    }
    app.activate()
    let entry = app.descendants(matching: .any).matching(NSPredicate(format: "label IN %@", ["Account and deletion", "Sign in to manage your account"])).firstMatch
    guard entry.waitForExistence(timeout: 15) else {
      capture("test-signin-recovery-unavailable")
      throw XCTSkip("Recovery account controls did not appear")
    }
    if element("Sign in to manage your account").exists {
      try tap("Sign in to manage your account")
    } else {
      try tap("Account and deletion")
      try tap("Sign in")
    }
    try tap("Continue with email")
    let field = app.textFields.firstMatch
    guard field.waitForExistence(timeout: 10) else { throw XCTSkip("Email field missing") }
    field.tap()
    if let value = field.value as? String, value != field.placeholderValue, !value.isEmpty {
      field.press(forDuration: 1.2)
      guard element("Select All").waitForExistence(timeout: 3) else {
        capture("email-selection-menu")
        throw XCTSkip("Select All required before replacing existing email")
      }
      try tap("Select All")
      field.typeText(XCUIKeyboardKey.delete.rawValue)
    }
    field.typeText(email)
    try tap("Send code")
    guard app.staticTexts["Check your email"].waitForExistence(timeout: 20) else {
      capture("email-code-request-not-confirmed")
      throw XCTSkip("Email-code screen did not open")
    }
    capture("test-email-code-requested")
  }

  func testResendCodeAndCaptureResponse() throws {
    app.activate()
    guard app.staticTexts["Check your email"].exists else { throw XCTSkip("Email code page missing") }
    try tap("Resend code")
    let deadline = Date().addingTimeInterval(30)
    while Date() < deadline {
      let button = app.buttons["Resend code"]
      if button.exists && button.isEnabled && (button.value as? String) != "busy" { break }
      Thread.sleep(forTimeInterval: 0.2)
    }
    capture("email-resend-response")
  }

  func testVerifyTestEmailCode() throws {
    guard let code = environment["EXCER_EMAIL_CODE"], code.count == 6,
      code.allSatisfy({ $0.isNumber }), environment["EXCER_TEST_ACCOUNT_AUTHORIZED"] == "1" else {
      throw XCTSkip("Requires protected code for owner-authorized app test account")
    }
    app.activate()
    let field = app.textFields.firstMatch
    guard field.waitForExistence(timeout: 10) else { throw XCTSkip("Code field missing") }
    field.tap()
    field.typeText(code)
    try tap("Verify code")
    Thread.sleep(forTimeInterval: 4)
    capture("test-email-verification-result")
    if app.staticTexts["Check your email"].exists {
      throw XCTSkip("Email verification has not established the selected test account")
    }
  }

  func testSnapshot() {
    app.activate()
    capture("existing-state")
  }

  func settingsRoot(_ settings: XCUIApplication) throws {
    settings.activate()
    for _ in 0..<4 {
      let knownBack = ["Settings", "Privacy & Security", "Developer", "Wi-Fi", "Bluetooth"].compactMap { label -> XCUIElement? in
        let button = settings.navigationBars.buttons[label]
        return button.exists && button.isHittable ? button : nil
      }.first
      guard let back = knownBack else { break }
      back.tap()
    }
    let airplane = settings.switches.matching(identifier: "com.apple.settings.airplaneMode").firstMatch
    for _ in 0..<10 {
      if airplane.exists && airplane.isHittable { return }
      settings.swipeDown()
    }
    capture("settings-root-unavailable", application: settings)
    throw XCTSkip("Settings root not confirmed; no preference changed")
  }

  func testInspectRadioBaseline() throws {
    let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
    try settingsRoot(settings)
    capture("radio-baseline", application: settings)
  }

  func testInspectWiFiControl() throws {
    let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
    try settingsRoot(settings)
    let wifi = settings.buttons.matching(identifier: "com.apple.settings.wifi").firstMatch
    guard wifi.exists && wifi.isHittable else { throw XCTSkip("Observed Wi-Fi settings row missing") }
    wifi.tap()
    capture("wifi-control-before-offline-proof", application: settings)
  }

  func setProofWiFi(_ settings: XCUIApplication, enabled: Bool) throws {
    try settingsRoot(settings)
    let row = settings.buttons.matching(identifier: "com.apple.settings.wifi").firstMatch
    guard row.exists && row.isHittable else { throw XCTSkip("Observed Wi-Fi row missing") }
    row.tap()
    let toggle = settings.switches.matching(NSPredicate(format: "label == %@", "Wi-Fi")).firstMatch
    guard toggle.waitForExistence(timeout: 10), toggle.isHittable,
      let value = toggle.value as? String, ["0", "1"].contains(value) else {
      capture("wifi-toggle-unavailable", application: settings)
      throw XCTSkip("Observed Wi-Fi toggle unavailable")
    }
    if value != (enabled ? "1" : "0") { toggle.tap() }
    XCTAssertEqual(toggle.value as? String, enabled ? "1" : "0")
  }

  func restoreProofRadios(_ settings: XCUIApplication) throws {
    try settingsRoot(settings)
    let airplane = settings.switches.matching(identifier: "com.apple.settings.airplaneMode").firstMatch
    guard airplane.exists && airplane.isHittable else { throw XCTSkip("Airplane Mode restoration control missing") }
    if airplane.value as? String == "1" { airplane.tap() }
    try setProofWiFi(settings, enabled: true)
    try settingsRoot(settings)
    XCTAssertEqual(airplane.value as? String, "0")
    let bluetooth = settings.buttons.matching(identifier: "com.apple.settings.bluetooth").firstMatch
    XCTAssertTrue(bluetooth.label.contains("On"), "Bluetooth must return to its observed On baseline")
    capture("radio-baseline-restored", application: settings)
  }

  func testRestoreRadioBaseline() throws {
    guard environment["EXCER_RADIO_BASELINE_CONFIRMED"] == "1" else { throw XCTSkip("Requires saved Airplane off, Wi-Fi on, Bluetooth on baseline") }
    try restoreProofRadios(XCUIApplication(bundleIdentifier: "com.apple.Preferences"))
  }

  func testOfflinePaywallQueue() throws {
    guard environment["EXCER_RADIO_BASELINE_CONFIRMED"] == "1",
      environment["EXCER_OWNER_DATA_SAFE"] == "1" else { throw XCTSkip("Requires disposable app test state and observed radio baseline") }
    let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
    try settingsRoot(settings)
    let airplane = settings.switches.matching(identifier: "com.apple.settings.airplaneMode").firstMatch
    let wifi = settings.buttons.matching(identifier: "com.apple.settings.wifi").firstMatch
    let bluetooth = settings.buttons.matching(identifier: "com.apple.settings.bluetooth").firstMatch
    guard airplane.value as? String == "0", !wifi.label.contains("Off"), bluetooth.label.contains("On") else {
      capture("unexpected-radio-baseline", application: settings)
      throw XCTSkip("Radio settings differ from the saved baseline; no preference changed")
    }
    try setProofWiFi(settings, enabled: true)
    try settingsRoot(settings)
    var needsRestore = false
    defer {
      if needsRestore {
        do { try restoreProofRadios(settings) }
        catch { XCTFail("Radio restoration blocked; run the prepared testRestoreRadioBaseline immediately") }
      }
    }
    airplane.tap()
    needsRestore = true
    try setProofWiFi(settings, enabled: false)
    try settingsRoot(settings)
    XCTAssertEqual(airplane.value as? String, "1")
    XCTAssertTrue(wifi.label.contains("Off"))
    capture("offline-radio-confirmed", application: settings)
    XCUIDevice.shared.system.open(URL(string: "excerlock://recovery")!)
    Thread.sleep(forTimeInterval: 1)
    XCUIDevice.shared.system.open(URL(string: "excerlock://paywall")!)
    app.activate()
    Thread.sleep(forTimeInterval: 15)
    capture("offline-paywall-queue")
    try restoreProofRadios(settings)
    needsRestore = false
    app.activate()
    Thread.sleep(forTimeInterval: 20)
    capture("online-after-offline-queue")
  }

  func testInspectTrackingSettings() throws {
    let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
    try settingsRoot(settings)
    for _ in 0..<12 {
      if element("Privacy & Security", in: settings).exists && element("Privacy & Security", in: settings).isHittable { break }
      settings.swipeUp()
    }
    try tap("Privacy & Security", in: settings)
    try tap("Tracking", in: settings)
    capture("tracking-settings-before-proof", application: settings)
  }

  func testSettingsSnapshot() {
    let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
    settings.activate()
    capture("settings-state", application: settings)
  }

  func testSettingsObservedControl() throws {
    let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
    let allowed = ["Developer", "Apps", "App Store", "Sandbox Apple Account", "Sandbox Account"]
    guard let label = environment["EXCER_OBSERVED_CONTROL"], allowed.contains(label) else {
      throw XCTSkip("Only sandbox Settings navigation is allowed")
    }
    settings.activate()
    if label == "Developer" || label == "Apps" { try settingsRoot(settings) }
    capture("settings-before-control", application: settings)
    for _ in 0..<12 {
      if element(label, in: settings).exists && element(label, in: settings).isHittable { break }
      settings.swipeUp()
    }
    try tap(label, in: settings)
    capture("settings-after-control", application: settings)
  }

  func testOpenDedicatedSandboxAccount() throws {
    let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
    settings.activate()
    let cell = settings.cells.matching(identifier: "SANDBOX_ACCOUNT_BUTTON").firstMatch
    guard cell.waitForExistence(timeout: 10),
      cell.label.contains("johansardar77+excersbx1@gmail.com") else {
      capture("dedicated-sandbox-cell-not-confirmed", application: settings)
      throw XCTSkip("Only the confirmed dedicated Sandbox cell may open account management")
    }
    cell.tap()
    capture("dedicated-sandbox-account-management", application: settings)
  }

  func testSignOutDedicatedSandboxAccount() throws {
    let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
    settings.activate()
    guard environment["EXCER_SANDBOX_SETTINGS_CONTEXT_CONFIRMED"] == "1",
      settings.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "johansardar77+excersbx1@gmail.com")).firstMatch.exists,
      settings.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "Sandbox")).firstMatch.exists else {
      capture("sandbox-signout-context-missing", application: settings)
      throw XCTSkip("Never sign out any Apple Account outside confirmed dedicated Sandbox settings")
    }
    capture("sandbox-before-cache-refresh-signout", application: settings)
    try tap("Sign Out", in: settings)
    capture("sandbox-after-cache-refresh-signout", application: settings)
  }

  func testSandboxSettingsLogin() throws {
    let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
    settings.activate()
    guard settings.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "Sandbox")).firstMatch.exists,
      let email = environment["EXCER_SANDBOX_EMAIL"], email == "johansardar77+excersbx1@gmail.com",
      let password = environment["EXCER_SANDBOX_PASSWORD"], !password.isEmpty else {
      throw XCTSkip("Requires the observed Sandbox page and protected tester credentials")
    }
    capture("sandbox-settings-before-login", application: settings)
    if element(email, in: settings).exists {
      capture("sandbox-account-already-present", application: settings)
      return
    }
    let sandboxSignIn = settings.cells.matching(identifier: "SANDBOX_ACCOUNT_BUTTON").firstMatch
    for _ in 0..<12 {
      if sandboxSignIn.exists && sandboxSignIn.isHittable { break }
      if sandboxSignIn.exists && sandboxSignIn.frame.minY < 110 { settings.swipeDown() }
      else { settings.swipeUp() }
    }
    guard sandboxSignIn.exists && sandboxSignIn.isHittable else {
      capture("sandbox-signin-cell-missing", application: settings)
      throw XCTSkip("Only the Developer Sandbox account cell may open authentication")
    }
    sandboxSignIn.tap()
    let emailField = settings.textFields.firstMatch
    guard emailField.waitForExistence(timeout: 10) else {
      capture("sandbox-login-fields-missing", application: settings)
      throw XCTSkip("Sandbox email field unavailable")
    }
    emailField.tap()
    emailField.typeText(email)
    try finishSandboxLogin(settings, password: password)
  }

  func testSandboxContinueLogin() throws {
    let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
    settings.activate()
    let email = "johansardar77+excersbx1@gmail.com"
    guard environment["EXCER_SANDBOX_SETTINGS_CONTEXT_CONFIRMED"] == "1",
      settings.textFields.allElementsBoundByIndex.contains(where: { ($0.value as? String)?.lowercased() == email }),
      let password = environment["EXCER_SANDBOX_PASSWORD"], !password.isEmpty else {
      throw XCTSkip("Resume only the observed dedicated Sandbox email authentication sheet")
    }
    try finishSandboxLogin(settings, password: password)
  }

  private func finishSandboxLogin(_ settings: XCUIApplication, password: String) throws {
    let secret = settings.secureTextFields.firstMatch
    if !secret.exists { try tap("Sign In", in: settings) }
    guard secret.waitForExistence(timeout: 10) else {
      capture("sandbox-password-field-missing", application: settings)
      throw XCTSkip("Sandbox password field unavailable")
    }
    secret.tap()
    secret.typeText(password)
    try submitSandboxLogin(settings)
  }

  func testSandboxSubmitCredentials() throws {
    let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
    settings.activate()
    guard environment["EXCER_SANDBOX_SETTINGS_CONTEXT_CONFIRMED"] == "1",
      settings.textFields.allElementsBoundByIndex.contains(where: { ($0.value as? String)?.lowercased() == "johansardar77+excersbx1@gmail.com" }),
      settings.secureTextFields.firstMatch.exists,
      (settings.secureTextFields.firstMatch.value as? String)?.contains("•") == true else {
      throw XCTSkip("Only submit the observed, filled dedicated Sandbox authentication sheet")
    }
    try submitSandboxLogin(settings)
  }

  func testSandboxObservedControl() throws {
    let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
    settings.activate()
    guard environment["EXCER_SANDBOX_SETTINGS_CONTEXT_CONFIRMED"] == "1",
      let label = environment["EXCER_OBSERVED_CONTROL"],
      ["Other Options", "Not Now", "Don't Upgrade", "Don’t Upgrade", "Continue"].contains(label),
      settings.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "johansardar77+excersbx1@gmail.com")).firstMatch.exists else {
      throw XCTSkip("Requires observed dedicated Sandbox account context and a reviewed non-purchase action")
    }
    capture("sandbox-before-observed-control", application: settings)
    try tap(label, in: settings)
    if label == "Other Options" {
      let decline = element("Don’t Upgrade", in: settings)
      if decline.waitForExistence(timeout: 5) && decline.isHittable {
        capture("sandbox-before-decline-optional-upgrade", application: settings)
        try tap("Don’t Upgrade", in: settings)
      }
    }
    Thread.sleep(forTimeInterval: 1)
    capture("sandbox-after-observed-control", application: settings)
  }

  private func submitSandboxLogin(_ settings: XCUIApplication) throws {
    let done = settings.keyboards.buttons.matching(identifier: "Done").firstMatch
    if done.exists && done.isHittable { done.tap() }
    try tap("Sign In", in: settings)
    capture("sandbox-settings-after-submit", application: settings)
  }

  func testSignOutExcerLockOwner() throws {
    guard environment["EXCER_OWNER_SIGNOUT_AUTHORIZED"] == "1",
      environment["EXCER_OWNER_BACKUP_VERIFIED"] == "1" else {
      throw XCTSkip("Owner sign-out requires explicit relay authorization and verified backups")
    }
    app.activate()
    guard app.staticTexts.matching(NSPredicate(format: "label == %@", "Account")).firstMatch.exists else {
      throw XCTSkip("Open the observed ExcerLock Account page first")
    }
    capture("owner-before-authorized-excerlock-signout")
    try tap("Sign out")
    capture("owner-after-authorized-excerlock-signout")
  }

  func testOnboardingToPaywall() throws {
    guard environment["EXCER_EMPTY_INSTALL_CONFIRMED"] == "1" else {
      throw XCTSkip("Existing owner data: onboarding must not overwrite Conditions or profile")
    }
    app.activate()
    if app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "This is the developer menu.")).firstMatch.exists {
      try tap("Continue")
      if element("Close").waitForExistence(timeout: 5) { try tap("Close") }
    }
    let deadline = Date().addingTimeInterval(240)
    while Date() < deadline {
      let visibleTree = app.debugDescription
      if app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH[c] %@", "Yearly ")).firstMatch.exists ||
        app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH[c] %@", "Annual ")).firstMatch.exists ||
        app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH[c] %@", "Monthly ")).firstMatch.exists ||
        element("Restore purchases").exists {
        capture("paywall")
        return
      }
      if element("Allow", in: springboard).exists && springboard.alerts.firstMatch.exists {
        if springboard.alerts.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "notifications")).firstMatch.exists {
          capture("notification-before-denial")
          try tap("Don’t Allow", in: springboard)
          continue
        }
        guard springboard.alerts.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "track")).firstMatch.exists else {
          capture("unreviewed-system-prompt")
          throw XCTSkip("Only the observed ATT prompt may be answered by onboarding automation")
        }
        capture("att-before-answer")
        guard environment["EXCER_ATT_ANSWER"] == "allow" else {
          try tap("Ask App Not to Track", in: springboard)
          continue
        }
        try tap("Allow", in: springboard)
        continue
      }
      if element("Not Now", in: springboard).exists && springboard.alerts.firstMatch.exists {
        try tap("Not Now", in: springboard)
        continue
      }
      let fields = app.textFields
      if visibleTree.contains("TextField") && fields.firstMatch.exists && ((fields.firstMatch.value as? String ?? "").isEmpty ||
        fields.firstMatch.value as? String == fields.firstMatch.placeholderValue) {
        fields.firstMatch.tap()
        fields.firstMatch.typeText("Sandbox\n")
      }
      let choices = ["Prefer not to say", "App Store", "25–34", "More exercise", "Maintain", "Maintaining my weight", "Walking", "0–5,000 steps", "Outside"]
      for choice in choices where visibleTree.contains("label: '\(choice)'") {
        let candidate = element(choice)
        if candidate.exists && candidate.isHittable && !(candidate.value as? String == "1") {
          candidate.tap()
          break
        }
      }
      if element("Get started").exists { capture("onboarding-welcome"); try tap("Get started") }
      else if element("Import").exists && element("Import").isEnabled { capture("onboarding-stage-empty-plan"); try tap("Import") }
      else if element("Continue").exists && element("Continue").isEnabled {
        capture("onboarding-before-continue")
        try tap("Continue")
      }
      else { Thread.sleep(forTimeInterval: 1) }
    }
    capture("onboarding-blocked")
    throw XCTSkip("Onboarding requires review of the captured screen; no blind permission grants")
  }

  func testTrialPurchase() throws {
    try requireSafePurchase()
    app.activate()
    guard app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "free trial")).firstMatch.exists else {
      capture("trial-unavailable")
      throw XCTSkip("A real free trial must be offered before purchase")
    }
    try tap("Continue")
    try confirmSandboxSheet()
  }

  func testNoTrialPurchase() throws {
    try requireSafePurchase()
    guard environment["EXCER_DISTINCT_ACQUISITION_ACCOUNT_CONFIRMED"] == "1" else {
      throw XCTSkip("Requires separate clean ExcerLock acquisition account; counted trial suppresses Subscribe")
    }
    app.activate()
    let monthly = app.descendants(matching: .any)
      .matching(NSPredicate(format: "label BEGINSWITH %@", "Monthly")).firstMatch
    guard monthly.waitForExistence(timeout: 20), monthly.isHittable else {
      throw XCTSkip("No monthly plan available")
    }
    monthly.tap()
    guard !app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "free trial, then")).firstMatch.exists else {
      throw XCTSkip("Selected product still offers a trial")
    }
    capture("no-trial-selected")
    try tap("Continue")
    try confirmSandboxSheet()
  }

  func confirmSandboxSheet() throws {
    let store = XCUIApplication(bundleIdentifier: "com.apple.AppStore")
    let sandbox = NSPredicate(format: "label CONTAINS[c] %@", "Environment: Sandbox")
    let deadline = Date().addingTimeInterval(30)
    while Date() < deadline {
      if springboard.descendants(matching: .any).matching(sandbox).firstMatch.exists ||
         (store.state == .runningForeground && store.descendants(matching: .any).matching(sandbox).firstMatch.exists) {
        capture("sandbox-sheet-before-confirmation")
        for application in [springboard, store] {
          for label in ["Subscribe", "Start Free Trial"] {
            if element(label, in: application).exists && element(label, in: application).isHittable {
              try tap(label, in: application)
              capture("sandbox-confirmation-requested")
              let signIn = app.buttons["Continue with Apple"]
              guard signIn.waitForExistence(timeout: 60) else {
                throw XCTSkip("Sandbox authentication or side-button confirmation needs the owner; inspect sheet")
              }
              capture("purchase-returned-to-sign-in")
              return
            }
          }
        }
        throw XCTSkip("Sandbox sheet requires owner confirmation; no credential or side-button automation")
      }
      Thread.sleep(forTimeInterval: 1)
    }
    capture("store-environment-unconfirmed")
    throw XCTSkip("No observed Sandbox label: never confirm a potentially real-money purchase")
  }

  func testRelaunch() {
    app.terminate()
    app.activate()
    capture("relaunch")
  }
}
