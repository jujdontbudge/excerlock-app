import SwiftUI
import UIKit

private enum RecorderTheme {
    static let top = Color(red: 246 / 255, green: 181 / 255, blue: 131 / 255)
    static let middle = Color(red: 251 / 255, green: 226 / 255, blue: 207 / 255)
    static let bottom = Color(red: 1, green: 247 / 255, blue: 241 / 255)
    static let card = Color.white.opacity(0.72)
    static let solid = Color.white
    static let selected = Color(red: 1, green: 241 / 255, blue: 232 / 255)
    static let primaryText = Color(red: 29 / 255, green: 29 / 255, blue: 34 / 255)
    static let secondaryText = Color(red: 102 / 255, green: 102 / 255, blue: 111 / 255)
    static let orange = Color(red: 201 / 255, green: 71 / 255, blue: 16 / 255)
    static let orangePressed = Color(red: 174 / 255, green: 56 / 255, blue: 10 / 255)
    static let outline = Color(red: 29 / 255, green: 29 / 255, blue: 34 / 255)
    static let divider = Color(red: 229 / 255, green: 229 / 255, blue: 234 / 255)
    static let success = Color(red: 39 / 255, green: 131 / 255, blue: 74 / 255)
    static let error = Color(red: 189 / 255, green: 48 / 255, blue: 56 / 255)
}

