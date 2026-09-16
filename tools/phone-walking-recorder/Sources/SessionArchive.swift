import Combine
import Foundation

private let sessionDirectorySuffix = ".walkingcapture"

enum CaptureEventChannel: String, CaseIterable {
    case raw = "raw-motion.ndjson"
    case labels = "labels.ndjson"
    case decisions = "decisions.ndjson"
    case system = "system.ndjson"
}

enum SessionWriterError: LocalizedError, Equatable {
    case storageLimit
    case closed
    case invalidPayload
    case sessionExists

    var errorDescription: String? {
        switch self {
        case .storageLimit: return "This recording reached its 250 MB safety limit. It was stopped and kept."
        case .closed: return "The recording file is already closed."
        case .invalidPayload: return "A sensor event could not be encoded."
        case .sessionExists: return "A recording with this session already exists on this phone. Nothing was overwritten."
        }
    }
}

/// Refusals from the archive store itself, so a caller cannot bypass a guard by
/// deleting through the repository instead of the controller.
enum SessionRepositoryError: LocalizedError, Equatable {
    case protectedLinkedRecovery(sessionId: String)

    var errorDescription: String? {
        switch self {
        case .protectedLinkedRecovery(let sessionId):
            return "This archive still backs linked Trace Lab test \(String(sessionId.prefix(8)))…. Finish that test in Trace Lab, then remove its protected reminder before deleting the archive."
        }
    }
}

final class SessionWriter {
    let id: String
    let directoryURL: URL
    let startedAt: CaptureStamp

    private let clock: CaptureClock
    private let maxBytes: Int64
    private let linkedTraceRecovery: LinkedTraceRecovery?
    private let lock = NSLock()
    private var handles: [CaptureEventChannel: FileHandle] = [:]
    private var buffers: [CaptureEventChannel: Data] = [:]
    private var sequence = 0
    private var eventCount = 0
    private var bytesWritten: Int64 = 0
    private var finalized = false
    private let flushThreshold = 64 * 1_024

    init(
        baseURL: URL,
        id: String = UUID().uuidString.lowercased(),
        startedAt: CaptureStamp,
        metadata: [String: Any],
        clock: CaptureClock = SystemCaptureClock(),
        maxBytes: Int64 = maximumSessionBytes,
        linkedTraceRecovery: LinkedTraceRecovery? = nil
    ) throws {
        self.id = id
        self.startedAt = startedAt
        self.clock = clock
        self.maxBytes = maxBytes
        self.linkedTraceRecovery = linkedTraceRecovery
        directoryURL = baseURL.appendingPathComponent("\(id)\(sessionDirectorySuffix)", isDirectory: true)

        // A repeated linked-session delivery must never truncate an existing
        // archive. Opening an existing session is handled by the controller as
        // reject/resume based on durable state; a writer is only ever created
        // for a session directory that does not exist yet.
        guard !FileManager.default.fileExists(atPath: directoryURL.path) else { throw SessionWriterError.sessionExists }
        do {
            try FileManager.default.createDirectory(at: directoryURL, withIntermediateDirectories: true)
            var created: [CaptureEventChannel: FileHandle] = [:]
            for channel in CaptureEventChannel.allCases {
                let url = directoryURL.appendingPathComponent(channel.rawValue)
                FileManager.default.createFile(
                    atPath: url.path,
                    contents: nil,
                    attributes: Self.protectedFileAttributes
                )
                created[channel] = try FileHandle(forWritingTo: url)
                buffers[channel] = Data()
            }
            handles = created
            try Self.writeJSONObject(metadata, to: directoryURL.appendingPathComponent("metadata.json"))
            try Self.writeJSONObject(Self.schemaDocument, to: directoryURL.appendingPathComponent("schema.json"))
            try Self.readme.write(to: directoryURL.appendingPathComponent("README.txt"), atomically: true, encoding: .utf8)
            try writeRecovery(timeline: LabelTimeline(), gapCount: 0)
        } catch {
            // A thrown initialization is not a durable archive: close whatever
            // was opened and remove the partial directory so the same session
            // id is not permanently blocked by an unfinished attempt.
            for handle in handles.values { try? handle.close() }
            handles.removeAll()
            try? FileManager.default.removeItem(at: directoryURL)
            throw error
        }
    }

    deinit {
        for handle in handles.values { try? handle.close() }
    }

