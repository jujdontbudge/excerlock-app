import Combine
import Foundation

#if canImport(UIKit)
import UIKit
#endif

/// The services the controller drives. Protocols so the simulator integration
/// test and the host recovery harness can run without a real phone.
protocol LocationCaptureServicing: AnyObject {
    var delegate: LocationCaptureServiceDelegate? { get set }
    var permission: LocationPermission { get }
    var accuracyAuthorization: LocationAccuracyAuthorization { get }
    var locationServicesEnabled: Bool { get }
    func requestWhenInUse()
    func requestAlways()
    func start(gyms: [SavedGym])
    func stop()
    func reregister(gyms: [SavedGym])
    func requestStateNow(reason: String)
    func probeCurrentLocation(completion: @escaping (GymFixSample?) -> Void)
}

extension LocationCaptureService: LocationCaptureServicing {
    func probeCurrentLocation(completion: @escaping (GymFixSample?) -> Void) {
        probeCurrentLocation { location in
            guard let location else {
                completion(nil)
                return
            }
            completion(
                GymFixSample(
                    latitude: location.coordinate.latitude,
                    longitude: location.coordinate.longitude,
                    horizontalAccuracyM: location.horizontalAccuracy,
                    wallTimeMs: Int64((location.timestamp.timeIntervalSince1970 * 1_000).rounded())
                )
            )
        }
    }
}

/// What the status header shows. Every field is derived from something the
/// archive also carries, so the header never says more than the recording does.
struct RecordingStatus: Equatable {
    var presence: String = "UNKNOWN"
    var distanceLine: String = "no fix yet"
    var reducerLine: String = "Reducer: idle"
    var activityLine: String = "waiting for motion"
    var streamHealth: String = "waiting"
    var gymName: String = "no gym"

    var streamIsLive: Bool { streamHealth == "live" }
}

enum ObserverCard: String, CaseIterable {
    case atGym = "at_gym"
    case notAtGym = "not_at_gym"
    case confirming
    case noCard = "no_card"
    case cannotTell = "cannot_tell"

    var title: String {
        switch self {
        case .atGym: return "At gym"
        case .notAtGym: return "Not at gym"
        case .confirming: return "Confirming"
        case .noCard: return "No card"
        case .cannotTell: return "Can't tell"
        }
    }
}

enum ObserverLock: String, CaseIterable {
    case unlocked
    case locked
    case cannotTell = "cannot_tell"

    var title: String {
        switch self {
        case .unlocked: return "Opened"
        case .locked: return "Blocked"
        case .cannotTell: return "Can't tell"
        }
    }
}

enum CanaryOutcome: String, CaseIterable {
    case appOpened = "app_opened"
    case shieldVisible = "shield_visible"
    case uncertain

    var title: String {
        switch self {
        case .appOpened: return "It opened"
        case .shieldVisible: return "It was blocked"
        case .uncertain: return "Not sure"
        }
    }
}

enum ExcerLockAction: String, CaseIterable {
    case manualCheckInTapped = "manual_check_in_tapped"
    case autoDetectToggled = "auto_detect_toggled"
    case permissionChanged = "permission_changed"
    case appForceQuit = "app_force_quit"
    case appRelaunched = "app_relaunched"
    case phoneRebooted = "phone_rebooted"

    var title: String {
        switch self {
        case .manualCheckInTapped: return "I tapped Check in / Unlock"
        case .autoDetectToggled: return "I changed auto-detect"
        case .permissionChanged: return "I changed location permission"
        case .appForceQuit: return "I force-quit ExcerLock"
        case .appRelaunched: return "I relaunched ExcerLock"
        case .phoneRebooted: return "I rebooted the phone"
        }
    }
}

/// The ExcerLock setup checklist the operator confirms before Start. Tapped
/// once per session; every field is a declaration, never a measurement.
struct ExcerLockSetupDeclaration: Equatable {
    var sameGymSaved = false
    var radiusMeters: Double = gymRadiusDefaultMeters
    var autoDetectOn = false
    var locationPermission = "unknown"
    var preciseLocation = "unknown"
    var buildKind = "unknown"

    var isComplete: Bool {
        sameGymSaved && locationPermission != "unknown" && preciseLocation != "unknown" && buildKind != "unknown"
    }

    var dictionary: [String: Any] {
        [
            "sameGymSaved": sameGymSaved,
            "radiusMeters": radiusMeters,
            "autoDetectOn": autoDetectOn,
            "locationPermission": locationPermission,
            "preciseLocation": preciseLocation,
            "buildKind": buildKind
        ]
    }
}

