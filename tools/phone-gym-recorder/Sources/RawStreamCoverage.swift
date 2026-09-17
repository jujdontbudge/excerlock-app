import Foundation

/// One interval in which the recorder received no sample at all for a stream
/// group. The boundaries are observed receipt times, never claimed iOS
/// suspension instants: iOS does not tell an app when it suspends it, so the
/// archive states the range over which delivery was absent and marks the exact
/// suspension time unknown. A label window that overlaps one of these intervals
/// can never again be mistaken for evidence of being outside.
struct RawSuspensionInterval: Codable, Equatable {
    let fromReceiptMonotonicNs: UInt64
    let toReceiptMonotonicNs: UInt64
    let fromReceiptWallTimeMs: Int64
    let toReceiptWallTimeMs: Int64
    let fromWallTimeISO8601: String
    let toWallTimeISO8601: String
    let basis: String
    let observedStreams: [String]
    let exactSuspensionTimeKnown: Bool
    let source: String
    let thresholdSeconds: Double

    var durationSeconds: Double {
        Double(toReceiptMonotonicNs - fromReceiptMonotonicNs) / 1_000_000_000
    }

    init(
        from: CaptureStamp,
        to: CaptureStamp,
        basis: RawSuspensionBasis,
        observedStreams: [String],
        source: RawSuspensionSource,
        thresholdSeconds: Double
    ) {
        fromReceiptMonotonicNs = from.monotonicNs
        toReceiptMonotonicNs = to.monotonicNs
        fromReceiptWallTimeMs = from.wallTimeMs
        toReceiptWallTimeMs = to.wallTimeMs
        fromWallTimeISO8601 = from.wallTimeISO8601
        toWallTimeISO8601 = to.wallTimeISO8601
        self.basis = basis.rawValue
        self.observedStreams = observedStreams
        exactSuspensionTimeKnown = false
        self.source = source.rawValue
        self.thresholdSeconds = thresholdSeconds
    }

    var dictionary: [String: Any] {
        [
            "streamGroup": "location_streams",
            "streams": observedStreams,
            "fromReceiptMonotonicNs": fromReceiptMonotonicNs,
            "toReceiptMonotonicNs": toReceiptMonotonicNs,
            "fromWallTimeMs": fromReceiptWallTimeMs,
            "toWallTimeMs": toReceiptWallTimeMs,
            "fromWallTimeISO8601": fromWallTimeISO8601,
            "toWallTimeISO8601": toWallTimeISO8601,
            "durationSeconds": durationSeconds,
            "thresholdSeconds": thresholdSeconds,
            "basis": basis,
            "exactSuspensionTimeKnown": exactSuspensionTimeKnown,
            "source": source,
            "meaning": "No sample was delivered on this stream group between these observed receipt times. Screen lock, backgrounding, process suspension and delivery stalls all look like this; the exact suspension instant is not observable to the app."
        ]
    }
}

enum RawSuspensionBasis: String, Codable {
    /// A lifecycle callback (inactive/background) was observed before the gap.
    case appLifecycleGap = "app_lifecycle_raw_gap"
    /// The stream stopped delivering with no lifecycle callback observed.
    case deliveryGap = "raw_delivery_gap"
    /// The session ended while the stream had not resumed.
    case sessionEndedWithoutResume = "session_ended_without_raw_resume"
    /// The session never received one sample at all.
    case noSamplesObserved = "no_raw_samples_observed"
    /// The process did not finalize and the archive was recovered on relaunch.
    case processTerminationRecoveredOnLaunch = "process_termination_recovered_on_launch"
}

enum RawSuspensionSource: String, Codable {
    case liveCapture = "live_capture"
    case recoveryPass = "recovery_pass"
}

enum RawLabelWindowCoverage: String, Codable {
    case covered
    case partial
    case none
}

/// Per-stream coverage in the manifest.
struct RawStreamObservation: Codable, Equatable {
    let sampleCount: Int
    let firstReceiptMonotonicNs: UInt64
    let firstReceiptWallTimeMs: Int64
    let lastReceiptMonotonicNs: UInt64
    let lastReceiptWallTimeMs: Int64
    let observedAverageDeliveryHz: Double?
}

/// The explicit stream-coverage evidence block the manifest carries.
struct RawStreamManifest: Codable, Equatable {
    static let currentSchemaVersion = 1
    static var defaultStreams: [String] { gymExpectedStreams }

