import UIKit

/// A solid lock in the app's button orange, drawn edge to edge so it fills the
/// shield's icon frame, with a keyhole cut through the body.
enum ClayLockIcon {
  private static let canvas = CGSize(width: 256, height: 256)

  static func make(tint: UIColor) -> UIImage? {
    let format = UIGraphicsImageRendererFormat.default()
    format.opaque = false
    let renderer = UIGraphicsImageRenderer(size: canvas, format: format)
    return renderer.image { _ in
      let w = canvas.width, h = canvas.height
      // Shackle: thick arc across the top, open at the bottom into the body.
      let shackle = UIBezierPath()
      let stroke: CGFloat = 34
      let radius = w * 0.29
      let center = CGPoint(x: w / 2, y: h * 0.36)
      shackle.addArc(withCenter: center, radius: radius, startAngle: .pi, endAngle: 0, clockwise: true)
      shackle.addLine(to: CGPoint(x: center.x + radius, y: h * 0.46))
      shackle.addLine(to: CGPoint(x: center.x + radius - stroke, y: h * 0.46))
      shackle.addLine(to: CGPoint(x: center.x + radius - stroke, y: center.y))
      shackle.addArc(withCenter: center, radius: radius - stroke, startAngle: 0, endAngle: .pi, clockwise: false)
      shackle.addLine(to: CGPoint(x: center.x - radius + stroke, y: h * 0.46))
      shackle.addLine(to: CGPoint(x: center.x - radius, y: h * 0.46))
      shackle.close()
      // Body: full-width rounded block on the lower 58%.
      let body = UIBezierPath(
        roundedRect: CGRect(x: 0, y: h * 0.42, width: w, height: h * 0.58),
        cornerRadius: 40
      )
      // Keyhole: a disc with a slot below it, cut out of the body.
      let keyhole = UIBezierPath(ovalIn: CGRect(x: w / 2 - 24, y: h * 0.56, width: 48, height: 48))
      keyhole.append(UIBezierPath(
        roundedRect: CGRect(x: w / 2 - 12, y: h * 0.56 + 36, width: 24, height: 52),
        cornerRadius: 12
      ))
      body.append(keyhole)
      body.usesEvenOddFillRule = true
      tint.setFill()
      shackle.fill()
      body.fill()
    }
  }
}