    @discardableResult
    func append(
        channel: CaptureEventChannel,
        type: String,
        payload: [String: Any],
        stamp: CaptureStamp? = nil,
        critical: Bool = false
    ) throws -> CaptureStamp {
        lock.lock()
        defer { lock.unlock() }
        guard !finalized else { throw SessionWriterError.closed }
        let actualStamp = stamp ?? clock.now()
        try appendLocked(channel: channel, type: type, payload: payload, stamp: actualStamp, enforceLimit: true)
        if critical { try flushLocked(synchronize: true) }
        return actualStamp
    }

    func flush() throws {
        lock.lock()
        defer { lock.unlock() }
        guard !finalized else { return }
        try flushLocked(synchronize: true)
    }

    func checkpoint(timeline: LabelTimeline, gapCount: Int, rawStream: RawStreamManifest? = nil) throws {
        lock.lock()
        defer { lock.unlock() }
        guard !finalized else { return }
        try flushLocked(synchronize: true)
        try writeRecovery(timeline: timeline, gapCount: gapCount, rawStream: rawStream)
    }

    func finalize(
        status: SessionCompletionStatus,
        timeline: LabelTimeline,
        gapCount: Int,
        endedAt: CaptureStamp? = nil,
        detail: String? = nil,
        rawStream: RawStreamManifest? = nil
    ) throws -> SessionSummary {
        lock.lock()
        defer { lock.unlock() }
        guard !finalized else { throw SessionWriterError.closed }
        let end = endedAt ?? clock.now()
        var payload: [String: Any] = ["status": status.rawValue]
        if let detail { payload["detail"] = detail }
        try appendLocked(channel: .system, type: "session_end", payload: payload, stamp: end, enforceLimit: false)
        try flushLocked(synchronize: true)
        for handle in handles.values { try handle.close() }
        handles.removeAll()
        finalized = true

        let provisional = SessionSummary(
            id: id,
            startedAt: startedAt,
            endedAt: end,
            status: status,
            eventCount: eventCount,
            segmentCount: timeline.segmentCount,
            gapCount: gapCount,
            byteCount: bytesWritten,
            scenarioCounts: timeline.scenarioCounts,
            directoryName: directoryURL.lastPathComponent,
            rawStream: rawStream
        )
        let manifestURL = directoryURL.appendingPathComponent("manifest.json")
        try Self.writeEncodable(provisional, to: manifestURL)
        let finalSize = Self.directorySize(directoryURL)
        let summary = SessionSummary(
            id: provisional.id,
            startedAt: provisional.startedAt,
            endedAt: provisional.endedAt,
            status: provisional.status,
            eventCount: provisional.eventCount,
            segmentCount: provisional.segmentCount,
            gapCount: provisional.gapCount,
            byteCount: finalSize,
            scenarioCounts: provisional.scenarioCounts,
            directoryName: provisional.directoryName,
            rawStream: provisional.rawStream
        )
        try Self.writeEncodable(summary, to: manifestURL)
        if linkedTraceRecovery == nil {
            try? FileManager.default.removeItem(at: directoryURL.appendingPathComponent("recovery.json"))
        } else {
            try writeRecovery(timeline: timeline, gapCount: gapCount, recorderFinalized: true, rawStream: rawStream)
        }
        return summary
    }

    private func appendLocked(
        channel: CaptureEventChannel,
        type: String,
        payload: [String: Any],
        stamp: CaptureStamp,
        enforceLimit: Bool
    ) throws {
        sequence += 1
        let event: [String: Any] = [
            "schemaVersion": recorderSchemaVersion,
            "sequence": sequence,
            "type": type,
            "receiptMonotonicNs": stamp.monotonicNs,
            "receiptWallTimeMs": stamp.wallTimeMs,
            "receiptWallTimeISO8601": stamp.wallTimeISO8601,
            "payload": payload
        ]
        guard JSONSerialization.isValidJSONObject(event),
              var data = try? JSONSerialization.data(withJSONObject: event, options: [.sortedKeys, .withoutEscapingSlashes])
        else {
            sequence -= 1
            throw SessionWriterError.invalidPayload
        }
        data.append(0x0A)
        if enforceLimit && bytesWritten + Int64(data.count) > maxBytes {
            sequence -= 1
            throw SessionWriterError.storageLimit
        }
        buffers[channel, default: Data()].append(data)
        bytesWritten += Int64(data.count)
        eventCount += 1
        if buffers[channel, default: Data()].count >= flushThreshold {
            try flushChannelLocked(channel, synchronize: false)
        }
    }

    private func flushLocked(synchronize: Bool) throws {
        for channel in CaptureEventChannel.allCases {
            try flushChannelLocked(channel, synchronize: false)
        }
        if synchronize {
            for handle in handles.values { try handle.synchronize() }
        }
    }

