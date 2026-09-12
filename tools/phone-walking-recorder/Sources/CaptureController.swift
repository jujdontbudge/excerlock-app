import Combine
import CoreMotion
import Foundation
import SwiftUI
import UIKit

@MainActor
final class CaptureController: NSObject, ObservableObject {
    enum Mode: Equatable {
        case idle
        case preparing
        case recording
        case saving
        case failed(String)
    }

    struct StreamStats {
        var count = 0
        var firstMonotonicNs: UInt64?
        var lastMonotonicNs: UInt64?

        mutating func observe(_ stamp: CaptureStamp) {
            count += 1
            if firstMonotonicNs == nil { firstMonotonicNs = stamp.monotonicNs }
            lastMonotonicNs = stamp.monotonicNs
        }

        var dictionary: [String: Any] {
            var observedHz: Any = NSNull()
            if count > 1, let firstMonotonicNs, let lastMonotonicNs, lastMonotonicNs > firstMonotonicNs {
                observedHz = Double(count - 1) / (Double(lastMonotonicNs - firstMonotonicNs) / 1_000_000_000)
            }
            return [
                "sampleCount": count,
                "firstReceiptMonotonicNs": firstMonotonicNs ?? NSNull(),
                "lastReceiptMonotonicNs": lastMonotonicNs ?? NSNull(),
                "observedAverageDeliveryRateHz": observedHz
            ]
        }
    }

    @Published private(set) var mode: Mode = .idle
    @Published private(set) var permission: MotionPermission
    @Published private(set) var availability: SensorAvailability
    @Published private(set) var activeScenario: GroundTruthScenario?
    @Published private(set) var sessionElapsedSeconds: TimeInterval = 0
    @Published private(set) var segmentElapsedSeconds: TimeInterval = 0
    @Published private(set) var walkingPhase: WalkingPhase = .inactive
    @Published private(set) var rawSampleCount = 0
    @Published private(set) var gapCount = 0
    @Published private(set) var isAppActive = true
    @Published private(set) var permissionRequestInFlight = false
    @Published var notice: String?
    @Published var shareURL: URL?
    @Published var exportingSessionID: String?

    let repository: SessionRepository

    private let clock: CaptureClock
    private let motionService: MotionCaptureService
    private var writer: SessionWriter?
    private var detector: ProductionWalkingDetectorPort?
    private var timeline = LabelTimeline()
    private var sessionStartedAt: CaptureStamp?
    private var ticker: Timer?
    private var backgroundObservedAt: CaptureStamp?
    private var lastInertialSourceSeconds: [String: TimeInterval] = [:]
    private var streamStats: [String: StreamStats] = [:]
    private var finishingAfterError = false

    #if DEBUG
    let isUIPreview = ProcessInfo.processInfo.arguments.contains("--ui-preview")
    #else
    let isUIPreview = false
    #endif

