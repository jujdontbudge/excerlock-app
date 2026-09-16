import Foundation

/// A gap this long with no delivered raw inertial sample is a suspension, not
/// jitter: at the requested 50 Hz, 2 seconds is 100 missed samples per stream,
/// while normal Core Motion delivery jitter is milliseconds. It is deliberately
/// generous so the archive never invents a suspension over ordinary delivery
/// jitter, and never hides a real one.
let rawSuspensionThresholdSeconds = 2.0

/// One interval in which the recorder received no raw inertial sample at all.
///
/// The boundaries are observed receipt times, never claimed iOS suspension
/// instants: iOS does not tell an app when it suspends it, so the archive states
/// the range over which delivery was absent and marks the exact suspension time
/// unknown. A label window that overlaps one of these intervals can never again
/// be mistaken for a still phone.
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

    var durationSeconds: Double {
        Double(toReceiptMonotonicNs - fromReceiptMonotonicNs) / 1_000_000_000
    }

    init(from: CaptureStamp, to: CaptureStamp, basis: RawSuspensionBasis, observedStreams: [String], source: RawSuspensionSource) {
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
    }

    var dictionary: [String: Any] {
        [
            "streamGroup": "raw_inertial",
            "streams": observedStreams,
            "fromReceiptMonotonicNs": fromReceiptMonotonicNs,
            "toReceiptMonotonicNs": toReceiptMonotonicNs,
            "fromWallTimeMs": fromReceiptWallTimeMs,
            "toWallTimeMs": toReceiptWallTimeMs,
            "fromWallTimeISO8601": fromWallTimeISO8601,
            "toWallTimeISO8601": toWallTimeISO8601,
            "durationSeconds": durationSeconds,
            "basis": basis,
            "exactSuspensionTimeKnown": exactSuspensionTimeKnown,
            "source": source,
            "meaning": "No raw inertial sample was delivered between these observed receipt times. Screen lock, backgrounding, process suspension and delivery stalls all look like this; the exact suspension instant is not observable to the app."
        ]
    }
}

enum RawSuspensionBasis: String, Codable {
    /// A lifecycle callback (inactive/background) was observed before the gap.
    case appLifecycleRawGap = "app_lifecycle_raw_gap"
    /// The stream stopped delivering with no lifecycle callback observed.
    case rawDeliveryGap = "raw_delivery_gap"
    /// The session ended while the raw stream had not resumed.
    case sessionEndedWithoutRawResume = "session_ended_without_raw_resume"
    /// The session never received one raw inertial sample.
    case noRawSamplesObserved = "no_raw_samples_observed"
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

/// Per-stream raw coverage in the manifest.
struct RawStreamObservation: Codable, Equatable {
    let sampleCount: Int
    let firstReceiptMonotonicNs: UInt64
    let firstReceiptWallTimeMs: Int64
    let lastReceiptMonotonicNs: UInt64
    let lastReceiptWallTimeMs: Int64
    let observedAverageDeliveryRateHz: Double?
}

/// One labeled window with its raw-inertial coverage. `coverage` is `none` when
/// no raw sample at all arrived inside the window, `partial` when samples exist
/// but a suspension or an edge gap left part of it uncovered, and `covered`
/// otherwise. The numbers carry the exact story; the state is the coarse label.
struct RawLabelWindow: Codable, Equatable {
    let scenario: String
    let fromReceiptMonotonicNs: UInt64
    let toReceiptMonotonicNs: UInt64
    let fromReceiptWallTimeMs: Int64
    let toReceiptWallTimeMs: Int64
    let durationSeconds: Double
    let rawSampleCount: Int
    let rawStreamsObserved: [String]
    let uncoveredSeconds: Double
    let coverageRatio: Double
    let coverage: RawLabelWindowCoverage

    var dictionary: [String: Any] {
        [
            "scenario": scenario,
            "coverage": coverage.rawValue,
            "uncoveredSeconds": uncoveredSeconds,
            "coverageRatio": coverageRatio,
            "rawSampleCount": rawSampleCount
        ]
    }
}

/// The explicit raw-stream evidence block the manifest carries.
struct RawStreamManifest: Codable, Equatable {
    static let currentSchemaVersion = 1
    static let inertialStreams = ["accelerometer", "gyroscope", "device_motion"]

    let schemaVersion: Int
    let requestedRateHz: Double
    let expectedStreams: [String]
    let suspensionThresholdSeconds: Double
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
    let labelWindows: [RawLabelWindow]