    private func flushChannelLocked(_ channel: CaptureEventChannel, synchronize: Bool) throws {
        guard let handle = handles[channel], let data = buffers[channel], !data.isEmpty else { return }
        try handle.write(contentsOf: data)
        buffers[channel] = Data()
        if synchronize { try handle.synchronize() }
    }

    private func writeRecovery(timeline: LabelTimeline, gapCount: Int, recorderFinalized: Bool = false, rawStream: RawStreamManifest? = nil) throws {
        var recovery: [String: Any] = [
            "schemaVersion": recorderSchemaVersion,
            "sessionId": id,
            "startedAt": Self.stampDictionary(startedAt),
            "lastSequence": sequence,
            "eventCount": eventCount,
            "segmentCount": timeline.segmentCount,
            "gapCount": gapCount,
            "scenarioCounts": timeline.scenarioCounts,
            "activeLabel": timeline.active?.rawValue ?? NSNull(),
            "recorderFinalized": recorderFinalized,
            "note": recorderFinalized
                ? "The Recorder archive is finalized. This protected file remains only until the linked Trace Lab session is finalized or explicitly abandoned."
                : "Presence of this file means the session was not cleanly finalized. Recovery time is observed on next launch, not an exact suspension or termination timestamp."
        ]
        if let linkedTraceRecovery {
            recovery["linkedTraceRecovery"] = [
                "sessionId": linkedTraceRecovery.sessionId,
                "nonce": linkedTraceRecovery.nonce,
                "protocolVersion": linkedTraceRecovery.protocolVersion,
                "excludedFromExport": true
            ]
        }
        // The checkpoint snapshot lets the relaunch recovery pass rebuild label
        // coverage and every suspension observed before the process died.
        if let rawStream, let object = Self.jsonObject(rawStream) {
            recovery["rawStream"] = object
        }
        try Self.writeJSONObject(recovery, to: directoryURL.appendingPathComponent("recovery.json"))
    }

    static func recoverInterruptedSessions(baseURL: URL, clock: CaptureClock = SystemCaptureClock()) {
        guard let directories = try? FileManager.default.contentsOfDirectory(
            at: baseURL,
            includingPropertiesForKeys: nil,
            options: [.skipsHiddenFiles]
        ) else { return }
        for directory in directories where directory.pathExtension == "walkingcapture" {
            let recoveryURL = directory.appendingPathComponent("recovery.json")
            let manifestURL = directory.appendingPathComponent("manifest.json")
            guard FileManager.default.fileExists(atPath: recoveryURL.path),
                  !FileManager.default.fileExists(atPath: manifestURL.path),
                  let data = try? Data(contentsOf: recoveryURL),
                  let recovery = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let sessionId = recovery["sessionId"] as? String,
                  let startedObject = recovery["startedAt"] as? [String: Any],
                  let started = stamp(from: startedObject)
            else { continue }

            let recoveredAt = clock.now()
            // A checkpoint is not written for every raw sample, so the highest
            // sequence on disk can exceed the one the recovery file carries.
            // Recovered events must continue after it or the archive would
            // contain duplicate sequence numbers.
            let sequence = max(recovery["lastSequence"] as? Int ?? 0, Self.lastSequenceOnDisk(in: directory)) + 1
            let systemURL = directory.appendingPathComponent(CaptureEventChannel.system.rawValue)
            let rawStream = RawStreamManifest.recovered(
                snapshot: Self.rawStreamSnapshot(from: recovery),
                startedAt: started,
                recoveredAt: recoveredAt,
                lastDeliveredRawSample: lastRawInertialSampleStamp(in: directory)
            )
            if let handle = try? FileHandle(forWritingTo: systemURL) {
                _ = try? handle.seekToEnd()
                let interval = rawStream.suspensions.last
                let events: [[String: Any]] = [
                    [
                        "schemaVersion": recorderSchemaVersion,
                        "sequence": sequence,
                        "type": "raw_stream_suspended",
                        "receiptMonotonicNs": interval?.toReceiptMonotonicNs ?? recoveredAt.monotonicNs,
                        "receiptWallTimeMs": interval?.toReceiptWallTimeMs ?? recoveredAt.wallTimeMs,
                        "receiptWallTimeISO8601": interval?.toWallTimeISO8601 ?? recoveredAt.wallTimeISO8601,
                        "payload": interval?.dictionary ?? ["meaning": "No raw inertial sample was delivered before this archive was recovered."]
                    ],
                    [
                        "schemaVersion": recorderSchemaVersion,
                        "sequence": sequence + 1,
                        "type": "interruption_recovered_on_launch",
                        "receiptMonotonicNs": recoveredAt.monotonicNs,
                        "receiptWallTimeMs": recoveredAt.wallTimeMs,
                        "receiptWallTimeISO8601": recoveredAt.wallTimeISO8601,
                        "payload": [
                            "meaning": "The prior process did not finalize. This timestamp is recovery observation time; it is not the exact suspension, crash, or termination time.",
                            "rawStreamRecovered": true
                        ]
                    ]
                ]
                for event in events {
                    if var line = try? JSONSerialization.data(withJSONObject: event, options: [.sortedKeys, .withoutEscapingSlashes]) {
                        line.append(0x0A)
                        try? handle.write(contentsOf: line)
                    }
                }
                try? handle.synchronize()
                try? handle.close()
            }
            let summary = SessionSummary(
                id: sessionId,
                startedAt: started,
                endedAt: recoveredAt,
                status: .interrupted,
                eventCount: (recovery["eventCount"] as? Int ?? 0) + 2,
                segmentCount: recovery["segmentCount"] as? Int ?? 0,
                gapCount: recovery["gapCount"] as? Int ?? 0,
                byteCount: directorySize(directory),
                scenarioCounts: recovery["scenarioCounts"] as? [String: Int] ?? [:],
                directoryName: directory.lastPathComponent,
                rawStream: rawStream
            )
            try? writeEncodable(summary, to: manifestURL)
            if linkedTraceRecovery(from: recovery) == nil {
                try? FileManager.default.removeItem(at: recoveryURL)
            } else {
                var retained = recovery
                retained["recorderFinalized"] = true
                retained["note"] = "The interrupted Recorder archive was finalized on relaunch. This protected file remains only until the linked Trace Lab session is finalized or explicitly abandoned."
                try? writeJSONObject(retained, to: recoveryURL)
            }
        }
    }

