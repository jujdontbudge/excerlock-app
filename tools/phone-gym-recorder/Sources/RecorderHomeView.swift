import SwiftUI
import UIKit

enum RecorderTheme {
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

struct GymRecorderHomeView: View {
    @ObservedObject var controller: CaptureController
    @Environment(\.scenePhase) private var scenePhase

    @State private var shareURL: URL?
    @State private var pendingDelete: SessionSummary?
    @State private var showMore = false
    @State private var showGymPicker = false
    @State private var showActions = false
    @State private var showBackdate = false
    @State private var showNote = false
    @State private var noteText = ""
    @State private var startPlace: GymPlaceLabel = .away
    @State private var selectedScenarioId: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16) {
                    if controller.isRecording {
                        recordingSection
                    } else {
                        homeSection
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 40)
            }
            .background(backgroundGradient.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
        }
        .tint(RecorderTheme.orange)
        .onChange(of: scenePhase) { _, phase in
            controller.noteScenePhase(Self.name(for: phase))
        }
        .onAppear { UIApplication.shared.isIdleTimerDisabled = controller.isRecording }
        .onChange(of: controller.isRecording) { _, recording in UIApplication.shared.isIdleTimerDisabled = recording }
        .sheet(isPresented: $showMore) {
            MoreSheet(
                controller: controller,
                selectedScenarioId: $selectedScenarioId,
                shareURL: $shareURL,
                pendingDelete: $pendingDelete,
                showActions: $showActions,
                showBackdate: $showBackdate,
                showNote: $showNote
            )
        }
        .sheet(isPresented: $showGymPicker) { GymPickerView(controller: controller) }
        .sheet(isPresented: $showActions) { ExcerLockActionsSheet(controller: controller) }
        .sheet(isPresented: $showBackdate) { BackdateSheet(controller: controller) }
        .sheet(isPresented: $showNote) { NoteSheet(controller: controller, text: $noteText) }
        .sheet(isPresented: Binding(get: { shareURL != nil }, set: { if !$0 { shareURL = nil } })) {
            if let shareURL {
                ActivityShareSheet(items: [shareURL]).presentationDetents([.medium, .large])
            }
        }
        .alert("Delete this saved session?", isPresented: Binding(
            get: { pendingDelete != nil },
            set: { if !$0 { pendingDelete = nil } }
        )) {
            Button("Cancel", role: .cancel) { pendingDelete = nil }
            Button("Delete", role: .destructive) {
                if let session = pendingDelete {
                    try? controller.repository.delete(session)
                }
                pendingDelete = nil
            }
        } message: {
            Text("This removes the local recording from this phone. Export it first if you want to keep it.")
        }
    }

    static func name(for phase: ScenePhase) -> String {
        switch phase {
        case .active: return "active"
        case .inactive: return "inactive"
        case .background: return "background"
        @unknown default: return "unknown"
        }
    }

    private var backgroundGradient: LinearGradient {
        LinearGradient(colors: [RecorderTheme.top, RecorderTheme.middle, RecorderTheme.bottom], startPoint: .top, endPoint: .bottom)
    }

    // MARK: Home

    private var header: some View {
        Text("Gym Recorder")
            .font(.system(.largeTitle, design: .rounded, weight: .bold))
            .foregroundStyle(RecorderTheme.primaryText)
    }

    /// The happy path is three giant buttons in order: allow, set the gym,
    /// start. Only the next one is orange; the others wait below it.
    @ViewBuilder
    private var homeSection: some View {
        header
        if let action = controller.nextPermissionAction {
            giantButton(action.title, symbol: "location.fill", primary: true, action: action.run)
        }
        gymButton
        giantButton("Start", symbol: "record.circle", primary: controller.canStart && controller.nextPermissionAction == nil) {
            controller.startSession(scenarioId: selectedScenarioId, startPlace: .away)
        }
        .disabled(!controller.canStart)
        if let scenario = controller.catalog.scenario(id: selectedScenarioId) {
            HStack {
                Text("Script \(scenario.id) · \(scenario.title)")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(RecorderTheme.primaryText)
                Spacer()
                Button("Clear") { selectedScenarioId = nil }
                    .font(.footnote)
                    .foregroundStyle(RecorderTheme.secondaryText)
            }
            .padding(.horizontal, 4)
        }
        if let last = controller.repository.sessions.first {
            lastRecordingRow(last)
        }
        Spacer(minLength: 24)
        moreLink
    }

    /// Opens the map picker (search, pin, radius, "I'm here"), the same way a
    /// gym is set in ExcerLock. Once set, the button shows the circle and
    /// re-opens the picker on that circle.
    private var gymButton: some View {
        let gym = controller.registry.gymUnderTest
        let needsPermission = controller.nextPermissionAction != nil
        return VStack(spacing: 6) {
            giantButton(gym == nil ? "Set the gym" : "Gym set ✓", symbol: gym == nil ? "mappin.and.ellipse" : "checkmark.circle.fill", primary: gym == nil && !needsPermission) {
                showGymPicker = true
            }
            if let gym {
                Text("\(gym.name) · \(Int(gym.radiusMeters)) m · tap to change")
                    .font(.footnote)
                    .foregroundStyle(RecorderTheme.secondaryText)
                    .multilineTextAlignment(.center)
            }
        }
    }

    private func lastRecordingRow(_ session: SessionSummary) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Last recording")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(RecorderTheme.primaryText)
                Text("\(SessionCard.dateFormatter.string(from: Date(timeIntervalSince1970: Double(session.startedAt.wallTimeMs) / 1_000))) · \(SessionCard.formatDuration(session.durationSeconds))")
                    .font(.caption)
                    .foregroundStyle(RecorderTheme.secondaryText)
            }
            Spacer()
            Button("Share") { shareURL = try? controller.repository.export(session) }
                .buttonStyle(SecondaryButtonStyle())
        }
        .padding(16)
        .background(RecorderTheme.card, in: RoundedRectangle(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(RecorderTheme.outline, lineWidth: 1))
    }

    private var moreLink: some View {
        HStack {
            Spacer()
            Button {
                showMore = true
            } label: {
                Label("More", systemImage: "ellipsis.circle")
                    .font(.footnote)
                    .foregroundStyle(RecorderTheme.secondaryText)
            }
            Spacer()
        }
    }

    /// A button a toddler can hit: full width, 96 pt tall, one or two words.
    private func giantButton(_ title: String, symbol: String, primary: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: symbol).font(.system(size: 30, weight: .bold))
                Text(title).font(.system(size: 30, weight: .bold, design: .rounded))
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, minHeight: 96)
            .padding(.horizontal, 20)
        }
        .buttonStyle(GiantButtonStyle(primary: primary))
    }

    // MARK: Recording

    private var recordingSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            statusHeader
            if controller.scenarioId != nil {
                scriptStrip
            }
            placeButton(.inGym, title: "I'm in")
            placeButton(.away, title: "I'm out")
            if !controller.activePlace.isPrimaryPlace {
                placeButton(controller.activePlace, title: controller.activePlace.title)
            }
            giantButton("Finish", symbol: "stop.circle.fill", primary: true) { controller.finish() }
            if let note = controller.finishNote {
                Text(note).font(.footnote).foregroundStyle(RecorderTheme.secondaryText)
            }
            moreLink
        }
    }

    private var statusHeader: some View {
        VStack(alignment: .center, spacing: 6) {
            Text(controller.status.presence)
                .font(.system(size: 44, weight: .heavy, design: .rounded))
                .foregroundStyle(RecorderTheme.primaryText)
            // The one hero metric: the live distance is the only orange text.
            Text(controller.status.distanceLine)
                .font(.system(size: 30, weight: .bold, design: .rounded))
                .foregroundStyle(RecorderTheme.orange)
            HStack(spacing: 8) {
                Circle()
                    .fill(controller.status.streamIsLive ? RecorderTheme.success : RecorderTheme.secondaryText)
                    .frame(width: 8, height: 8)
                Text("\(controller.status.reducerLine) · \(controller.status.activityLine)")
                    .font(.caption)
                    .foregroundStyle(RecorderTheme.secondaryText)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(18)
        .background(RecorderTheme.card, in: RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(RecorderTheme.outline, lineWidth: 1))
    }

    private var scriptStrip: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let scenario = controller.currentScenario, let step = controller.currentStep {
                Text("\(scenario.id) \(scenario.title) · step \(controller.stepIndex + 1) of \(scenario.steps.count)")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(RecorderTheme.secondaryText)
                Text(step.text)
                    .font(.headline)
                    .foregroundStyle(RecorderTheme.primaryText)
                    .fixedSize(horizontal: false, vertical: true)
                if step.expectsPlaceTap {
                    Text("Tap “\(step.place?.title ?? "")” when you are there.")
                        .font(.subheadline)
                        .foregroundStyle(RecorderTheme.secondaryText)
                } else {
                    Button("Done") { controller.acknowledgeCurrentStep() }
                        .buttonStyle(SecondaryButtonStyle())
                }
            } else {
                Text("All scripted steps acknowledged.")
                    .font(.subheadline)
                    .foregroundStyle(RecorderTheme.secondaryText)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(RecorderTheme.solid, in: RoundedRectangle(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(RecorderTheme.outline, lineWidth: 1))
    }

    /// One giant radio-style place button; the active one is filled orange.
    private func placeButton(_ place: GymPlaceLabel, title: String) -> some View {
        let isActive = controller.activePlace == place
        return Button {
            controller.setPlace(place)
        } label: {
            HStack(spacing: 14) {
                Image(systemName: place.symbol).font(.system(size: 30, weight: .bold))
                Text(title).font(.system(size: 30, weight: .bold, design: .rounded))
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
                Spacer()
                Image(systemName: isActive ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 28))
            }
            .frame(maxWidth: .infinity, minHeight: 96)
            .padding(.horizontal, 20)
        }
        .buttonStyle(GiantButtonStyle(primary: isActive))
    }

    // MARK: Sheets

    /// Everything the lab can do that a person at a gym does not need on the
    /// happy path: scripts, the circle's numbers, ExcerLock declarations, the
    /// rarer places, observations, probes and saved recordings.
    private struct MoreSheet: View {
        @ObservedObject var controller: CaptureController
        @Binding var selectedScenarioId: String?
        @Binding var shareURL: URL?
        @Binding var pendingDelete: SessionSummary?
        @Binding var showActions: Bool
        @Binding var showBackdate: Bool
        @Binding var showNote: Bool
        @Environment(\.dismiss) private var dismiss

        var body: some View {
            NavigationStack {
                List {
                    if controller.isRecording {
                        recordingSections
                    } else {
                        setupSections
                    }
                    Section("Permissions") {
                        LabeledContent("Location", value: controller.locationPermissionTitle)
                        LabeledContent("Precise location", value: controller.precisionTitle)
                        LabeledContent("Motion & Fitness", value: controller.motionPermissionTitle)
                        Button("Open Settings") { CaptureController.openSettings() }
                    }
                    Section("Saved on this phone") {
                        if controller.repository.sessions.isEmpty {
                            Text("Nothing saved yet.").foregroundStyle(RecorderTheme.secondaryText)
                        }
                        ForEach(controller.repository.sessions) { session in
                            SessionCard(
                                session: session,
                                export: {
                                    shareURL = try? controller.repository.export(session)
                                    dismiss()
                                },
                                delete: {
                                    pendingDelete = session
                                    dismiss()
                                }
                            )
                            .listRowInsets(EdgeInsets())
                            .listRowBackground(Color.clear)
                        }
                    }
                }
                .navigationTitle("More")
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
                .tint(RecorderTheme.orange)
            }
        }

        @ViewBuilder
        private var setupSections: some View {
            Section {
                NavigationLink {
                    ScriptPickerSheet(controller: controller, selectedScenarioId: $selectedScenarioId)
                } label: {
                    LabeledContent("Run a script", value: controller.catalog.scenario(id: selectedScenarioId).map(\.id) ?? "Free session")
                }
                NavigationLink {
                    GymSetupSheet(controller: controller)
                } label: {
                    LabeledContent("Gym circle", value: controller.registry.gymUnderTest.map { "\(Int($0.radiusMeters)) m" } ?? "not set")
                }
                NavigationLink {
                    ExcerLockSetupSheet(controller: controller)
                } label: {
                    LabeledContent("ExcerLock setup", value: controller.setup.isComplete ? "declared" : "not declared")
                }
            }
        }

        @ViewBuilder
        private var recordingSections: some View {
            Section("Other places") {
                ForEach([GymPlaceLabel.onBoundary, .inCircleNotGym, .passingBy], id: \.self) { place in
                    Button {
                        controller.setPlace(place)
                        dismiss()
                    } label: {
                        Label {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(place.title)
                                Text(place.guidance).font(.caption).foregroundStyle(RecorderTheme.secondaryText)
                            }
                        } icon: {
                            Image(systemName: controller.activePlace == place ? "checkmark.circle.fill" : place.symbol)
                        }
                    }
                }
            }
            Section("ExcerLock shows…") {
                ForEach(ObserverCard.allCases, id: \.self) { card in
                    Button("Card: \(card.title)") {
                        controller.observeExcerLock(card: card, lock: .cannotTell)
                        dismiss()
                    }
                }
                ForEach(ObserverLock.allCases, id: \.self) { lock in
                    Button("Locked app: \(lock.title)") {
                        controller.observeExcerLock(card: .cannotTell, lock: lock)
                        dismiss()
                    }
                }
            }
            Section("Opened a locked app on purpose?") {
                ForEach(CanaryOutcome.allCases, id: \.self) { outcome in
                    Button(outcome.title) {
                        controller.recordCanary(outcome)
                        dismiss()
                    }
                }
            }
            Section("Lab actions") {
                Button("Probe check-in") { controller.probeCheckIn(); dismiss() }
                Button("Probe re-register") { controller.reregisterRegions(); dismiss() }
                Button("I did this in ExcerLock…") { dismiss(); showActions = true }
                Button("Oops, I forgot a tap") { dismiss(); showBackdate = true }
                Button("Add a note") { dismiss(); showNote = true }
            }
        }
    }

    private struct ScriptPickerSheet: View {
        @ObservedObject var controller: CaptureController
        @Binding var selectedScenarioId: String?
        @Environment(\.dismiss) private var dismiss

        var body: some View {
            List {
                Section {
                    Button {
                        selectedScenarioId = nil
                        dismiss()
                    } label: {
                        row(title: "Free session", subtitle: "Anything goes", selected: selectedScenarioId == nil)
                    }
                }
                Section("Scripts") {
                    ForEach(controller.catalog.scenarios) { scenario in
                        Button {
                            selectedScenarioId = scenario.id
                            dismiss()
                        } label: {
                            row(
                                title: "\(scenario.id) \(scenario.title)",
                                subtitle: scenario.captainWords ?? scenario.mode,
                                selected: selectedScenarioId == scenario.id
                            )
                        }
                    }
                }
            }
            .navigationTitle("Run a script")
        }

        private func row(title: String, subtitle: String, selected: Bool) -> some View {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).foregroundStyle(RecorderTheme.primaryText)
                    Text(subtitle).font(.caption).foregroundStyle(RecorderTheme.secondaryText)
                }
                Spacer()
                if selected { Image(systemName: "checkmark").foregroundStyle(RecorderTheme.orange) }
            }
        }
    }

    private struct ExcerLockSetupSheet: View {
        @ObservedObject var controller: CaptureController
        @Environment(\.dismiss) private var dismiss

        var body: some View {
            Form {
                Section {
                    Toggle("The same gym circle is saved in ExcerLock", isOn: binding(\.sameGymSaved))
                    Toggle("Auto-detect is on in ExcerLock", isOn: binding(\.autoDetectOn))
                }
                Section {
                    picker("ExcerLock permission", options: ["unknown", "whenInUse", "always", "denied"], keyPath: \.locationPermission)
                    picker("Precise location", options: ["unknown", "true", "false"], keyPath: \.preciseLocation)
                    picker("Build", options: ["unknown", "production", "traceLab"], keyPath: \.buildKind)
                } footer: {
                    Text("ExcerLock cannot be read by this app, so these are your declarations. They are recorded with the session.")
                }
            }
            .navigationTitle("ExcerLock setup")
        }

        private func binding(_ keyPath: WritableKeyPath<ExcerLockSetupDeclaration, Bool>) -> Binding<Bool> {
            Binding(
                get: { controller.setup[keyPath: keyPath] },
                set: { value in
                    var setup = controller.setup
                    setup[keyPath: keyPath] = value
                    controller.updateSetup(setup)
                }
            )
        }

        private func picker(_ title: String, options: [String], keyPath: WritableKeyPath<ExcerLockSetupDeclaration, String>) -> some View {
            Picker(title, selection: Binding(
                get: { controller.setup[keyPath: keyPath] },
                set: { value in
                    var setup = controller.setup
                    setup[keyPath: keyPath] = value
                    controller.updateSetup(setup)
                }
            )) {
                ForEach(options, id: \.self) { Text($0).tag($0) }
            }
        }
    }

    /// The saved circles: which one is under test, its radius, and deleting.
    /// Setting a circle happens on Home through the map picker.
    private struct GymSetupSheet: View {
        @ObservedObject var controller: CaptureController

        var body: some View {
            Form {
                if let gym = controller.registry.gymUnderTest {
                    Section("Radius") {
                        Stepper(
                            "\(Int(gym.radiusMeters)) m",
                            value: Binding(
                                get: { gym.radiusMeters },
                                set: { controller.registry.updateRadius(id: gym.id, radiusMeters: $0) }
                            ),
                            in: gymRadiusMinimumMeters...gymRadiusMaximumMeters,
                            step: gymRadiusStepMeters
                        )
                    }
                }
                Section("Saved circles") {
                    if controller.registry.gyms.isEmpty {
                        Text("None yet. Tap Set the gym on Home.").foregroundStyle(RecorderTheme.secondaryText)
                    }
                    ForEach(controller.registry.gyms) { gym in
                        VStack(alignment: .leading, spacing: 4) {
                            Text("\(gym.name)\(gym.isUnderTest ? " · under test" : "")")
                            Text("\(Int(gym.radiusMeters)) m · \(String(format: "%.5f", gym.latitude)), \(String(format: "%.5f", gym.longitude)) · \(gym.setBy.replacingOccurrences(of: "_", with: " "))")
                                .font(.caption)
                                .foregroundStyle(RecorderTheme.secondaryText)
                        }
                        .contentShape(Rectangle())
                        .onTapGesture { controller.registry.markUnderTest(id: gym.id) }
                    }
                    .onDelete { indexSet in
                        for index in indexSet { controller.registry.remove(id: controller.registry.gyms[index].id) }
                    }
                }
            }
            .navigationTitle("Gym circle")
        }
    }

    private struct ExcerLockActionsSheet: View {
        @ObservedObject var controller: CaptureController
        @Environment(\.dismiss) private var dismiss

        var body: some View {
            NavigationStack {
                List {
                    ForEach(ExcerLockAction.allCases, id: \.self) { action in
                        Button(action.title) {
                            controller.recordAction(action)
                            dismiss()
                        }
                    }
                }
                .navigationTitle("What did you do in ExcerLock?")
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
            }
        }
    }

    private struct BackdateSheet: View {
        @ObservedObject var controller: CaptureController
        @Environment(\.dismiss) private var dismiss
        @State private var place: GymPlaceLabel = .inGym
        @State private var offset: Double = 30

        var body: some View {
            NavigationStack {
                Form {
                    Picker("Where were you?", selection: $place) {
                        ForEach(GymPlaceLabel.allCases) { Text($0.title).tag($0) }
                    }
                    Picker("About how long ago?", selection: $offset) {
                        Text("30 seconds").tag(30.0)
                        Text("1 minute").tag(60.0)
                        Text("2 minutes").tag(120.0)
                        Text("5 minutes").tag(300.0)
                    }
                    Section {
                        Button("Save the missed tap") {
                            controller.recordBackdatedPlace(place, offsetSeconds: offset)
                            dismiss()
                        }
                        Text("The boundary is placed at now − \(Int(offset)) s and marked approximate, so the verdict line will say so.")
                            .font(.caption)
                    }
                }
                .navigationTitle("A tap I forgot")
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
            }
        }
    }

    private struct NoteSheet: View {
        @ObservedObject var controller: CaptureController
        @Binding var text: String
        @Environment(\.dismiss) private var dismiss

        var body: some View {
            NavigationStack {
                Form {
                    TextField("One line, for example the day-boundary time", text: $text, axis: .vertical)
                    Button("Save note") {
                        controller.addLabelNote(text)
                        dismiss()
                    }
                }
                .navigationTitle("Note")
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
            }
        }
    }
}

