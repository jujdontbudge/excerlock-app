import StoreKit
import StoreKitTest
import XCTest

@MainActor
final class ExcerLockStoreKitUITests: XCTestCase {
  private var session: SKTestSession!

  override func setUpWithError() throws {
    continueAfterFailure = false
    session = try SKTestSession(configurationFileNamed: "ExcerLock")
    session.disableDialogs = false
    session.clearTransactions()
  }

  func testRealRuntimeLaunchesWithLocalStoreKitCatalog() async throws {
    let expected = [
      "com.johansardar.excerlock.premium.a.monthly",
      "com.johansardar.excerlock.premium.a.annual",
      "com.johansardar.excerlock.premium.a.winback.annual",
      "com.johansardar.excerlock.premium.b.monthly",
      "com.johansardar.excerlock.premium.b.annual",
      "com.johansardar.excerlock.premium.b.winback.annual",
    ]
    let products = try await Product.products(for: expected)
    XCTAssertEqual(Set(products.map(\.id)), Set(expected), "Local StoreKit catalog is incomplete")

    let app = XCUIApplication()
    app.launch()
    XCTAssertTrue(app.wait(for: .runningForeground, timeout: 20), "Real preview runtime did not launch")
    XCTAssertTrue(app.staticTexts["ExcerLock"].waitForExistence(timeout: 20), "Embedded real-runtime UI did not appear")
  }

  func testFreshInstallInvokesLocalAnnualPurchase() throws {
    let app = XCUIApplication()
    app.launch()
    XCTAssertTrue(app.wait(for: .runningForeground, timeout: 20), "Real preview runtime did not launch")
    XCTAssertTrue(
      app.staticTexts["Block apps. Exercise more."].waitForExistence(timeout: 20),
      "Fresh-install precondition failed; erase only the dedicated test simulator before rerunning"
    )

    tap("Get started", in: app)
    tap("Get started", in: app)
    tap("Get started", in: app)
    let name = app.textFields["First name"]
    XCTAssertTrue(name.waitForExistence(timeout: 20), "First-name field did not appear")
    name.tap()
    name.typeText("App Review")
    tap("Continue", in: app)
    tap("Other", in: app)
    tap("Continue", in: app)
    tap("25–34", in: app)
    tap("Continue", in: app)
    tap("More exercise", in: app)
    tap("Continue", in: app)
    tap("Have more energy", in: app)
    tap("Continue", in: app)
    tap("2 to 4 hours", in: app)
    tap("Continue", in: app)

    // These two calculated screens intentionally withhold Continue until their animations settle.
    tap("Continue", in: app, timeout: 45)
    tap("Continue", in: app, timeout: 45)
    tap("Continue", in: app)
    tap("Continue", in: app)
    tap("Continue", in: app)
    tap("Continue", in: app)
    tap("Walking", in: app)
    tap("Continue", in: app)
    tap("Outside", in: app)
    tap("Continue", in: app)
    tap("Reach a step goal (Recommended)", in: app)
    tap("Continue", in: app)
    tap("Continue", in: app) // default 5,000 steps
    tap("Continue", in: app) // default weekday schedule
    tap("Use this plan", in: app)
    tap("Not now", in: app)
    tap("Continue", in: app)
    tap("Maybe later", in: app)
    tap("Continue", in: app)

    XCTAssertTrue(app.staticTexts["Premium A"].waitForExistence(timeout: 30), "Real fetched paywall did not appear")
    tap("Start free trial", in: app)

    let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    let subscribe = springboard.buttons["Subscribe"]
    let buy = springboard.buttons["Buy"]
    let deadline = Date().addingTimeInterval(20)
    while Date() < deadline && !subscribe.exists && !buy.exists { RunLoop.current.run(until: Date().addingTimeInterval(0.1)) }
    XCTAssertTrue(subscribe.exists || buy.exists, "Local StoreKit confirmation sheet did not appear")
    (subscribe.exists ? subscribe : buy).tap()

    let transactionDeadline = Date().addingTimeInterval(20)
    while Date() < transactionDeadline && session.allTransactions().isEmpty {
      RunLoop.current.run(until: Date().addingTimeInterval(0.1))
    }
    XCTAssertEqual(
      session.allTransactions().last?.productIdentifier,
      "com.johansardar.excerlock.premium.a.annual",
      "The actual paywall CTA did not create the configured local annual transaction"
    )
    // Deliberately no Adapty entitlement/profile/webhook assertion: local StoreKit is not sandbox proof.
  }

  private func tap(_ label: String, in app: XCUIApplication, timeout: TimeInterval = 20) {
    let element = app.descendants(matching: .any)[label]
    XCTAssertTrue(element.waitForExistence(timeout: timeout), "Missing required control: \(label)")
    for _ in 0..<8 where !element.isHittable { app.swipeUp() }
    XCTAssertTrue(element.isHittable, "Required control is not hittable: \(label)")
    element.tap()
  }
}