    /// Pending linked recoveries in actionable order, newest unfinished test first.
    ///
    /// Directory enumeration order is not an order: without this, the
    /// "Linked test recorded here" card could surface an arbitrary stale
    /// recovery. An unfinished recording (no manifest yet, or an archive the
    /// recovery pass has not finalized) outranks an already-finalized archive
    /// that only waits for Trace Lab, and within each group the most recently
    /// started test wins. The session id is the stable tie-break so two
    /// recoveries with equal start stamps can never swap places.
    static func pendingLinkedTraceRecoveries(baseURL: URL) -> [LinkedTraceRecovery] {
        guard let directories = try? FileManager.default.contentsOfDirectory(
            at: baseURL,
            includingPropertiesForKeys: nil,
            options: [.skipsHiddenFiles]
        ) else { return [] }
        let candidates: [PendingLinkedTraceRecovery] = directories.compactMap { directory in
            let recoveryURL = directory.appendingPathComponent("recovery.json")
            let manifestURL = directory.appendingPathComponent("manifest.json")
            guard let data = try? Data(contentsOf: recoveryURL),
                  let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let recovery = linkedTraceRecovery(from: object)
            else { return nil }
            let recorderFinalized = object["recorderFinalized"] as? Bool ?? false
            // A finalized archive is the card's normal case. An unfinished
            // recording has no manifest yet, and it is the most actionable
            // recovery of all, so it is surfaced instead of hidden. A finalized
            // stamp whose archive is missing is a partial attempt that never
            // wrote a manifest, and it cannot claim a recording that is not there.
            if recorderFinalized && !FileManager.default.fileExists(atPath: manifestURL.path) { return nil }
            let started = (object["startedAt"] as? [String: Any]).flatMap(stamp(from:))
            return PendingLinkedTraceRecovery(
                recovery: recovery,
                // An unreadable start stamp sorts last inside its group instead of
                // hiding a recovery the operator may still need.
                startedAtWallTimeMs: started?.wallTimeMs ?? Int64.min,
                recorderFinalized: recorderFinalized
            )
        }
        return candidates.sorted(by: PendingLinkedTraceRecovery.actionableOrder).map(\.recovery)
    }

    static func clearLinkedTraceRecovery(sessionId: String, baseURL: URL) throws {
        let directory = baseURL.appendingPathComponent("\(sessionId)\(sessionDirectorySuffix)", isDirectory: true)
        guard directory.deletingLastPathComponent().standardizedFileURL == baseURL.standardizedFileURL else { return }
        let recoveryURL = directory.appendingPathComponent("recovery.json")
        if FileManager.default.fileExists(atPath: recoveryURL.path) { try FileManager.default.removeItem(at: recoveryURL) }
    }

