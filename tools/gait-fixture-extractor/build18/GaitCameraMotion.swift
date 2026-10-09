import CoreImage
import ImageIO
import Vision

final class GaitCameraMotion {
  private var previous: CVPixelBuffer?
  private var previousAt: Double?
  private let context = CIContext(options: [.cacheIntermediates: false])

  func reset() { previous = nil; previousAt = nil }

  func estimate(_ image: CVPixelBuffer, at: Double, orientation: CGImagePropertyOrientation, excluding: [CGRect]) -> [String: Double] {
    defer { previous = image; previousAt = at }
    let unavailable = ["x": 0.0, "y": 0.0, "quality": 0.0]
    guard let previous, let previousAt, at > previousAt, at - previousAt <= 200 else { return unavailable }
    let request = VNGenerateOpticalFlowRequest(targetedCVPixelBuffer: previous, orientation: orientation, options: [:])
    request.computationAccuracy = .low
    request.outputPixelFormat = kCVPixelFormatType_TwoComponent32Float
    do {
      try VNImageRequestHandler(cvPixelBuffer: image, orientation: orientation, options: [:]).perform([request])
      guard let flow = request.results?.first?.pixelBuffer else { return unavailable }
      CVPixelBufferLockBaseAddress(flow, .readOnly)
      defer { CVPixelBufferUnlockBaseAddress(flow, .readOnly) }
      guard let base = CVPixelBufferGetBaseAddress(flow) else { return unavailable }
      let width = CVPixelBufferGetWidth(flow), height = CVPixelBufferGetHeight(flow), stride = CVPixelBufferGetBytesPerRow(flow) / MemoryLayout<Float>.stride
      let pointer = base.assumingMemoryBound(to: Float.self)
      var vectors: [(Double, Double)] = []
      for y in Swift.stride(from: 4, to: height - 4, by: 12) {
        for x in Swift.stride(from: 4, to: width - 4, by: 12) {
          let location = CGPoint(x: Double(x) / Double(width), y: 1 - Double(y) / Double(height))
          if excluding.contains(where: { $0.contains(location) }) { continue }
          let vx = Double(pointer[y * stride + x * 2]) / Double(width)
          let vy = Double(pointer[y * stride + x * 2 + 1]) / Double(height)
          if vx.isFinite && vy.isFinite { vectors.append((vx, vy)) }
        }
      }
      guard vectors.count >= 60 else { return unavailable }
      let xs = vectors.map { $0.0 }.sorted(), ys = vectors.map { $0.1 }.sorted()
      let mx = xs[xs.count / 2], my = ys[ys.count / 2]
      let inliers = vectors.filter { hypot($0.0 - mx, $0.1 - my) < 0.003 }
      let texture = backgroundTexture(image, orientation: orientation, excluding: excluding)
      let quality = texture >= 0.01 ? Double(inliers.count) / Double(vectors.count) : 0
      return ["x": mx, "y": my, "quality": quality]
    } catch { return unavailable }
  }

  private func backgroundTexture(_ image: CVPixelBuffer, orientation: CGImagePropertyOrientation, excluding: [CGRect]) -> Double {
    let oriented = CIImage(cvPixelBuffer: image).oriented(forExifOrientation: Int32(orientation.rawValue))
    let width = 96, height = 128
    let scaled = oriented.transformed(by: CGAffineTransform(scaleX: Double(width) / oriented.extent.width, y: Double(height) / oriented.extent.height))
    var bytes = [UInt8](repeating: 0, count: width * height * 4)
    context.render(scaled, toBitmap: &bytes, rowBytes: width * 4, bounds: CGRect(x: 0, y: 0, width: width, height: height), format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
    var gradients: [Double] = []
    for y in Swift.stride(from: 1, to: height - 1, by: 3) {
      for x in Swift.stride(from: 1, to: width - 1, by: 3) {
        let location = CGPoint(x: Double(x) / Double(width), y: Double(y) / Double(height))
        if excluding.contains(where: { $0.contains(location) }) { continue }
        let offset = (y * width + x) * 4
        gradients.append((abs(Double(bytes[offset]) - Double(bytes[offset - 4])) + abs(Double(bytes[offset]) - Double(bytes[offset - width * 4]))) / 510)
      }
    }
    guard !gradients.isEmpty else { return 0 }
    return gradients.reduce(0, +) / Double(gradients.count)
  }
}
