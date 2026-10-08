import ManagedSettings
import ManagedSettingsUI
import UIKit

/// Mirrors app-next/src/design-system/tokens.ts: brand.primary, surface.topTint, text.primary/secondary.
private enum ShieldPalette {
  static let tintedWhite = UIColor(hex: 0xFFF0E5, alpha: 0.96)
  static let orange = UIColor(hex: 0xEA6A12)
  static let text = UIColor(hex: 0x1D1D22)
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
    backgroundBlurStyle: .systemThickMaterialLight,
    backgroundColor: ShieldPalette.tintedWhite,
    icon: ClayLockIcon.make(tint: ShieldPalette.orange),
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