    /// Durable presence of an archive directory for a session id. A repeated
    /// linked-session delivery must consult this before creating a writer.
    static func archiveExists(id: String, baseURL: URL) -> Bool {
        let directory = baseURL.appendingPathComponent("\(id)\(sessionDirectorySuffix)", isDirectory: true)
        return FileManager.default.fileExists(atPath: directory.path)
    }

    /// The raw-coverage snapshot a checkpoint wrote, if this archive predates it.
    private static func rawStreamSnapshot(from recovery: [String: Any]) -> RawStreamManifest? {
        guard let object = recovery["rawStream"] as? [String: Any],
              let data = try? JSONSerialization.data(withJSONObject: object) else { return nil }
        return try? JSONDecoder().decode(RawStreamManifest.self, from: data)
    }

    private static func jsonObject<T: Encodable>(_ value: T) -> Any? {
        guard let data = try? JSONEncoder().encode(value) else { return nil }
        return try? JSONSerialization.jsonObject(with: data)
    }

    /// Last inertial sample receipt recorded on disk, used when a process died
    /// before finalizing. Reads only the file tail: an interrupted archive can
    /// hold tens of megabytes and this runs on the launch path.
    static func lastRawInertialSampleStamp(in directory: URL) -> CaptureStamp? {
        let objects = tailObjects(of: directory.appendingPathComponent(CaptureEventChannel.raw.rawValue))
        for object in objects.reversed() {
            guard let type = object["type"] as? String,
                  RawStreamManifest.inertialStreams.contains(where: { type == "\($0)_sample" }),
                  let monotonic = (object["receiptMonotonicNs"] as? NSNumber)?.uint64Value,
                  let wall = (object["receiptWallTimeMs"] as? NSNumber)?.int64Value,
                  let iso = object["receiptWallTimeISO8601"] as? String else { continue }
            return CaptureStamp(monotonicNs: monotonic, wallTimeMs: wall, wallTimeISO8601: iso)
        }
        return nil
    }

    /// Highest sequence present in any channel file, so a recovered archive
    /// never repeats a sequence that was written after the last checkpoint.
    static func lastSequenceOnDisk(in directory: URL) -> Int {
        var maximum = 0
        for channel in CaptureEventChannel.allCases {
            let objects = tailObjects(of: directory.appendingPathComponent(channel.rawValue))
            guard let last = objects.last, let sequence = (last["sequence"] as? NSNumber)?.intValue else { continue }
            maximum = max(maximum, sequence)
        }
        return maximum
    }

    /// Parses the last few hundred kilobytes of an NDJSON channel.
    private static func tailObjects(of url: URL) -> [[String: Any]] {
        guard let handle = try? FileHandle(forReadingFrom: url) else { return [] }
        defer { try? handle.close() }
        let size = (try? handle.seekToEnd()) ?? 0
        let chunkSize: UInt64 = 256 * 1_024
        let start = size > chunkSize ? size - chunkSize : 0
        try? handle.seek(toOffset: start)
        guard var data = try? handle.read(upToCount: Int(size - start)), !data.isEmpty else { return [] }
        if start > 0, let newline = data.firstIndex(of: 0x0A) {
            data = data[data.index(after: newline)...]
        }
        return data.split(separator: 0x0A).compactMap {
            (try? JSONSerialization.jsonObject(with: Data($0))) as? [String: Any]
        }
    }

    private static func linkedTraceRecovery(from recovery: [String: Any]) -> LinkedTraceRecovery? {
        guard let linked = recovery["linkedTraceRecovery"] as? [String: Any],
              let sessionId = linked["sessionId"] as? String,
              let nonce = linked["nonce"] as? String,
              let protocolVersion = linked["protocolVersion"] as? Int,
              protocolVersion == 1,
              UUID(uuidString: sessionId)?.uuidString.lowercased() == sessionId.lowercased(),
              nonce.utf8.count >= 64
        else { return nil }
        return LinkedTraceRecovery(sessionId: sessionId.lowercased(), nonce: nonce, protocolVersion: protocolVersion)
    }

    static func stampDictionary(_ stamp: CaptureStamp) -> [String: Any] {
        [
            "monotonicNs": stamp.monotonicNs,
            "wallTimeMs": stamp.wallTimeMs,
            "wallTimeISO8601": stamp.wallTimeISO8601
        ]
    }

