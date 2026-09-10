import ManagedSettings
import ManagedSettingsUI
import UIKit

private enum ShieldPalette {
  static let ivory = UIColor(hex: 0xF4F1F5, alpha: 0.94)
  static let clayGray = UIColor(hex: 0xC9C4CC)
  static let orange = UIColor(hex: 0xF98529)
  static let text = UIColor(hex: 0x2F2932)
  static let secondaryText = UIColor(hex: 0x6E6871)
}

private struct ShieldActions {
  let primaryActionLabel: String
  let secondaryActionLabel: String?
}

extension UIColor {
  convenience init(hex: UInt32, alpha: CGFloat = 1) {
    self.init(
      red: CGFloat((hex >> 16) & 0xFF) / 255,
      green: CGFloat((hex >> 8) & 0xFF) / 255,
      blue: CGFloat(hex & 0xFF) / 255,
      alpha: alpha
    )
  }
}

private func makeShieldConfiguration() -> ShieldConfiguration {
  let content = ShieldContentCatalog().current()
  let actions = shieldActions(for: content)
  return ShieldConfiguration(
    backgroundBlurStyle: .systemUltraThinMaterialLight,
    backgroundColor: ShieldPalette.ivory,
    icon: ClayLockIcon.make(),
    title: .init(text: content.variant.title, color: ShieldPalette.text),
    subtitle: .init(text: content.variant.subtitle, color: ShieldPalette.secondaryText),
    primaryButtonLabel: .init(text: actions.primaryActionLabel, color: .white),
    primaryButtonBackgroundColor: ShieldPalette.orange,
    secondaryButtonLabel: actions.secondaryActionLabel.map {
      .init(text: $0, color: ShieldPalette.secondaryText)
    }
  )
}

private func shieldActions(for content: ResolvedShieldContent) -> ShieldActions {
  if content.cause == .lockWindow {
    return ShieldActions(
      primaryActionLabel: content.variant.primaryActionLabel,
      secondaryActionLabel: nil
    )
  }
  if content.routeHomeAvailable {
    return ShieldActions(
      primaryActionLabel: content.variant.primaryActionLabel,
      secondaryActionLabel: content.variant.secondaryActionLabel
    )
  }
  return ShieldActions(
    primaryActionLabel: "Close",
    secondaryActionLabel: nil
  )
}

/// Renders the same cause-driven ExcerLock treatment for app, category, and web shields.
/// Apple tokens and display names are deliberately ignored.
final class ShieldConfigurationExtension: ShieldConfigurationDataSource {
  override func configuration(shielding application: Application) -> ShieldConfiguration {
    makeShieldConfiguration()
  }

  override func configuration(
    shielding application: Application,
    in category: ActivityCategory
  ) -> ShieldConfiguration {
    makeShieldConfiguration()
  }

  override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
    makeShieldConfiguration()
  }

  override func configuration(
    shielding webDomain: WebDomain,
    in category: ActivityCategory
  ) -> ShieldConfiguration {
    makeShieldConfiguration()
  }
}
