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
    @State private var showGymSetup = false
    @State private var showActions = false
    @State private var showBackdate = false
    @State private var showNote = false
    @State private var showBackdatePlace: GymPlaceLabel = .inGym
    @State private var noteText = ""
    @State private var startPlace: GymPlaceLabel = .away

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16) {
                    if controller.isRecording {
                        recordingSection
                    } else {
                        header
                        permissionsCard
                        gymCard
                        scenarioSection
                        setupChecklist
                        savedSessionsSection
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, controller.isRecording ? 120 : 40)
            }
            .background(backgroundGradient.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
        }
        .tint(RecorderTheme.orange)
        .onChange(of: scenePhase) { _, phase in
            controller.noteScenePhase(Self.name(for: phase))
        }
        .onAppear { UIApplication.shared.isIdleTimerDisabled = controller.isRecording }
        .sheet(isPresented: $showGymSetup) { GymSetupSheet(controller: controller) }
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
        VStack(alignment: .leading, spacing: 8) {
            Text("Gym Recorder")
                .font(.system(.largeTitle, design: .rounded, weight: .bold))
                .foregroundStyle(RecorderTheme.primaryText)
            Text("Record beside ExcerLock and tap where you are. One tap per place change; the strip tells you the next one.")
                .font(.body)
                .foregroundStyle(RecorderTheme.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
            Text("This app records your own labels, the location stream your phone delivers, and what it thinks the production gym reducer would decide. It never drives ExcerLock.")
                .font(.footnote)
                .foregroundStyle(RecorderTheme.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
    }

    private var permissionsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Permissions")
                .font(.headline)
                .foregroundStyle(RecorderTheme.primaryText)
            statusRow(
                title: "Location",
                value: controller.locationPermissionTitle,
                ok: controller.locationPermissionIsUsable
            )
            statusRow(
                title: "Precise location",
                value: controller.precisionTitle,
                ok: controller.precisionIsFull
            )
            statusRow(
                title: "Motion & Fitness",
                value: controller.motionPermissionTitle,
                ok: controller.motionPermissionIsUsable
            )
            HStack(spacing: 10) {
                Button("Allow location") { controller.requestLocationPermission() }
                    .buttonStyle(SecondaryButtonStyle())
                Button("Allow Motion") { controller.requestMotionPermission() }
                    .buttonStyle(SecondaryButtonStyle())
            }
            if let reason = controller.startBlockedReason, !controller.isRecording {
                Text(reason)
                    .font(.footnote)
                    .foregroundStyle(RecorderTheme.error)
            }
            Text("Recording under any permission state is allowed on purpose: the denied and approximate scenarios exist to be judged.")
                .font(.caption)
                .foregroundStyle(RecorderTheme.secondaryText)
        }
        .padding(16)
        .background(RecorderTheme.card, in: RoundedRectangle(cornerRadius: 20))
    }

    private func statusRow(title: String, value: String, ok: Bool) -> some View {
        HStack {
            Image(systemName: ok ? "checkmark.circle.fill" : "exclamationmark.circle")
                .foregroundStyle(ok ? RecorderTheme.success : RecorderTheme.error)
            Text(title).font(.subheadline).foregroundStyle(RecorderTheme.primaryText)
            Spacer()
            Text(value).font(.subheadline.weight(.semibold)).foregroundStyle(RecorderTheme.secondaryText)
        }
    }

    private var gymCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("The circle under test")
                .font(.headline)
                .foregroundStyle(RecorderTheme.primaryText)
            if let gym = controller.registry.gymUnderTest {
                Text("\(gym.name) · \(Int(gym.radiusMeters)) m radius")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(RecorderTheme.primaryText)
                Text("\(String(format: "%.5f", gym.latitude)), \(String(format: "%.5f", gym.longitude))")
                    .font(.footnote.monospaced())
                    .foregroundStyle(RecorderTheme.secondaryText)
                Text("Set by \(gym.setBy.replacingOccurrences(of: "_", with: " "))" + (gym.averageAccuracyM.map { String(format: " · averaged accuracy %.0f m over %d fixes", $0, gym.fixesAveraged) } ?? ""))
                    .font(.caption)
                    .foregroundStyle(RecorderTheme.secondaryText)
                HStack(spacing: 10) {
                    Button("−10 m") { controller.registry.updateRadius(id: gym.id, radiusMeters: gym.radiusMeters - 10) }
                        .buttonStyle(SecondaryButtonStyle())
                    Button("+10 m") { controller.registry.updateRadius(id: gym.id, radiusMeters: gym.radiusMeters + 10) }
                        .buttonStyle(SecondaryButtonStyle())
                }
            } else {
                Text("No circle yet. Stand at the gym entrance and use Set gym here, or type the coordinates.")
                    .font(.subheadline)
                    .foregroundStyle(RecorderTheme.secondaryText)
            }
            Button(controller.registry.gyms.isEmpty ? "Set gym here" : "Add or change the circle") { showGymSetup = true }
                .buttonStyle(SecondaryButtonStyle())
        }
        .padding(16)
        .background(RecorderTheme.card, in: RoundedRectangle(cornerRadius: 20))
    }

    private var scenarioSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("What are you testing?")
                .font(.headline)
                .foregroundStyle(RecorderTheme.primaryText)
            Text("Free session is at the top. Picking a script shows its steps here and in the strip while you record.")
                .font(.caption)
                .foregroundStyle(RecorderTheme.secondaryText)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    scenarioChip(id: nil, title: "Free session", subtitle: "Anything goes")
                    ForEach(controller.catalog.scenarios) { scenario in
                        scenarioChip(id: scenario.id, title: "\(scenario.id) \(scenario.title)", subtitle: shortScript(for: scenario))
                    }
                }
                .padding(.vertical, 2)
            }
            if let scenario = controller.catalog.scenario(id: selectedScenarioId) {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(scenario.steps) { step in
                        Text("• \(step.text)")
                            .font(.footnote)
                            .foregroundStyle(RecorderTheme.secondaryText)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    Text("Expect: \(scenario.refExpectation)")
                        .font(.caption)
                        .foregroundStyle(RecorderTheme.secondaryText)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            Text("Where are you right now?")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(RecorderTheme.primaryText)
            placeChips(selection: $startPlace)
            Button("Start recording") { controller.startSession(scenarioId: selectedScenarioId, startPlace: startPlace) }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(!controller.canStart)
        }
        .padding(16)
        .background(RecorderTheme.card, in: RoundedRectangle(cornerRadius: 20))
    }

    @State private var selectedScenarioId: String?

    private func shortScript(for scenario: GymScenario) -> String {
        scenario.captainWords ?? scenario.mode
    }

    private func scenarioChip(id: String?, title: String, subtitle: String) -> some View {
        let isSelected = selectedScenarioId == id
        return Button {
            selectedScenarioId = id
        } label: {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.footnote.weight(.semibold)).foregroundStyle(RecorderTheme.primaryText)
                Text(subtitle).font(.caption2).foregroundStyle(RecorderTheme.secondaryText)
            }
            .padding(10)
            .frame(minWidth: 130, alignment: .leading)
            .background(isSelected ? RecorderTheme.selected : RecorderTheme.solid, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(RecorderTheme.outline, lineWidth: isSelected ? 2 : 1))
        }
        .buttonStyle(.plain)
    }

    private func placeChips(selection: Binding<GymPlaceLabel>) -> some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
            ForEach(GymPlaceLabel.allCases) { place in
                Button {
                    selection.wrappedValue = place
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: place.symbol)
                        Text(place.title).font(.caption.weight(.semibold)).lineLimit(2)
                    }
                    .frame(maxWidth: .infinity, minHeight: 46)
                    .padding(.horizontal, 8)
                    .background(selection.wrappedValue == place ? RecorderTheme.selected : RecorderTheme.solid, in: RoundedRectangle(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(RecorderTheme.outline, lineWidth: selection.wrappedValue == place ? 2 : 1))
                    .foregroundStyle(RecorderTheme.primaryText)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var setupChecklist: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("ExcerLock setup (tap once per session)")
                .font(.headline)
                .foregroundStyle(RecorderTheme.primaryText)
            toggleRow("The same gym circle is saved in ExcerLock", isOn: Binding(
                get: { controller.setup.sameGymSaved },
                set: { value in
                    var setup = controller.setup
                    setup.sameGymSaved = value
                    controller.updateSetup(setup)
                }
            ))
            toggleRow("Auto-detect is on in ExcerLock", isOn: Binding(
                get: { controller.setup.autoDetectOn },
                set: { value in
                    var setup = controller.setup
                    setup.autoDetectOn = value
                    controller.updateSetup(setup)
                }
            ))
            HStack(spacing: 8) {
                listChip("ExcerLock permission", options: ["unknown", "whenInUse", "always", "denied"], keyPath: \.locationPermission)
                listChip("Precise", options: ["unknown", "true", "false"], keyPath: \.preciseLocation)
                listChip("Build", options: ["unknown", "production", "traceLab"], keyPath: \.buildKind)
            }
            Text("ExcerLock cannot be read by this app, so these are your declarations. They are recorded with the session.")
                .font(.caption)
                .foregroundStyle(RecorderTheme.secondaryText)
        }
        .padding(16)
        .background(RecorderTheme.card, in: RoundedRectangle(cornerRadius: 20))
    }

    private func listChip(_ title: String, options: [String], keyPath: WritableKeyPath<ExcerLockSetupDeclaration, String>) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.caption2).foregroundStyle(RecorderTheme.secondaryText)
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
            .pickerStyle(.menu)
            .labelsHidden()
        }
    }

    private func toggleRow(_ title: String, isOn: Binding<Bool>) -> some View {
        Toggle(title, isOn: isOn)
            .font(.subheadline)
            .foregroundStyle(RecorderTheme.primaryText)
            .tint(RecorderTheme.orange)
    }

    private var savedSessionsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Saved on this phone")
                .font(.headline)
                .foregroundStyle(RecorderTheme.primaryText)
            if controller.repository.sessions.isEmpty {
                Text("Nothing saved yet.")
                    .font(.subheadline)
                    .foregroundStyle(RecorderTheme.secondaryText)
            }
            ForEach(controller.repository.sessions) { session in
                SessionCard(
                    session: session,
                    export: {
                        shareURL = try? controller.repository.export(session)
                    },
                    delete: { pendingDelete = session }
                )
            }
        }
    }

    // MARK: Recording

    private var recordingSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            statusHeader
            scriptStrip
            placeCardGrid
            observationRow
            actionRow
            Button("Finish & save") { controller.finish() }
                .buttonStyle(PrimaryButtonStyle())
            if let note = controller.finishNote {
                Text(note).font(.footnote).foregroundStyle(RecorderTheme.secondaryText)
            }
        }
    }

    private var statusHeader: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Circle()
                    .fill(controller.status.streamIsLive ? RecorderTheme.success : RecorderTheme.secondaryText)
                    .frame(width: 10, height: 10)
                Text(controller.status.streamHealth == "live" ? "location stream live" : "location stream \(controller.status.streamHealth)")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(RecorderTheme.secondaryText)
                Spacer()
                Text(controller.status.gymName).font(.caption).foregroundStyle(RecorderTheme.secondaryText)
            }
            Text(controller.status.presence)
                .font(.system(size: 40, weight: .heavy, design: .rounded))
                .foregroundStyle(RecorderTheme.primaryText)
            // The one hero metric: the live distance is the only orange text.
            Text(controller.status.distanceLine)
                .font(.system(size: 30, weight: .bold, design: .rounded))
                .foregroundStyle(RecorderTheme.orange)
            Text(controller.status.reducerLine)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(RecorderTheme.primaryText)
            Text(controller.status.activityLine)
                .font(.subheadline)
                .foregroundStyle(RecorderTheme.secondaryText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(RecorderTheme.card, in: RoundedRectangle(cornerRadius: 22))
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
                    Text("Tap “\(step.place?.title ?? "")” below when you are there.")
                        .font(.subheadline)
                        .foregroundStyle(RecorderTheme.secondaryText)
                } else {
                    Button("Done") { controller.acknowledgeCurrentStep() }
                        .buttonStyle(SecondaryButtonStyle())
                }
            } else if controller.scenarioId == nil {
                Text("Free session · tap the place cards whenever they change.")
                    .font(.subheadline)
                    .foregroundStyle(RecorderTheme.secondaryText)
            } else {
                Text("All scripted steps acknowledged. Keep tapping place cards if anything changes.")
                    .font(.subheadline)
                    .foregroundStyle(RecorderTheme.secondaryText)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(RecorderTheme.solid, in: RoundedRectangle(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(RecorderTheme.outline, lineWidth: 1))
    }

    private var placeCardGrid: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Where are you now?")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(RecorderTheme.primaryText)
            ForEach(GymPlaceLabel.allCases) { place in
                Button {
                    controller.setPlace(place)
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: place.symbol).font(.title3)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(place.title).font(.subheadline.weight(.semibold))
                            Text(place.guidance).font(.caption2).foregroundStyle(RecorderTheme.secondaryText)
                        }
                        Spacer()
                        if controller.activePlace == place {
                            Image(systemName: "largecircle.fill.circle")
                                .foregroundStyle(RecorderTheme.orange)
                        } else {
                            Image(systemName: "circle").foregroundStyle(RecorderTheme.secondaryText)
                        }
                    }
                    .foregroundStyle(RecorderTheme.primaryText)
                    .frame(maxWidth: .infinity, minHeight: 54, alignment: .leading)
                    .padding(.horizontal, 12)
                    .background(controller.activePlace == place ? RecorderTheme.selected : RecorderTheme.solid, in: RoundedRectangle(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(RecorderTheme.outline, lineWidth: controller.activePlace == place ? 2 : 1))
                }
                .buttonStyle(ScalePressStyle())
            }
        }
    }

    private var observationRow: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("ExcerLock shows…")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(RecorderTheme.primaryText)
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                ForEach(ObserverCard.allCases, id: \.self) { card in
                    compactButton("Card: \(card.title)") {
                        controller.observeExcerLock(card: card, lock: .cannotTell)
                    }
                }
            }
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                ForEach(ObserverLock.allCases, id: \.self) { lock in
                    compactButton("Locked app: \(lock.title)") {
                        controller.observeExcerLock(card: .cannotTell, lock: lock)
                    }
                }
            }
            Text("Opened a locked app on purpose? Record it:")
                .font(.caption)
                .foregroundStyle(RecorderTheme.secondaryText)
            HStack(spacing: 8) {
                ForEach(CanaryOutcome.allCases, id: \.self) { outcome in
                    compactButton(outcome.title) { controller.recordCanary(outcome) }
                }
            }
        }
        .padding(16)
        .background(RecorderTheme.card, in: RoundedRectangle(cornerRadius: 20))
    }

    private var actionRow: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                Button("Probe check-in") { controller.probeCheckIn() }
                    .buttonStyle(SecondaryButtonStyle())
                Button("Probe re-register") { controller.reregisterRegions() }
                    .buttonStyle(SecondaryButtonStyle())
            }
            HStack(spacing: 10) {
                Button("I did this in ExcerLock…") { showActions = true }
                    .buttonStyle(SecondaryButtonStyle())
                Button("Oops, I forgot a tap") { showBackdate = true }
                    .buttonStyle(SecondaryButtonStyle())
            }
            Button("Add a note") { showNote = true }
                .buttonStyle(SecondaryButtonStyle())
        }
    }

    // MARK: Sheets

    private struct GymSetupSheet: View {
        @ObservedObject var controller: CaptureController
        @Environment(\.dismiss) private var dismiss
        @State private var name = ""
        @State private var typedLatitude = ""
        @State private var typedLongitude = ""

        var body: some View {
            NavigationStack {
                Form {
                    Section("Stand at the gym entrance") {
                        Button(controller.isAveragingGym ? "Averaging… \(controller.averagingFixCount) fixes" : "Set gym here (20 seconds)") {
                            controller.beginGymAveraging(name: name.isEmpty ? "Gym" : name) { _ in }
                        }
                        .disabled(controller.isAveragingGym)
                        Text("The centre is the accuracy-weighted average of the fixes taken while you stand still for 20 seconds. Fixes worse than 65 m are rejected, and nothing is saved if fewer than 3 usable fixes arrive.")
                            .font(.caption)
                            .foregroundStyle(RecorderTheme.secondaryText)
                        if let note = controller.lastGymAverageNote {
                            Text(note)
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(RecorderTheme.primaryText)
                        }
                    }
                    Section("Or type the coordinates") {
                        TextField("Name", text: $name)
                        TextField("Latitude", text: $typedLatitude).keyboardType(.numbersAndPunctuation)
                        TextField("Longitude", text: $typedLongitude).keyboardType(.numbersAndPunctuation)
                        Button("Save typed gym") {
                            if let latitude = Double(typedLatitude), let longitude = Double(typedLongitude) {
                                controller.registry.addTypedGym(
                                    name: name,
                                    latitude: latitude,
                                    longitude: longitude,
                                    radiusMeters: controller.registry.gymUnderTest?.radiusMeters ?? gymRadiusDefaultMeters
                                )
                                dismiss()
                            }
                        }
                    }
                    Section("Saved circles") {
                        ForEach(controller.registry.gyms) { gym in
                            VStack(alignment: .leading, spacing: 4) {
                                Text("\(gym.name)\(gym.isUnderTest ? " · under test" : "")")
                                Text("\(Int(gym.radiusMeters)) m · \(String(format: "%.5f", gym.latitude)), \(String(format: "%.5f", gym.longitude))")
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
                .navigationTitle("The circle under test")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } }
                }
            }
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

    private static let dateFormatter: DateFormatter = {
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
                    Text("\(session.scenarioId ?? "free") · \(formatDuration(session.durationSeconds)) · \(session.eventCount) events · \(ByteCountFormatter.string(fromByteCount: session.byteCount, countStyle: .file))")
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

    private func formatDuration(_ seconds: TimeInterval) -> String {
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
