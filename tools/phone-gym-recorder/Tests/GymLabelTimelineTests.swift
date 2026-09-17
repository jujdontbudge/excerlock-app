import XCTest
@testable import PhoneGymRecorder

final class GymLabelTimelineTests: XCTestCase {
    private func stamp(_ wallTimeMs: Int64, monotonicMs: Int64? = nil) -> CaptureStamp {
        CaptureStamp(
            monotonicNs: UInt64((monotonicMs ?? wallTimeMs)) * 1_000_000,
            wallTimeMs: wallTimeMs,
            wallTimeISO8601: RawStreamManifest.iso8601(wallMilliseconds: wallTimeMs)
        )
    }

    func testExactlyOnePlaceIsActiveAndASwitchIsAtomic() {
        var timeline = GymLabelTimeline()
        XCTAssertNil(timeline.active)
        _ = timeline.transition(to: .away, at: stamp(1_000), reason: .sessionStart)
        XCTAssertEqual(timeline.active, .away)
        XCTAssertEqual(timeline.segmentCount, 1)

        let transition = timeline.transition(to: .inGym, at: stamp(10_000), reason: .userTap)
        XCTAssertEqual(transition?.from, .away)
        XCTAssertEqual(transition?.to, .inGym)
        XCTAssertEqual(transition?.reason, GymLabelReason.userTap.rawValue)
        XCTAssertEqual(transition?.basis, GymLabelBasis.live.rawValue)
        // The previous window closes at the same stamp the next one opens, so no
        // second is counted twice and none is lost.
        XCTAssertEqual(timeline.segments.count, 2)
        XCTAssertEqual(timeline.segments[0].to, stamp(10_000))
        XCTAssertEqual(timeline.segments[1].from, stamp(10_000))
        XCTAssertEqual(timeline.placeCounts["in_gym"], 1)
    }

    func testRepeatedTapOnTheActivePlaceIsNotABoundary() {
        var timeline = GymLabelTimeline()
        _ = timeline.transition(to: .inGym, at: stamp(1_000), reason: .sessionStart)
        XCTAssertNil(timeline.transition(to: .inGym, at: stamp(5_000), reason: .userTap))
        XCTAssertEqual(timeline.segmentCount, 1)
    }

    func testBackdatedBoundaryIsPlacedBeforeReceiptAndCarriesItsBasis() {
        var timeline = GymLabelTimeline()
        _ = timeline.transition(to: .away, at: stamp(0), reason: .sessionStart)
        let receipt = stamp(120_000)
        let transition = timeline.backdatedTransition(to: .inGym, receipt: receipt, offsetSeconds: 30)
        XCTAssertEqual(transition?.boundary.wallTimeMs, 90_000)
        XCTAssertEqual(transition?.receipt.wallTimeMs, 120_000)
        XCTAssertEqual(transition?.reason, GymLabelReason.backdatedCorrection.rawValue)
        XCTAssertEqual(transition?.basis, GymLabelBasis.backdatedEstimate.rawValue)
        XCTAssertEqual(transition?.declaredOffsetSeconds, 30)
        XCTAssertEqual(timeline.segments.last?.from.wallTimeMs, 90_000)
        // The whole span it could have been declared in is its uncertainty.
        XCTAssertEqual(timeline.segments.last?.uncertaintySeconds(toleranceSeconds: 15), 60)
    }

    func testLiveBoundaryCarriesTheSharedHumanTolerance() {
        var timeline = GymLabelTimeline()
        _ = timeline.transition(to: .inGym, at: stamp(1_000), reason: .sessionStart)
        XCTAssertEqual(timeline.segments.last?.uncertaintySeconds(toleranceSeconds: 15), 15)
    }

