import Combine
import CoreLocation
import MapKit
import SwiftUI

/// The native mirror of `app-next/src/features/gym-picker`: find a place by
/// search or the current fix, then a map that pans under a fixed centre pin
/// with the orange ring, the outside dimmed, and a 50–200 m radius slider.
/// Save stores the actual coordinate and radius as the circle under test.
final class GymPickerModel: NSObject, ObservableObject {
    enum Stage { case find, place }
    enum Source { case search, mapPin, currentFix }

    @Published var stage: Stage
    @Published var query = "" { didSet { queryChanged() } }
    @Published private(set) var suggestions: [MKLocalSearchCompletion] = []
    @Published private(set) var searching = false
    @Published private(set) var resolving = false
    @Published var name: String
    @Published var radius: Double
    @Published private(set) var pin: CLLocationCoordinate2D
    @Published private(set) var address: String?
    @Published private(set) var error: String?
    @Published private(set) var locating = false
    @Published private(set) var locatingFixCount = 0
    @Published var cameraPosition: MapCameraPosition
    @Published private(set) var region: MKCoordinateRegion

    let editingId: String?
    private(set) var source: Source = .mapPin
    private var fixesAveraged = 0
    private var averageAccuracyM: Double?
    private var userPannedSinceLocate = false

    private let completer = MKLocalSearchCompleter()
    private let geocoder = CLGeocoder()
    private var geocodeCache: [String: String] = [:]
    private var lastGeocodeKey: String?
    private var searchDebounce: DispatchWorkItem?
    private weak var controller: CaptureController?

    static let averagingSeconds = GymRegistry.averagingWindowSeconds
    static let placeholderName = "New gym"