    init(repository: SessionRepository = SessionRepository(), clock: CaptureClock = SystemCaptureClock()) {
        self.repository = repository
        self.clock = clock
        motionService = MotionCaptureService(clock: clock)
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--ui-preview") {
            permission = .authorized
            availability = SensorAvailability(activity: true, cadence: true, stepCounting: true, accelerometer: true, gyroscope: true, deviceMotion: true)
        } else {
            permission = motionService.permission
            availability = motionService.availability
        }
        #else
        permission = motionService.permission
        availability = motionService.availability
        #endif
        super.init()
        motionService.delegate = self
    }

    deinit { ticker?.invalidate() }

    var isRecording: Bool { mode == .recording }

    var readiness: CaptureReadiness {
        if isUIPreview { return .ready }
        return CaptureReadiness.evaluate(permission: permission, availability: availability, freeBytes: repository.freeBytes())
    }

    var recordingHealthTitle: String {
        if isUIPreview { return "Simulated UI preview" }
        if !isAppActive { return "Capture may be paused" }
        if !availability.isComplete { return "Limited capture" }
        if rawSampleCount == 0 { return "Waiting for sensor data" }
        return "Recording looks healthy"
    }

    var recordingHealthDetail: String {
        if isUIPreview { return "Buttons and files are test-only here; no gait claim is made."
        }
        if !isAppActive { return "Return to this screen. iOS may suspend live sensors while the app is away or the phone is locked."
        }
        if !availability.isComplete { return "Unavailable: \(availability.unavailableNames.joined(separator: ", ")). The archive marks these streams missing."
        }
        if rawSampleCount == 0 { return "Keep this screen open while the sensors begin."
        }
        return "\(rawSampleCount.formatted()) raw samples saved • \(gapCount) visible gap\(gapCount == 1 ? "" : "s")"
    }

    func refreshEnvironment() {
        guard !isUIPreview else { return }
        permission = motionService.permission
        availability = motionService.availability
        repository.reload()
    }

    func requestPermission() {
        guard !permissionRequestInFlight, !isUIPreview else { return }
        permissionRequestInFlight = true
        notice = nil
        motionService.requestLiveAuthorization { [weak self] status in
            guard let self else { return }
            self.permissionRequestInFlight = false
            self.permission = status
            self.availability = self.motionService.availability
            if status != .authorized {
                self.notice = "Motion & Fitness was not allowed. No recording was started."
            }
        }
    }

    func openSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }

    func tapScenario(_ scenario: GroundTruthScenario) {
        switch mode {
        case .idle, .failed:
            beginSession(with: scenario)
        case .recording:
            if activeScenario == scenario {
                transition(to: nil, reason: "user_tapped_not_doing_anymore")
            } else {
                transition(to: scenario, reason: activeScenario == nil ? "user_started_scenario" : "user_switched_scenario")
            }
        case .preparing, .saving:
            return
        }
    }

    func finishAndSave() {
        guard mode == .recording else { return }
        mode = .saving
        if activeScenario != nil {
            transitionToNilDuringSave(reason: "finish_and_save")
        }
        finish(status: .completed, detail: nil)
    }

    func handleScenePhase(_ phase: ScenePhase) {
        guard isRecording, let writer else {
            isAppActive = phase == .active
            return
        }
        let stamp = clock.now()
        do {
            switch phase {
            case .active:
                isAppActive = true
                UIApplication.shared.isIdleTimerDisabled = true
                var payload: [String: Any] = ["state": "active"]
                if let backgroundObservedAt {
                    let elapsed = Double(stamp.monotonicNs - backgroundObservedAt.monotonicNs) / 1_000_000_000
                    payload["elapsedSinceBackgroundCallbackSeconds"] = elapsed
                    payload["meaning"] = "Elapsed between observed lifecycle callbacks; it does not identify an exact iOS suspension interval."
                    if elapsed > 1.0 {
                        gapCount += 1
                        try writer.append(
                            channel: .system,
                            type: "recording_gap",
                            payload: [
                                "stream": "app_lifecycle",
                                "observedDurationSeconds": elapsed,
                                "basis": "time between did-enter-background and next active callback",
                                "exactSuspensionTimeKnown": false
                            ],
                            stamp: stamp,
                            critical: true
                        )
                    }
                    self.backgroundObservedAt = nil
                }
                try writer.append(channel: .system, type: "app_lifecycle", payload: payload, stamp: stamp, critical: true)
                tick(at: stamp)
            case .inactive:
                isAppActive = false
                UIApplication.shared.isIdleTimerDisabled = false
                try writer.append(
                    channel: .system,
                    type: "app_lifecycle",
                    payload: ["state": "inactive", "deliveryMeaning": "callback receipt only"],
                    stamp: stamp,
                    critical: true
                )
                try writer.checkpoint(timeline: timeline, gapCount: gapCount)
            case .background:
                isAppActive = false
                UIApplication.shared.isIdleTimerDisabled = false
                backgroundObservedAt = stamp
                try writer.append(
                    channel: .system,
                    type: "app_lifecycle",
                    payload: [
                        "state": "background",
                        "captureContinuityGuaranteed": false,
                        "note": "The app has no background keep-alive entitlement. iOS may suspend callbacks after this observed event."
                    ],
                    stamp: stamp,
                    critical: true
                )
                try writer.checkpoint(timeline: timeline, gapCount: gapCount)
            @unknown default:
                break
            }
        } catch {
            stopAfterWriteFailure(error)
        }
    }

    func prepareExport(_ session: SessionSummary) {
        guard exportingSessionID == nil else { return }
        exportingSessionID = session.id
        notice = nil
        let baseURL = repository.baseURL
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            do {
                let url = try SessionRepository.export(session, from: baseURL)
                DispatchQueue.main.async {
                    self?.exportingSessionID = nil
                    self?.shareURL = url
                }
            } catch {
                DispatchQueue.main.async {
                    self?.exportingSessionID = nil
                    self?.notice = "Export failed: \(error.localizedDescription)"
                }
            }
        }
    }

    func delete(_ session: SessionSummary) {
        do {
            try repository.delete(session)
        } catch {
            notice = "Could not delete that session: \(error.localizedDescription)"
        }
    }

    private func beginSession(with scenario: GroundTruthScenario) {
        notice = nil
        refreshEnvironment()
        switch readiness {
        case .ready: break
        case .needsPermission:
            requestPermission()
            notice = "Allow Motion & Fitness, then tap the activity again."
            return
        case .permissionDenied:
            notice = "Motion & Fitness is off. Open Settings to allow it; no recording was started."
            return
        case .permissionRestricted:
            notice = "Motion & Fitness is restricted on this phone, so recording cannot start."
            return
        case .unsupported(let names):
            notice = "Required sensors are unavailable: \(names.joined(separator: ", ")). No recording was started."
            return
        case .lowStorage:
            notice = "Not enough free space for a safe recording. Delete a saved session first."
            return
        }
        guard StoragePolicy.canStartSession(totalStoredBytes: repository.totalStoredBytes, freeBytes: repository.freeBytes()) else {
            notice = "Recorder storage is full. Export and delete a saved session before starting."
            return
        }

        mode = .preparing
        let started = clock.now()
        do {
            let writer = try SessionWriter(
                baseURL: repository.baseURL,
                startedAt: started,
                metadata: buildMetadata(startedAt: started),
                clock: clock
            )
            self.writer = writer
            sessionStartedAt = started
            detector = ProductionWalkingDetectorPort(startMonotonicMs: started.monotonicMs)
            timeline = LabelTimeline()
            streamStats = [:]
            rawSampleCount = 0
            gapCount = 0
            lastInertialSourceSeconds = [:]
            try writer.append(
                channel: .system,
                type: "session_start",
                payload: [
                    "captureMode": isUIPreview ? "simulated_ui_preview" : "live_core_motion",
                    "automaticUploads": false,
                    "locationCollected": false,
                    "microphoneCollected": false,
                    "cameraCollected": false,
                    "healthHistoryQueried": false,
                    "requestedDeviceMotionRateHz": requestedDeviceMotionHz
                ],
                stamp: started,
                critical: true
            )
            try writer.append(
                channel: .system,
                type: "permission_state",
                payload: [
                    "motionAndFitness": permission.rawValue,
                    "location": "not_requested",
                    "camera": "not_requested",
                    "microphone": "not_requested"
                ],
                stamp: started,
                critical: true
            )

            let startedAvailability: SensorAvailability
            if isUIPreview {
                startedAvailability = availability
            } else {
                startedAvailability = try motionService.start()
            }
            try recordSubscriptions(availability: startedAvailability)
            mode = .recording
            UIApplication.shared.isIdleTimerDisabled = true
            startTicker()
            transition(to: scenario, reason: "user_started_session")
        } catch {
            motionService.stop()
            UIApplication.shared.isIdleTimerDisabled = false
            if let writer = self.writer {
                _ = try? writer.finalize(
                    status: .sensorError,
                    timeline: timeline,
                    gapCount: gapCount,
                    detail: error.localizedDescription
                )
            }
            self.writer = nil
            detector = nil
            repository.reload()
            mode = .failed(error.localizedDescription)
            notice = "Recording did not start: \(error.localizedDescription)"
        }
    }

    private func transition(to scenario: GroundTruthScenario?, reason: String) {
        guard mode == .recording, let writer else { return }
        var candidate = timeline
        let stamp = clock.now()
        guard let boundary = candidate.transition(to: scenario, at: stamp, reason: reason) else { return }
        do {
            try writeLabelBoundary(boundary, writer: writer)
            timeline = candidate
            activeScenario = timeline.active
            try writer.checkpoint(timeline: timeline, gapCount: gapCount)
        } catch {
            stopAfterWriteFailure(error)
        }
    }

    private func transitionToNilDuringSave(reason: String) {
        guard let writer else { return }
        var candidate = timeline
        let stamp = clock.now()
        guard let boundary = candidate.transition(to: nil, at: stamp, reason: reason) else { return }
        do {
            try writeLabelBoundary(boundary, writer: writer)
            timeline = candidate
            activeScenario = nil
        } catch {
            notice = "The final boundary could not be written: \(error.localizedDescription)"
        }
    }

    private func writeLabelBoundary(_ transition: LabelTransition, writer: SessionWriter) throws {
        try writer.append(
            channel: .labels,
            type: "label_transition",
            payload: [
                "fromLabel": transition.from?.rawValue ?? NSNull(),
                "toLabel": transition.to?.rawValue ?? NSNull(),
                "reason": transition.reason,
                "boundaryMeaning": "User tap received by the app on the shared monotonic timebase.",
                "transitionAfterStopIsStationary": false,
                "unlabeledAfterBoundary": transition.to == nil
            ],
            stamp: transition.boundary,
            critical: true
        )
    }

    private func recordSubscriptions(availability: SensorAvailability) throws {
        guard let writer else { throw SessionWriterError.closed }
        let streams: [(String, Bool, Any)] = [
            ("activity", availability.activity, "event-driven"),
            ("pedometer_cadence_steps", availability.cadence && availability.stepCounting, "event-driven"),
            ("accelerometer", availability.accelerometer, requestedDeviceMotionHz),
            ("gyroscope", availability.gyroscope, requestedDeviceMotionHz),
            ("device_motion", availability.deviceMotion, requestedDeviceMotionHz)
        ]
        for stream in streams {
            try writer.append(
                channel: .system,
                type: "sensor_subscription",
                payload: [
                    "stream": stream.0,
                    "state": stream.1 ? "started" : "unsupported",
                    "configuredRateHz": stream.2,
                    "missingDataExplicit": !stream.1
                ],
                critical: true
            )
        }
    }

    private func startTicker() {
        ticker?.invalidate()
        ticker = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self else { return }
                let stamp = self.clock.now()
                self.updateTimers(at: stamp)
                if self.isRecording && self.isAppActive { self.tick(at: stamp) }
            }
        }
        if let ticker { RunLoop.main.add(ticker, forMode: .common) }
    }

    private func updateTimers(at stamp: CaptureStamp) {
        if let sessionStartedAt {
            sessionElapsedSeconds = Double(stamp.monotonicNs - sessionStartedAt.monotonicNs) / 1_000_000_000
        }
        if let activeSince = timeline.activeSince {
            segmentElapsedSeconds = Double(stamp.monotonicNs - activeSince.monotonicNs) / 1_000_000_000
        } else {
            segmentElapsedSeconds = 0
        }
    }

    private func tick(at stamp: CaptureStamp) {
        guard var detector, let writer else { return }
        let snapshot = detector.tick(nowMs: stamp.monotonicMs)
        self.detector = detector
        walkingPhase = snapshot.state.phase
        do {
            try writer.append(channel: .decisions, type: "production_walking_decision", payload: snapshot.dictionary, stamp: stamp)
        } catch {
            stopAfterWriteFailure(error)
        }
    }

    private func finish(status: SessionCompletionStatus, detail: String?) {
        ticker?.invalidate()
        ticker = nil
        motionService.stop()
        UIApplication.shared.isIdleTimerDisabled = false
        guard let writer else {
            resetAfterFinish()
            return
        }
        let end = clock.now()
        var finalDetail = detail
        if status != .storageLimit {
            do {
                for (stream, stats) in streamStats.sorted(by: { $0.key < $1.key }) {
                    try writer.append(
                        channel: .system,
                        type: "sensor_subscription",
                        payload: ["stream": stream, "state": "stopped", "summary": stats.dictionary],
                        stamp: end,
                        critical: true
                    )
                }
                try writer.append(
                    channel: .system,
                    type: "clock_mapping",
                    payload: [
                        "atSessionEnd": SessionWriter.stampDictionary(end),
                        "meaning": "Second wall/monotonic pair for drift-aware mapping."
                    ],
                    stamp: end,
                    critical: true
                )
            } catch {
                finalDetail = [detail, "Final stream summary error: \(error.localizedDescription)"]
                    .compactMap { $0 }
                    .joined(separator: " | ")
            }
        }
        do {
            _ = try writer.finalize(status: status, timeline: timeline, gapCount: gapCount, endedAt: end, detail: finalDetail)
            repository.reload()
            notice = status == .completed ? "Session saved on this phone." : finalDetail
            resetAfterFinish()
        } catch {
            mode = .failed(error.localizedDescription)
            notice = "The session stopped, but final saving needs attention: \(error.localizedDescription)"
            self.writer = nil
            detector = nil
            repository.reload()
        }
    }

    private func resetAfterFinish() {
        writer = nil
        detector = nil
        timeline = LabelTimeline()
        activeScenario = nil
        sessionStartedAt = nil
        sessionElapsedSeconds = 0
        segmentElapsedSeconds = 0
        walkingPhase = .inactive
        rawSampleCount = 0
        isAppActive = true
        finishingAfterError = false
        mode = .idle
    }

    private func stopAfterWriteFailure(_ error: Error) {
        guard !finishingAfterError else { return }
        finishingAfterError = true
        let status: SessionCompletionStatus = (error as? SessionWriterError) == .storageLimit ? .storageLimit : .sensorError
        notice = error.localizedDescription
        mode = .saving
        finish(status: status, detail: error.localizedDescription)
    }

    private func observeStream(_ stream: String, stamp: CaptureStamp) {
        var stats = streamStats[stream] ?? StreamStats()
        stats.observe(stamp)
        streamStats[stream] = stats
        rawSampleCount += 1
    }

    private func recordInertial(
        raw: [String: Any],
        stream: String,
        eventType: String,
        sourceTimestampSeconds: TimeInterval,
        stamp: CaptureStamp,
        writer: SessionWriter
    ) throws {
        if let previous = lastInertialSourceSeconds[stream] {
            let interval = sourceTimestampSeconds - previous
            if interval > 0.5 {
                gapCount += 1
                try writer.append(
                    channel: .system,
                    type: "recording_gap",
                    payload: [
                        "stream": stream,
                        "observedSourceTimestampGapSeconds": interval,
                        "expectedIntervalSeconds": 1.0 / requestedDeviceMotionHz,
                        "basis": "gap between delivered Core Motion source timestamps",
                        "exactSuspensionTimeKnown": false
                    ],
                    stamp: stamp,
                    critical: true
                )
            }
        }
        lastInertialSourceSeconds[stream] = sourceTimestampSeconds
        try writer.append(channel: .raw, type: eventType, payload: raw, stamp: stamp)
        observeStream(stream, stamp: stamp)
    }

    private func buildMetadata(startedAt: CaptureStamp) -> [String: Any] {
        let bundle = Bundle.main
        let sourceCommit = bundle.object(forInfoDictionaryKey: "RecorderSourceCommit") as? String ?? "unknown"
        return [
            "schemaVersion": recorderSchemaVersion,
            "sessionStartedAt": SessionWriter.stampDictionary(startedAt),
            "clock": SystemCaptureClock.timebaseMetadata,
            "app": [
                "name": "Walking Recorder",
                "bundleIdentifier": bundle.bundleIdentifier ?? "unknown",
                "version": bundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown",
                "build": bundle.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "unknown",
                "sourceCommit": sourceCommit,
                "delivery": "isolated development companion; Expo Updates and OTA delivery are absent"
            ],
            "device": [
                "modelFamily": UIDevice.current.model,
                "modelCode": Self.hardwareModelCode(),
                "systemName": UIDevice.current.systemName,
                "systemVersion": UIDevice.current.systemVersion,
                "personalIdentifiersCollected": false
            ],
            "permissionAtStart": [
                "motionAndFitness": permission.rawValue,
                "locationRequested": false,
                "cameraRequested": false,
                "microphoneRequested": false
            ],
            "availability": [
                "activity": availability.activity,
                "cadence": availability.cadence,
                "stepCounting": availability.stepCounting,
                "accelerometer": availability.accelerometer,
                "gyroscope": availability.gyroscope,
                "deviceMotion": availability.deviceMotion
            ],
            "productionParity": [
                "kind": "equivalent Swift port; production TypeScript is not embedded in this standalone native target",
                "sourceFiles": [
                    "app-next/src/runtime/detection/MotionAdapter.ts",
                    "app-next/src/domain/walkingMachine.ts"
                ],
                "constants": [
                    "motionFreshnessMs": productionMotionFreshnessMs,
                    "minimumCadencePerMinute": productionMinimumWalkingCadencePerMinute,
                    "qualificationMs": productionWalkQualificationMs,
                    "silenceMs": productionWalkSilenceMs,
                    "graceMs": productionWalkingGraceMs
                ]
            ],
            "scope": [
                "rawStreamsAlsoAvailableInProduction": ["activity/confidence", "cadence", "cumulative steps", "gravity", "rotation rate"],
                "labOnlyExtraRawFieldsNotCurrentlyEmittedByProduction": ["raw accelerometer", "raw gyroscope", "user acceleration", "total acceleration", "attitude", "magnetic field", "source boot timestamp", "50 Hz requested sampling"],
                "managedSettingsOrActualShieldInstrumentation": false,
                "locationKeepAlive": false,
                "automaticUpload": false
            ]
        ]
    }

    private static func hardwareModelCode() -> String {
        var systemInfo = utsname()
        uname(&systemInfo)
        return withUnsafePointer(to: &systemInfo.machine) {
            $0.withMemoryRebound(to: CChar.self, capacity: 1) { String(cString: $0) }
        }
    }
}

