import XCTest
@testable import PhoneWalkingRecorder

final class ProductionWalkingDetectorTests: XCTestCase {
    private struct Fixture: Decodable {
        let events: [Event]

        struct Event: Decodable {
            let atMs: Int64
            let kind: String
            let classes: [String]?
            let confidence: String?
            let startedAtMs: Int64?
            let stepsPerSecond: Double?
            let cumulativeSteps: Int?
            let expectedPhase: String
            let expectedQualification: Bool
            let expectedGraceEndsAtMs: Int64?
        }
    }

    func testProductionFixtureParityStationaryHighCadenceActivates() throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "production-path", withExtension: "json"))
        let fixture = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: url))
        var detector = ProductionWalkingDetectorPort(startMonotonicMs: 0)

        for event in fixture.events {
            let snapshot: ProductionDetectorSnapshot
            if event.kind == "activity" {
                snapshot = try XCTUnwrap(detector.acceptActivity(
                    ProductionActivitySample(
                        classes: event.classes ?? ["unknown"],
                        confidence: event.confidence ?? "low",
                        startedAtMs: event.startedAtMs ?? event.atMs,
                        receivedAtMs: event.atMs
                    ),
                    nowMs: event.atMs
                ))
            } else {
                snapshot = try XCTUnwrap(detector.acceptCadence(
                    ProductionCadenceSample(
                        stepsPerSecond: event.stepsPerSecond,
                        cumulativeSteps: event.cumulativeSteps ?? 0,
                        asOfMs: event.atMs
                    ),
                    nowMs: event.atMs
                ))
            }
            XCTAssertEqual(snapshot.state.phase.rawValue, event.expectedPhase, "at \(event.atMs)")
            XCTAssertEqual(snapshot.evidence.qualifying.isPositive, event.expectedQualification, "at \(event.atMs)")
            if let deadline = event.expectedGraceEndsAtMs {
                XCTAssertEqual(snapshot.state.graceEndsAtMs, deadline)
            }
        }
    }

    func testThreeSecondQualificationAndSilenceAnchoredGrace() {
        var state = ProductionWalkingState(nowMs: 0)
        state.reduceEvidence(atMs: 1_000, qualification: .qualifying, nowMs: 1_000)
        XCTAssertEqual(state.phase, .verifying)
        state.tick(nowMs: 3_999)
        XCTAssertEqual(state.phase, .verifying)
        state.tick(nowMs: 4_000)
        XCTAssertEqual(state.phase, .active)
        XCTAssertEqual(state.activeSinceMs, 4_000)

        state.tick(nowMs: 6_000)
        XCTAssertEqual(state.phase, .grace)
        XCTAssertEqual(state.graceEndsAtMs, 36_000)
        state.tick(nowMs: 36_000)
        XCTAssertEqual(state.phase, .inactive)
    }

    func testFreshnessBoundaryIsStrictlyLessThanFiveSeconds() {
        var adapter = ProductionMotionAdapterPort()
        _ = adapter.acceptActivity(
            ProductionActivitySample(classes: ["walking"], confidence: "high", startedAtMs: 0, receivedAtMs: 1_000),
            nowMs: 1_000
        )
        XCTAssertEqual(adapter.reconcile(atMs: 5_999).qualifying, .qualifying)
        XCTAssertEqual(adapter.reconcile(atMs: 6_000).qualifying, .unknown)
    }

    func testLateEvidenceCannotReviveInactiveState() {
        var state = ProductionWalkingState(nowMs: 10_000)
        state.reduceEvidence(atMs: 9_000, qualification: .qualifying, nowMs: 10_000)
        XCTAssertEqual(state.phase, .inactive)
        XCTAssertNil(state.lastEvidenceAtMs)
    }
}