struct RecorderHomeView: View {
    @ObservedObject var controller: CaptureController
    @Environment(\.scenePhase) private var scenePhase
    @State private var pendingDelete: SessionSummary?

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16) {
                    header
                    if controller.isUIPreview { previewBanner }
                    permissionOrHealthCard
                    linkedTestSection
                    scenarioSection
                    savedSessionsSection
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, controller.isRecording ? 112 : 32)
            }
            .background(backgroundGradient.ignoresSafeArea())
            .safeAreaInset(edge: .bottom) {
                if controller.isRecording {
                    finishBar
                }
            }
            .toolbar(.hidden, for: .navigationBar)
        }
        .tint(RecorderTheme.orange)
        .onAppear { controller.refreshEnvironment() }
        .onChange(of: scenePhase) { _, phase in controller.handleScenePhase(phase) }
        .onOpenURL { url in controller.handleIncomingLink(url) }
        .sheet(
            isPresented: Binding(
                get: { controller.shareURL != nil },
                set: { if !$0 { controller.shareURL = nil } }
            )
        ) {
            if let url = controller.shareURL {
                ActivityShareSheet(items: [url])
                    .presentationDetents([.medium, .large])
            }
        }
        .alert("Delete this saved session?", isPresented: Binding(
            get: { pendingDelete != nil },
            set: { if !$0 { pendingDelete = nil } }
        )) {
            Button("Cancel", role: .cancel) { pendingDelete = nil }
            Button("Delete", role: .destructive) {
                if let session = pendingDelete { controller.delete(session) }
                pendingDelete = nil
            }
        } message: {
            Text("This removes the local recording from this phone. Export it first if you want to keep it.")
        }
    }

    private var backgroundGradient: LinearGradient {
        LinearGradient(
            colors: [RecorderTheme.top, RecorderTheme.middle, RecorderTheme.bottom],
            startPoint: .top,
            endPoint: .bottom
        )
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Walking Recorder")
                .font(.system(.largeTitle, design: .rounded, weight: .bold))
                .foregroundStyle(RecorderTheme.primaryText)
            Text("Tap what you’re doing. Tap the same card when you stop. Recording starts automatically.")
                .font(.body)
                .foregroundStyle(RecorderTheme.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
            Text("Linked background tests start in ExcerLock Trace Lab; this app records the honest foreground labels for them.")
        }
        .accessibilityElement(children: .combine)
    }

    private var previewBanner: some View {
        HStack(spacing: 12) {
            Image(systemName: "wrench.and.screwdriver.fill")
                .foregroundStyle(.white)
            Text("SIMULATED UI • NOT SENSOR EVIDENCE")
                .font(.caption.weight(.bold))
                .foregroundStyle(.white)
        }
        .padding(.horizontal, 16)
        .frame(minHeight: 44)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RecorderTheme.outline, in: Capsule())
        .accessibilityLabel("Simulated user interface preview. Not sensor evidence.")
    }

    @ViewBuilder
    private var permissionOrHealthCard: some View {
        if controller.isRecording {
            recordingHealthCard
        } else {
            readinessCard
        }
    }

    private var readinessCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            switch controller.readiness {
            case .ready:
                Label("Ready to record", systemImage: "checkmark.circle.fill")
                    .font(.headline)
                    .foregroundStyle(RecorderTheme.primaryText)
                Text("Live Motion & Fitness is available. Nothing is uploaded, and location, camera, microphone, and health history are not used.")
                    .font(.subheadline)
                    .foregroundStyle(RecorderTheme.secondaryText)
            case .needsPermission:
                Label("One permission, once", systemImage: "figure.walk.motion")
                    .font(.headline)
                    .foregroundStyle(RecorderTheme.primaryText)
                Text("Allow live Motion & Fitness so the recorder can save movement and step cadence. It will not read your past activity.")
                    .font(.subheadline)
                    .foregroundStyle(RecorderTheme.secondaryText)
                Button(controller.permissionRequestInFlight ? "Waiting for your choice…" : "Allow Motion & Fitness") {
                    controller.requestPermission()
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(controller.permissionRequestInFlight)
                .accessibilityHint("Shows the iOS Motion and Fitness permission prompt.")
            case .permissionDenied:
                Label("Motion & Fitness is off", systemImage: "exclamationmark.triangle.fill")
                    .font(.headline)
                    .foregroundStyle(RecorderTheme.primaryText)
                Text("No session can start until you allow Motion & Fitness in Settings. The recorder will never claim a capture succeeded without it.")
                    .font(.subheadline)
                    .foregroundStyle(RecorderTheme.secondaryText)
                Button("Open Settings") { controller.openSettings() }
                    .buttonStyle(PrimaryButtonStyle())
            case .permissionRestricted:
                Label("Recording is restricted", systemImage: "hand.raised.fill")
                    .font(.headline)
                    .foregroundStyle(RecorderTheme.primaryText)
                Text("This phone does not permit Motion & Fitness access. No recording will be created.")
                    .font(.subheadline)
                    .foregroundStyle(RecorderTheme.secondaryText)
            case .unsupported(let names):
                Label("Required sensors unavailable", systemImage: "sensor.tag.radiowaves.forward.fill")
                    .font(.headline)
                    .foregroundStyle(RecorderTheme.primaryText)
                Text(names.joined(separator: ", ").capitalized + ". No recording will be created on this device.")
                    .font(.subheadline)
                    .foregroundStyle(RecorderTheme.secondaryText)
            case .lowStorage:
                Label("More storage needed", systemImage: "externaldrive.badge.exclamationmark")
                    .font(.headline)
                    .foregroundStyle(RecorderTheme.primaryText)
                Text("Export and delete an older session before recording. A new session needs at least 300 MB free.")
                    .font(.subheadline)
                    .foregroundStyle(RecorderTheme.secondaryText)
            }
            if let notice = controller.notice {
                Divider().overlay(RecorderTheme.divider)
                Text(notice)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(RecorderTheme.error)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .recorderCard()
    }

    private var recordingHealthCard: some View {
        VStack(spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                Circle()
                    .fill(controller.isAppActive ? RecorderTheme.success : RecorderTheme.error)
                    .frame(width: 12, height: 12)
                    .padding(.top, 4)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 4) {
                    Text(controller.recordingHealthTitle)
                        .font(.headline)
                        .foregroundStyle(RecorderTheme.primaryText)
                    Text(controller.recordingHealthDetail)
                        .font(.subheadline)
                        .foregroundStyle(RecorderTheme.secondaryText)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer()
                Text(formatDuration(controller.sessionElapsedSeconds))
                    .font(.system(.title2, design: .monospaced, weight: .bold))
                    .foregroundStyle(RecorderTheme.orange)
                    .monospacedDigit()
                    .accessibilityLabel("Session time \(spokenDuration(controller.sessionElapsedSeconds))")
            }
            Divider().overlay(RecorderTheme.divider)
            HStack {
                Label("Detector: \(controller.walkingPhase.rawValue.capitalized)", systemImage: "waveform.path.ecg")
                Spacer()
                Text(controller.activeScenario == nil ? "Unlabeled transition" : "Label active")
            }
            .font(.caption.weight(.semibold))
            .foregroundStyle(RecorderTheme.secondaryText)
        }
        .recorderCard()
    }

    @ViewBuilder
    private var linkedTestSection: some View {
        if controller.isRecording, controller.linkedSessionID != nil {
            canaryCheckCard
        } else if let recovery = controller.pendingLinkedTraceRecovery {
            VStack(alignment: .leading, spacing: 12) {
                Label("Linked test needs finishing", systemImage: "arrow.clockwise.circle.fill")
                    .font(.headline)
                    .foregroundStyle(RecorderTheme.primaryText)
                Text("Test \(recovery.sessionId.prefix(8))… was recorded here, but ExcerLock Trace Lab has not saved its trace yet.")
                    .font(.subheadline)
                    .foregroundStyle(RecorderTheme.secondaryText)
                Text("Open Trace Lab to save it. The one-time link stays in a protected file, stays out of every export, and survives a relaunch until you clear it.")
                    .font(.caption)
                    .foregroundStyle(RecorderTheme.secondaryText)
                Button("Open Trace Lab to finish") { controller.openPendingLinkedTrace() }
                    .buttonStyle(PrimaryButtonStyle())
                if controller.linkedReminderRemovalRequested {
                    Text(RecorderLinkedReminderCopy.removeConfirmation)
                        .font(.caption)
                        .foregroundStyle(RecorderTheme.secondaryText)
                        .fixedSize(horizontal: false, vertical: true)
                    Button(RecorderLinkedReminderCopy.confirmAction) { controller.confirmLinkedReminderRemoval() }
                        .buttonStyle(SecondaryButtonStyle())
                    Button(RecorderLinkedReminderCopy.cancelAction) { controller.cancelLinkedReminderRemoval() }
                        .buttonStyle(SecondaryButtonStyle())
                } else {
                    Button(RecorderLinkedReminderCopy.removeAction) { controller.requestLinkedReminderRemoval() }
                        .buttonStyle(SecondaryButtonStyle())
                        .accessibilityHint("Shows a confirmation before the protected one-time link to Trace Lab is removed.")
                }
            }
            .recorderCard()
        }
    }

    /// One card, two inline questions, one obvious choice each: the only human
    /// observation the test needs, asked at the moment it happens.
    private var canaryCheckCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Canary check", systemImage: "shield.lefthalf.filled")
                .font(.headline)
                .foregroundStyle(RecorderTheme.primaryText)
            switch controller.canaryStep {
            case .walking:
                Text("1. While you are walking, open your canary app. ExcerLock releases the shield while you walk, so it should open. What did you see?")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(RecorderTheme.primaryText)
                    .fixedSize(horizontal: false, vertical: true)
                canaryChoices(phase: .walking, options: [
                    ("It opened normally", "app_opened"),
                    ("Blocked (shield shown)", "shield_visible"),
                    ("Did not try / not sure", "uncertain")
                ])
            case .stationary:
                Text("2. Stop walking and stand still for a full minute (longer than Trace Lab's stop grace), then open the canary app again. The shield should be back. What did you see?")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(RecorderTheme.primaryText)
                    .fixedSize(horizontal: false, vertical: true)
                canaryChoices(phase: .stationary, options: [
                    ("Blocked (shield shown)", "shield_visible"),
                    ("It opened normally", "app_opened"),
                    ("Did not try / not sure", "uncertain")
                ])
            case .recorded:
                Label("Both checks recorded", systemImage: "checkmark.circle.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(RecorderTheme.primaryText)
                Text(controller.canarySummary ?? "")
                    .font(.caption)
                    .foregroundStyle(RecorderTheme.secondaryText)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Text("Answer with what your eyes saw. Never select Walking Recorder or ExcerLock as the canary app.")
                .font(.caption)
                .foregroundStyle(RecorderTheme.secondaryText)
        }
        .recorderCard()
    }

    private func canaryChoices(phase: RecorderCanaryPhase, options: [(String, String)]) -> some View {
        VStack(spacing: 8) {
            ForEach(options, id: \.1) { option in
                Button(option.0) { controller.recordCanaryObservation(phase: phase, outcome: option.1) }
            }
        }
        .buttonStyle(CompactTestButtonStyle())
    }

    private var scenarioSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(controller.isRecording ? "What are you doing now?" : "Choose your activity")
                .font(.title3.weight(.semibold))
                .foregroundStyle(RecorderTheme.primaryText)
            if controller.isRecording, controller.linkedSessionID != nil, controller.activeScenario == nil {
                Text("Linked test recording. Tap what you are doing now — the background trace is already running.")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(RecorderTheme.primaryText)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(12)
                    .background(RecorderTheme.selected, in: RoundedRectangle(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(RecorderTheme.outline, lineWidth: 1))
            } else if controller.isRecording && controller.activeScenario == nil {
                Text("Still recording the transition. No stationary label is assumed. Choose the next activity or finish and save.")
                    .font(.subheadline)
                    .foregroundStyle(RecorderTheme.primaryText)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(12)
                    .background(RecorderTheme.selected, in: RoundedRectangle(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(RecorderTheme.outline, lineWidth: 1))
            }
            ForEach(GroundTruthScenario.allCases) { scenario in
                ScenarioButton(
                    scenario: scenario,
                    isActive: controller.activeScenario == scenario,
                    elapsedSeconds: controller.activeScenario == scenario ? controller.segmentElapsedSeconds : nil
                ) {
                    controller.tapScenario(scenario)
                }
            }
        }
    }

    private var savedSessionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Saved on this phone")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(RecorderTheme.primaryText)
                Spacer()
                if !controller.repository.sessions.isEmpty {
                    Text(ByteCountFormatter.string(fromByteCount: controller.repository.totalStoredBytes, countStyle: .file))
                        .font(.caption)
                        .foregroundStyle(RecorderTheme.secondaryText)
                }
            }
            if controller.repository.sessions.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "tray")
                        .font(.title2)
                        .foregroundStyle(RecorderTheme.orange)
                    Text("Your finished sessions will appear here, ready to share.")
                        .font(.subheadline)
                        .foregroundStyle(RecorderTheme.secondaryText)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .recorderCard()
            } else {
                ForEach(controller.repository.sessions) { session in
                    SessionCard(
                        session: session,
                        isExporting: controller.exportingSessionID == session.id,
                        export: { controller.prepareExport(session) },
                        delete: { pendingDelete = session }
                    )
                }
            }
        }
    }

    private var finishBar: some View {
        VStack(spacing: 0) {
            LinearGradient(
                colors: [RecorderTheme.bottom.opacity(0), RecorderTheme.bottom],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 20)
            Button(controller.isRecording && controller.linkedSessionID != nil ? "Finish test" : "Finish & Save") { controller.finishAndSave() }
                .buttonStyle(PrimaryButtonStyle())
                .padding(.horizontal, 20)
                .padding(.bottom, 8)
                .background(RecorderTheme.bottom)
                .accessibilityHint("Ends any active label, stops all live sensors, and saves the local session.")
        }
    }

    private func formatDuration(_ seconds: TimeInterval) -> String {
        let whole = max(0, Int(seconds))
        return String(format: "%02d:%02d", whole / 60, whole % 60)
    }

    private func spokenDuration(_ seconds: TimeInterval) -> String {
        let whole = max(0, Int(seconds))
        return "\(whole / 60) minutes, \(whole % 60) seconds"
    }
}

