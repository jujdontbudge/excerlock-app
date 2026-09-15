import XCTest
@testable import PhoneWalkingRecorder

/// The guided two-app flow depends on exactly one lab-only link contract:
/// Trace Lab opens this app with `linked-session` (and later `share-archive`),
/// and this app returns through Trace Lab's own scheme. A malformed or foreign
/// link must never start a recording.
final class RecorderLinkedLinkTests: XCTestCase {
    private let sessionId = "123e4567-e89b-42d3-a456-426614174000"
    private let nonce = String(repeating: "ab", count: 32)

    func testBuildsTheLabOnlySessionLink() throws {
        let url = try XCTUnwrap(RecorderLinkedLink.session(sessionId: sessionId, nonce: nonce))
        let components = try XCTUnwrap(URLComponents(url: url, resolvingAgainstBaseURL: false))
        XCTAssertEqual(components.scheme, "excerlock-walkingrecorder")
        XCTAssertEqual(components.host, "linked-session")
        XCTAssertEqual(components.queryItems?.first { $0.name == "protocolVersion" }?.value, "1")
        XCTAssertEqual(RecorderLinkedLink.handshake(from: url)?.sessionId, sessionId)
        XCTAssertEqual(RecorderLinkedLink.handshake(from: url)?.nonce, nonce)
    }

    func testRejectsForeignSchemeOrWrongProtocol() throws {
        let foreign = try XCTUnwrap(URL(string: "excerlock://linked-session?sessionId=\(sessionId)&nonce=\(nonce)&protocolVersion=1"))
        XCTAssertNil(RecorderLinkedLink.handshake(from: foreign))
        let wrongProtocol = try XCTUnwrap(URL(string: "excerlock-walkingrecorder://linked-session?sessionId=\(sessionId)&nonce=\(nonce)&protocolVersion=2"))
        XCTAssertNil(RecorderLinkedLink.handshake(from: wrongProtocol))
    }

    func testRejectsShortNonceAndNonUuidSession() throws {
        let shortNonce = try XCTUnwrap(URL(string: "excerlock-walkingrecorder://linked-session?sessionId=\(sessionId)&nonce=abcd&protocolVersion=1"))
        XCTAssertNil(RecorderLinkedLink.handshake(from: shortNonce))
        let badSession = try XCTUnwrap(URL(string: "excerlock-walkingrecorder://linked-session?sessionId=not-a-uuid&nonce=\(nonce)&protocolVersion=1"))
        XCTAssertNil(RecorderLinkedLink.handshake(from: badSession))
    }

    func testShareRequestNeedsTheArchiveHost() throws {
        let share = try XCTUnwrap(URL(string: "excerlock-walkingrecorder://share-archive?sessionId=\(sessionId)"))
        XCTAssertEqual(RecorderLinkedLink.shareRequest(from: share), sessionId)
        XCTAssertNil(RecorderLinkedLink.shareRequest(from: try XCTUnwrap(URL(string: "excerlock-walkingrecorder://linked-session?sessionId=\(sessionId)"))))
    }

    func testTraceLabReturnURLUsesTheTraceLabScheme() throws {
        let url = try XCTUnwrap(RecorderLinkedLink.traceLab(sessionId: sessionId, nonce: nonce))
        XCTAssertEqual(url.scheme, "excerlock-linked-trace")
        XCTAssertEqual(url.host, "linked-trace")
    }
}