extension CaptureController: MotionCaptureServiceDelegate {
    nonisolated func motionCaptureDidReceiveActivity(raw: [String: Any], production: ProductionActivitySample, stamp: CaptureStamp) {
        Task { @MainActor in
            guard let writer = self.writer, self.isRecording else { return }
            do {
                try writer.append(channel: .raw, type: "activity_sample", payload: raw, stamp: stamp)
                self.observeStream("activity", stamp: stamp)
                if var detector = self.detector,
                   let snapshot = detector.acceptActivity(production, nowMs: stamp.monotonicMs) {
                    self.detector = detector
                    self.walkingPhase = snapshot.state.phase
                    try writer.append(channel: .decisions, type: "production_walking_decision", payload: snapshot.dictionary, stamp: stamp)
                }
            } catch { self.stopAfterWriteFailure(error) }
        }
    }

    nonisolated func motionCaptureDidReceiveCadence(raw: [String: Any], production: ProductionCadenceSample?, stamp: CaptureStamp) {
        Task { @MainActor in
            guard let writer = self.writer, self.isRecording else { return }
            do {
                try writer.append(channel: .raw, type: "pedometer_sample", payload: raw, stamp: stamp)
                self.observeStream("pedometer", stamp: stamp)
                if let production, var detector = self.detector,
                   let snapshot = detector.acceptCadence(production, nowMs: stamp.monotonicMs) {
                    self.detector = detector
                    self.walkingPhase = snapshot.state.phase
                    try writer.append(channel: .decisions, type: "production_walking_decision", payload: snapshot.dictionary, stamp: stamp)
                } else if production == nil {
                    try writer.append(
                        channel: .decisions,
                        type: "production_input_rejected",
                        payload: ["stream": "cadence", "reason": "invalid or future-mapped source timestamp/cadence"],
                        stamp: stamp
                    )
                }
            } catch { self.stopAfterWriteFailure(error) }
        }
    }