final class CaptureController: ObservableObject {
    @Published private(set) var isRecording = false
    @Published private(set) var status = RecordingStatus()
    @Published private(set) var startedAt: CaptureStamp?
    @Published private(set) var sessionId: String?
    @Published private(set) var setup = ExcerLockSetupDeclaration()
    @Published private(set) var scenarioId: String?
    @Published private(set) var stepIndex = 0
    @Published private(set) var completedSteps: Set<String> = []
    @Published private(set) var activePlace: GymPlaceLabel = .away
    @Published private(set) var finishNote: String?
    @Published private(set) var errorMessage: String?
    @Published private(set) var averagingFixCount = 0
    @Published private(set) var isAveragingGym = false
    @Published private(set) var lastGymAverageNote: String?

    let repository: SessionRepository
    let registry: GymRegistry
    let catalog: ScenarioCatalog

    private let clock: CaptureClock
    private let location: LocationCaptureServicing
    private let motion: MotionCaptureServicing

    private var writer: SessionWriter?
    private var timeline = GymLabelTimeline()
    private var coverage = RawCoverageTracker()
    private var detector: ProductionGymDetector?
    private var tickTimer: Timer?
    private var lastTickStamp: CaptureStamp?
    private var checkpointCounter = 0
    private var gapCount = 0
    private var storageLimitReached = false
    private var suspensionAnnounced = false
    private var lastActivityClasses: [String] = []
    private var lastCadencePerMinute: Double?
    private var lastCadenceAtMs: Int64 = 0
    private var lastFix: (distanceM: Double, accuracyM: Double?)?
    private var regionPresence: [String: Bool] = [:]
    private var powerStateObserver: NSObjectProtocol?

    init(
        repository: SessionRepository = SessionRepository(),
        registry: GymRegistry = GymRegistry(),
        catalog: ScenarioCatalog = .shared,
        clock: CaptureClock = SystemCaptureClock(),
        location: LocationCaptureServicing = LocationCaptureService(),
        motion: MotionCaptureServicing = MotionCaptureService()
    ) {
        self.repository = repository
        self.registry = registry
        self.catalog = catalog
        self.clock = clock
        self.location = location
        self.motion = motion
        self.location.delegate = self
        self.motion.delegate = self
    }

    // MARK: Home actions

    var locationPermissionTitle: String {
        switch location.permission {
        case .notDetermined: return "not asked yet"
        case .restricted: return "restricted"
        case .denied: return "denied"
        case .whenInUse: return "While Using"
        case .always: return "Always"
        }
    }

    var locationPermissionIsUsable: Bool { location.permission.isAuthorized }

    var precisionTitle: String {
        location.accuracyAuthorization == .fullAccuracy ? "on" : "approximate"
    }

    var precisionIsFull: Bool { location.accuracyAuthorization == .fullAccuracy }

    var motionPermissionTitle: String {
        switch motion.permission {
        case .notDetermined: return "not asked yet"
        case .authorized: return "on"
        case .denied: return "denied"
        case .restricted: return "restricted"
        }
    }

    var motionPermissionIsUsable: Bool { motion.permission == .authorized }

    func requestLocationPermission() { location.requestWhenInUse() }

    /// Always is what the background-geofence scenarios need. iOS only shows
    /// the upgrade prompt once; after that the user has to flip it in Settings.
    func requestAlwaysLocationPermission() {
        if location.permission == .notDetermined {
            location.requestWhenInUse()
        } else {
            location.requestAlways()
        }
    }

    var missingPermissionSummary: String? {
        var missing: [String] = []
        switch location.permission {
        case .notDetermined: missing.append("location")
        case .whenInUse: missing.append("location Always")
        case .denied, .restricted: missing.append("location (denied)")
        case .always: break
        }
        if motion.permission != .authorized { missing.append("motion") }
        return missing.isEmpty ? nil : missing.joined(separator: " and ")
    }

    /// The one button the permissions row shows, in the order iOS needs them.
    var nextPermissionAction: (title: String, run: () -> Void)? {
        switch location.permission {
        case .notDetermined:
            return ("Allow location", { [weak self] in self?.requestLocationPermission() })
        case .whenInUse:
            return ("Allow Always", { [weak self] in self?.requestAlwaysLocationPermission() })
        case .denied, .restricted:
            return ("Open Settings", { Self.openSettings() })
        case .always:
            break
        }
        if motion.permission == .notDetermined {
            return ("Allow motion", { [weak self] in self?.requestMotionPermission() })
        }
        if motion.permission != .authorized {
            return ("Open Settings", { Self.openSettings() })
        }
        return nil
    }

    static func openSettings() {
        #if canImport(UIKit)
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
        #endif
    }

    func requestMotionPermission() {
        motion.requestLiveAuthorization { _ in }
    }

    func updateSetup(_ declaration: ExcerLockSetupDeclaration) {
        setup = declaration
    }