    func testLocationSamplesAndRegionEventsBelongToTheOpenWindowOnly() {
        var timeline = GymLabelTimeline()
        // A sample before any place is declared belongs to no window.
        timeline.recordLocationSample(at: stamp(500))
        _ = timeline.transition(to: .away, at: stamp(1_000), reason: .sessionStart)
        timeline.recordLocationSample(at: stamp(2_000))
        timeline.recordLocationSample(at: stamp(3_000))
        timeline.recordRegionEvent()
        _ = timeline.transition(to: .inGym, at: stamp(10_000), reason: .userTap)
        timeline.recordLocationSample(at: stamp(11_000))

        XCTAssertEqual(timeline.segments[0].locationSampleCount, 2)
        XCTAssertEqual(timeline.segments[0].regionEventsDuringWindow, 1)
        XCTAssertEqual(timeline.segments[1].locationSampleCount, 1)
    }

    func testSessionEndClosesTheOpenWindowAndIsIdempotent() {
        var timeline = GymLabelTimeline()
        _ = timeline.transition(to: .inGym, at: stamp(1_000), reason: .sessionStart)
        XCTAssertTrue(timeline.closeOpenSegment(at: stamp(50_000)))
        XCTAssertFalse(timeline.closeOpenSegment(at: stamp(60_000)), "a closed window must not be re-closed")
        XCTAssertEqual(timeline.segments.last?.to, stamp(50_000))
    }

    func testWindowCoverageIsCoveredPartialOrNoneFromTheSuspensionUnion() {
        var timeline = GymLabelTimeline()
        _ = timeline.transition(to: .inGym, at: stamp(0), reason: .sessionStart)
        timeline.recordLocationSample(at: stamp(1_000))
        timeline.recordLocationSample(at: stamp(99_000))
        let window = timeline.labelWindows(
            endedAt: stamp(100_000),
            suspensions: [],
            thresholdSeconds: 15
        )[0]
        // The gap between the two samples is 98 s of uncovered time, so this
        // window is partial, never a still phone.
        XCTAssertEqual(window.coverage, .partial)
        XCTAssertEqual(window.uncoveredSeconds, 98, accuracy: 0.001)
        XCTAssertEqual(window.locationSampleCount, 2)

        var empty = GymLabelTimeline()
        _ = empty.transition(to: .inGym, at: stamp(0), reason: .sessionStart)
        let none = empty.labelWindows(endedAt: stamp(100_000), suspensions: [], thresholdSeconds: 15)[0]
        XCTAssertEqual(none.coverage, .none)
        XCTAssertEqual(none.coverageRatio, 0)
    }

    func testSuspensionInsideAWindowIsReportedAsUncoveredTime() {
        var timeline = GymLabelTimeline()
        _ = timeline.transition(to: .inGym, at: stamp(0), reason: .sessionStart)
        timeline.recordLocationSample(at: stamp(1_000))
        timeline.recordLocationSample(at: stamp(50_000))
        let suspension = RawSuspensionInterval(
            from: stamp(1_000),
            to: stamp(50_000),
            basis: .deliveryGap,
            observedStreams: ["location"],
            source: .liveCapture,
            thresholdSeconds: 15
        )
        let window = timeline.labelWindows(endedAt: stamp(51_000), suspensions: [suspension], thresholdSeconds: 15)[0]
        XCTAssertEqual(window.coverage, .partial)
        XCTAssertGreaterThan(window.uncoveredSeconds, 40)
    }

    func testBackdatedWindowKeepsItsDeclaredOffsetInTheManifest() {
        var timeline = GymLabelTimeline()
        _ = timeline.transition(to: .away, at: stamp(0), reason: .sessionStart)
        _ = timeline.backdatedTransition(to: .inGym, receipt: stamp(120_000), offsetSeconds: 60)
        let windows = timeline.labelWindows(endedAt: stamp(180_000), suspensions: [], thresholdSeconds: 15)
        XCTAssertEqual(windows.count, 2)
        XCTAssertEqual(windows[1].basis, GymLabelBasis.backdatedEstimate.rawValue)
        XCTAssertEqual(windows[1].declaredOffsetSeconds, 60)
        XCTAssertEqual(windows[1].fromReceiptWallTimeMs, 60_000)
    }
}