    private static func stamp(from object: [String: Any]) -> CaptureStamp? {
        let monotonic: UInt64?
        if let value = object["monotonicNs"] as? UInt64 { monotonic = value }
        else if let value = object["monotonicNs"] as? NSNumber { monotonic = value.uint64Value }
        else { monotonic = nil }
        let wall: Int64?
        if let value = object["wallTimeMs"] as? Int64 { wall = value }
        else if let value = object["wallTimeMs"] as? NSNumber { wall = value.int64Value }
        else { wall = nil }
        guard let monotonic, let wall, let iso = object["wallTimeISO8601"] as? String else { return nil }
        return CaptureStamp(monotonicNs: monotonic, wallTimeMs: wall, wallTimeISO8601: iso)
    }

    static func directorySize(_ url: URL) -> Int64 {
        let keys: [URLResourceKey] = [.isRegularFileKey, .fileSizeKey]
        let enumerator = FileManager.default.enumerator(at: url, includingPropertiesForKeys: keys)
        var total: Int64 = 0
        while let file = enumerator?.nextObject() as? URL {
            if let values = try? file.resourceValues(forKeys: Set(keys)), values.isRegularFile == true {
                total += Int64(values.fileSize ?? 0)
            }
        }
        return total
    }

    private static var protectedFileAttributes: [FileAttributeKey: Any]? {
        #if os(iOS)
        return [.protectionKey: FileProtectionType.completeUnlessOpen]
        #else
        return nil
        #endif
    }

    private static func writeJSONObject(_ object: [String: Any], to url: URL) throws {
        let data = try JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes])
        #if os(iOS)
        try data.write(to: url, options: [.atomic, .completeFileProtectionUnlessOpen])
        #else
        try data.write(to: url, options: .atomic)
        #endif
    }

    private static func writeEncodable<T: Encodable>(_ value: T, to url: URL) throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        let data = try encoder.encode(value)
        #if os(iOS)
        try data.write(to: url, options: [.atomic, .completeFileProtectionUnlessOpen])
        #else
        try data.write(to: url, options: .atomic)
        #endif
    }

    private static let schemaDocument: [String: Any] = [
        "schemaVersion": recorderSchemaVersion,
        "format": "Four newline-delimited JSON event streams plus metadata and manifest. Every event shares one monotonically increasing sequence across files.",
        "timebase": [
            "receiptMonotonicNs": "Nanoseconds converted from mach_continuous_time; use for ordering and elapsed time.",
            "receiptWallTimeMs": "Unix epoch milliseconds sampled at event receipt for wall-clock mapping.",
            "source timestamps": "Raw Core Motion source timestamps remain in payloads with explicit units and clock domains."
        ],
        "streams": [
            "raw-motion.ndjson": "Unmodified numeric observations from live activity, pedometer, and device-motion callbacks, plus explicit invalid samples/errors. The three inertial streams are written for the whole session in every label mode.",
            "labels.ndjson": "User-declared boundaries. A null toLabel is an unlabeled transition/baseline, never assumed stationary.",
            "decisions.ndjson": "Equivalent Swift port of the current production MotionAdapter and walking reducer. These are intended classifier decisions, not proof of OS shielding.",
            "system.ndjson": "Session, permission, subscription, lifecycle, write-health, gap, raw_stream_suspended, raw_stream_coverage, and recovery events."
        ],
        "manifest": [
            "status: completion status, duration, event/segment/gap counts, byte size, and per-scenario counts.",
            "rawStream: raw inertial coverage evidence. Per-stream sample counts and first/last receipt stamps, every observed suspension interval (fromReceiptMonotonicNs..toReceiptMonotonicNs plus wall-clock range, basis and source), endedBeforeSessionEnd, and one entry per labeled window with rawSampleCount, uncoveredSeconds, coverageRatio and coverage (covered/partial/none).",
            "suspension: a period longer than suspensionThresholdSeconds with no delivered raw inertial sample. Its exact iOS suspension instant is not observable, so exactSuspensionTimeKnown is always false and the interval is an observed receipt range.",
            "sampleCountBasis: exact for a finalized live session; as_of_last_checkpoint or unavailable when the archive was recovered after the process did not finalize."
        ],
        "units": [
            "acceleration": "g",
            "gravity": "g",
            "rotationRate": "radians/second",
            "attitudeEuler": "radians",
            "attitudeQuaternion": "unitless",
            "magneticField": "microteslas",
            "cadence": "steps/second raw; steps/minute derived",
            "distance": "meters",
            "pace": "seconds/meter"
        ]
    ]

    private static let readme = """
    ExcerLock Walking Recorder capture

    This archive contains only local, user-labeled live motion data. It has four NDJSON streams so raw sensor observations, user labels, inferred production-path decisions, and lifecycle/system events remain separate. See schema.json for fields and units, metadata.json for build/device/permission context, and manifest.json for completion status.

    Label transition time is intentionally unlabeled until another scenario starts or the session is finished. Gaps report observed callback/lifecycle gaps and never claim an exact iOS suspension timestamp. A label window that received no raw inertial sample (or only part of one) is declared in manifest.json rawStream.labelWindows and in system.ndjson raw_stream_suspended events with its observed wall-clock range: it is never presented as a still phone. The decisions stream describes intended ExcerLock walking-reducer state only; this lab app does not apply or measure Managed Settings shields.
    """
}

