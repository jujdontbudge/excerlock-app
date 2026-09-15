import XCTest
@testable import PhoneWalkingRecorder

/// The canary check must follow ExcerLock's real order: a verified walk
/// releases the shield, and the shield returns only after standing still past
/// the stop grace. The old inverted expectation must never come back.
final class RecorderCanaryProtocolTests: XCTestCase {
    func testWalkingExpectsReleaseAndStationaryExpectsTheShield() {
        XCTAssertEqual(RecorderCanaryPhase.walking.expectedOutcome, "app_opened")
        XCTAssertEqual(RecorderCanaryPhase.stationary.expectedOutcome, "shield_visible")
    }

    func testSummaryUsesTheCorrectedOrderAndPlainWords() {
        XCTAssertEqual(
            RecorderCanaryPhase.summary(walking: "app_opened", stationary: "shield_visible"),
            "While walking: the app opened. After standing still: the app was blocked."
        )
        XCTAssertEqual(
            RecorderCanaryPhase.summary(walking: nil, stationary: "uncertain"),
            "While walking: not recorded. After standing still: unsure."
        )
    }

    /// Trace Lab opens the recorder with a bare `excerlock-walkingrecorder://`
    /// link when it no longer holds a test link. That is a harmless app-open
    /// recovery action, not a malformed test link.
    func testBareAppOpenLinkIsHarmlessRecoveryNotAnInvalidTest() throws {
        let bare = try XCTUnwrap(URL(string: "excerlock-walkingrecorder://"))
        XCTAssertTrue(RecorderLinkedLink.isAppOpen(bare))
        XCTAssertNil(RecorderLinkedLink.handshake(from: bare))
        XCTAssertNil(RecorderLinkedLink.shareRequest(from: bare))

        let malformed = try XCTUnwrap(URL(string: "excerlock-walkingrecorder://linked-session"))
        XCTAssertFalse(RecorderLinkedLink.isAppOpen(malformed))
        let foreign = try XCTUnwrap(URL(string: "excerlock://"))
        XCTAssertFalse(RecorderLinkedLink.isAppOpen(foreign))
    }

    /// The controller must open the app for that bare link without claiming an
    /// invalid test, while a genuinely malformed link still reports one.
    @MainActor
    func testControllerTreatsBareLinkAsAppOpenAndStillRejectsMalformedLinks() throws {
        let root = FileManager.default.temporaryDirectory
            .appendingPathComponent("recorder-canary-\(UUID().uuidString)", isDirectory: true)
        defer { try? FileManager.default.removeItem(at: root) }
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let controller = CaptureController(repository: SessionRepository(baseURL: root), clock: SystemCaptureClock())

        controller.handleIncomingLink(try XCTUnwrap(URL(string: "excerlock-walkingrecorder://")))
        XCTAssertNil(controller.notice)
        XCTAssertFalse(controller.isRecording)

        controller.handleIncomingLink(try XCTUnwrap(URL(string: "excerlock-walkingrecorder://linked-session?sessionId=not-a-uuid")))
        XCTAssertEqual(controller.notice, "That link is not a valid linked test. Nothing was started.")
        XCTAssertFalse(controller.isRecording)
    }
}