    /// Stands at the entrance for the averaging window, taking one fresh fix a
    /// second. The average is accuracy-weighted and rejects fixes worse than
    /// 65 m, exactly as `GymRegistry.averagedLocation` documents.
    func beginGymAveraging(
        seconds: Double = GymRegistry.averagingWindowSeconds,
        name: String,
        completion: @escaping (Bool) -> Void
    ) {
        guard !isAveragingGym else { return }
        isAveragingGym = true
        averagingFixCount = 0
        lastGymAverageNote = nil
        var collected: [GymFixSample] = []
        let deadline = Date().addingTimeInterval(seconds)

        func poll() {
            location.probeCurrentLocation { [weak self] fix in
                DispatchQueue.main.async {
                    guard let self else { return }
                    if let fix { collected.append(fix) }
                    self.averagingFixCount = collected.count
                    if Date() < deadline {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { poll() }
                    } else {
                        self.isAveragingGym = false
                        let usable = collected.filter { $0.horizontalAccuracyM > 0 && $0.horizontalAccuracyM <= GymRegistry.maximumAcceptedAccuracyM }
                        if GymRegistry.averagedLocation(from: collected) != nil {
                            _ = self.registry.addAveragedGym(name: name, fixes: collected)
                            self.lastGymAverageNote = String(
                                format: "Averaged %d fixes (%d usable), mean accuracy %.0f m",
                                collected.count, usable.count, usable.isEmpty ? 0 : usable.map(\.horizontalAccuracyM).reduce(0, +) / Double(usable.count)
                            )
                            completion(true)
                        } else {
                            self.lastGymAverageNote = "Only \(usable.count) usable fixes in \(Int(seconds)) s; nothing was saved. Stand still, outdoors if possible."
                            completion(false)
                        }
                    }
                }
            }
        }
        poll()
    }

    var currentScenario: GymScenario? { catalog.scenario(id: scenarioId) }
    var thresholds: GymThresholds? { catalog.thresholds }

    var currentStep: GymScenarioStep? {
        let steps = currentScenario?.steps ?? []
        guard stepIndex < steps.count else { return nil }
        return steps[stepIndex]
    }

    var stepsRemaining: Int {
        max(0, (currentScenario?.steps.count ?? 0) - stepIndex)
    }

    var canStart: Bool { startBlockedReason == nil }

    var startBlockedReason: String? {
        if isRecording { return "A recording is already running." }
        if registry.gyms.isEmpty { return "Set the gym circle first." }
        if !StoragePolicy.canStartSession(totalStoredBytes: repository.totalStoredBytes, freeBytes: repository.freeBytes()) {
            return "Not enough free space to start a recording."
        }
        return nil
    }

    // MARK: Session lifecycle

    func startSession(scenarioId: String?, startPlace: GymPlaceLabel) {
        guard canStart else { return }
        self.scenarioId = scenarioId
        activePlace = startPlace
        stepIndex = 0
        completedSteps = []
        finishNote = nil
        errorMessage = nil
        storageLimitReached = false
        suspensionAnnounced = false
        gapCount = 0
        checkpointCounter = 0
        lastTickStamp = nil
        regionPresence = [:]
        lastFix = nil
        detector = nil
        timeline = GymLabelTimeline()
        coverage = RawCoverageTracker()

        let start = clock.now()
        startedAt = start
        let gyms = registry.gyms
        let metadata = Self.metadata(
            scenarioId: scenarioId,
            startPlace: startPlace,
            setup: setup,
            gyms: gyms,
            permission: location.permission.rawValue,
            accuracy: location.accuracyAuthorization.rawValue,
            locationServicesEnabled: location.locationServicesEnabled,
            motionPermission: motion.permission.rawValue,
            motionAvailability: motion.availability
        )
        do {
            let writer = try SessionWriter(
                baseURL: repository.baseURL,
                startedAt: start,
                metadata: metadata,
                gyms: gyms.map(\.dictionary),
                clock: clock
            )
            self.writer = writer
            sessionId = writer.id
        } catch {
            errorMessage = error.localizedDescription
            return
        }
        isRecording = true
        write(channel: .system, type: "session_start", payload: [
            "scenarioId": scenarioId ?? NSNull(),
            "scriptVersion": catalog.table?.scriptVersion ?? 1,
            "expectedOutcomeVersion": catalog.table?.expectedOutcomeVersion ?? 1,
            "gymIds": gyms.map(\.id),
            "gymAutoDetectRequested": setup.autoDetectOn,
            "productionConfirmMs": gymConfirmMs,
            "labOnly": true,
            "meaning": "This lab app records beside ExcerLock. It never drives ExcerLock and never claims its enforcement."
        ], critical: true)
        write(channel: .labels, type: "scenario_declared", payload: [
            "scenarioId": scenarioId ?? "free",
            "scriptVersion": catalog.table?.scriptVersion ?? 1,
            "expectedOutcomeVersion": catalog.table?.expectedOutcomeVersion ?? 1
        ], critical: true)
        write(channel: .observations, type: "excerlock_setup_declared", payload: setup.dictionary, critical: true)
        if let transition = timeline.transition(to: startPlace, at: start, reason: .sessionStart) {
            writeLabelTransition(transition)
        }
        detector = ProductionGymDetector(startWallTimeMs: start.wallTimeMs)
        writeLowPowerMode()
        powerStateObserver = NotificationCenter.default.addObserver(
            forName: .NSProcessInfoPowerStateDidChange,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.writeLowPowerMode()
        }
        write(channel: .system, type: "permission_state", payload: [
            "location": location.permission.rawValue,
            "locationAccuracy": location.accuracyAuthorization.rawValue,
            "locationServicesEnabled": location.locationServicesEnabled,
            "motion": motion.permission.rawValue,
            "motionAvailability": [
                "activity": motion.availability.activity,
                "cadence": motion.availability.cadence,
                "stepCounting": motion.availability.stepCounting
            ]
        ], critical: true)
        location.start(gyms: gyms)
        do {
            _ = try motion.start()
        } catch {
            write(channel: .system, type: "sensor_error", payload: ["stream": "motion", "description": error.localizedDescription])
        }
        startTicker()
        refreshStatus()
    }

