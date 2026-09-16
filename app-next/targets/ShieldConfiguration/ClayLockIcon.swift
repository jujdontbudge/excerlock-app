import UIKit

/// A solid lock in the app's button orange; the shield renders it centred at about 96pt.
enum ClayLockIcon {
  private static let canvas = CGSize(width: 256, height: 256)

  static func make(tint: UIColor) -> UIImage? {
    let config = UIImage.SymbolConfiguration(pointSize: 200, weight: .bold)
    guard let symbol = UIImage(systemName: "lock.fill", withConfiguration: config) else { return nil }
    let format = UIGraphicsImageRendererFormat.default()
    format.opaque = false
    let renderer = UIGraphicsImageRenderer(size: canvas, format: format)
    return renderer.image { _ in
      let size = symbol.size
      let scale = min(canvas.width / size.width, canvas.height / size.height)
      let drawn = CGSize(width: size.width * scale, height: size.height * scale)
      let origin = CGPoint(x: (canvas.width - drawn.width) / 2, y: (canvas.height - drawn.height) / 2)
      symbol.withTintColor(tint, renderingMode: .alwaysOriginal).draw(in: CGRect(origin: origin, size: drawn))
    }
  }
}
