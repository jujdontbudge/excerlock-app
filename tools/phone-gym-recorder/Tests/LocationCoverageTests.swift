import XCTest
@testable import PhoneGymRecorder

private enum LocationStamps {
    static let baseMonotonic: UInt64 = 9_000_000_000
    static let baseWall: Int64 = 1_700_000_000_000

    static func stamp(_ seconds: Double) -> CaptureStamp {
        let wallTimeMs = baseWall + Int64((seconds * 1_000).rounded())
        let monotonic = Int64(baseMonotonic) + Int64((seconds * 1_000_000_000).rounded())
        return CaptureStamp(
            monotonicNs: UInt64(monotonic),
            wallTimeMs: wallTimeMs,
            wallTimeISO8601: RawStreamManifest.iso8601(wallMilliseconds: wallTimeMs)
        )
    }
}

/// Core Location has no fixed rate, so these tests pin the difference between
/// normal delivery jitter and a real undelivered range, and keep the location
/// stream independent from the event-driven motion streams that share the
/// tracker. A window can never be called uncovered because the phone was still.
final class LocationCoverageTests: XCTestCase {
    func testLocationGapOverFifteenSecondsIsOneSuspensionExactlyOverTheUndeliveredRange() {
        let tracker = RawCoverageTracker()
        tracker.observe(stream: "location", stamp: LocationStamps.stamp(0))
        tracker.observe(stream: "location", stamp: LocationStamps.stamp(5))
        XCTAssertTrue(tracker.suspensions.isEmpty, "a 5 s fix gap is normal delivery, not a suspension")

        let closed = tracker.observe(stream: "location", stamp: LocationStamps.stamp(80))
        XCTAssertEqual(closed?.fromReceiptMonotonicNs, LocationStamps.stamp(5).monotonicNs)
        XCTAssertEqual(closed?.toReceiptMonotonicNs, LocationStamps.stamp(80).monotonicNs)
        XCTAssertEqual(closed?.durationSeconds ?? 0, 75, accuracy: 0.001)
        XCTAssertEqual(closed?.basis, RawSuspensionBasis.deliveryGap.rawValue)
        XCTAssertEqual(closed?.observedStreams, ["location"])
        XCTAssertEqual(closed?.thresholdSeconds, 15)
        XCTAssertEqual(closed?.exactSuspensionTimeKnown, false)
        XCTAssertEqual(tracker.suspensions.count, 1)
    }

    func testShortLocationJitterNeverCreatesASuspension() {
        let tracker = RawCoverageTracker()
        for seconds in [0.0, 4.0, 9.5, 14.0, 16.5, 22.0, 30.0] {
            tracker.observe(stream: "location", stamp: LocationStamps.stamp(seconds))
        }
        XCTAssertTrue(tracker.suspensions.isEmpty, "gaps under the 15 s threshold are covered delivery")
    }

    func testSlowEventStreamsDoNotBorrowEachOthersGaps() {
        let tracker = RawCoverageTracker()
        tracker.observe(stream: "activity", stamp: LocationStamps.stamp(0))
        // Location delivers every 5 s for 100 s while activity is silent: the
        // location stream is fully covered and the activity stream has not yet
        // reached its own 120 s threshold.
        for tick in 1...20 {
            tracker.observe(stream: "location", stamp: LocationStamps.stamp(Double(tick) * 5))
        }
        XCTAssertTrue(tracker.suspensions.isEmpty)

        // The activity gap is measured from the last activity sample (0 s), not
        // from the newest location sample (100 s).
        let closed = tracker.observe(stream: "activity", stamp: LocationStamps.stamp(150))
        XCTAssertEqual(closed?.observedStreams, ["activity"])
        XCTAssertEqual(closed?.fromReceiptMonotonicNs, LocationStamps.stamp(0).monotonicNs)
        XCTAssertEqual(closed?.durationSeconds ?? 0, 150, accuracy: 0.001)
        XCTAssertEqual(closed?.thresholdSeconds, 120)
        XCTAssertEqual(tracker.suspensions.map(\.observedStreams), [["activity"]])
    }

    func testActivityAndPedometerUseTheirOwnLongerThreshold() {
        let tracker = RawCoverageTracker()
        tracker.observe(stream: "activity", stamp: LocationStamps.stamp(0))
        XCTAssertNil(tracker.observe(stream: "activity", stamp: LocationStamps.stamp(119)))
        let closed = tracker.observe(stream: "activity", stamp: LocationStamps.stamp(119 + 300))
        XCTAssertEqual(closed?.thresholdSeconds, 120)
        XCTAssertEqual(closed?.observedStreams, ["activity"])
    }

    func testLocationSilenceWhileMotionFlowsIsStillASuspension() {
        let tracker = RawCoverageTracker()
        tracker.observe(stream: "location", stamp: LocationStamps.stamp(0))
        for tick in 1...6 {
            tracker.observe(stream: "activity", stamp: LocationStamps.stamp(Double(tick) * 20))
        }
        // The newest sample is an activity sample, but the location stream has
        // been silent for 120 s; the live health dot must say suspended.
        XCTAssertTrue(tracker.isSuspended(at: LocationStamps.stamp(121)))
        XCTAssertEqual(tracker.lastStamps["location"], LocationStamps.stamp(0))
    }