    init(controller: CaptureController) {
        self.controller = controller
        let existing = controller.registry.gymUnderTest
        editingId = existing?.id
        name = existing?.name ?? ""
        let initialRadius = existing?.radiusMeters ?? gymRadiusDefaultMeters
        radius = initialRadius
        let centre = existing.map { CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude) }
            ?? CLLocationCoordinate2D(latitude: 0, longitude: 0)
        pin = centre
        let initial = GymPickerGeometry.region(centre: centre, radiusMeters: initialRadius, size: CGSize(width: 360, height: 380))
        region = initial
        cameraPosition = .region(initial)
        stage = existing == nil ? .find : .place
        super.init()
        completer.delegate = self
        completer.resultTypes = [.address, .pointOfInterest]
    }

    // MARK: Find

    private func queryChanged() {
        searchDebounce?.cancel()
        let trimmed = query.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else {
            suggestions = []
            searching = false
            completer.cancel()
            return
        }
        searching = true
        let work = DispatchWorkItem { [weak self] in
            guard let self else { return }
            if self.pinIsPlaced { self.completer.region = self.region }
            self.completer.queryFragment = trimmed
        }
        searchDebounce = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25, execute: work)
    }

    func pick(_ completion: MKLocalSearchCompletion) {
        guard !resolving else { return }
        resolving = true
        error = nil
        let request = MKLocalSearch.Request(completion: completion)
        MKLocalSearch(request: request).start { [weak self] response, searchError in
            DispatchQueue.main.async {
                guard let self else { return }
                self.resolving = false
                guard let item = response?.mapItems.first else {
                    self.error = searchError?.localizedDescription ?? "That place could not be resolved. Try another result."
                    return
                }
                let coordinate = item.placemark.coordinate
                if self.name.trimmingCharacters(in: .whitespaces).isEmpty {
                    self.name = item.name ?? completion.title
                }
                self.source = .search
                self.fixesAveraged = 0
                self.averageAccuracyM = nil
                self.address = Self.addressLine(item.placemark)
                self.drop(coordinate)
            }
        }
    }

    /// The "I'm here" shortcut: the first fix drops the pin at once, then the
    /// remaining fixes in the window refine it with the accuracy-weighted
    /// average until the person pans the map themselves.
    func useCurrentLocation() {
        guard let controller, !locating else { return }
        guard controller.locationPermissionIsUsable else {
            error = "Allow location first (Home → Allow location)."
            return
        }
        locating = true
        locatingFixCount = 0
        error = nil
        userPannedSinceLocate = false
        var collected: [GymFixSample] = []
        let deadline = Date().addingTimeInterval(Self.averagingSeconds)

        func poll() {
            controller.probeCurrentFix { [weak self] fix in
                guard let self else { return }
                if let fix, fix.horizontalAccuracyM > 0, fix.horizontalAccuracyM <= GymRegistry.maximumAcceptedAccuracyM {
                    collected.append(fix)
                    self.locatingFixCount = collected.count
                    if !self.userPannedSinceLocate {
                        if let averaged = GymRegistry.averagedLocation(from: collected) {
                            self.fixesAveraged = averaged.count
                            self.averageAccuracyM = averaged.accuracyM
                            self.source = .currentFix
                            self.drop(CLLocationCoordinate2D(latitude: averaged.latitude, longitude: averaged.longitude))
                        } else if collected.count == 1 {
                            self.fixesAveraged = 1
                            self.averageAccuracyM = fix.horizontalAccuracyM
                            self.source = .currentFix
                            self.drop(CLLocationCoordinate2D(latitude: fix.latitude, longitude: fix.longitude))
                        }
                    }
                }
                if Date() < deadline, !self.userPannedSinceLocate {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { poll() }
                } else {
                    self.locating = false
                    if collected.isEmpty {
                        self.error = "No usable fix in \(Int(Self.averagingSeconds)) s. Stand still, outdoors if possible, or search instead."
                    }
                }
            }
        }
        poll()
    }

    // MARK: Place

    /// Moves the camera so the pin sits on `coordinate`, at a zoom that shows
    /// the whole ring, and switches to the map.
    func drop(_ coordinate: CLLocationCoordinate2D) {
        pin = coordinate
        let fitted = GymPickerGeometry.region(centre: coordinate, radiusMeters: radius, size: mapSize)
        region = fitted
        cameraPosition = .region(fitted)
        stage = .place
        reverseGeocodeIfNeeded()
    }

    private var mapSize = CGSize(width: 360, height: 380)

    func mapLaidOut(_ size: CGSize) {
        guard size.width > 0, size.height > 0, size != mapSize else { return }
        mapSize = size
        let fitted = GymPickerGeometry.region(centre: pin, radiusMeters: radius, size: size)
        region = fitted
        cameraPosition = .region(fitted)
    }

    func cameraMoving(_ context: MapCameraUpdateContext) {
        region = context.region
    }

    func cameraSettled(_ context: MapCameraUpdateContext) {
        region = context.region
        let centre = context.region.center
        // About a metre: programmatic camera fits settle within that of the pin.
        let moved = abs(centre.latitude - pin.latitude) > 1e-5 || abs(centre.longitude - pin.longitude) > 1e-5
        guard moved else { return }
        pin = centre
        if locating { userPannedSinceLocate = true }
        source = .mapPin
        fixesAveraged = 0
        averageAccuracyM = nil
        reverseGeocodeIfNeeded()
    }

    func openSearch() {
        stage = .find
    }

    private func reverseGeocodeIfNeeded() {
        let key = String(format: "%.4f,%.4f", pin.latitude, pin.longitude)
        if let cached = geocodeCache[key] {
            address = cached
            return
        }
        guard key != lastGeocodeKey else { return }
        lastGeocodeKey = key
        geocoder.cancelGeocode()
        let location = CLLocation(latitude: pin.latitude, longitude: pin.longitude)
        geocoder.reverseGeocodeLocation(location) { [weak self] placemarks, _ in
            DispatchQueue.main.async {
                guard let self, let placemark = placemarks?.first else { return }
                let line = Self.addressLine(placemark)
                self.geocodeCache[key] = line
                if self.lastGeocodeKey == key { self.address = line }
            }
        }
    }

    static func addressLine(_ placemark: CLPlacemark) -> String? {
        let street = [placemark.subThoroughfare, placemark.thoroughfare].compactMap { $0 }.joined(separator: " ")
        let parts = [street.isEmpty ? nil : street, placemark.locality].compactMap { $0 }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }

    /// A pin exists once a place was chosen or a gym is being edited; the
    /// find stage's Back button and the pin shortcut only make sense then.
    var pinIsPlaced: Bool { editingId != nil || !(pin.latitude == 0 && pin.longitude == 0) }

    var coordinateLine: String {
        address ?? String(format: "%.5f, %.5f", pin.latitude, pin.longitude)
    }

    var atLimit: Bool {
        guard let controller else { return false }
        return editingId == nil && !controller.registry.canAddMore
    }

    var canSave: Bool { !atLimit && !resolving }

    /// Saves the circle and makes it the one under test.
    func save() -> Bool {
        guard let controller else { return false }
        let setBy: String
        switch source {
        case .search: setBy = "search"
        case .mapPin: setBy = "map_pin"
        case .currentFix: setBy = "current_fix_average"
        }
        let saved = controller.registry.savePicked(
            id: editingId,
            name: name,
            latitude: pin.latitude,
            longitude: pin.longitude,
            radiusMeters: radius,
            setBy: setBy,
            fixesAveraged: fixesAveraged,
            averageAccuracyM: averageAccuracyM
        )
        if saved == nil {
            error = atLimit ? "All \(maximumGyms) circles are saved; delete one under More → Gym circle." : "That spot cannot be saved."
        }
        return saved != nil
    }
}