    let schemaVersion: Int
    let expectedStreams: [String]
    /// Per-stream suspension threshold. Location has no fixed rate, so its
    /// threshold is short (15 s); activity and pedometer are event-driven.
    let suspensionThresholdsSeconds: [String: Double]
    /// `exact` for a finalized live session; `as_of_last_checkpoint` when the
    /// process died and the archive was rebuilt from its last durable
    /// checkpoint, where counts are a lower bound rather than an exact total.
    let sampleCountBasis: String
    let sampleCounts: [String: Int]
    let observed: [String: RawStreamObservation]
    let firstSampleMonotonicNs: UInt64?
    let lastSampleMonotonicNs: UInt64?
    let firstSampleWallTimeMs: Int64?
    let lastSampleWallTimeMs: Int64?
    let suspendedSeconds: Double
    let endedBeforeSessionEnd: Bool
    let suspensionCount: Int
    let suspensions: [RawSuspensionInterval]
    let labelWindows: [GymLabelWindow]

    var summaryDictionary: [String: Any] {
        [
            "schemaVersion": schemaVersion,
            "sampleCountBasis": sampleCountBasis,
            "sampleCounts": sampleCounts,
            "suspensionThresholdsSeconds": suspensionThresholdsSeconds,
            "suspendedSeconds": suspendedSeconds,
            "suspensionCount": suspensions.count,
            "endedBeforeSessionEnd": endedBeforeSessionEnd,
            "labelWindows": labelWindows.map(\.dictionary)
        ]
    }
}

/// Live accounting for the recorded streams during one session.
///
/// Invariants the archive relies on:
/// - every interval longer than the stream's own threshold with no delivered
///   sample produces exactly one `RawSuspensionInterval`, and
/// - no interval may overlap a delivered sample: every interval starts at the
///   last observed receipt and ends at the next observed receipt (or the
///   session end / recovery observation when no sample followed).
final class RawCoverageTracker {
    let streams: [String]
    /// Streams that are actually expected to deliver, with their thresholds.
    let thresholds: [String: Double]
    let timeoutStream: String

    private(set) var sampleCounts: [String: Int] = [:]
    private(set) var firstStamps: [String: CaptureStamp] = [:]
    private(set) var lastStamps: [String: CaptureStamp] = [:]
    private(set) var suspensions: [RawSuspensionInterval] = []
    /// The most recent observed lifecycle departure (inactive/background) that
    /// has not yet been followed by a sample.
    private var departure: (stamp: CaptureStamp, state: String)?

    /// The location stream (or whichever stream the caller declared as the
    /// timeout stream) is the one whose silence means "this archive is not
    /// covered". Motion streams have their own, longer thresholds and are never
    /// allowed to mask location silence.
    var timeoutStreamLastStamp: CaptureStamp? { lastStamps[timeoutStream] }

    init(
        streams: [String] = RawStreamManifest.defaultStreams,
        thresholds: [String: Double] = gymStreamThresholdSeconds,
        timeoutStream: String = "location"
    ) {
        self.streams = streams
        self.thresholds = thresholds
        self.timeoutStream = timeoutStream
    }

    var thresholdSeconds: Double {
        thresholds[timeoutStream] ?? locationSuspensionThresholdSeconds
    }

    /// Records one delivered sample. Returns the suspension interval that this
    /// sample closed, if the sample arrived after a real gap.
    @discardableResult
    func observe(stream: String, stamp: CaptureStamp) -> RawSuspensionInterval? {
        var closed: RawSuspensionInterval?
        let threshold = thresholds[stream] ?? thresholdSeconds
        // Each stream's gap is measured against its own last delivery, so a
        // sparse activity update can neither create nor hide a location gap.
        if let previous = lastStamps[stream], stamp.monotonicNs >= previous.monotonicNs {
            let gap = Double(stamp.monotonicNs - previous.monotonicNs) / 1_000_000_000
            if gap > threshold {
                let interval = RawSuspensionInterval(
                    from: previous,
                    to: stamp,
                    // A lifecycle departure observed at or after the last sample
                    // explains the gap; otherwise it is an unexplained stall and
                    // is labelled as such rather than guessed.
                    basis: departure != nil ? .appLifecycleGap : .deliveryGap,
                    observedStreams: [stream],
                    source: .liveCapture,
                    thresholdSeconds: threshold
                )
                suspensions.append(interval)
                closed = interval
            }
        }
        sampleCounts[stream, default: 0] += 1
        if firstStamps[stream] == nil { firstStamps[stream] = stamp }
        if lastStamps[stream] == nil || stamp.monotonicNs > lastStamps[stream]!.monotonicNs {
            lastStamps[stream] = stamp
        }
        departure = nil
        return closed
    }

