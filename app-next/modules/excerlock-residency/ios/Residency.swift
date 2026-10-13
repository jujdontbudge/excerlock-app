import CoreLocation
import Foundation
import UIKit
import os

final class Residency: NSObject, CLLocationManagerDelegate {
  static let shared = Residency()
  static let wantedKey = "excerlock.residency.wanted.v1"
  private let log = Logger(subsystem: "com.johansardar.excerlock.residency", category: "residency")

  private let lock = NSLock()
  private var updates: Task<Void, Never>?
  private var session: AnyObject?
  private var sessionForeground = false
  private var visits: CLLocationManager?
  private(set) var launchedForLocation = false
  private(set) var launchedInBackground = false
  private(set) var lastUpdateAt: Double = 0

  var wanted: Bool { UserDefaults.standard.bool(forKey: Self.wantedKey) }

  func launched(options: [UIApplication.LaunchOptionsKey: Any]?) {
    launchedForLocation = options?[.location] != nil
    launchedInBackground = UIApplication.shared.applicationState == .background
    log.notice("launch location=\(self.launchedForLocation, privacy: .public) background=\(self.launchedInBackground, privacy: .public) wanted=\(self.wanted, privacy: .public)")
    if wanted { start(foreground: UIApplication.shared.applicationState == .active) }
  }

  func setWanted(_ value: Bool, foreground: Bool) {
    if wanted != value { UserDefaults.standard.set(value, forKey: Self.wantedKey) }
    value ? start(foreground: foreground) : stop()
  }

  func status() -> [String: Any] {
    lock.lock(); defer { lock.unlock() }
    return [
      "wanted": wanted,
      "running": updates != nil,
      "session": session != nil,
      "sessionForeground": sessionForeground,
      "launchedForLocation": launchedForLocation,
      "launchedInBackground": launchedInBackground,
      "lastUpdateAt": lastUpdateAt,
      "availableMemoryMb": Double(os_proc_available_memory()) / 1_048_576,
    ]
  }

  private func start(foreground: Bool) {
    lock.lock()
    let needsVisits = visits == nil
    if #available(iOS 18.0, *), session == nil || (foreground && !sessionForeground) {
      let previous = session as? CLServiceSession
      session = CLServiceSession(authorization: .always)
      sessionForeground = foreground
      previous?.invalidate()
    }
    if updates == nil {
      log.notice("start foreground=\(foreground, privacy: .public)")
      updates = Task.detached(priority: .utility) { [weak self] in
        do {
          for try await _ in CLLocationUpdate.liveUpdates() {
            if Task.isCancelled { break }
            self?.markUpdate()
          }
        } catch {}
      }
    }
    lock.unlock()
    if needsVisits { DispatchQueue.main.async { [weak self] in self?.startVisits() } }
  }

  private func stop() {
    lock.lock()
    guard updates != nil || session != nil || visits != nil else { lock.unlock(); return }
    log.notice("stop")
    updates?.cancel()
    updates = nil
    if #available(iOS 18.0, *) { (session as? CLServiceSession)?.invalidate() }
    session = nil
    sessionForeground = false
    let manager = visits
    visits = nil
    lock.unlock()
    DispatchQueue.main.async { manager?.stopMonitoringVisits() }
  }

  private func startVisits() {
    let manager = CLLocationManager()
    manager.delegate = self
    lock.lock()
    guard visits == nil, updates != nil else { lock.unlock(); return }
    visits = manager
    lock.unlock()
    manager.startMonitoringVisits()
  }

  private func markUpdate() {
    lock.lock()
    let first = lastUpdateAt == 0
    lastUpdateAt = Date().timeIntervalSince1970 * 1000
    lock.unlock()
    if first { log.notice("first live update") }
  }

  func locationManager(_ manager: CLLocationManager, didVisit visit: CLVisit) {}
}