final class SessionRepository: ObservableObject {
    @Published private(set) var sessions: [SessionSummary] = []
    @Published private(set) var pendingLinkedTraceRecoveries: [LinkedTraceRecovery] = []
    let baseURL: URL

    init(baseURL: URL? = nil) {
        if let baseURL {
            self.baseURL = baseURL
        } else {
            let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            self.baseURL = documents.appendingPathComponent("WalkingRecorderSessions", isDirectory: true)
        }
        try? FileManager.default.createDirectory(at: self.baseURL, withIntermediateDirectories: true)
        SessionWriter.recoverInterruptedSessions(baseURL: self.baseURL)
        reload()
    }

    func reload() {
        let decoder = JSONDecoder()
        let directories = (try? FileManager.default.contentsOfDirectory(
            at: baseURL,
            includingPropertiesForKeys: nil,
            options: [.skipsHiddenFiles]
        )) ?? []
        sessions = directories.compactMap { directory in
            let manifest = directory.appendingPathComponent("manifest.json")
            guard let data = try? Data(contentsOf: manifest) else { return nil }
            return try? decoder.decode(SessionSummary.self, from: data)
        }.sorted { $0.startedAt.wallTimeMs > $1.startedAt.wallTimeMs }
        pendingLinkedTraceRecoveries = SessionWriter.pendingLinkedTraceRecoveries(baseURL: baseURL)
    }

    var totalStoredBytes: Int64 { sessions.reduce(0) { $0 + $1.byteCount } }

    func freeBytes() -> Int64? {
        let values = try? baseURL.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey])
        return values?.volumeAvailableCapacityForImportantUsage
    }

    /// Deleting a saved archive is refused while any of its own pending linked
    /// recoveries is still protected, not only the recovery the card currently
    /// displays. The pending set is read from durable files here, so a stale
    /// in-memory list can never drop the protected one-time link.
    func delete(_ session: SessionSummary) throws {
        let protectedIds = Set(SessionWriter.pendingLinkedTraceRecoveries(baseURL: baseURL).map(\.sessionId))
        guard !protectedIds.contains(session.id) else {
            throw SessionRepositoryError.protectedLinkedRecovery(sessionId: session.id)
        }
        let url = baseURL.appendingPathComponent(session.directoryName, isDirectory: true)
        guard url.deletingLastPathComponent().standardizedFileURL == baseURL.standardizedFileURL else { return }
        try FileManager.default.removeItem(at: url)
        reload()
    }

    func clearLinkedTraceRecovery(sessionId: String) throws {
        try SessionWriter.clearLinkedTraceRecovery(sessionId: sessionId, baseURL: baseURL)
        reload()
    }

    func export(_ session: SessionSummary) throws -> URL {
        try Self.export(session, from: baseURL)
    }

    static func export(_ session: SessionSummary, from baseURL: URL) throws -> URL {
        let source = baseURL.appendingPathComponent(session.directoryName, isDirectory: true)
        let exportDirectory = FileManager.default.temporaryDirectory.appendingPathComponent("WalkingRecorderExports", isDirectory: true)
        try FileManager.default.createDirectory(at: exportDirectory, withIntermediateDirectories: true)
        let destination = exportDirectory.appendingPathComponent("walking-capture-\(session.id).zip")
        try? FileManager.default.removeItem(at: destination)
        let files = try FileManager.default.contentsOfDirectory(at: source, includingPropertiesForKeys: [.isRegularFileKey])
            .filter { (try? $0.resourceValues(forKeys: [.isRegularFileKey]).isRegularFile) == true }
            .filter { $0.lastPathComponent != "recovery.json" }
            .sorted { $0.lastPathComponent < $1.lastPathComponent }
        try ZipArchiveWriter.write(files: files.map { ($0, $0.lastPathComponent) }, to: destination)
        return destination
    }
}

