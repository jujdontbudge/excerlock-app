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

    var errorDescription: String? {
        switch self {
        case .storageLimit: return "This recording reached its 250 MB safety limit. It was stopped and kept."
        case .closed: return "The recording file is already closed."
        case .invalidPayload: return "A sensor event could not be encoded."
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

        try FileManager.default.createDirectory(at: directoryURL, withIntermediateDirectories: true)
        for channel in CaptureEventChannel.allCases {
            let url = directoryURL.appendingPathComponent(channel.rawValue)
            FileManager.default.createFile(
                atPath: url.path,
                contents: nil,
                attributes: Self.protectedFileAttributes
            )
            handles[channel] = try FileHandle(forWritingTo: url)
            buffers[channel] = Data()
        }
        try Self.writeJSONObject(metadata, to: directoryURL.appendingPathComponent("metadata.json"))
        try Self.writeJSONObject(Self.schemaDocument, to: directoryURL.appendingPathComponent("schema.json"))
        try Self.readme.write(to: directoryURL.appendingPathComponent("README.txt"), atomically: true, encoding: .utf8)
        try writeRecovery(timeline: LabelTimeline(), gapCount: 0)
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

    func checkpoint(timeline: LabelTimeline, gapCount: Int) throws {
        lock.lock()
        defer { lock.unlock() }
        guard !finalized else { return }
        try flushLocked(synchronize: true)
        try writeRecovery(timeline: timeline, gapCount: gapCount)
    }

    func finalize(
        status: SessionCompletionStatus,
        timeline: LabelTimeline,
        gapCount: Int,
        endedAt: CaptureStamp? = nil,
        detail: String? = nil
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
            directoryName: directoryURL.lastPathComponent
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
            directoryName: provisional.directoryName
        )
        try Self.writeEncodable(summary, to: manifestURL)
        if linkedTraceRecovery == nil {
            try? FileManager.default.removeItem(at: directoryURL.appendingPathComponent("recovery.json"))
        } else {
            try writeRecovery(timeline: timeline, gapCount: gapCount, recorderFinalized: true)
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

    private func writeRecovery(timeline: LabelTimeline, gapCount: Int, recorderFinalized: Bool = false) throws {
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
            let sequence = (recovery["lastSequence"] as? Int ?? 0) + 1
            let systemURL = directory.appendingPathComponent(CaptureEventChannel.system.rawValue)
            if let handle = try? FileHandle(forWritingTo: systemURL) {
                _ = try? handle.seekToEnd()
                let event: [String: Any] = [
                    "schemaVersion": recorderSchemaVersion,
                    "sequence": sequence,
                    "type": "interruption_recovered_on_launch",
                    "receiptMonotonicNs": recoveredAt.monotonicNs,
                    "receiptWallTimeMs": recoveredAt.wallTimeMs,
                    "receiptWallTimeISO8601": recoveredAt.wallTimeISO8601,
                    "payload": [
                        "meaning": "The prior process did not finalize. This timestamp is recovery observation time; it is not the exact suspension, crash, or termination time."
                    ]
                ]
                if var line = try? JSONSerialization.data(withJSONObject: event, options: [.sortedKeys, .withoutEscapingSlashes]) {
                    line.append(0x0A)
                    try? handle.write(contentsOf: line)
                    try? handle.synchronize()
                }
                try? handle.close()
            }
            let summary = SessionSummary(
                id: sessionId,
                startedAt: started,
                endedAt: recoveredAt,
                status: .interrupted,
                eventCount: (recovery["eventCount"] as? Int ?? 0) + 1,
                segmentCount: recovery["segmentCount"] as? Int ?? 0,
                gapCount: recovery["gapCount"] as? Int ?? 0,
                byteCount: directorySize(directory),
                scenarioCounts: recovery["scenarioCounts"] as? [String: Int] ?? [:],
                directoryName: directory.lastPathComponent
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

    static func pendingLinkedTraceRecoveries(baseURL: URL) -> [LinkedTraceRecovery] {
        guard let directories = try? FileManager.default.contentsOfDirectory(
            at: baseURL,
            includingPropertiesForKeys: nil,
            options: [.skipsHiddenFiles]
        ) else { return [] }
        return directories.compactMap { directory in
            let recoveryURL = directory.appendingPathComponent("recovery.json")
            let manifestURL = directory.appendingPathComponent("manifest.json")
            guard FileManager.default.fileExists(atPath: manifestURL.path),
                  let data = try? Data(contentsOf: recoveryURL),
                  let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            else { return nil }
            return linkedTraceRecovery(from: object)
        }
    }

    static func clearLinkedTraceRecovery(sessionId: String, baseURL: URL) throws {
        let directory = baseURL.appendingPathComponent("\(sessionId)\(sessionDirectorySuffix)", isDirectory: true)
        guard directory.deletingLastPathComponent().standardizedFileURL == baseURL.standardizedFileURL else { return }
        let recoveryURL = directory.appendingPathComponent("recovery.json")
        if FileManager.default.fileExists(atPath: recoveryURL.path) { try FileManager.default.removeItem(at: recoveryURL) }
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
            "raw-motion.ndjson": "Unmodified numeric observations from live activity, pedometer, and device-motion callbacks, plus explicit invalid samples/errors.",
            "labels.ndjson": "User-declared boundaries. A null toLabel is an unlabeled transition/baseline, never assumed stationary.",
            "decisions.ndjson": "Equivalent Swift port of the current production MotionAdapter and walking reducer. These are intended classifier decisions, not proof of OS shielding.",
            "system.ndjson": "Session, permission, subscription, lifecycle, write-health, gap, and recovery events."
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

    Label transition time is intentionally unlabeled until another scenario starts or the session is finished. Gaps report observed callback/lifecycle gaps and never claim an exact iOS suspension timestamp. The decisions stream describes intended ExcerLock walking-reducer state only; this lab app does not apply or measure Managed Settings shields.
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

    func delete(_ session: SessionSummary) throws {
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
