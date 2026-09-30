import ExpoModulesCore
import StoreKit

public final class ExcerlockStoreEnvironmentModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExcerlockStoreEnvironment")
    AsyncFunction("verifiedEnvironment") { () async -> String? in
      do {
        let result = try await AppTransaction.shared
        switch result {
        case .verified(let transaction):
          switch transaction.environment {
          case .production: return "production"
          case .sandbox: return "sandbox"
          case .xcode: return nil
          default: return nil
          }
        case .unverified: return nil
        }
      } catch {
        return nil
      }
    }
  }
}