    var summaryDictionary: [String: Any] {
        [
            "schemaVersion": schemaVersion,
            "sampleCountBasis": sampleCountBasis,
            "sampleCounts": sampleCounts,
            "suspendedSeconds": suspendedSeconds,
            "suspensionCount": suspensions.count,
            "endedBeforeSessionEnd": endedBeforeSessionEnd,
            "labelWindows": labelWindows.map(\.dictionary)
        ]
    }
}

/// Live accounting for the three raw inertial streams during one session.
///
/// Invariants the archive relies on:
/// - every interval longer than `thresholdSeconds` with no delivered sample
///   produces exactly one `RawSuspensionInterval`, and
/// - no interval may overlap a delivered sample: every interval starts at the
///   last observed receipt and ends at the next observed receipt (or the
///   session end / recovery observation when no sample followed).
final class RawCoverageTracker {
    let streams: [String]
    let thresholdSeconds: Double

    private(set) var sampleCounts: [String: Int] = [:]
    private(set) var firstStamps: [String: CaptureStamp] = [:]
    private(set) var lastStamps: [String: CaptureStamp] = [:]
    private(set) var suspensions: [RawSuspensionInterval] = []
    private(set) var lastSampleStamp: CaptureStamp?
    /// The most recent observed lifecycle departure (inactive/background) that
    /// has not yet been followed by a raw sample.
    private var departure: (stamp: CaptureStamp, state: String)?

    init(streams: [String] = RawStreamManifest.inertialStreams, thresholdSeconds: Double = rawSuspensionThresholdSeconds) {
        self.streams = streams
        self.thresholdSeconds = thresholdSeconds
    }