    func finish() {
        guard isRecording, let writer else { return }
        let end = clock.now()
        tickTimer?.invalidate()
        tickTimer = nil
        if let powerStateObserver {
            NotificationCenter.default.removeObserver(powerStateObserver)
            self.powerStateObserver = nil
        }
        location.stop()
        motion.stop()
        if let closed = coverage.closeAtSessionEnd(startedAt: writer.startedAt, endedAt: end) {
            write(channel: .system, type: "location_stream_suspended", payload: closed.dictionary)
        }
        timeline.closeOpenSegment(at: end)
        if timeline.active != nil, let transition = timeline.transition(to: nil, at: end, reason: .sessionEnd) {
            writeLabelTransition(transition)
        }
        let windows = timeline.labelWindows(
            endedAt: end,
            suspensions: coverage.suspensions,
            thresholdSeconds: coverage.thresholdSeconds
        )
        let manifest = coverage.manifest(startedAt: writer.startedAt, endedAt: end, labelWindows: windows)
        if let errorMessage {
            write(channel: .system, type: "sensor_error", payload: ["stream": "session", "description": errorMessage])
        }
        do {
            let summary = try writer.finalize(
                status: storageLimitReached ? .storageLimit : .completed,
                timeline: timeline,
                gapCount: gapCount,
                endedAt: end,
                detail: errorMessage,
                streams: manifest,
                scenarioId: scenarioId,
                gymIds: registry.gyms.map(\.id),
                reducerIntervals: detector?.intervalSummaries() ?? []
            )
            finishNote = "Saved \(summary.id.prefix(8))… (\(Int(summary.durationSeconds)) s, \(summary.eventCount) events)"
        } catch {
            finishNote = "Could not finish the archive: \(error.localizedDescription)"
        }
        isRecording = false
        self.writer = nil
        detector = nil
        activePlace = .away
        repository.reload()
    }

    // MARK: Ground truth

    func setPlace(_ place: GymPlaceLabel) {
        guard isRecording else { return }
        let stamp = clock.now()
        if let transition = timeline.transition(to: place, at: stamp, reason: .userTap) {
            writeLabelTransition(transition)
            activePlace = place
            advanceStep(for: place)
            checkpoint()
        }
    }

    /// A boundary the operator missed. It is placed at receipt − offset and is
    /// marked approximate so the validator can score it without pretending it
    /// was a live tap.
    func recordBackdatedPlace(_ place: GymPlaceLabel, offsetSeconds: Double) {
        guard isRecording else { return }
        let stamp = clock.now()
        if let transition = timeline.backdatedTransition(to: place, receipt: stamp, offsetSeconds: offsetSeconds) {
            writeLabelTransition(transition)
            activePlace = place
            checkpoint()
        }
    }

    func acknowledgeCurrentStep() {
        guard isRecording, let step = currentStep else { return }
        completedSteps.insert(step.id)
        write(channel: .labels, type: "script_step_acknowledged", payload: [
            "scenarioId": scenarioId ?? "free",
            "stepId": step.id,
            "ack": step.ack ?? NSNull()
        ], critical: true)
        stepIndex += 1
    }

    func addLabelNote(_ text: String) {
        guard isRecording else { return }
        write(channel: .labels, type: "label_note", payload: ["text": text], critical: true)
    }