// MARK: - Small components

private func compactButton(_ title: String, action: @escaping () -> Void) -> some View {
    Button(action: action) {
        Text(title)
            .font(.caption.weight(.semibold))
            .foregroundStyle(RecorderTheme.primaryText)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity, minHeight: 46)
            .padding(.horizontal, 6)
            .background(RecorderTheme.solid, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(RecorderTheme.outline, lineWidth: 1))
    }
    .buttonStyle(ScalePressStyle())
}

private struct SessionCard: View {
    let session: SessionSummary
    let export: () -> Void
    let delete: () -> Void

    static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(Self.dateFormatter.string(from: Date(timeIntervalSince1970: Double(session.startedAt.wallTimeMs) / 1_000)))
                        .font(.headline)
                        .foregroundStyle(RecorderTheme.primaryText)
                    Text("\(session.scenarioId ?? "free") · \(Self.formatDuration(session.durationSeconds)) · \(session.eventCount) events · \(ByteCountFormatter.string(fromByteCount: session.byteCount, countStyle: .file))")
                        .font(.subheadline)
                        .foregroundStyle(RecorderTheme.secondaryText)
                    if !session.placeCounts.isEmpty {
                        Text(session.placeCountsDescription)
                            .font(.caption)
                            .foregroundStyle(RecorderTheme.secondaryText)
                    }
                    if let streams = session.streams {
                        Text("coverage: " + streams.sampleCounts.keys.sorted().map { "\($0) \(streams.sampleCounts[$0] ?? 0)" }.joined(separator: " · "))
                            .font(.caption)
                            .foregroundStyle(RecorderTheme.secondaryText)
                    }
                }
                Spacer()
                Text(session.status.rawValue.replacingOccurrences(of: "Limit", with: " limit").capitalized)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(session.status == .completed ? RecorderTheme.primaryText : RecorderTheme.error)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(RecorderTheme.solid, in: Capsule())
            }
            HStack(spacing: 10) {
                Button("Share archive", action: export).buttonStyle(SecondaryButtonStyle())
                Button("Delete", action: delete).buttonStyle(SecondaryButtonStyle())
            }
        }
        .padding(16)
        .background(RecorderTheme.card, in: RoundedRectangle(cornerRadius: 18))
    }

    static func formatDuration(_ seconds: TimeInterval) -> String {
        let total = Int(seconds.rounded())
        if total >= 3_600 { return "\(total / 3_600) h \((total % 3_600) / 60) min" }
        if total >= 60 { return "\(total / 60) min \(total % 60) s" }
        return "\(total) s"
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

/// Full-width, 96 pt, orange when it is the next thing to do; outlined otherwise.
private struct GiantButtonStyle: ButtonStyle {
    let primary: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(primary ? .white : RecorderTheme.primaryText)
            .background(
                primary ? (configuration.isPressed ? RecorderTheme.orangePressed : RecorderTheme.orange)
                    : (configuration.isPressed ? RecorderTheme.selected : RecorderTheme.solid),
                in: RoundedRectangle(cornerRadius: 24)
            )
            .overlay(RoundedRectangle(cornerRadius: 24).stroke(RecorderTheme.outline, lineWidth: primary ? 0 : 1))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.1), value: configuration.isPressed)
    }
}

private struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(RecorderTheme.primaryText)
            .frame(minHeight: 48)
            .padding(.horizontal, 12)
            .background(configuration.isPressed ? RecorderTheme.selected : RecorderTheme.solid, in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(RecorderTheme.outline, lineWidth: 1))
    }
}

private struct ScalePressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.1), value: configuration.isPressed)
    }
}

struct ActivityShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
