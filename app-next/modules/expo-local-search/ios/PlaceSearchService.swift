import ExpoModulesCore
import MapKit
import Contacts

final class PlaceSearchService: NSObject, MKLocalSearchCompleterDelegate {
  private var completer: MKLocalSearchCompleter?
  private var pending: Promise?
  private var completions: [String: MKLocalSearchCompletion] = [:]
  private var timeout: DispatchWorkItem?

  func suggest(_ query: String, latitude: Double?, longitude: Double?, promise: Promise) {
    pending?.resolve([] as [[String: String]])
    completer?.cancel()
    timeout?.cancel()
    pending = promise
    let next = MKLocalSearchCompleter()
    next.delegate = self
    next.resultTypes = [.address, .pointOfInterest]
    // Region is a ranking hint, never a country restriction.
    if let lat = latitude, let lon = longitude {
      next.region = MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: lat, longitude: lon), latitudinalMeters: 30000, longitudinalMeters: 30000)
    }
    completer = next
    next.queryFragment = query
    let work = DispatchWorkItem { [weak self, weak next] in
      guard let self = self, self.completer === next else { return }
      self.pending?.reject("SEARCH_TIMEOUT", "Search timed out. Please try again.")
      self.pending = nil
      next?.cancel()
    }
    timeout = work
    DispatchQueue.main.asyncAfter(deadline: .now() + 15, execute: work)
  }

  func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
    guard self.completer === completer else { return }
    timeout?.cancel()
    completions.removeAll()
    let items = completer.results.prefix(12).map { item -> [String: String] in
      let id = UUID().uuidString
      completions[id] = item
      return ["id": id, "title": item.title, "subtitle": item.subtitle]
    }
    pending?.resolve(items)
    pending = nil
  }

  func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
    guard self.completer === completer else { return }
    timeout?.cancel()
    pending?.reject("SEARCH_FAILED", error.localizedDescription)
    pending = nil
  }

  func resolve(_ id: String, title: String, subtitle: String, promise: Promise) {
    let request: MKLocalSearch.Request
    if let completion = completions[id] { request = MKLocalSearch.Request(completion: completion) }
    else {
      request = MKLocalSearch.Request()
      request.naturalLanguageQuery = "\(title) \(subtitle)"
      request.resultTypes = [.address, .pointOfInterest]
    }
    MKLocalSearch(request: request).start { response, error in
      if let error = error { promise.reject("SEARCH_FAILED", error.localizedDescription); return }
      guard let item = response?.mapItems.first else { promise.reject("NO_PLACE", "No matching place found"); return }
      promise.resolve(self.candidate(item))
    }
  }

  func nearby(_ latitude: Double, longitude: Double, promise: Promise) {
    let request = MKLocalPointsOfInterestRequest(center: CLLocationCoordinate2D(latitude: latitude, longitude: longitude), radius: 10000)
    request.pointOfInterestFilter = MKPointOfInterestFilter(including: [.fitnessCenter])
    MKLocalSearch(request: request).start { response, error in
      if let error = error { promise.reject("SEARCH_FAILED", error.localizedDescription); return }
      promise.resolve(Array((response?.mapItems ?? []).prefix(6)).map(self.candidate))
    }
  }

  private func candidate(_ item: MKMapItem) -> [String: Any] {
    let coord = item.placemark.coordinate
    let address = item.placemark.postalAddress.map {
      CNPostalAddressFormatter.string(from: $0, style: .mailingAddress).replacingOccurrences(of: "\n", with: ", ")
    } ?? item.placemark.title ?? ""
    return ["id": "apple:\(coord.latitude):\(coord.longitude):\(item.name ?? "")",
            "name": item.name ?? address, "address": address,
            "latitude": coord.latitude, "longitude": coord.longitude]
  }
}
