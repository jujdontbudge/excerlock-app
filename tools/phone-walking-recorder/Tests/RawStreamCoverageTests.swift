import XCTest
@testable import PhoneWalkingRecorder

private enum CoverageStamps {
    static let baseMonotonic: UInt64 = 5_000_000_000
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

final class RawStreamCoverageTests: XCTestCase {
    func testSuspensionIntervalIsExactlyTheUndeliveredRange() {
        let tracker = RawCoverageTracker()
        var closed: [RawSuspensionInterval] = []
        for tick in 0...100 {
            let seconds = Double(tick) * 0.02
            closed.append(contentsOf: [tracker.observe(stream: "accelerometer", stamp: CoverageStamps.stamp(seconds))].compactMap { $0 })
            closed.append(contentsOf: [tracker.observe(stream: "gyroscope", stamp: CoverageStamps.stamp(seconds + 0.005))].compactMap { $0 })
            closed.append(contentsOf: [tracker.observe(stream: "device_motion", stamp: CoverageStamps.stamp(seconds + 0.010))].compactMap { $0 })
        }
        // Nothing between 2.01 and 5.0: the next delivered sample closes exactly
        // one suspension from the last receipt to the new one.
        if let interval = tracker.observe(stream: "device_motion", stamp: CoverageStamps.stamp(5.0)) {
            closed.append(interval)
        }

        XCTAssertEqual(closed.count, 1)
        let interval = try? XCTUnwrap(closed.first)
        XCTAssertEqual(interval?.fromReceiptMonotonicNs, CoverageStamps.stamp(2.01).monotonicNs)
        XCTAssertEqual(interval?.toReceiptMonotonicNs, CoverageStamps.stamp(5.0).monotonicNs)
        XCTAssertEqual(interval?.durationSeconds ?? 0, 2.99, accuracy: 0.001)
        XCTAssertEqual(interval?.basis, RawSuspensionBasis.rawDeliveryGap.rawValue)
        XCTAssertEqual(interval?.source, RawSuspensionSource.liveCapture.rawValue)
        XCTAssertEqual(interval?.exactSuspensionTimeKnown, false)
        XCTAssertEqual(interval?.observedStreams, RawStreamManifest.inertialStreams)
        XCTAssertEqual(tracker.suspensions.count, 1)
    }

    func testShortDeliveryJitterNeverCreatesASuspension() {
        let tracker = RawCoverageTracker()
        for (index, seconds) in [0.0, 0.4, 0.9, 2.7, 3.4, 5.29, 5.5].enumerated() {
            tracker.observe(stream: index.isMultiple(of: 2) ? "accelerometer" : "gyroscope", stamp: CoverageStamps.stamp(seconds))
        }
        XCTAssertTrue(tracker.suspensions.isEmpty, "jitter under the 2 s threshold must not be marked as a suspension")
    }

    func testLifecycleDepartureLabelsTheGapThatFollows() {
        let tracker = RawCoverageTracker()
        tracker.observe(stream: "accelerometer", stamp: CoverageStamps.stamp(0))
        tracker.noteLifecycleDeparture(state: "background", stamp: CoverageStamps.stamp(0.1))
        tracker.observe(stream: "accelerometer", stamp: CoverageStamps.stamp(1.0))
        XCTAssertTrue(tracker.suspensions.isEmpty, "a lifecycle callback without a real gap is not a suspension")

        tracker.noteLifecycleDeparture(state: "background", stamp: CoverageStamps.stamp(1.1))
        let closed = tracker.observe(stream: "accelerometer", stamp: CoverageStamps.stamp(5.0))
        XCTAssertEqual(closed?.basis, RawSuspensionBasis.appLifecycleRawGap.rawValue)
        XCTAssertEqual(tracker.suspensions.count, 1)
    }

    func testSessionEndingSuspendedClosesAnExplicitTail() {
        let tracker = RawCoverageTracker()
        tracker.observe(stream: "accelerometer", stamp: CoverageStamps.stamp(0))
        tracker.observe(stream: "gyroscope", stamp: CoverageStamps.stamp(0.02))
        tracker.observe(stream: "device_motion", stamp: CoverageStamps.stamp(0.04))
        let tail = tracker.closeAtSessionEnd(startedAt: CoverageStamps.stamp(-5), endedAt: CoverageStamps.stamp(8))
        XCTAssertEqual(tail?.basis, RawSuspensionBasis.sessionEndedWithoutRawResume.rawValue)
        XCTAssertEqual(tail?.fromReceiptMonotonicNs, CoverageStamps.stamp(0.04).monotonicNs)
        XCTAssertEqual(tail?.toReceiptMonotonicNs, CoverageStamps.stamp(8).monotonicNs)

        let manifest = tracker.manifest(
            startedAt: CoverageStamps.stamp(-5),
            endedAt: CoverageStamps.stamp(8),
            labelWindows: []
        )
        XCTAssertTrue(manifest.endedBeforeSessionEnd)
        XCTAssertEqual(manifest.suspensionCount, 1)
        XCTAssertEqual(manifest.suspendedSeconds, 7.96, accuracy: 0.001)
    }