    // MARK: ExcerLock observations

    func observeExcerLock(card: ObserverCard, lock: ObserverLock) {
        guard isRecording else { return }
        write(channel: .observations, type: "excerlock_state_observed", payload: [
            "card": card.rawValue,
            "lock": lock.rawValue,
            "referencePresence": referencePresence(),
            "referenceConfirmed": !confirmedGymIds().isEmpty
        ], critical: true)
    }

    func recordCanary(_ outcome: CanaryOutcome) {
        guard isRecording else { return }
        write(channel: .observations, type: "canary_outcome", payload: [
            "outcome": outcome.rawValue,
            "referenceConfirmed": !confirmedGymIds().isEmpty
        ], critical: true)
    }

    func recordAction(_ action: ExcerLockAction) {
        guard isRecording else { return }
        write(channel: .observations, type: "excerlock_action", payload: [
            "action": action.rawValue,
            "atWallTimeMs": clock.now().wallTimeMs
        ], critical: true)
        if action == .permissionChanged {
            setup.locationPermission = location.permission.rawValue
            setup.preciseLocation = location.accuracyAuthorization == .fullAccuracy ? "true" : "false"
            write(channel: .observations, type: "excerlock_setup_declared", payload: setup.dictionary)
        }
    }

    // MARK: Probes

    /// The manual check-in mirror: one fresh fix, the same distance test and the
    /// same refusal string the production port would produce.
    func probeCheckIn() {
        guard isRecording else { return }
        location.probeCurrentLocation { [weak self] fix in
            DispatchQueue.main.async {
                guard let self else { return }
                let gym = self.registry.gymUnderTest
                let distance = (fix != nil && gym != nil)
                    ? GymGeometry.distanceMetres(
                        latitude: fix!.latitude,
                        longitude: fix!.longitude,
                        toLatitude: gym!.latitude,
                        toLongitude: gym!.longitude
                    )
                    : nil
                let inside = (distance != nil && gym != nil) ? distance! <= gym!.radiusMeters : nil
                self.write(channel: .decisions, type: "manual_checkin_probe", payload: [
                    "gymId": gym?.id ?? NSNull(),
                    "distanceM": distance ?? NSNull(),
                    "accuracyM": fix?.horizontalAccuracyM ?? NSNull(),
                    "inside": inside ?? NSNull(),
                    "wouldThrow": inside == false ? "Outside saved gym" : NSNull(),
                    "meaning": "Mirror of NativeGymPort.checkIn's fresh-fix distance test. The production port ignores the confirmation argument, so this probe reports distance only."
                ], critical: true)
            }
        }
    }

    /// Probe re-register for the "permission granted after arrival" scenario.
    func reregisterRegions() {
        guard isRecording else { return }
        location.reregister(gyms: registry.gyms)
        location.requestStateNow(reason: "probe_reregister")
    }

    func requestStateNow(reason: String) {
        location.requestStateNow(reason: reason)
    }

    /// Called by the scene phase observer. A tick gap over 5 s is recorded as a
    /// gap, and a background departure arms the coverage tracker's lifecycle
    /// basis so a following stream gap is attributed honestly.
    func noteScenePhase(_ name: String) {
        let stamp = clock.now()
        if let last = lastTickStamp {
            let gap = Double(stamp.monotonicNs - last.monotonicNs) / 1_000_000_000
            if gap > 5 {
                gapCount += 1
                write(channel: .system, type: "recording_gap", payload: [
                    "fromReceiptMonotonicNs": last.monotonicNs,
                    "toReceiptMonotonicNs": stamp.monotonicNs,
                    "durationSeconds": gap,
                    "observedDuring": name
                ])
            }
        }
        lastTickStamp = stamp
        write(channel: .system, type: "app_lifecycle", payload: ["state": name], critical: true)
        if isRecording, name == "background" || name == "inactive" {
            coverage.noteLifecycleDeparture(state: name, stamp: stamp)
        }
        if isRecording, name == "active" {
            location.requestStateNow(reason: "foreground_return")
        }
        refreshStatus()
    }

    // MARK: Ticker

