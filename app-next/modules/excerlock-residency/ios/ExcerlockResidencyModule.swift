import ExpoModulesCore

public final class ExcerlockResidencyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExcerlockResidency")
    Function("setWanted") { (wanted: Bool, foreground: Bool, until: Double) in Residency.shared.setWanted(wanted, foreground: foreground, until: until) }
    Function("status") { () -> [String: Any] in Residency.shared.status() }
  }
}