private struct ScenarioButton: View {
    let scenario: GroundTruthScenario
    let isActive: Bool
    let elapsedSeconds: TimeInterval?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                Image(systemName: isActive ? "stop.fill" : scenario.symbol)
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(isActive ? .white : RecorderTheme.orange)
                    .frame(width: 32, height: 32)
                VStack(alignment: .leading, spacing: 4) {
                    Text(isActive ? scenario.stopAction : scenario.startAction)
                        .font(.headline)
                        .foregroundStyle(isActive ? .white : RecorderTheme.primaryText)
                    Text(isActive ? "Tap when this activity ends" : scenario.guidance)
                        .font(.subheadline)
                        .foregroundStyle(isActive ? Color.white.opacity(0.86) : RecorderTheme.secondaryText)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 8)
                if let elapsedSeconds {
                    Text(formatDuration(elapsedSeconds))
                        .font(.system(.body, design: .monospaced, weight: .bold))
                        .foregroundStyle(.white)
                        .monospacedDigit()
                } else {
                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(RecorderTheme.secondaryText)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, minHeight: 84, alignment: .leading)
            .background(isActive ? RecorderTheme.orange : RecorderTheme.card)
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(isActive ? RecorderTheme.orange : RecorderTheme.outline, lineWidth: 1)
            )
            .contentShape(RoundedRectangle(cornerRadius: 20))
        }
        .buttonStyle(ScalePressStyle())
        .accessibilityLabel(isActive ? scenario.stopAction : scenario.startAction)
        .accessibilityValue(isActive ? "Active for \(formatDuration(elapsedSeconds ?? 0))" : "Not active")
        .accessibilityHint(isActive ? "Stops this label while sensor recording continues." : "Starts this label and automatically begins recording if needed.")
    }

    private func formatDuration(_ seconds: TimeInterval) -> String {
        let whole = max(0, Int(seconds))
        return String(format: "%02d:%02d", whole / 60, whole % 60)
    }
}

