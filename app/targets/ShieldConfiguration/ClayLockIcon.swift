import UIKit

enum ClayLockIcon {
  private static let canvas = CGSize(width: 256, height: 256)

  static func make() -> UIImage? {
    guard
      let body = UIImage(named: "ClayLockBody", in: .main, compatibleWith: nil),
      let shackle = UIImage(named: "ClayLockShackle", in: .main, compatibleWith: nil)
    else {
      return UIImage(systemName: "lock.fill")?.withTintColor(
        UIColor(hex: 0xC9C4CC),
        renderingMode: .alwaysOriginal
      )
    }

    let format = UIGraphicsImageRendererFormat.default()
    format.opaque = false
    let renderer = UIGraphicsImageRenderer(size: canvas, format: format)
    return renderer.image { _ in
      let bounds = CGRect(origin: .zero, size: canvas)
      shackle.draw(in: bounds)
      body.draw(in: bounds)
    }
  }
}