    /// A scene lifecycle callback observed while recording. It never creates a
    /// suspension by itself: only a following gap does, so a screen flicker that
    /// never stopped the stream is not recorded as a suspension.
    func noteLifecycleDeparture(state: String, stamp: CaptureStamp) {
        departure = (stamp, state)
    }

    /// Closes the session's tail. Without this a session that ended suspended
    /// would look like a clean session whose stream was quiet.
    @discardableResult
    func closeAtSessionEnd(startedAt: CaptureStamp, endedAt: CaptureStamp) -> RawSuspensionInterval? {
        defer { departure = nil }
        let threshold = thresholdSeconds
        if let last = lastStamps[timeoutStream] {
            guard endedAt.monotonicNs >= last.monotonicNs else { return nil }
            let gap = Double(endedAt.monotonicNs - last.monotonicNs) / 1_000_000_000
            guard gap > threshold else { return nil }
            let interval = RawSuspensionInterval(
                from: last,
                to: endedAt,
                basis: .sessionEndedWithoutResume,
                observedStreams: [timeoutStream],
                source: .liveCapture,
                thresholdSeconds: threshold
            )
            suspensions.append(interval)
            return interval
        }
        guard endedAt.monotonicNs >= startedAt.monotonicNs else { return nil }
        let duration = Double(endedAt.monotonicNs - startedAt.monotonicNs) / 1_000_000_000
        guard duration > threshold else { return nil }
        let interval = RawSuspensionInterval(
            from: startedAt,
            to: endedAt,
            basis: .noSamplesObserved,
            observedStreams: [timeoutStream],
            source: .liveCapture,
            thresholdSeconds: threshold
        )
        suspensions.append(interval)
        return interval
    }

    func isSuspended(at stamp: CaptureStamp) -> Bool {
        guard let last = lastStamps[timeoutStream] else { return true }
        return Double(stamp.monotonicNs - last.monotonicNs) / 1_000_000_000 > thresholdSeconds
    }

    /// Suspended time observed so far, including an open tail after the last
    /// location sample, for the live recording-health display.
    func suspendedSeconds(through stamp: CaptureStamp) -> Double {
        var total = suspensions.reduce(0) { $0 + $1.durationSeconds }
        if let last = lastStamps[timeoutStream], stamp.monotonicNs > last.monotonicNs {
            let tail = Double(stamp.monotonicNs - last.monotonicNs) / 1_000_000_000
            if tail > thresholdSeconds { total += tail }
        }
        return total
    }

    var firstSampleStamp: CaptureStamp? {
        firstStamps.values.min { $0.monotonicNs < $1.monotonicNs }
    }

    func manifest(
        startedAt: CaptureStamp,
        endedAt: CaptureStamp,
        labelWindows: [GymLabelWindow],
        sampleCountBasis: String = "exact"
    ) -> RawStreamManifest {
        var observed: [String: RawStreamObservation] = [:]
        for stream in streams {
            guard let first = firstStamps[stream], let last = lastStamps[stream], let count = sampleCounts[stream] else { continue }
            var rate: Double?
            if count > 1, last.monotonicNs > first.monotonicNs {
                rate = Double(count - 1) / (Double(last.monotonicNs - first.monotonicNs) / 1_000_000_000)
            }
            observed[stream] = RawStreamObservation(
                sampleCount: count,
                firstReceiptMonotonicNs: first.monotonicNs,
                firstReceiptWallTimeMs: first.wallTimeMs,
                lastReceiptMonotonicNs: last.monotonicNs,
                lastReceiptWallTimeMs: last.wallTimeMs,
                observedAverageDeliveryHz: rate
            )
        }
        let first = firstSampleStamp
        let last = lastStamps[timeoutStream]
        let endedBeforeSessionEnd: Bool
        if let last {
            endedBeforeSessionEnd = Double(endedAt.monotonicNs - last.monotonicNs) / 1_000_000_000 > thresholdSeconds
        } else {
            endedBeforeSessionEnd = Double(endedAt.monotonicNs - startedAt.monotonicNs) / 1_000_000_000 > thresholdSeconds
        }
        return RawStreamManifest(
            schemaVersion: RawStreamManifest.currentSchemaVersion,
            expectedStreams: streams,
            suspensionThresholdsSeconds: thresholds,
            sampleCountBasis: sampleCountBasis,
            sampleCounts: sampleCounts,
            observed: observed,
            firstSampleMonotonicNs: first?.monotonicNs,
            lastSampleMonotonicNs: last?.monotonicNs,
            firstSampleWallTimeMs: first?.wallTimeMs,
            lastSampleWallTimeMs: last?.wallTimeMs,
            suspendedSeconds: suspensions.reduce(0) { $0 + $1.durationSeconds },
            endedBeforeSessionEnd: endedBeforeSessionEnd,
            suspensionCount: suspensions.count,
            suspensions: suspensions,
            labelWindows: labelWindows
        )
    }
}