    func testSessionWithoutAnyRawSampleIsExplicitInsteadOfSilent() {
        let tracker = RawCoverageTracker()
        let interval = tracker.closeAtSessionEnd(startedAt: CoverageStamps.stamp(0), endedAt: CoverageStamps.stamp(6))
        XCTAssertEqual(interval?.basis, RawSuspensionBasis.noRawSamplesObserved.rawValue)
        XCTAssertEqual(interval?.durationSeconds ?? 0, 6, accuracy: 0.001)
        XCTAssertTrue(tracker.isSuspended(at: CoverageStamps.stamp(6)))
        let manifest = tracker.manifest(startedAt: CoverageStamps.stamp(0), endedAt: CoverageStamps.stamp(6), labelWindows: [])
        XCTAssertNil(manifest.firstSampleMonotonicNs)
        XCTAssertNil(manifest.lastSampleMonotonicNs)
        XCTAssertTrue(manifest.endedBeforeSessionEnd)
    }

    func testLabelWindowsReportCoverageForEveryMode() {
        var timeline = LabelTimeline()
        var tracker = RawCoverageTracker()
        let modes: [(GroundTruthScenario, Double)] = [
            (.normalWalking, 0),
            (.treadmillWalkingPhoneInHand, 2),
            (.seatedShaking, 4),
            (.sittingNormallyWithPhone, 6)
        ]
        for (scenario, start) in modes {
            _ = timeline.transition(to: scenario, at: CoverageStamps.stamp(start), reason: "test")
            for tick in 1...100 {
                let seconds = start + Double(tick) * 0.02
                let stream = tick.isMultiple(of: 3) ? "accelerometer" : (tick.isMultiple(of: 2) ? "gyroscope" : "device_motion")
                let stamp = CoverageStamps.stamp(seconds)
                tracker.observe(stream: stream, stamp: stamp)
                timeline.recordRawSample(stream: stream, at: stamp)
            }
        }
        timeline.closeOpenSegment(at: CoverageStamps.stamp(8.0))

        let windows = timeline.rawLabelWindows(
            endedAt: CoverageStamps.stamp(80),
            suspensions: tracker.suspensions,
            suspensionThresholdSeconds: tracker.thresholdSeconds
        )
        XCTAssertEqual(windows.map(\.scenario), modes.map { $0.0.rawValue })
        for window in windows {
            XCTAssertEqual(window.coverage, .covered, "\(window.scenario) must have raw coverage")
            XCTAssertEqual(window.rawSampleCount, 100)
            XCTAssertEqual(window.rawStreamsObserved, RawStreamManifest.inertialStreams.sorted())
            XCTAssertLessThanOrEqual(window.uncoveredSeconds, 2.0)
            XCTAssertGreaterThan(window.coverageRatio, 0.95)
        }
    }