    private func startTicker() {
        tickTimer?.invalidate()
        tickTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            self?.tick()
        }
    }

    private func tick() {
        guard isRecording else { return }
        performTick(at: clock.now())
    }

    /// The ticker body, callable by the simulator/host tests with a controlled
    /// clock so the 30 s confirmation can be proven without waiting for it.
    func performTick(at stamp: CaptureStamp) {
        guard isRecording, let writer else { return }
        if let last = lastTickStamp {
            let gap = Double(stamp.monotonicNs - last.monotonicNs) / 1_000_000_000
            if gap > 5 {
                gapCount += 1
                write(channel: .system, type: "recording_gap", payload: [
                    "fromReceiptMonotonicNs": last.monotonicNs,
                    "toReceiptMonotonicNs": stamp.monotonicNs,
                    "durationSeconds": gap,
                    "observedDuring": "ticker"
                ])
            }
        }
        lastTickStamp = stamp
        let elapsedMs = Int64(Double(stamp.monotonicNs - writer.startedAt.monotonicNs) / 1_000_000)
        for decision in detector?.tick(nowWallTimeMs: writer.startedAt.wallTimeMs + elapsedMs) ?? [] {
            writeDecision(decision, stamp: stamp)
        }
        if coverage.isSuspended(at: stamp), !suspensionAnnounced, let last = coverage.lastStamps["location"] {
            suspensionAnnounced = true
            write(channel: .system, type: "location_stream_suspended", payload: [
                "streamGroup": "location_streams",
                "streams": ["location"],
                "fromReceiptMonotonicNs": last.monotonicNs,
                "fromWallTimeMs": last.wallTimeMs,
                "toReceiptMonotonicNs": stamp.monotonicNs,
                "toWallTimeMs": stamp.wallTimeMs,
                "durationSeconds": Double(stamp.monotonicNs - last.monotonicNs) / 1_000_000_000,
                "thresholdSeconds": coverage.thresholdSeconds,
                "basis": "live_gap_observation",
                "provisional": true,
                "exactSuspensionTimeKnown": false,
                "source": "live_capture",
                "meaning": "No location sample has arrived for longer than the threshold while updates are requested. The interval closes when a sample arrives or the session ends."
            ])
        }
        checkpointCounter += 1
        if checkpointCounter % 30 == 0 { checkpoint() }
        refreshStatus()
    }

    private func checkpoint() {
        guard let writer else { return }
        let end = clock.now()
        let windows = timeline.labelWindows(
            endedAt: end,
            suspensions: coverage.suspensions,
            thresholdSeconds: coverage.thresholdSeconds
        )
        let manifest = coverage.manifest(startedAt: writer.startedAt, endedAt: end, labelWindows: windows)
        try? writer.checkpoint(timeline: timeline, gapCount: gapCount, streams: manifest)
    }

    // MARK: Status

    private func referencePresence() -> String {
        if !confirmedGymIds().isEmpty { return "confirmed" }
        let pending = detector?.state.regions.values.contains { $0.pendingEnterAt != nil } ?? false
        return pending ? "pending" : "none"
    }

    private func confirmedGymIds() -> [String] {
        guard let detector else { return [] }
        return confirmedGymRegions(detector.state)
    }

    private func refreshStatus() {
        guard let gym = registry.gymUnderTest, let writer else {
            status.gymName = registry.gymUnderTest?.name ?? "no gym"
            return
        }
        status.gymName = gym.name
        switch regionPresence[gym.id] {
        case .some(true): status.presence = "INSIDE"
        case .some(false): status.presence = "OUTSIDE"
        case .none: status.presence = "UNKNOWN"
        }
        if let lastFix {
            status.distanceLine = "\(Int(lastFix.distanceM.rounded())) m" + (lastFix.accuracyM.map { " ±\(Int($0.rounded()))" } ?? "")
        }
        let nowMs = writer.startedAt.wallTimeMs + Int64(Double(clock.now().monotonicNs - writer.startedAt.monotonicNs) / 1_000_000)
        if let region = detector?.state.regions[gym.id], let confirmed = region.confirmedSince {
            status.reducerLine = "Reducer: confirmed \(Self.mmss(nowMs - confirmed))"
        } else if let region = detector?.state.regions[gym.id], let pending = region.pendingEnterAt {
            let remaining = max(0, (pending + gymConfirmMs) - nowMs)
            status.reducerLine = "Reducer: confirming \(Int((Double(remaining) / 1_000).rounded())) s"
        } else {
            status.reducerLine = "Reducer: idle"
        }
        if let cadence = lastCadencePerMinute, nowMs - lastCadenceAtMs < 30_000 {
            status.activityLine = "\(lastActivityClasses.first ?? "unknown") · \(Int(cadence.rounded())) spm"
        } else if !lastActivityClasses.isEmpty {
            status.activityLine = lastActivityClasses.joined(separator: " · ")
        }
        status.streamHealth = coverage.lastStamps["location"] != nil
            ? (coverage.isSuspended(at: clock.now()) ? "suspended" : "live")
            : "waiting"
    }

    static func mmss(_ milliseconds: Int64) -> String {
        let totalSeconds = max(0, milliseconds / 1_000)
        return String(format: "%02d:%02d", totalSeconds / 60, totalSeconds % 60)
    }

    // MARK: Writing

    private func writeLabelTransition(_ transition: GymLabelTransition) {
        write(channel: .labels, type: "label_transition", payload: transition.dictionary, critical: true)
    }

    /// Low Power Mode changes CPU cadence, wake scheduling and GPS duty cycling,
    /// so S23 cannot be read without knowing whether it was on. Recorded at
    /// every transition plus once at start (the call site above).
    private func writeLowPowerMode() {
        guard isRecording else { return }
        write(channel: .system, type: "low_power_mode_changed", payload: [
            "enabled": ProcessInfo.processInfo.isLowPowerModeEnabled
        ], critical: true)
    }

    private func advanceStep(for place: GymPlaceLabel) {
        guard let step = currentStep else { return }
        if step.expectsPlaceTap, step.place == place {
            completedSteps.insert(step.id)
            stepIndex += 1
        }
    }

    private func write(channel: CaptureEventChannel, type: String, payload: [String: Any], stamp: CaptureStamp? = nil, critical: Bool = false) {
        guard let writer else { return }
        do {
            try writer.append(channel: channel, type: type, payload: payload, stamp: stamp, critical: critical)
        } catch SessionWriterError.storageLimit {
            storageLimitReached = true
            finishNote = "The 250 MB safety limit was reached. The recording was stopped and kept."
            finish()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func writeDecision(_ decision: GymDecision, stamp: CaptureStamp?) {
        write(channel: .decisions, type: "production_gym_decision", payload: decision.dictionary, stamp: stamp)
    }

    // MARK: Metadata

    static func metadata(
        scenarioId: String?,
        startPlace: GymPlaceLabel,
        setup: ExcerLockSetupDeclaration,
        gyms: [SavedGym],
        permission: String,
        accuracy: String,
        locationServicesEnabled: Bool,
        motionPermission: String,
        motionAvailability: SensorAvailability
    ) -> [String: Any] {
        var device = "unknown"
        var systemVersion = "unknown"
        #if canImport(UIKit)
        device = UIDevice.current.model
        systemVersion = UIDevice.current.systemVersion
        #endif
        return [
            "app": "PhoneGymRecorder",
            "bundleId": "com.johansardar.excerlock.lab.gymrecorder",
            "schemaVersion": recorderSchemaVersion,
            "sourceCommit": Bundle.main.object(forInfoDictionaryKey: "RecorderSourceCommit") as? String ?? "unknown",
            "buildKind": setup.buildKind,
            "deviceModel": device,
            "systemVersion": systemVersion,
            "scenarioId": scenarioId ?? "free",
            "startPlace": startPlace.rawValue,
            "gymCount": gyms.count,
            "permissionAtStart": permission,
            "accuracyAtStart": accuracy,
            "locationServicesEnabledAtStart": locationServicesEnabled,
            "motionPermission": motionPermission,
            "motionAvailability": [
                "activity": motionAvailability.activity,
                "cadence": motionAvailability.cadence,
                "stepCounting": motionAvailability.stepCounting
            ],
            "productionParity": [
                "gymConfirmMs": gymConfirmMs,
                "radiusMinMeters": gymRadiusMinimumMeters,
                "radiusMaxMeters": gymRadiusMaximumMeters,
                "radiusStepMeters": gymRadiusStepMeters,
                "radiusDefaultMeters": gymRadiusDefaultMeters,
                "maxGyms": maximumGyms,
                "reducer": "app-next/src/domain/gymMachine.ts"
            ],
            "streams": [
                "locationSuspensionThresholdSeconds": locationSuspensionThresholdSeconds,
                "eventStreamSuspensionThresholdSeconds": eventStreamSuspensionThresholdSeconds
            ],
            "labOnlyFlags": [
                "recordsCoordinates": true,
                "recordsExcerLockObservations": true,
                "decisionsAreAPortNotEnforcement": true,
                "regionEventsAreReceiptTimeOnly": true,
                "backgroundLocationMode": true
            ],
            "clock": SystemCaptureClock.timebaseMetadata
        ]
    }
}

// MARK: - Location delegate

extension CaptureController: LocationCaptureServiceDelegate {
    func locationCaptureDidDeliver(payload: [String: Any], stamp: CaptureStamp) {
        handleLocationSample(payload: payload, stamp: stamp)
    }

    func locationCaptureDidEmit(type: String, payload: [String: Any], stamp: CaptureStamp) {
        handleLocationEvent(type: type, payload: payload, stamp: stamp)
    }

    func locationCaptureDidProbe(distanceM: Double?, accuracyM: Double?, inside: Bool?, stamp: CaptureStamp) {
        // The probe writes its own decision event from the one-shot fix; this
        // callback exists so a failed fix is never silent.
        guard inside == nil else { return }
        write(channel: .system, type: "sensor_error", payload: [
            "stream": "location_probe",
            "description": "The one-shot manual check-in probe delivered no usable fix."
        ], stamp: stamp)
    }

    private func handleLocationSample(payload: [String: Any], stamp: CaptureStamp) {
        guard isRecording else { return }
        if let closed = coverage.observe(stream: "location", stamp: stamp) {
            suspensionAnnounced = false
            write(channel: .system, type: "location_stream_coverage", payload: closed.dictionary, stamp: stamp)
        }
        write(channel: .rawLocation, type: "location_sample", payload: payload, stamp: stamp)
        timeline.recordLocationSample(at: stamp)
        if let perGym = payload["perGym"] as? [[String: Any]] {
            for entry in perGym {
                guard let gymId = entry["gymId"] as? String else { continue }
                write(channel: .decisions, type: "sampled_presence", payload: [
                    "gymId": gymId,
                    "inside": entry["insideByDistance"] ?? NSNull(),
                    "distanceM": entry["distanceM"] ?? NSNull(),
                    "accuracyM": payload["horizontalAccuracyM"] ?? NSNull(),
                    "accuracyBand": entry["accuracyBand"] ?? NSNull(),
                    "basis": "haversine_same_as_regionPresence"
                ], stamp: stamp)
            }
            if let gym = registry.gymUnderTest,
               let entry = perGym.first(where: { ($0["gymId"] as? String) == gym.id }),
               let distance = entry["distanceM"] as? Double {
                lastFix = (distance, payload["horizontalAccuracyM"] as? Double)
            }
        }
        refreshStatus()
    }

    private func handleLocationEvent(type: String, payload: [String: Any], stamp: CaptureStamp) {
        guard isRecording else { return }
        write(channel: .rawLocation, type: type, payload: payload, stamp: stamp)
        switch type {
        case "region_event":
            let gymId = payload["gymId"] as? String ?? ""
            let kind = payload["kind"] as? String ?? ""
            regionPresence[gymId] = kind == "enter"
            timeline.recordRegionEvent()
            write(channel: .decisions, type: "region_presence", payload: [
                "gymId": gymId,
                "inside": kind == "enter",
                "basis": "region_event",
                "sourceTime": "unavailable_receipt_only"
            ], stamp: stamp)
            let decisions = detector?.receiveRegionEvent(
                gymId: gymId,
                type: kind == "enter" ? .enter : .exit,
                atWallTimeMs: stamp.wallTimeMs
            ) ?? []
            for decision in decisions { writeDecision(decision, stamp: stamp) }
        case "region_state_determined":
            let gymId = payload["gymId"] as? String
            let state = payload["state"] as? String
            if let gymId, let state, state != "unknown" {
                regionPresence[gymId] = state == "inside"
            }
            write(channel: .decisions, type: "region_presence", payload: [
                "gymId": gymId ?? NSNull(),
                "inside": jsonOrNull(state == "inside" ? true : (state == "outside" ? false : nil)),
                "basis": "state_determined"
            ], stamp: stamp)
        case "authorization_changed":
            setup.preciseLocation = (payload["accuracyAuthorization"] as? String) == "fullAccuracy" ? "true" : "false"
        default:
            break
        }
        refreshStatus()
    }
}

// MARK: - Motion delegate

extension CaptureController: MotionCaptureServiceDelegate {
    func motionCaptureDidReceiveActivity(raw: [String: Any], stamp: CaptureStamp) {
        recordMotion(raw: raw, stamp: stamp, type: "activity_sample", stream: "activity")
        lastActivityClasses = (raw["classes"] as? [String]) ?? []
        refreshStatus()
    }

    func motionCaptureDidReceivePedometer(raw: [String: Any], stamp: CaptureStamp) {
        recordMotion(raw: raw, stamp: stamp, type: "pedometer_sample", stream: "pedometer")
        lastCadencePerMinute = raw["currentCadenceStepsPerMinute"] as? Double
        lastCadenceAtMs = stamp.monotonicMs
        refreshStatus()
    }

    func motionCaptureDidFail(stream: String, error: Error, stamp: CaptureStamp) {
        guard isRecording else { return }
        write(channel: .system, type: "sensor_error", payload: [
            "stream": stream,
            "description": error.localizedDescription
        ], stamp: stamp)
    }

    private func recordMotion(raw: [String: Any], stamp: CaptureStamp, type: String, stream: String) {
        guard isRecording else { return }
        write(channel: .rawMotion, type: type, payload: raw, stamp: stamp)
        // Motion gaps are still tracked so the manifest carries them, but they
        // are not location coverage: a still phone produces no activity or
        // pedometer updates, which is not a suspended location stream.
        _ = coverage.observe(stream: stream, stamp: stamp)
    }
}
