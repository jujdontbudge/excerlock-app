import Foundation

/// Host-side (macOS) proof of the gym archive's recovery rules, compiled with
/// `scripts/test-recovery.sh` from the same sources the phone runs.
///
/// It asserts the three things an interrupted `.gymcapture` must never get
/// wrong: the process-death gap is declared honestly with the basis
/// `process_termination_recovered_on_launch` and its observed range, a relaunch
/// a few seconds later is normal Core Location behaviour and NOT a suspension,
/// and the open label window is closed at recovery observation time without
/// claiming an exact termination time. No ExcerLock link, nonce or URL scheme is
/// involved: the gym harness has none.

private final class HarnessClock: CaptureClock {
    var stamp: CaptureStamp

    init(monotonicNs: UInt64 = 1_000_000_000, wallTimeMs: Int64 = 1_700_000_000_000) {
        stamp = CaptureStamp(
            monotonicNs: monotonicNs,
            wallTimeMs: wallTimeMs,
            wallTimeISO8601: RawStreamManifest.iso8601(wallMilliseconds: wallTimeMs)
        )
    }

    func now() -> CaptureStamp { stamp }

    func advance(seconds: Double) {
        let wall = stamp.wallTimeMs + Int64((seconds * 1_000).rounded())
        stamp = CaptureStamp(
            monotonicNs: stamp.monotonicNs + UInt64((seconds * 1_000_000_000).rounded()),
            wallTimeMs: wall,
            wallTimeISO8601: RawStreamManifest.iso8601(wallMilliseconds: wall)
        )
    }
}

private struct FixedClock: CaptureClock {
    let stamp: CaptureStamp
    func now() -> CaptureStamp { stamp }
}

@main
struct GymRecoveryHarness {
    static func main() throws {
        try transientInterruptionIsRecoveredWithoutInventingATerminationTime()
        try shortRelaunchGapIsNotASuspension()
        try legacyCheckpointWithoutAStreamSnapshotStillRecovers()
        print("Gym Recorder recovery harness passed")
    }

