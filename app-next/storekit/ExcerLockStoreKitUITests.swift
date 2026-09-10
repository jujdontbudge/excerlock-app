import StoreKit
import StoreKitTest
import UIKit
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

  func testFreshInstallInvokesLocalAnnualPurchase() async throws {
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
    XCTAssertTrue(
      app.staticTexts["Block apps. Exercise more."].waitForExistence(timeout: 20),
      "Fresh-install precondition failed; reset only the dedicated test app before rerunning"
    )

    tap("Get started", in: app, destination: "Reduce your screen time and track your progress.")
    tap("Get started", in: app, destination: "Exercise more each week and stay consistent.")
    tap("Get started", in: app, destination: "First name")
    let name = app.textFields["First name"]
    XCTAssertTrue(name.waitForExistence(timeout: 20), "First-name field did not appear")
    name.tap()
    name.typeText("App Review")
    tap("Continue", in: app, destination: "Other")
    tap("Other", in: app)
    tap("Continue", in: app, destination: "25–34")
    tap("25–34", in: app)
    tap("Continue", in: app, destination: "More exercise")
    tap("More exercise", in: app)
    tap("Continue", in: app, destination: "Have more energy")
    tap("Have more energy", in: app)
    tap("Continue", in: app, destination: "2 to 4 hours")
    tap("2 to 4 hours", in: app)
    tap("Continue", in: app, destination: "Here’s some quick math")

    // The calculated screens intentionally withhold Continue until their animations settle.
    tap("Continue", in: app, timeout: 45, destination: "This is a year in your life")
    if UIAccessibility.isReduceMotionEnabled {
      // Reduced motion disables the automatic O12/O13 advances.
      tap("Continue", in: app, destination: "This is the free time left")
      tap("Continue", in: app, destination: "This is how much time you spend scrolling")
    }
    tap("Continue", in: app, timeout: 45, destination: "This is good.")
    tap("Continue", in: app, destination: "You’re stuck in a loop")
    tap("Continue", in: app, destination: "We’ll change the loop")
    tap("Continue", in: app, destination: "You become ADDICTED to exercise")
    tap("Continue", in: app, destination: "What exercise should unlock your apps?")
    tap("Walking", in: app)
    tap("Continue", in: app, destination: "Where do you walk?")
    // Outside is selected by default for a fresh profile; keep the test on that path.
    tap("Continue", in: app, destination: "How should walking unlock your apps?")
    tap("Reach a step goal (Recommended)", in: app)
    tap("Continue", in: app, destination: "Set your walking goal")
    let reviewGoal = app.descendants(matching: .any).matching(
      NSPredicate(format: "label == %@ AND value == %@", "Daily step goal", "20 steps")
    ).firstMatch
    XCTAssertTrue(reviewGoal.waitForExistence(timeout: 20), "App Review preset must be visible before continuing")
    tap("Continue", in: app, destination: "When should blocking be active?")
    tap("Continue", in: app, destination: "Setting up your plan…")
    XCTAssertTrue(app.staticTexts["Your plan is ready"].waitForExistence(timeout: 30))
    XCTAssertTrue(app.staticTexts["Walk 20 steps"].exists, "Reviewer summary must match the persisted goal")
    tap("Use this plan", in: app, destination: "Help us make ExcerLock better")
    tap("Not now", in: app, destination: "Try ExcerLock free")
    tap("Continue", in: app, destination: "We'll remind you before it ends")
    tap("Continue", in: app, destination: "Want a trial reminder?")
    tap("Maybe later", in: app, destination: "How your free trial works")
    tap("Continue", in: app, destination: "Choose your plan")

    XCTAssertTrue(app.staticTexts["Choose your plan"].waitForExistence(timeout: 30), "Real fetched paywall did not appear")
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

  private func tap(
    _ label: String,
    in app: XCUIApplication,
    timeout: TimeInterval = 20,
    destination: String? = nil
  ) {
    let element = app.descendants(matching: .any).matching(identifier: label).firstMatch
    XCTAssertTrue(element.waitForExistence(timeout: timeout), "Missing required control: \(label)")
    for _ in 0..<8 where !element.isHittable { app.swipeUp() }
    XCTAssertTrue(element.isHittable, "Required control is not hittable: \(label)")
    element.tap()
    if let destination {
      let next = app.descendants(matching: .any).matching(identifier: destination).firstMatch
      XCTAssertTrue(
        next.waitForExistence(timeout: timeout),
        "Destination did not appear after \(label): \(destination)"
      )
    }
  }
}
