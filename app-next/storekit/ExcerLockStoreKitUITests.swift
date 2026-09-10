import StoreKit
import StoreKitTest
import XCTest

final class ExcerLockStoreKitUITests: XCTestCase {
  private var session: SKTestSession!

  override func setUpWithError() throws {
    continueAfterFailure = false
    session = try SKTestSession(configurationFileNamed: "ExcerLock")
    session.disableDialogs = false
    try session.clearTransactions()
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
    let products = await Product.products(for: expected)
    XCTAssertEqual(Set(products.map(\.id)), Set(expected), "Local StoreKit catalog is incomplete")

    let app = XCUIApplication()
    app.launch()
    XCTAssertTrue(app.wait(for: .runningForeground, timeout: 20), "Real preview runtime did not launch")
    XCTAssertTrue(app.staticTexts["Welcome to ExcerLock"].waitForExistence(timeout: 20), "Fresh-install welcome did not appear")
  }
}
