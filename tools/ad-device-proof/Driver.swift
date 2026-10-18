import XCTest

final class DeviceDriver: XCTestCase {
  let app = XCUIApplication(bundleIdentifier: "com.johansardar.excerlock")
  let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
  var environment: [String: String] { ProcessInfo.processInfo.environment }

  override func setUpWithError() throws {
    continueAfterFailure = false
  }

  func capture(_ name: String) {
    let utc = ISO8601DateFormatter().string(from: Date())
    print("DEVICE_PROOF UTC=\(utc) checkpoint=\(name)")
    let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
    image.name = "\(utc)-\(name)"
    image.lifetime = .keepAlways
    add(image)
    let tree = XCTAttachment(string: app.debugDescription)
    tree.name = "\(utc)-\(name)-accessibility"
    tree.lifetime = .keepAlways
    add(tree)
  }

  func element(_ text: String, in application: XCUIApplication? = nil) -> XCUIElement {
    (application ?? app).descendants(matching: .any)
      .matching(NSPredicate(format: "label == %@", text)).firstMatch
  }

  func tap(_ label: String, in application: XCUIApplication? = nil) throws {
    let target = element(label, in: application)
    guard target.waitForExistence(timeout: 10), target.isHittable else {
      capture("blocked-missing-control")
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

  func testSnapshot() {
    app.activate()
    capture("existing-state")
  }

  func testOnboardingToPaywall() throws {
    guard environment["EXCER_EMPTY_INSTALL_CONFIRMED"] == "1" else {
      throw XCTSkip("Existing owner data: onboarding must not overwrite Conditions or profile")
    }
    app.activate()
    let deadline = Date().addingTimeInterval(240)
    while Date() < deadline {
      if app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Yearly")).firstMatch.exists {
        capture("paywall")
        return
      }
      if element("Allow", in: springboard).exists && springboard.alerts.firstMatch.exists {
        guard environment["EXCER_ATT_ANSWER"] == "allow" else {
          try tap("Ask App Not to Track", in: springboard)
          continue
        }
        try tap("Allow", in: springboard)
        continue
      }
      let fields = app.textFields
      if fields.firstMatch.exists && (fields.firstMatch.value as? String ?? "").isEmpty {
        fields.firstMatch.tap()
        fields.firstMatch.typeText("Sandbox\n")
      }
      let choices = ["Prefer not to say", "App Store", "25–34", "More exercise", "Maintain", "Walking"]
      for choice in choices {
        let candidate = element(choice)
        if candidate.exists && candidate.isHittable && !(candidate.value as? String == "1") {
          candidate.tap()
          break
        }
      }
      if element("Get started").exists { try tap("Get started") }
      else if element("Continue").exists && element("Continue").isEnabled { try tap("Continue") }
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
    let sandbox = NSPredicate(format: "label CONTAINS[c] %@", "Sandbox")
    let deadline = Date().addingTimeInterval(30)
    while Date() < deadline {
      if springboard.descendants(matching: .any).matching(sandbox).firstMatch.exists ||
         store.descendants(matching: .any).matching(sandbox).firstMatch.exists {
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