private struct SessionCard: View {
    let session: SessionSummary
    let isExporting: Bool
    let export: () -> Void
    let delete: () -> Void

    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(Self.dateFormatter.string(from: Date(timeIntervalSince1970: Double(session.startedAt.wallTimeMs) / 1_000)))
                        .font(.headline)
                        .foregroundStyle(RecorderTheme.primaryText)
                    Text("\(formatDuration(session.durationSeconds)) • \(session.segmentCount) segment\(session.segmentCount == 1 ? "" : "s") • \(ByteCountFormatter.string(fromByteCount: session.byteCount, countStyle: .file))")
                        .font(.subheadline)
                        .foregroundStyle(RecorderTheme.secondaryText)
                }
                Spacer()
                Text(session.status.rawValue.replacingOccurrences(of: "Limit", with: " limit").capitalized)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(session.status == .completed ? RecorderTheme.primaryText : RecorderTheme.error)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(RecorderTheme.solid, in: Capsule())
                    .overlay(Capsule().stroke(RecorderTheme.outline, lineWidth: 1))
            }
            HStack(spacing: 12) {
                Button(action: export) {
                    Label(isExporting ? "Preparing…" : "Share archive", systemImage: "square.and.arrow.up")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SecondaryButtonStyle())
                .disabled(isExporting)
                Button(action: delete) {
                    Image(systemName: "trash")
                        .frame(width: 52, height: 52)
                }
                .buttonStyle(SecondaryButtonStyle())
                .accessibilityLabel("Delete session")
            }
        }
        .recorderCard()
    }

    private func formatDuration(_ seconds: TimeInterval) -> String {
        let whole = max(0, Int(seconds))
        return "\(whole / 60)m \(whole % 60)s"
    }
}

private struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: 54)
            .padding(.horizontal, 20)
            .background(configuration.isPressed ? RecorderTheme.orangePressed : RecorderTheme.orange, in: Capsule())
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.1), value: configuration.isPressed)
    }
}

private struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(RecorderTheme.primaryText)
            .frame(minHeight: 52)
            .padding(.horizontal, 12)
            .background(configuration.isPressed ? RecorderTheme.selected : RecorderTheme.solid, in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(RecorderTheme.outline, lineWidth: 1))
    }
}

private struct CompactTestButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.caption.weight(.semibold))
            .foregroundStyle(RecorderTheme.primaryText)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity, minHeight: 48)
            .padding(.horizontal, 6)
            .background(configuration.isPressed ? RecorderTheme.selected : RecorderTheme.solid, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(RecorderTheme.outline, lineWidth: 1))
    }
}

private struct ScalePressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.1), value: configuration.isPressed)
    }
}

private extension View {
    func recorderCard() -> some View {
        self
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RecorderTheme.card, in: RoundedRectangle(cornerRadius: 20))
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(RecorderTheme.outline, lineWidth: 1))
    }
}

private struct ActivityShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