extension GymPickerModel: MKLocalSearchCompleterDelegate {
    func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        searching = false
        suggestions = completer.results
    }

    func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        searching = false
        suggestions = []
    }
}

/// `geometry.ts` in Swift: real metres to screen points and the camera fit.
enum GymPickerGeometry {
    static func metresToPoints(region: MKCoordinateRegion, width: CGFloat, metres: Double) -> CGFloat {
        let metresAcross = max(0.001, region.span.longitudeDelta * 111_320 * cos(region.center.latitude * .pi / 180))
        return CGFloat(metres) * width / CGFloat(metresAcross)
    }

    static func region(centre: CLLocationCoordinate2D, radiusMeters: Double, size: CGSize) -> MKCoordinateRegion {
        let span = radiusMeters * 2.7
        let shortest = max(1, min(size.width, size.height))
        let latitudeDelta = (span / 111_320) * Double(size.height) / Double(shortest)
        let longitudeDelta = (span / (111_320 * max(0.01, cos(centre.latitude * .pi / 180)))) * Double(size.width) / Double(shortest)
        return MKCoordinateRegion(center: centre, span: MKCoordinateSpan(latitudeDelta: latitudeDelta, longitudeDelta: longitudeDelta))
    }
}

struct GymPickerView: View {
    @ObservedObject var controller: CaptureController
    @StateObject private var model: GymPickerModel
    @Environment(\.dismiss) private var dismiss
    @FocusState private var searchFocused: Bool