    /// Records one delivered raw inertial sample. Returns the suspension
    /// interval that this sample closed, if the sample arrived after a real gap.
    @discardableResult
    func observe(stream: String, stamp: CaptureStamp) -> RawSuspensionInterval? {
        var closed: RawSuspensionInterval?
        if let previous = lastSampleStamp, stamp.monotonicNs >= previous.monotonicNs {
            let gap = Double(stamp.monotonicNs - previous.monotonicNs) / 1_000_000_000
            if gap > thresholdSeconds {
                let interval = RawSuspensionInterval(
                    from: previous,
                    to: stamp,
                    // A lifecycle departure observed at or after the last sample
                    // explains the gap; otherwise it is an unexplained stall and
                    // is labelled as such rather than guessed.
                    basis: departure != nil ? .appLifecycleRawGap : .rawDeliveryGap,
                    observedStreams: streams,
                    source: .liveCapture
                )
                suspensions.append(interval)
                closed = interval
            }
        }
        if lastSampleStamp == nil || stamp.monotonicNs > lastSampleStamp!.monotonicNs {
            lastSampleStamp = stamp
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
    /// suspension by itself: only a following raw gap does, so a screen flicker
    /// that never stopped the sensors is not recorded as a suspension. The most
    /// recent departure is kept until a raw sample actually arrives again, so
    /// the gap that a lock created keeps its lifecycle basis.
    func noteLifecycleDeparture(state: String, stamp: CaptureStamp) {
        departure = (stamp, state)
    }

    /// Closes the session's tail. Without this a session that ended suspended
    /// would look like a clean session whose sensors were quiet.
    @discardableResult
    func closeAtSessionEnd(startedAt: CaptureStamp, endedAt: CaptureStamp) -> RawSuspensionInterval? {
        defer { departure = nil }
        if let last = lastSampleStamp {
            guard endedAt.monotonicNs >= last.monotonicNs else { return nil }
            let gap = Double(endedAt.monotonicNs - last.monotonicNs) / 1_000_000_000
            guard gap > thresholdSeconds else { return nil }
            let interval = RawSuspensionInterval(
                from: last,
                to: endedAt,
                basis: .sessionEndedWithoutRawResume,
                observedStreams: streams,
                source: .liveCapture
            )
            suspensions.append(interval)
            return interval
        }
        guard endedAt.monotonicNs >= startedAt.monotonicNs else { return nil }
        let duration = Double(endedAt.monotonicNs - startedAt.monotonicNs) / 1_000_000_000
        guard duration > thresholdSeconds else { return nil }
        let interval = RawSuspensionInterval(
            from: startedAt,
            to: endedAt,
            basis: .noRawSamplesObserved,
            observedStreams: streams,
            source: .liveCapture
        )
        suspensions.append(interval)
        return interval
    }

    func isSuspended(at stamp: CaptureStamp) -> Bool {
        guard let last = lastSampleStamp else { return true }
        return Double(stamp.monotonicNs - last.monotonicNs) / 1_000_000_000 > thresholdSeconds
    }

    /// Suspended time observed so far, including an open tail after the last
    /// sample, for the live recording-health display.
    func suspendedSeconds(through stamp: CaptureStamp) -> Double {
        var total = suspensions.reduce(0) { $0 + $1.durationSeconds }
        if let last = lastSampleStamp, stamp.monotonicNs > last.monotonicNs {
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
        labelWindows: [RawLabelWindow],
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
                observedAverageDeliveryRateHz: rate
            )
        }
        let first = firstSampleStamp
        let last = lastSampleStamp
        let endedBeforeSessionEnd: Bool
        if let last {
            endedBeforeSessionEnd = Double(endedAt.monotonicNs - last.monotonicNs) / 1_000_000_000 > thresholdSeconds
        } else {
            endedBeforeSessionEnd = Double(endedAt.monotonicNs - startedAt.monotonicNs) / 1_000_000_000 > thresholdSeconds
        }
        return RawStreamManifest(
            schemaVersion: RawStreamManifest.currentSchemaVersion,
            requestedRateHz: requestedDeviceMotionHz,
            expectedStreams: streams,
            suspensionThresholdSeconds: thresholdSeconds,
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
    ///
    /// The checkpoint snapshot carries the suspensions and per-window counts
    /// observed while the process lived. The recovery pass adds the tail the
    /// process could not write: no raw sample was delivered after the last one
    /// on disk, and the archive was only finalized on relaunch. Counts come from
    /// the checkpoint, so they are marked as a lower bound.
    static func recovered(
        snapshot: RawStreamManifest?,
        startedAt: CaptureStamp,
        recoveredAt: CaptureStamp,
        lastDeliveredRawSample: CaptureStamp?
    ) -> RawStreamManifest {
        let streams = snapshot?.expectedStreams ?? RawStreamManifest.inertialStreams
        let threshold = snapshot?.suspensionThresholdSeconds ?? rawSuspensionThresholdSeconds
        // The snapshot was built as if the session ended at its checkpoint, so
        // its synthetic tail is dropped and rebuilt from the real last sample.
        var suspensions = (snapshot?.suspensions ?? []).filter {
            $0.basis != RawSuspensionBasis.sessionEndedWithoutRawResume.rawValue &&
            $0.basis != RawSuspensionBasis.noRawSamplesObserved.rawValue
        }
        let snapshotLast = snapshot.flatMap { manifest -> CaptureStamp? in
            guard let monotonic = manifest.lastSampleMonotonicNs, let wall = manifest.lastSampleWallTimeMs else { return nil }
            return CaptureStamp(monotonicNs: monotonic, wallTimeMs: wall, wallTimeISO8601: iso8601(wallMilliseconds: wall))
        }
        let lastSample: CaptureStamp?
        switch (snapshotLast, lastDeliveredRawSample) {
        case let (l?, r?): lastSample = l.monotonicNs >= r.monotonicNs ? l : r
        case let (l?, nil): lastSample = l
        case let (nil, r?): lastSample = r
        default: lastSample = nil
        }

        if let lastSample, recoveredAt.monotonicNs > lastSample.monotonicNs {
            suspensions.append(RawSuspensionInterval(
                from: lastSample,
                to: recoveredAt,
                basis: .processTerminationRecoveredOnLaunch,
                observedStreams: streams,
                source: .recoveryPass
            ))
        } else if lastSample == nil, recoveredAt.monotonicNs > startedAt.monotonicNs {
            suspensions.append(RawSuspensionInterval(
                from: startedAt,
                to: recoveredAt,
                basis: .noRawSamplesObserved,
                observedStreams: streams,
                source: .recoveryPass
            ))
        }

        // The last window was open when the process died; it cannot be claimed
        // as covered, because delivery stopped and only a relaunch observed it.
        let windows = snapshot?.labelWindows ?? []
        let labelWindows = windows.enumerated().map { index, window -> RawLabelWindow in
            guard index == windows.count - 1 else { return window }
            let end = max(recoveredAt.monotonicNs, window.fromReceiptMonotonicNs)
            let duration = Double(end - window.fromReceiptMonotonicNs) / 1_000_000_000
            let checkpointCovered = max(0, window.durationSeconds - window.uncoveredSeconds)
            let uncovered = min(duration, max(0, duration - checkpointCovered))
            return RawLabelWindow(
                scenario: window.scenario,
                fromReceiptMonotonicNs: window.fromReceiptMonotonicNs,
                toReceiptMonotonicNs: end,
                fromReceiptWallTimeMs: window.fromReceiptWallTimeMs,
                toReceiptWallTimeMs: recoveredAt.wallTimeMs,
                durationSeconds: duration,
                rawSampleCount: window.rawSampleCount,
                rawStreamsObserved: window.rawStreamsObserved,
                uncoveredSeconds: uncovered,
                coverageRatio: duration > 0 ? max(0, 1 - uncovered / duration) : 0,
                coverage: window.rawSampleCount == 0 ? .none : .partial
            )
        }

        return RawStreamManifest(
            schemaVersion: currentSchemaVersion,
            requestedRateHz: snapshot?.requestedRateHz ?? requestedDeviceMotionHz,
            expectedStreams: streams,
            suspensionThresholdSeconds: threshold,
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