    private static func root(_ name: String) -> URL {
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("gym-recorder-\(name)-\(UUID().uuidString)", isDirectory: true)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    private static func readLines(_ url: URL) throws -> [[String: Any]] {
        let text = try String(contentsOf: url, encoding: .utf8)
        return try text.split(separator: "\n").map { line in
            guard let object = try JSONSerialization.jsonObject(with: Data(line.utf8)) as? [String: Any] else {
                throw NSError(domain: "harness", code: 1)
            }
            return object
        }
    }

    /// 30 s of silence after the last fix: a real suspension, declared with the
    /// recovery-pass basis, the observed range and the window it made partial.
    private static func transientInterruptionIsRecoveredWithoutInventingATerminationTime() throws {
        let directory = root("interrupted")
        defer { try? FileManager.default.removeItem(at: directory) }
        let clock = HarnessClock()
        var timeline = GymLabelTimeline()
        _ = timeline.transition(to: .inGym, at: clock.now(), reason: .sessionStart)

        let coverage = RawCoverageTracker()
        var writer: SessionWriter? = try SessionWriter(
            baseURL: directory,
            id: "gym-interrupted",
            startedAt: clock.now(),
            metadata: ["schemaVersion": recorderSchemaVersion, "scenarioId": "S04"],
            gyms: [["id": "gym-primary", "radiusMeters": 100]],
            clock: clock
        )
        for _ in 0..<2 {
            clock.advance(seconds: 5)
            coverage.observe(stream: "location", stamp: clock.now())
            timeline.recordLocationSample(at: clock.now())
        }
        let windows = timeline.labelWindows(
            endedAt: clock.now(),
            suspensions: coverage.suspensions,
            thresholdSeconds: coverage.thresholdSeconds
        )
        let manifest = coverage.manifest(startedAt: timeline.segments[0].from, endedAt: clock.now(), labelWindows: windows)
        try writer?.checkpoint(timeline: timeline, gapCount: 0, streams: manifest)
        writer = nil

        let recoveredAt = CaptureStamp(
            monotonicNs: clock.now().monotonicNs + 30_000_000_000,
            wallTimeMs: clock.now().wallTimeMs + 30_000,
            wallTimeISO8601: RawStreamManifest.iso8601(wallMilliseconds: clock.now().wallTimeMs + 30_000)
        )
        SessionWriter.recoverInterruptedSessions(baseURL: directory, clock: FixedClock(stamp: recoveredAt))

        let repository = SessionRepository(baseURL: directory)
        guard let summary = repository.sessions.first else { preconditionFailure("no recovered session") }
        precondition(summary.status == .interrupted, "a process death must recover as interrupted")
        precondition(summary.scenarioId == "S04", "recovery must keep the declared scenario")
        precondition(summary.gymIds == ["gym-primary"], "recovery must keep the registered gym ids")

        guard let streams = summary.streams else { preconditionFailure("no coverage manifest") }
        precondition(streams.sampleCountBasis == "as_of_last_checkpoint")
        precondition(streams.suspensionCount == 1, "the 30 s process gap must be one declared suspension")
        guard let suspension = streams.suspensions.last else { preconditionFailure("no suspension") }
        precondition(
            suspension.basis == RawSuspensionBasis.processTerminationRecoveredOnLaunch.rawValue,
            "the gap after the last sample must carry the recovery basis"
        )
        precondition(suspension.source == RawSuspensionSource.recoveryPass.rawValue)
        precondition(suspension.exactSuspensionTimeKnown == false, "the exact suspension instant is not observable")
        precondition(
            suspension.fromReceiptMonotonicNs == clock.now().monotonicNs,
            "the suspension must start at the last delivered sample"
        )
        precondition(
            suspension.toReceiptMonotonicNs == recoveredAt.monotonicNs,
            "the suspension must end at recovery observation time"
        )

        guard let window = summary.labelWindows.last else { preconditionFailure("no label window") }
        precondition(window.place == "in_gym")
        precondition(window.coverage == .partial, "a 30 s gap inside the window is uncovered time")
        precondition(window.uncoveredSeconds > 20, "the uncovered seconds must be reported, not hidden")
        precondition(
            window.toReceiptMonotonicNs == recoveredAt.monotonicNs,
            "the open window must be closed at recovery observation time"
        )

        let system = try readLines(directory.appendingPathComponent("gym-interrupted.gymcapture").appendingPathComponent("system.ndjson"))
        precondition(system.last?["type"] as? String == "interruption_recovered_on_launch")
        guard let payload = system.last?["payload"] as? [String: Any] else { preconditionFailure("no payload") }
        precondition((payload["meaning"] as? String)?.contains("not the exact") == true)
        precondition(system.dropLast().last?["type"] as? String == "location_stream_suspended")

        let labels = try readLines(directory.appendingPathComponent("gym-interrupted.gymcapture").appendingPathComponent("labels.ndjson"))
        guard let closing = labels.last?["payload"] as? [String: Any] else { preconditionFailure("no closing label") }
        precondition(closing["reason"] as? String == "session_end")
        precondition(closing["toPlace"] is NSNull, "the closing transition must not invent a destination place")

        let archive = try SessionRepository.export(summary, from: directory)
        let bytes = try Data(contentsOf: archive)
        precondition(bytes.range(of: Data("recovery.json".utf8)) == nil, "recovery.json must never be exported")
        let text = String(decoding: bytes, as: UTF8.self)
        for name in ["raw-location.ndjson", "raw-motion.ndjson", "labels.ndjson", "observations.ndjson", "decisions.ndjson", "system.ndjson", "gym.json", "manifest.json"] {
            precondition(text.contains(name), "export is missing \(name)")
        }
    }

    /// A five-second relaunch gap is normal iOS behaviour, not a suspension, and
    /// must not mark the open window partial.
    private static func shortRelaunchGapIsNotASuspension() throws {
        let directory = root("short-gap")
        defer { try? FileManager.default.removeItem(at: directory) }
        let clock = HarnessClock()
        var timeline = GymLabelTimeline()
        _ = timeline.transition(to: .inGym, at: clock.now(), reason: .sessionStart)

        let coverage = RawCoverageTracker()
        var writer: SessionWriter? = try SessionWriter(
            baseURL: directory,
            id: "gym-short-gap",
            startedAt: clock.now(),
            metadata: ["schemaVersion": recorderSchemaVersion, "scenarioId": "S03"],
            gyms: [["id": "gym-primary", "radiusMeters": 100]],
            clock: clock
        )
        clock.advance(seconds: 2)
        coverage.observe(stream: "location", stamp: clock.now())
        timeline.recordLocationSample(at: clock.now())
        let windows = timeline.labelWindows(
            endedAt: clock.now(),
            suspensions: coverage.suspensions,
            thresholdSeconds: coverage.thresholdSeconds
        )
        let manifest = coverage.manifest(startedAt: timeline.segments[0].from, endedAt: clock.now(), labelWindows: windows)
        try writer?.checkpoint(timeline: timeline, gapCount: 0, streams: manifest)
        writer = nil

        let recoveredAt = CaptureStamp(
            monotonicNs: clock.now().monotonicNs + 5_000_000_000,
            wallTimeMs: clock.now().wallTimeMs + 5_000,
            wallTimeISO8601: RawStreamManifest.iso8601(wallMilliseconds: clock.now().wallTimeMs + 5_000)
        )
        SessionWriter.recoverInterruptedSessions(baseURL: directory, clock: FixedClock(stamp: recoveredAt))

        let repository = SessionRepository(baseURL: directory)
        guard let summary = repository.sessions.first else { preconditionFailure("no recovered session") }
        precondition(summary.status == .interrupted)
        precondition(summary.streams?.suspensionCount == 0, "a 5 s gap is under the 15 s location threshold")
        guard let window = summary.labelWindows.last else { preconditionFailure("no label window") }
        precondition(window.coverage == .covered, "a sub-threshold relaunch gap must not make the window partial")
        precondition(window.uncoveredSeconds <= 15)
    }

    /// A checkpoint written before the recovery file carried a stream snapshot
    /// still recovers: the archive keeps its declared shape and the closing
    /// label transition is written, but no window can be rebuilt from it.
    private static func legacyCheckpointWithoutAStreamSnapshotStillRecovers() throws {
        let directory = root("legacy")
        defer { try? FileManager.default.removeItem(at: directory) }
        let clock = HarnessClock()
        var timeline = GymLabelTimeline()
        _ = timeline.transition(to: .inGym, at: clock.now(), reason: .sessionStart)
        var writer: SessionWriter? = try SessionWriter(
            baseURL: directory,
            id: "gym-legacy",
            startedAt: clock.now(),
            metadata: ["schemaVersion": recorderSchemaVersion, "scenarioId": "S02"],
            gyms: [["id": "gym-primary", "radiusMeters": 100]],
            clock: clock
        )
        try writer?.checkpoint(timeline: timeline, gapCount: 0)
        writer = nil

        let recoveredAt = CaptureStamp(
            monotonicNs: clock.now().monotonicNs + 60_000_000_000,
            wallTimeMs: clock.now().wallTimeMs + 60_000,
            wallTimeISO8601: RawStreamManifest.iso8601(wallMilliseconds: clock.now().wallTimeMs + 60_000)
        )
        SessionWriter.recoverInterruptedSessions(baseURL: directory, clock: FixedClock(stamp: recoveredAt))

        let repository = SessionRepository(baseURL: directory)
        guard let summary = repository.sessions.first else { preconditionFailure("no recovered session") }
        precondition(summary.status == .interrupted)
        precondition(summary.streams?.sampleCountBasis == "unavailable")
        precondition(summary.streams?.suspensionCount == 1)
        precondition(summary.labelWindows.isEmpty, "a legacy checkpoint carries no window snapshot")
        let labels = try readLines(directory.appendingPathComponent("gym-legacy.gymcapture").appendingPathComponent("labels.ndjson"))
        guard let closing = labels.last?["payload"] as? [String: Any] else { preconditionFailure("no closing label") }
        precondition(closing["reason"] as? String == "session_end")
        precondition(closing["fromPlace"] as? String == "in_gym")
    }
}