    func testSuspendedLabelWindowIsPartialAndSampleFreeWindowIsNone() {
        var timeline = LabelTimeline()
        let tracker = RawCoverageTracker()
        // Covered window: samples every 20 ms for its whole span.
        _ = timeline.transition(to: .normalWalking, at: CoverageStamps.stamp(0), reason: "test")
        for tick in 1...100 {
            let stamp = CoverageStamps.stamp(Double(tick) * 0.02)
            tracker.observe(stream: "accelerometer", stamp: stamp)
            timeline.recordRawSample(stream: "accelerometer", at: stamp)
        }
        // Suspended window: 4 samples and then a 6 s hole declared as a suspension.
        _ = timeline.transition(to: .treadmillWalkingPhoneInHand, at: CoverageStamps.stamp(2), reason: "test")
        for tick in 1...4 {
            let stamp = CoverageStamps.stamp(2 + Double(tick) * 0.02)
            tracker.observe(stream: "accelerometer", stamp: stamp)
            timeline.recordRawSample(stream: "accelerometer", at: stamp)
        }
        tracker.noteLifecycleDeparture(state: "background", stamp: CoverageStamps.stamp(2.1))
        if let interval = tracker.observe(stream: "accelerometer", stamp: CoverageStamps.stamp(8.1)) {
            timeline.recordRawSample(stream: "accelerometer", at: CoverageStamps.stamp(8.1))
            XCTAssertEqual(interval.basis, RawSuspensionBasis.appLifecycleRawGap.rawValue)
        }
        for tick in 1...95 {
            let stamp = CoverageStamps.stamp(8.1 + Double(tick) * 0.02)
            tracker.observe(stream: "accelerometer", stamp: stamp)
            timeline.recordRawSample(stream: "accelerometer", at: stamp)
        }
        // Window with no samples at all.
        _ = timeline.transition(to: .seatedShaking, at: CoverageStamps.stamp(10), reason: "test")
        timeline.closeOpenSegment(at: CoverageStamps.stamp(12))

        let windows = timeline.rawLabelWindows(
            endedAt: CoverageStamps.stamp(12),
            suspensions: tracker.suspensions,
            suspensionThresholdSeconds: tracker.thresholdSeconds
        )
        XCTAssertEqual(windows[0].coverage, .covered)
        XCTAssertEqual(windows[1].coverage, .partial)
        XCTAssertEqual(windows[1].uncoveredSeconds, 6.0, accuracy: 0.35)
        XCTAssertLessThan(windows[1].coverageRatio, 0.4)
        XCTAssertEqual(windows[2].coverage, .none)
        XCTAssertEqual(windows[2].uncoveredSeconds, 2.0, accuracy: 0.001)
        XCTAssertEqual(windows[2].rawSampleCount, 0)
    }

    func testRecoveredManifestDeclaresTheTerminationSuspension() throws {
        let tracker = RawCoverageTracker()
        for tick in 0...50 {
            tracker.observe(stream: "accelerometer", stamp: CoverageStamps.stamp(Double(tick) * 0.02))
        }
        // The checkpoint snapshot describes the session as if it ended at t=4,
        // so it carries the synthetic tail a live checkpoint would write.
        tracker.closeAtSessionEnd(startedAt: CoverageStamps.stamp(0), endedAt: CoverageStamps.stamp(4))
        let snapshot = tracker.manifest(
            startedAt: CoverageStamps.stamp(0),
            endedAt: CoverageStamps.stamp(4),
            labelWindows: []
        )
        XCTAssertEqual(snapshot.suspensions.last?.basis, RawSuspensionBasis.sessionEndedWithoutRawResume.rawValue)

        let recovered = RawStreamManifest.recovered(
            snapshot: snapshot,
            startedAt: CoverageStamps.stamp(0),
            recoveredAt: CoverageStamps.stamp(300),
            lastDeliveredRawSample: CoverageStamps.stamp(1.0)
        )
        XCTAssertTrue(recovered.endedBeforeSessionEnd)
        XCTAssertEqual(recovered.sampleCountBasis, "as_of_last_checkpoint")
        XCTAssertEqual(recovered.suspensions.count, 1)
        XCTAssertEqual(recovered.suspensions.last?.basis, RawSuspensionBasis.processTerminationRecoveredOnLaunch.rawValue)
        XCTAssertEqual(recovered.suspensions.last?.fromReceiptMonotonicNs, CoverageStamps.stamp(1.0).monotonicNs)
        XCTAssertEqual(recovered.suspensions.last?.toReceiptMonotonicNs, CoverageStamps.stamp(300).monotonicNs)
        XCTAssertEqual(recovered.suspensions.last?.source, RawSuspensionSource.recoveryPass.rawValue)
        XCTAssertEqual(recovered.sampleCounts["accelerometer"], 51)
    }

    func testRecoveredManifestWithNoSnapshotStillDeclaresTheWholeSession() {
        let recovered = RawStreamManifest.recovered(
            snapshot: nil,
            startedAt: CoverageStamps.stamp(0),
            recoveredAt: CoverageStamps.stamp(120),
            lastDeliveredRawSample: nil
        )
        XCTAssertTrue(recovered.endedBeforeSessionEnd)
        XCTAssertEqual(recovered.sampleCountBasis, "unavailable")
        XCTAssertEqual(recovered.suspensions.count, 1)
        XCTAssertEqual(recovered.suspensions.first?.basis, RawSuspensionBasis.noRawSamplesObserved.rawValue)
        XCTAssertEqual(recovered.firstSampleMonotonicNs, nil)
        XCTAssertEqual(recovered.lastSampleMonotonicNs, nil)
    }

    func testIntervalUnionMergesOverlaps() {
        let length = MonotonicIntervalUnion.lengthSeconds([(0, 3_000_000_000), (1_000_000_000, 2_000_000_000), (5_000_000_000, 6_000_000_000)])
        XCTAssertEqual(length, 4.0, accuracy: 0.0001)
    }
}