    func testSessionEndingWithSilentLocationClosesTheTailFromTheLastLocationSample() {
        let tracker = RawCoverageTracker()
        tracker.observe(stream: "location", stamp: LocationStamps.stamp(0))
        tracker.observe(stream: "activity", stamp: LocationStamps.stamp(30))
        let tail = tracker.closeAtSessionEnd(startedAt: LocationStamps.stamp(0), endedAt: LocationStamps.stamp(40))
        XCTAssertEqual(tail?.basis, RawSuspensionBasis.sessionEndedWithoutResume.rawValue)
        XCTAssertEqual(tail?.fromReceiptMonotonicNs, LocationStamps.stamp(0).monotonicNs)
        XCTAssertEqual(tail?.toReceiptMonotonicNs, LocationStamps.stamp(40).monotonicNs)
        XCTAssertEqual(tail?.observedStreams, ["location"])
    }

    func testLabelWindowsCoverageIgnoresMotionSuspensions() {
        var timeline = GymLabelTimeline()
        _ = timeline.transition(to: .inGym, at: LocationStamps.stamp(0), reason: .sessionStart)
        for tick in 1...10 {
            timeline.recordLocationSample(at: LocationStamps.stamp(Double(tick) * 10))
        }
        let motionSuspension = RawSuspensionInterval(
            from: LocationStamps.stamp(0),
            to: LocationStamps.stamp(300),
            basis: .deliveryGap,
            observedStreams: ["activity"],
            source: .liveCapture,
            thresholdSeconds: 120
        )
        let window = timeline.labelWindows(
            endedAt: LocationStamps.stamp(100),
            suspensions: [motionSuspension],
            thresholdSeconds: 15
        )[0]
        XCTAssertEqual(window.coverage, .covered)
        XCTAssertEqual(window.uncoveredSeconds, 0, accuracy: 0.001)
        XCTAssertEqual(window.coverageRatio, 1, accuracy: 0.001)
        XCTAssertEqual(window.locationSampleCount, 10)
    }

    func testWindowWithNoLocationSamplesIsNoneEvenWhenMotionFlows() {
        var timeline = GymLabelTimeline()
        _ = timeline.transition(to: .inGym, at: LocationStamps.stamp(0), reason: .sessionStart)
        timeline.recordRegionEvent()
        let window = timeline.labelWindows(
            endedAt: LocationStamps.stamp(100),
            suspensions: [],
            thresholdSeconds: 15
        )[0]
        XCTAssertEqual(window.coverage, .none)
        XCTAssertEqual(window.coverageRatio, 0)
        XCTAssertEqual(window.uncoveredSeconds, 100, accuracy: 0.001)
        XCTAssertEqual(window.regionEventsDuringWindow, 1)
    }

    func testWindowIsPartialWhenTheLocationStreamWasSuspendedInsideIt() {
        var timeline = GymLabelTimeline()
        _ = timeline.transition(to: .inGym, at: LocationStamps.stamp(0), reason: .sessionStart)
        timeline.recordLocationSample(at: LocationStamps.stamp(5))
        timeline.recordLocationSample(at: LocationStamps.stamp(95))
        let suspension = RawSuspensionInterval(
            from: LocationStamps.stamp(5),
            to: LocationStamps.stamp(95),
            basis: .appLifecycleGap,
            observedStreams: ["location"],
            source: .liveCapture,
            thresholdSeconds: 15
        )
        let window = timeline.labelWindows(
            endedAt: LocationStamps.stamp(100),
            suspensions: [suspension],
            thresholdSeconds: 15
        )[0]
        XCTAssertEqual(window.coverage, .partial)
        XCTAssertEqual(window.uncoveredSeconds, 90, accuracy: 0.001)
        // Only covered seconds will be scored by the validator.
        XCTAssertEqual(window.coverageRatio, 0.1, accuracy: 0.001)
    }

    func testManifestCarriesPerStreamCountsAndFirstLastReceipts() {
        let tracker = RawCoverageTracker()
        tracker.observe(stream: "location", stamp: LocationStamps.stamp(0))
        tracker.observe(stream: "location", stamp: LocationStamps.stamp(5))
        tracker.observe(stream: "activity", stamp: LocationStamps.stamp(10))
        let manifest = tracker.manifest(
            startedAt: LocationStamps.stamp(0),
            endedAt: LocationStamps.stamp(11),
            labelWindows: []
        )
        XCTAssertEqual(manifest.expectedStreams, ["location", "activity", "pedometer"])
        XCTAssertEqual(manifest.suspensionThresholdsSeconds, ["location": 15, "activity": 120, "pedometer": 120])
        XCTAssertEqual(manifest.sampleCounts["location"], 2)
        XCTAssertEqual(manifest.observed["location"]?.firstReceiptMonotonicNs, LocationStamps.stamp(0).monotonicNs)
        XCTAssertEqual(manifest.observed["location"]?.lastReceiptMonotonicNs, LocationStamps.stamp(5).monotonicNs)
        XCTAssertEqual(manifest.observed["activity"]?.sampleCount, 1)
        XCTAssertNil(manifest.observed["pedometer"])
    }
}