    nonisolated func motionCaptureDidReceiveInertial(
        raw: [String: Any],
        stream: String,
        sourceTimestampSeconds: TimeInterval,
        stamp: CaptureStamp
    ) {
        Task { @MainActor in
            guard let writer = self.writer, self.isRecording else { return }
            do {
                try self.recordInertial(
                    raw: raw,
                    stream: stream,
                    eventType: "\(stream)_sample",
                    sourceTimestampSeconds: sourceTimestampSeconds,
                    stamp: stamp,
                    writer: writer
                )
            } catch { self.stopAfterWriteFailure(error) }
        }
    }

    nonisolated func motionCaptureDidReceiveDeviceMotion(raw: [String: Any], sourceTimestampSeconds: TimeInterval, stamp: CaptureStamp) {
        Task { @MainActor in
            guard let writer = self.writer, self.isRecording else { return }
            do {
                try self.recordInertial(
                    raw: raw,
                    stream: "device_motion",
                    eventType: "device_motion_sample",
                    sourceTimestampSeconds: sourceTimestampSeconds,
                    stamp: stamp,
                    writer: writer
                )
            } catch { self.stopAfterWriteFailure(error) }
        }
    }

    nonisolated func motionCaptureDidFail(stream: String, error: Error, stamp: CaptureStamp) {
        Task { @MainActor in
            guard let writer = self.writer, self.isRecording else { return }
            do {
                try writer.append(
                    channel: .system,
                    type: "sensor_error",
                    payload: [
                        "stream": stream,
                        "message": error.localizedDescription,
                        "domain": (error as NSError).domain,
                        "code": (error as NSError).code,
                        "missingDataExplicit": true
                    ],
                    stamp: stamp,
                    critical: true
                )
                self.notice = "\(stream) reported an error. The gap was saved."
            } catch { self.stopAfterWriteFailure(error) }
        }
    }
}