extension RawStreamManifest {
    /// Rebuilds the manifest for an archive whose process did not finalize.
    static func recovered(
        snapshot: RawStreamManifest?,
        startedAt: CaptureStamp,
        recoveredAt: CaptureStamp,
        lastDeliveredSample: (CaptureStamp, String)?
    ) -> RawStreamManifest {
        let streams = snapshot?.expectedStreams ?? RawStreamManifest.defaultStreams
        let thresholds = snapshot?.suspensionThresholdsSeconds ?? gymStreamThresholdSeconds
        let threshold = thresholds["location"] ?? locationSuspensionThresholdSeconds
        // The snapshot was built as if the session ended at its checkpoint, so
        // its synthetic tail is dropped and rebuilt from the real last sample.
        var suspensions = (snapshot?.suspensions ?? []).filter {
            $0.basis != RawSuspensionBasis.sessionEndedWithoutResume.rawValue &&
            $0.basis != RawSuspensionBasis.noSamplesObserved.rawValue
        }
        let snapshotLast = snapshot.flatMap { manifest -> CaptureStamp? in
            guard let monotonic = manifest.lastSampleMonotonicNs, let wall = manifest.lastSampleWallTimeMs else { return nil }
            return CaptureStamp(monotonicNs: monotonic, wallTimeMs: wall, wallTimeISO8601: iso8601(wallMilliseconds: wall))
        }
        let lastSample: CaptureStamp?
        switch (snapshotLast, lastDeliveredSample?.0) {
        case let (l?, r?): lastSample = l.monotonicNs >= r.monotonicNs ? l : r
        case let (l?, nil): lastSample = l
        case let (nil, r?): lastSample = r
        default: lastSample = nil
        }

        // A process gap only becomes a suspension when it is longer than the
        // location threshold, exactly like a live delivery gap. A relaunch a
        // few seconds later is normal Core Location behaviour and must not mark
        // a window partial or add a finding.
        var recoverySuspension: RawSuspensionInterval?
        if let lastSample, recoveredAt.monotonicNs > lastSample.monotonicNs {
            let gapSeconds = Double(recoveredAt.monotonicNs - lastSample.monotonicNs) / 1_000_000_000
            if gapSeconds > threshold {
                let interval = RawSuspensionInterval(
                    from: lastSample,
                    to: recoveredAt,
                    basis: .processTerminationRecoveredOnLaunch,
                    observedStreams: [lastDeliveredSample?.1 ?? "location"],
                    source: .recoveryPass,
                    thresholdSeconds: threshold
                )
                suspensions.append(interval)
                recoverySuspension = interval
            }
        } else if lastSample == nil, recoveredAt.monotonicNs > startedAt.monotonicNs {
            let gapSeconds = Double(recoveredAt.monotonicNs - startedAt.monotonicNs) / 1_000_000_000
            if gapSeconds > threshold {
                let interval = RawSuspensionInterval(
                    from: startedAt,
                    to: recoveredAt,
                    basis: .noSamplesObserved,
                    observedStreams: ["location"],
                    source: .recoveryPass,
                    thresholdSeconds: threshold
                )
                suspensions.append(interval)
                recoverySuspension = interval
            }
        }

        // The last window was open when the process died. It is extended to
        // recovery observation time and its coverage is recomputed by the same
        // rule the live tracker uses: only silence longer than the location
        // threshold reduces it. A sub-threshold relaunch gap leaves the
        // checkpoint's own verdict intact.
        let windows = snapshot?.labelWindows ?? []
        let labelWindows = windows.enumerated().map { index, window -> GymLabelWindow in
            guard index == windows.count - 1 else { return window }
            let end = max(recoveredAt.monotonicNs, window.fromReceiptMonotonicNs)
            let duration = Double(end - window.fromReceiptMonotonicNs) / 1_000_000_000
            var recoveryUncovered = 0.0
            if let recoverySuspension {
                let low = max(recoverySuspension.fromReceiptMonotonicNs, window.fromReceiptMonotonicNs)
                let high = min(recoverySuspension.toReceiptMonotonicNs, end)
                if high > low { recoveryUncovered = Double(high - low) / 1_000_000_000 }
            }
            let uncovered = min(duration, max(min(duration, window.uncoveredSeconds), recoveryUncovered))
            let coverage: RawLabelWindowCoverage
            if window.locationSampleCount == 0 {
                coverage = .none
            } else if uncovered <= threshold {
                coverage = .covered
            } else {
                coverage = .partial
            }
            return GymLabelWindow(
                place: window.place,
                fromReceiptMonotonicNs: window.fromReceiptMonotonicNs,
                toReceiptMonotonicNs: end,
                fromReceiptWallTimeMs: window.fromReceiptWallTimeMs,
                toReceiptWallTimeMs: recoveredAt.wallTimeMs,
                durationSeconds: duration,
                locationSampleCount: window.locationSampleCount,
                regionEventsDuringWindow: window.regionEventsDuringWindow,
                uncoveredSeconds: uncovered,
                coverageRatio: duration > 0 ? max(0, min(1, 1 - uncovered / duration)) : 1,
                coverage: coverage,
                basis: window.basis,
                declaredOffsetSeconds: window.declaredOffsetSeconds
            )
        }

        return RawStreamManifest(
            schemaVersion: currentSchemaVersion,
            expectedStreams: streams,
            suspensionThresholdsSeconds: thresholds,
            sampleCountBasis: snapshot == nil ? "unavailable" : "as_of_last_checkpoint",
            sampleCounts: snapshot?.sampleCounts ?? [:],
            observed: snapshot?.observed ?? [:],
            firstSampleMonotonicNs: snapshot?.firstSampleMonotonicNs ?? (snapshot == nil ? lastSample?.monotonicNs : nil),
            lastSampleMonotonicNs: maxOptional(snapshot?.lastSampleMonotonicNs, lastSample?.monotonicNs),
            firstSampleWallTimeMs: snapshot?.firstSampleWallTimeMs ?? (snapshot == nil ? lastSample?.wallTimeMs : nil),
            lastSampleWallTimeMs: maxOptional(snapshot?.lastSampleWallTimeMs, lastSample?.wallTimeMs),
            suspendedSeconds: suspensions.reduce(0) { $0 + $1.durationSeconds },
            endedBeforeSessionEnd: true,
            suspensionCount: suspensions.count,
            suspensions: suspensions,
            labelWindows: labelWindows
        )
    }