    init(controller: CaptureController) {
        self.controller = controller
        _model = StateObject(wrappedValue: GymPickerModel(controller: controller))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(colors: [RecorderTheme.top, RecorderTheme.middle, RecorderTheme.bottom], startPoint: .top, endPoint: .bottom)
                    .ignoresSafeArea()
                if model.stage == .find {
                    findStage
                } else {
                    placeStage
                }
            }
            .navigationTitle(model.stage == .find ? "Find the gym" : "Set the gym")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    if model.stage == .find, model.pinIsPlaced {
                        Button("Back") { model.stage = .place }
                    } else {
                        Button("Close") { dismiss() }
                    }
                }
            }
            .tint(RecorderTheme.orange)
        }
    }

    // MARK: Find stage

    private var findStage: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                searchField
                if !model.query.trimmingCharacters(in: .whitespaces).isEmpty {
                    resultsList
                } else {
                    currentLocationRow
                    if model.pinIsPlaced {
                        Button {
                            model.stage = .place
                        } label: {
                            Label("Drop the pin on the map", systemImage: "mappin.and.ellipse")
                                .frame(maxWidth: .infinity, minHeight: 56)
                        }
                        .buttonStyle(PickerSecondaryStyle())
                    }
                }
                if let error = model.error {
                    Text(error).font(.footnote).foregroundStyle(RecorderTheme.error)
                }
            }
            .padding(20)
        }
        .scrollDismissesKeyboard(.interactively)
        .onAppear { searchFocused = true }
    }

    private var searchField: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass").foregroundStyle(RecorderTheme.orange)
            TextField("Search gym, address or place", text: $model.query)
                .focused($searchFocused)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.words)
                .submitLabel(.search)
            if !model.query.isEmpty {
                Button { model.query = "" } label: {
                    Image(systemName: "xmark.circle.fill").foregroundStyle(RecorderTheme.secondaryText)
                }
            }
        }
        .padding(.horizontal, 14)
        .frame(minHeight: 56)
        .background(RecorderTheme.solid, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(searchFocused ? RecorderTheme.orange : RecorderTheme.outline, lineWidth: 1))
    }

    private var currentLocationRow: some View {
        Button {
            model.useCurrentLocation()
        } label: {
            HStack(spacing: 14) {
                ZStack {
                    Circle().fill(RecorderTheme.orange).frame(width: 44, height: 44)
                    if model.locating {
                        ProgressView().tint(.white)
                    } else {
                        Image(systemName: "location.fill").foregroundStyle(.white)
                    }
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("I'm here").font(.system(.title3, design: .rounded, weight: .bold)).foregroundStyle(RecorderTheme.primaryText)
                    Text(model.locating ? "Hold still… \(model.locatingFixCount) fixes" : "Drop the pin on my current location")
                        .font(.footnote).foregroundStyle(RecorderTheme.secondaryText)
                }
                Spacer()
            }
            .padding(16)
            .frame(maxWidth: .infinity, minHeight: 76)
            .background(RecorderTheme.card, in: RoundedRectangle(cornerRadius: 20))
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(RecorderTheme.outline, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .disabled(model.locating)
    }

    private var resultsList: some View {
        VStack(alignment: .leading, spacing: 0) {
            if model.searching || model.resolving {
                ProgressView().tint(RecorderTheme.orange).frame(maxWidth: .infinity).padding(.vertical, 12)
            }
            ForEach(Array(model.suggestions.enumerated()), id: \.offset) { _, suggestion in
                Button {
                    searchFocused = false
                    model.pick(suggestion)
                } label: {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(suggestion.title).font(.body.weight(.semibold)).foregroundStyle(RecorderTheme.primaryText)
                        if !suggestion.subtitle.isEmpty {
                            Text(suggestion.subtitle).font(.footnote).foregroundStyle(RecorderTheme.secondaryText)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 12)
                }
                .buttonStyle(.plain)
                .disabled(model.resolving)
                Divider().overlay(RecorderTheme.divider)
            }
            if !model.searching, model.suggestions.isEmpty, model.error == nil {
                Text("No places match yet. Keep typing, or drop the pin on the map.")
                    .font(.footnote).foregroundStyle(RecorderTheme.secondaryText).padding(.vertical, 12)
            }
        }
        .padding(.horizontal, 16)
        .background(RecorderTheme.card, in: RoundedRectangle(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(RecorderTheme.outline, lineWidth: 1))
    }

    // MARK: Place stage

    private var placeStage: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    pickerMap
                        .frame(height: 380)
                    Button {
                        model.openSearch()
                    } label: {
                        HStack(spacing: 10) {
                            Image(systemName: "magnifyingglass").foregroundStyle(RecorderTheme.orange)
                            Text("Search gym, address or place").foregroundStyle(RecorderTheme.secondaryText)
                            Spacer()
                        }
                        .padding(.horizontal, 14)
                        .frame(minHeight: 56)
                        .background(RecorderTheme.card, in: RoundedRectangle(cornerRadius: 16))
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(RecorderTheme.outline, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                    Button {
                        model.useCurrentLocation()
                    } label: {
                        HStack(spacing: 10) {
                            if model.locating {
                                ProgressView().tint(RecorderTheme.orange)
                            } else {
                                Image(systemName: "location.fill").foregroundStyle(RecorderTheme.orange)
                            }
                            Text(model.locating ? "Hold still… \(model.locatingFixCount) fixes" : "I'm here — put the pin on me")
                                .foregroundStyle(RecorderTheme.primaryText)
                            Spacer()
                        }
                        .padding(.horizontal, 14)
                        .frame(minHeight: 56)
                        .background(RecorderTheme.card, in: RoundedRectangle(cornerRadius: 16))
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(RecorderTheme.outline, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                    .disabled(model.locating)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Name").font(.subheadline.weight(.semibold)).foregroundStyle(RecorderTheme.primaryText)
                        TextField(GymPickerModel.placeholderName, text: $model.name)
                            .padding(.horizontal, 14)
                            .frame(minHeight: 48)
                            .background(RecorderTheme.solid, in: RoundedRectangle(cornerRadius: 16))
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(RecorderTheme.outline, lineWidth: 1))
                        Text("Address").font(.subheadline.weight(.semibold)).foregroundStyle(RecorderTheme.primaryText).padding(.top, 4)
                        Text(model.coordinateLine).font(.footnote).foregroundStyle(RecorderTheme.secondaryText)
                        HStack {
                            Text("Radius").font(.subheadline.weight(.semibold)).foregroundStyle(RecorderTheme.primaryText)
                            Spacer()
                            Text("\(Int(model.radius)) m").font(.subheadline.weight(.semibold)).foregroundStyle(RecorderTheme.primaryText)
                        }
                        .padding(.top, 4)
                        Slider(value: $model.radius, in: gymRadiusMinimumMeters...gymRadiusMaximumMeters, step: gymRadiusStepMeters)
                            .tint(RecorderTheme.orange)
                        if let error = model.error {
                            Text(error).font(.footnote).foregroundStyle(RecorderTheme.error)
                        } else if model.atLimit {
                            Text("All \(maximumGyms) circles are saved; delete one under More → Gym circle.")
                                .font(.footnote).foregroundStyle(RecorderTheme.error)
                        }
                    }
                    .padding(.horizontal, 4)
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 16)
            }
            .scrollDismissesKeyboard(.interactively)
            Button {
                if model.save() { dismiss() }
            } label: {
                Text("Save gym")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .frame(maxWidth: .infinity, minHeight: 64)
            }
            .buttonStyle(PickerPrimaryStyle())
            .disabled(!model.canSave)
            .padding(.horizontal, 20)
            .padding(.bottom, 12)
        }
    }

    private var pickerMap: some View {
        GeometryReader { proxy in
            let size = proxy.size
            let ringRadius = min(
                hypot(size.width, size.height) * 2,
                GymPickerGeometry.metresToPoints(region: model.region, width: size.width, metres: model.radius)
            )
            ZStack {
                Map(position: $model.cameraPosition, interactionModes: [.pan, .zoom]) {
                    if controller.locationPermissionIsUsable { UserAnnotation() }
                }
                .mapStyle(.standard(pointsOfInterest: .all))
                .mapControlVisibility(.hidden)
                .onMapCameraChange(frequency: .continuous) { model.cameraMoving($0) }
                .onMapCameraChange(frequency: .onEnd) { model.cameraSettled($0) }
                // Outside the ring is dimmed, exactly like the production mask.
                Path { path in
                    path.addRect(CGRect(origin: .zero, size: size))
                    path.addEllipse(in: CGRect(
                        x: size.width / 2 - ringRadius,
                        y: size.height / 2 - ringRadius,
                        width: ringRadius * 2,
                        height: ringRadius * 2
                    ))
                }
                .fill(Color.black.opacity(0.18), style: FillStyle(eoFill: true))
                .allowsHitTesting(false)
                Circle()
                    .fill(RecorderTheme.orange.opacity(0.12))
                    .overlay(Circle().stroke(RecorderTheme.orange, lineWidth: 3))
                    .frame(width: ringRadius * 2, height: ringRadius * 2)
                    .allowsHitTesting(false)
                // The pin sits exactly on the map centre; its name rides below it.
                Circle()
                    .fill(RecorderTheme.orange)
                    .frame(width: 22, height: 22)
                    .overlay(Circle().stroke(RecorderTheme.solid, lineWidth: 3))
                    .allowsHitTesting(false)
                Text(model.name.trimmingCharacters(in: .whitespaces).isEmpty ? GymPickerModel.placeholderName : model.name)
                    .font(.footnote.weight(.semibold))
                    .lineLimit(1)
                    .foregroundStyle(RecorderTheme.primaryText)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(RecorderTheme.solid, in: Capsule())
                    .overlay(Capsule().stroke(RecorderTheme.outline, lineWidth: 1))
                    .frame(maxWidth: size.width * 0.8)
                    .offset(y: 34)
                    .allowsHitTesting(false)
                VStack {
                    Spacer()
                    Text("Drag the map to put the pin on the gym entrance")
                        .font(.footnote)
                        .foregroundStyle(RecorderTheme.primaryText)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(RecorderTheme.solid, in: Capsule())
                        .overlay(Capsule().stroke(RecorderTheme.outline, lineWidth: 1))
                        .padding(.bottom, 16)
                }
                .allowsHitTesting(false)
            }
            .onAppear { model.mapLaidOut(size) }
            .onChange(of: size) { _, next in model.mapLaidOut(next) }
        }
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .overlay(RoundedRectangle(cornerRadius: 24).stroke(RecorderTheme.outline, lineWidth: 1))
    }
}


private struct PickerPrimaryStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(.white)
            .background(
                configuration.isPressed ? RecorderTheme.orangePressed : RecorderTheme.orange,
                in: RoundedRectangle(cornerRadius: 24)
            )
            .opacity(isEnabled ? 1 : 0.5)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.1), value: configuration.isPressed)
    }
}

private struct PickerSecondaryStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.weight(.semibold))
            .foregroundStyle(RecorderTheme.primaryText)
            .background(configuration.isPressed ? RecorderTheme.selected : RecorderTheme.solid, in: RoundedRectangle(cornerRadius: 20))
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(RecorderTheme.outline, lineWidth: 1))
    }
}
