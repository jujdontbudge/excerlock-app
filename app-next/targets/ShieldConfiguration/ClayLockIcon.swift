import UIKit

/// The Home screen lock, solid in the app's button orange: a tall body with a
/// narrower shackle and a small keyhole, drawn to fill the shield's icon frame
/// top to bottom.
enum ClayLockIcon {
  private static let canvas = CGSize(width: 256, height: 256)

  static func make(tint: UIColor) -> UIImage? {
    let format = UIGraphicsImageRendererFormat.default()
    format.opaque = false
    let renderer = UIGraphicsImageRenderer(size: canvas, format: format)
    return renderer.image { _ in
      let w = canvas.width, h = canvas.height
      let bodyWidth = w * 0.74
      let bodyLeft = (w - bodyWidth) / 2
      let bodyTop = h * 0.40
      // Shackle: narrower than the body, thick stroke, legs sunk into the body.
      let stroke: CGFloat = 30
      let radius = bodyWidth * 0.30
      let center = CGPoint(x: w / 2, y: h * 0.06 + radius)
      let shackle = UIBezierPath()
      shackle.addArc(withCenter: center, radius: radius, startAngle: .pi, endAngle: 0, clockwise: true)
      shackle.addLine(to: CGPoint(x: center.x + radius, y: bodyTop + 4))
      shackle.addLine(to: CGPoint(x: center.x + radius - stroke, y: bodyTop + 4))
      shackle.addLine(to: CGPoint(x: center.x + radius - stroke, y: center.y))
      shackle.addArc(withCenter: center, radius: radius - stroke, startAngle: 0, endAngle: .pi, clockwise: false)
      shackle.addLine(to: CGPoint(x: center.x - radius + stroke, y: bodyTop + 4))
      shackle.addLine(to: CGPoint(x: center.x - radius, y: bodyTop + 4))
      shackle.close()
      // Body: tall rounded block on the lower 60%.
      let body = UIBezierPath(
        roundedRect: CGRect(x: bodyLeft, y: bodyTop, width: bodyWidth, height: h - bodyTop),
        cornerRadius: 36
      )
      // Keyhole: small disc with a slot, centred in the upper half of the body.
      let keyTop = bodyTop + (h - bodyTop) * 0.28
      let keyhole = UIBezierPath(ovalIn: CGRect(x: w / 2 - 17, y: keyTop, width: 34, height: 34))
      keyhole.append(UIBezierPath(
        roundedRect: CGRect(x: w / 2 - 9, y: keyTop + 26, width: 18, height: 40),
        cornerRadius: 9
      ))
      body.append(keyhole)
      body.usesEvenOddFillRule = true
      tint.setFill()
      shackle.fill()
      body.fill()
    }
  }
}