    static func iso8601(wallMilliseconds: Int64) -> String {
        let formatter = ISO8601DateFormatter()
        return formatter.string(from: Date(timeIntervalSince1970: Double(wallMilliseconds) / 1_000))
    }

    private static func maxOptional<T: Comparable>(_ lhs: T?, _ rhs: T?) -> T? {
        switch (lhs, rhs) {
        case let (l?, r?): return max(l, r)
        case let (l?, nil): return l
        case let (nil, r?): return r
        default: return nil
        }
    }
}

/// Union length of potentially overlapping monotonic intervals.
enum MonotonicIntervalUnion {
    static func lengthSeconds(_ intervals: [(UInt64, UInt64)]) -> Double {
        let sorted = intervals.filter { $0.1 > $0.0 }.sorted { $0.0 < $1.0 }
        guard !sorted.isEmpty else { return 0 }
        var total: UInt64 = 0
        var currentStart = sorted[0].0
        var currentEnd = sorted[0].1
        for interval in sorted.dropFirst() {
            if interval.0 > currentEnd {
                total += currentEnd - currentStart
                currentStart = interval.0
                currentEnd = interval.1
            } else {
                currentEnd = max(currentEnd, interval.1)
            }
        }
        total += currentEnd - currentStart
        return Double(total) / 1_000_000_000
    }
}
