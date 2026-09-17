import Combine
import Foundation

private let sessionDirectorySuffix = ".gymcapture"

enum CaptureEventChannel: String, CaseIterable {
    case rawLocation = "raw-location.ndjson"
    case rawMotion = "raw-motion.ndjson"
    case labels = "labels.ndjson"
    case observations = "observations.ndjson"
    case decisions = "decisions.ndjson"
    case system = "system.ndjson"

    var streamName: String? {
        switch self {
        case .rawLocation: return "location"
        case .rawMotion: return "motion"
        default: return nil
        }
    }
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
        case .invalidPayload: return "An event could not be encoded."
        case .sessionExists: return "A recording with this session already exists on this phone. Nothing was overwritten."
        }
    }
}

enum SessionRepositoryError: LocalizedError, Equatable {
    case unsafePath

    var errorDescription: String? {
        switch self {
        case .unsafePath: return "That recording path is outside the recorder's own folder."
        }
    }
}

final class SessionWriter {
    let id: String
    let directoryURL: URL
    let startedAt: CaptureStamp

    private let clock: CaptureClock
    private let maxBytes: Int64
    /// Declared at start and carried in the checkpoint so a recovered archive
    /// still knows which scenario it was recording (`scenarioId` in the
    /// manifest) and which circles it registered.
    private let scenarioId: String?
    private let gymIds: [String]
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
        gyms: [[String: Any]],
        clock: CaptureClock = SystemCaptureClock(),
        maxBytes: Int64 = maximumSessionBytes
    ) throws {
        self.id = id
        self.startedAt = startedAt
        self.clock = clock
        self.maxBytes = maxBytes
        self.scenarioId = metadata["scenarioId"] as? String
        self.gymIds = gyms.compactMap { $0["id"] as? String }
        directoryURL = baseURL.appendingPathComponent("\(id)\(sessionDirectorySuffix)", isDirectory: true)

        // A repeated start must never truncate an existing archive.
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
            try Self.writeJSONObject(["gyms": gyms], to: directoryURL.appendingPathComponent("gym.json"))
            try Self.writeJSONObject(Self.schemaDocument, to: directoryURL.appendingPathComponent("schema.json"))
            try Self.readme.write(to: directoryURL.appendingPathComponent("README.txt"), atomically: true, encoding: .utf8)
            try writeRecovery(timeline: GymLabelTimeline(), gapCount: 0)
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

    func checkpoint(timeline: GymLabelTimeline, gapCount: Int, streams: RawStreamManifest? = nil) throws {
        lock.lock()
        defer { lock.unlock() }
        guard !finalized else { return }
        try flushLocked(synchronize: true)
        try writeRecovery(timeline: timeline, gapCount: gapCount, streams: streams)
    }

    func finalize(
        status: SessionCompletionStatus,
        timeline: GymLabelTimeline,
        gapCount: Int,
        endedAt: CaptureStamp? = nil,
        detail: String? = nil,
        streams: RawStreamManifest? = nil,
        scenarioId: String? = nil,
        gymIds: [String] = [],
        reducerIntervals: [GymIntervalSummary] = []
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
            placeCounts: timeline.placeCounts,
            directoryName: directoryURL.lastPathComponent,
            scenarioId: scenarioId,
            gymIds: gymIds,
            labelWindows: streams?.labelWindows ?? [],
            reducerIntervals: reducerIntervals,
            streams: streams
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
            placeCounts: provisional.placeCounts,
            directoryName: provisional.directoryName,
            scenarioId: provisional.scenarioId,
            gymIds: provisional.gymIds,
            labelWindows: provisional.labelWindows,
            reducerIntervals: provisional.reducerIntervals,
            streams: provisional.streams
        )
        try Self.writeEncodable(summary, to: manifestURL)
        // recovery.json is a protected checkpoint, never part of an export, and
        // it is dropped once the archive is finalized.
        try? FileManager.default.removeItem(at: directoryURL.appendingPathComponent("recovery.json"))
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

    private func writeRecovery(timeline: GymLabelTimeline, gapCount: Int, streams: RawStreamManifest? = nil) throws {
        var recovery: [String: Any] = [
            "schemaVersion": recorderSchemaVersion,
            "sessionId": id,
            "startedAt": Self.stampDictionary(startedAt),
            "lastSequence": sequence,
            "eventCount": eventCount,
            "segmentCount": timeline.segmentCount,
            "gapCount": gapCount,
            "placeCounts": timeline.placeCounts,
            "scenarioId": scenarioId ?? NSNull(),
            "gymIds": gymIds,
            "activeLabel": timeline.active?.rawValue ?? NSNull(),
            "note": "Presence of this file means the session was not cleanly finalized. Recovery time is observed on next launch, not an exact suspension or termination timestamp."
        ]
        // The checkpoint snapshot lets the relaunch recovery pass rebuild label
        // coverage and every suspension observed before the process died.
        if let streams, let object = Self.jsonObject(streams) {
            recovery["streams"] = object
        }
        try Self.writeJSONObject(recovery, to: directoryURL.appendingPathComponent("recovery.json"))
    }

    static func recoverInterruptedSessions(baseURL: URL, clock: CaptureClock = SystemCaptureClock()) {
        guard let directories = try? FileManager.default.contentsOfDirectory(
            at: baseURL,
            includingPropertiesForKeys: nil,
            options: [.skipsHiddenFiles]
        ) else { return }
        for directory in directories where directory.pathExtension == "gymcapture" {
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
            // A checkpoint is not written for every sample, so the highest
            // sequence on disk can exceed the one the recovery file carries.
            // Recovered events must continue after it or the archive would
            // contain duplicate sequence numbers.
            let sequence = max(recovery["lastSequence"] as? Int ?? 0, Self.lastSequenceOnDisk(in: directory)) + 1
            let systemURL = directory.appendingPathComponent(CaptureEventChannel.system.rawValue)
            let streams = RawStreamManifest.recovered(
                snapshot: Self.streamSnapshot(from: recovery),
                startedAt: started,
                recoveredAt: recoveredAt,
                lastDeliveredSample: lastLocationSampleStamp(in: directory)
            )
            if let handle = try? FileHandle(forWritingTo: systemURL) {
                _ = try? handle.seekToEnd()
                let interval = streams.suspensions.last
                let events: [[String: Any]] = [
                    [
                        "schemaVersion": recorderSchemaVersion,
                        "sequence": sequence,
                        "type": "location_stream_suspended",
                        "receiptMonotonicNs": interval?.toReceiptMonotonicNs ?? recoveredAt.monotonicNs,
                        "receiptWallTimeMs": interval?.toReceiptWallTimeMs ?? recoveredAt.wallTimeMs,
                        "receiptWallTimeISO8601": interval?.toWallTimeISO8601 ?? recoveredAt.wallTimeISO8601,
                        "payload": interval?.dictionary ?? ["meaning": "No location sample was delivered before this archive was recovered."]
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
                            "streamsRecovered": true
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
            // The label window that was open when the process died is closed
            // explicitly, at recovery observation time, so the archive never
            // leaves a window open and never claims an exact termination time.
            if let activeLabel = recovery["activeLabel"] as? String, !activeLabel.isEmpty {
                let labelsURL = directory.appendingPathComponent(CaptureEventChannel.labels.rawValue)
                if let handle = try? FileHandle(forWritingTo: labelsURL) {
                    _ = try? handle.seekToEnd()
                    let event: [String: Any] = [
                        "schemaVersion": recorderSchemaVersion,
                        "sequence": sequence + 2,
                        "type": "label_transition",
                        "receiptMonotonicNs": recoveredAt.monotonicNs,
                        "receiptWallTimeMs": recoveredAt.wallTimeMs,
                        "receiptWallTimeISO8601": recoveredAt.wallTimeISO8601,
                        "payload": [
                            "fromPlace": activeLabel,
                            "toPlace": NSNull(),
                            "boundaryMonotonicNs": recoveredAt.monotonicNs,
                            "boundaryWallTimeMs": recoveredAt.wallTimeMs,
                            "boundaryWallTimeISO8601": recoveredAt.wallTimeISO8601,
                            "reason": "session_end",
                            "basis": "recovery_observation_time",
                            "declaredOffsetSeconds": NSNull(),
                            "meaning": "The window was still open when the process died. It is closed at recovery observation time, which is not the exact termination time."
                        ]
                    ]
                    if var line = try? JSONSerialization.data(withJSONObject: event, options: [.sortedKeys, .withoutEscapingSlashes]) {
                        line.append(0x0A)
                        try? handle.write(contentsOf: line)
                    }
                    try? handle.synchronize()
                    try? handle.close()
                }
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
                placeCounts: recovery["placeCounts"] as? [String: Int] ?? [:],
                directoryName: directory.lastPathComponent,
                // A checkpoint written before this field existed carries no
                // scenario; metadata.json still holds the declaration.
                scenarioId: (recovery["scenarioId"] as? String) ?? metadataScenarioId(in: directory),
                gymIds: recovery["gymIds"] as? [String] ?? metadataGymIds(in: directory),
                labelWindows: streams.labelWindows,
                reducerIntervals: [],
                streams: streams
            )
            try? writeEncodable(summary, to: manifestURL)
            try? FileManager.default.removeItem(at: recoveryURL)
        }
    }

    /// The scenario the session declared, read from metadata.json. Only used
    /// when a checkpoint predates the scenarioId field in recovery.json.
    private static func metadataScenarioId(in directory: URL) -> String? {
        guard let object = readMetadataObject(in: directory), let value = object["scenarioId"] as? String else { return nil }
        return value.isEmpty ? nil : value
    }

    private static func metadataGymIds(in directory: URL) -> [String] {
        guard let object = readMetadataObject(in: directory) else { return [] }
        if let ids = object["gymIds"] as? [String] { return ids }
        if let gyms = object["gyms"] as? [[String: Any]] { return gyms.compactMap { $0["id"] as? String } }
        return []
    }

    private static func readMetadataObject(in directory: URL) -> [String: Any]? {
        guard let data = try? Data(contentsOf: directory.appendingPathComponent("metadata.json")) else { return nil }
        return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
    }

    /// The stream-coverage snapshot a checkpoint wrote, if this archive has one.
    private static func streamSnapshot(from recovery: [String: Any]) -> RawStreamManifest? {
        guard let object = recovery["streams"] as? [String: Any],
              let data = try? JSONSerialization.data(withJSONObject: object) else { return nil }
        return try? JSONDecoder().decode(RawStreamManifest.self, from: data)
    }

    private static func jsonObject<T: Encodable>(_ value: T) -> Any? {
        guard let data = try? JSONEncoder().encode(value) else { return nil }
        return try? JSONSerialization.jsonObject(with: data)
    }

    /// Last location sample receipt recorded on disk, used when a process died
    /// before finalizing. Reads only the file tail: an interrupted archive can
    /// hold tens of megabytes and this runs on the launch path.
    static func lastLocationSampleStamp(in directory: URL) -> (CaptureStamp, String)? {
        let objects = tailObjects(of: directory.appendingPathComponent(CaptureEventChannel.rawLocation.rawValue))
        for object in objects.reversed() {
            guard let type = object["type"] as? String,
                  type == "location_sample",
                  let monotonic = (object["receiptMonotonicNs"] as? NSNumber)?.uint64Value,
                  let wall = (object["receiptWallTimeMs"] as? NSNumber)?.int64Value,
                  let iso = object["receiptWallTimeISO8601"] as? String else { continue }
            return (CaptureStamp(monotonicNs: monotonic, wallTimeMs: wall, wallTimeISO8601: iso), "location")
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
        "format": "Six newline-delimited JSON event streams plus gym.json, metadata.json, schema.json and manifest.json. Every event shares one monotonically increasing sequence across files.",
        "timebase": [
            "receiptMonotonicNs": "Nanoseconds converted from mach_continuous_time; use for ordering and elapsed time.",
            "receiptWallTimeMs": "Unix epoch milliseconds sampled at event receipt for wall-clock mapping.",
            "sourceWallTimeMs": "Source clock of the originating API (CLLocation.timestamp, CMMotionActivity.startDate, CMPedometerData.endDate).",
            "region events": "Core Location gives a region event no crossing time. Their payload says sourceTime=unavailable_receipt_only, so receipt time is never mistaken for the exact crossing."
        ],
        "streams": [
            "raw-location.ndjson": "Every delivered CLLocation plus region monitoring lifecycle, region enter/exit events, authorization and accuracy changes and monitoring errors. Per gym: distanceMetres (haversine, as the production regionPresence) and an accuracy band.",
            "raw-motion.ndjson": "Core Motion activity classification and CMPedometer samples. No inertial streams: this harness records arrival mode, not gait.",
            "labels.ndjson": "The person's ground truth: one active place at a time, scenario declaration, scripted step acknowledgements and backdated corrections.",
            "observations.ndjson": "What the person saw in ExcerLock (home card, locked app) and the ExcerLock setup declaration. Human observation, never sensor truth.",
            "decisions.ndjson": "Equivalent Swift port of the production reducer (gymMachine.ts) fed by this app's own region events, sampled-distance presence per fix, and manual check-in probes. Intended decisions, never claimed enforcement.",
            "system.ndjson": "Session, permission, lifecycle, write health, gap, location_stream_suspended, location_stream_coverage, clock mapping and recovery events."
        ],
        "manifest": [
            "status: completion status, duration, event/segment/gap counts, byte size, scenario id, gym ids and per-place counts.",
            "labelWindows: one entry per labeled window with place, duration, locationSampleCount, uncoveredSeconds, coverageRatio and coverage (covered/partial/none).",
            "streams: per-stream sample counts and first/last receipt stamps, every observed suspension interval with basis and source, and the same per-window coverage block.",
            "suspension: a period longer than the stream's own threshold (15 s for location, 120 s for event-driven activity/pedometer) with no delivered sample. The exact iOS suspension instant is not observable, so exactSuspensionTimeKnown is always false.",
            "reducerIntervals: the intervals the port held at finish, copied from decisions.ndjson so the verdict inputs are readable without parsing NDJSON."
        ],
        "units": [
            "latitude/longitude": "degrees WGS84",
            "horizontalAccuracyM": "metres; null with invalid=true when Core Location reports a negative accuracy",
            "distance": "metres",
            "speed": "metres/second",
            "cadence": "steps/second raw; steps/minute derived",
            "radiusMeters": "metres (50-200 in 10 m steps)"
        ]
    ]

    private static let readme = """
    ExcerLock Gym Recorder capture

    This archive contains local, user-labeled Core Location and Core Motion observations made on this phone. It has six NDJSON streams so raw location, motion, ground-truth labels, ExcerLock observations, the ported production decision and system events stay separate. See schema.json for fields and units, metadata.json for build/device/permission context, gym.json for the registered circle(s), and manifest.json for completion status and coverage.

    Two cautions, deliberately stated in the archive and not only in the app:
    - Region enter/exit events carry receipt time only. iOS does not tell an app when the boundary was actually crossed, so every region event payload says sourceTime=unavailable_receipt_only and the exact crossing time is not observable.
    - The person's ExcerLock observations (observations.ndjson) are human eyes-on-the-screen reports, and the decisions stream is a port of the production reducer, not ExcerLock itself. Nothing here proves what ExcerLock was told by iOS.

    Unlike ExcerLock (which stores no coordinates) this archive contains raw positions and the registered circle. It stays in this app's Documents folder, protected and excluded from any network path, until the operator shares or pulls it.
    """
}

final class SessionRepository: ObservableObject {
    @Published private(set) var sessions: [SessionSummary] = []
    let baseURL: URL

    init(baseURL: URL? = nil) {
        if let baseURL {
            self.baseURL = baseURL
        } else {
            let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            self.baseURL = documents.appendingPathComponent("GymRecorderSessions", isDirectory: true)
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
    }

    var totalStoredBytes: Int64 { sessions.reduce(0) { $0 + $1.byteCount } }

    func freeBytes() -> Int64? {
        let values = try? baseURL.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey])
        return values?.volumeAvailableCapacityForImportantUsage
    }

    func delete(_ session: SessionSummary) throws {
        let url = baseURL.appendingPathComponent(session.directoryName, isDirectory: true)
        guard url.deletingLastPathComponent().standardizedFileURL == baseURL.standardizedFileURL else {
            throw SessionRepositoryError.unsafePath
        }
        try FileManager.default.removeItem(at: url)
        reload()
    }

    func export(_ session: SessionSummary) throws -> URL {
        try Self.export(session, from: baseURL)
    }

    static func export(_ session: SessionSummary, from baseURL: URL) throws -> URL {
        let source = baseURL.appendingPathComponent(session.directoryName, isDirectory: true)
        let exportDirectory = FileManager.default.temporaryDirectory.appendingPathComponent("GymRecorderExports", isDirectory: true)
        try FileManager.default.createDirectory(at: exportDirectory, withIntermediateDirectories: true)
        let destination = exportDirectory.appendingPathComponent("gym-capture-\(session.id).zip")
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