private enum ZipArchiveWriter {
    private struct Entry {
        let name: String
        let crc32: UInt32
        let size: UInt32
        let localOffset: UInt32
    }

    static func write(files: [(url: URL, name: String)], to destination: URL) throws {
        FileManager.default.createFile(atPath: destination.path, contents: nil)
        let output = try FileHandle(forWritingTo: destination)
        defer { try? output.close() }
        var offset: UInt32 = 0
        var entries: [Entry] = []

        for file in files {
            let name = Data(file.name.utf8)
            let localOffset = offset
            var header = Data()
            header.appendLE(UInt32(0x04034B50))
            header.appendLE(UInt16(20))
            header.appendLE(UInt16(0x0808))
            header.appendLE(UInt16(0))
            header.appendLE(UInt16(0))
            header.appendLE(UInt16(0))
            header.appendLE(UInt32(0))
            header.appendLE(UInt32(0))
            header.appendLE(UInt32(0))
            header.appendLE(UInt16(name.count))
            header.appendLE(UInt16(0))
            header.append(name)
            try output.write(contentsOf: header)
            offset += UInt32(header.count)

            let input = try FileHandle(forReadingFrom: file.url)
            var crc = CRC32.initial
            var size: UInt32 = 0
            while let chunk = try input.read(upToCount: 64 * 1_024), !chunk.isEmpty {
                crc = CRC32.update(crc, with: chunk)
                size += UInt32(chunk.count)
                offset += UInt32(chunk.count)
                try output.write(contentsOf: chunk)
            }
            try input.close()
            crc = CRC32.finalize(crc)

            var descriptor = Data()
            descriptor.appendLE(UInt32(0x08074B50))
            descriptor.appendLE(crc)
            descriptor.appendLE(size)
            descriptor.appendLE(size)
            try output.write(contentsOf: descriptor)
            offset += UInt32(descriptor.count)
            entries.append(Entry(name: file.name, crc32: crc, size: size, localOffset: localOffset))
        }

        let centralOffset = offset
        for entry in entries {
            let name = Data(entry.name.utf8)
            var header = Data()
            header.appendLE(UInt32(0x02014B50))
            header.appendLE(UInt16(20))
            header.appendLE(UInt16(20))
            header.appendLE(UInt16(0x0808))
            header.appendLE(UInt16(0))
            header.appendLE(UInt16(0))
            header.appendLE(UInt16(0))
            header.appendLE(entry.crc32)
            header.appendLE(entry.size)
            header.appendLE(entry.size)
            header.appendLE(UInt16(name.count))
            header.appendLE(UInt16(0))
            header.appendLE(UInt16(0))
            header.appendLE(UInt16(0))
            header.appendLE(UInt16(0))
            header.appendLE(UInt32(0))
            header.appendLE(entry.localOffset)
            header.append(name)
            try output.write(contentsOf: header)
            offset += UInt32(header.count)
        }

        var end = Data()
        end.appendLE(UInt32(0x06054B50))
        end.appendLE(UInt16(0))
        end.appendLE(UInt16(0))
        end.appendLE(UInt16(entries.count))
        end.appendLE(UInt16(entries.count))
        end.appendLE(offset - centralOffset)
        end.appendLE(centralOffset)
        end.appendLE(UInt16(0))
        try output.write(contentsOf: end)
        try output.synchronize()
    }
}

private enum CRC32 {
    static let initial: UInt32 = 0xFFFF_FFFF

    static func update(_ current: UInt32, with data: Data) -> UInt32 {
        var crc = current
        for byte in data {
            let index = Int((crc ^ UInt32(byte)) & 0xFF)
            crc = (crc >> 8) ^ table[index]
        }
        return crc
    }

    static func finalize(_ current: UInt32) -> UInt32 { current ^ 0xFFFF_FFFF }

    private static let table: [UInt32] = (0..<256).map { value in
        var crc = UInt32(value)
        for _ in 0..<8 {
            crc = (crc & 1) == 1 ? (crc >> 1) ^ 0xEDB8_8320 : crc >> 1
        }
        return crc
    }
}

private extension Data {
    mutating func appendLE<T: FixedWidthInteger>(_ value: T) {
        var littleEndian = value.littleEndian
        Swift.withUnsafeBytes(of: &littleEndian) { append(contentsOf: $0) }
    }
}
