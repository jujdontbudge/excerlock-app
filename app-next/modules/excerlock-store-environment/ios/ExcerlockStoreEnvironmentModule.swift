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
    AsyncFunction("xcodeEntitlementTransactions") { () async -> [String] in
      var transactions: [String] = []
      for await result in Transaction.currentEntitlements {
        if case .verified(let transaction) = result, transaction.environment == .xcode {
          transactions.append(result.jwsRepresentation)
        }
      }
      return transactions
    }
  }
}
