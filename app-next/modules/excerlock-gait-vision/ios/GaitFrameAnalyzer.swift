import Foundation
import ImageIO
import Vision

final class GaitFrameAnalyzer {
  private let pose = VNDetectHumanBodyPoseRequest()
  private let face = VNDetectFaceRectanglesRequest()
  private let motion = GaitCameraMotion()
  func reset() { motion.reset() }

  func analyze(_ image: CVPixelBuffer, captureMs: Double, sequence: UInt64, orientation: CGImagePropertyOrientation) -> GaitVisionPayload {
    let start = ProcessInfo.processInfo.systemUptime
    let handler = VNImageRequestHandler(cvPixelBuffer: image, orientation: orientation, options: [:])
    var poseMs = 0.0, faceMs = 0.0, motionMs = 0.0
    var payload: GaitVisionPayload = ["landmarks": [String: Any](), "empty": true]
    do {
      try handler.perform([pose]); poseMs = (ProcessInfo.processInfo.systemUptime - start) * 1000
      let faceStart = ProcessInfo.processInfo.systemUptime
      try handler.perform([face]); faceMs = (ProcessInfo.processInfo.systemUptime - faceStart) * 1000
      let selectedFace = largestFace(face.results ?? [])
      let associated = associatedBody(pose.results ?? [], face: selectedFace)
      payload = gaitVisionPayload(body: associated.body, face: selectedFace)
      payload["empty"] = associated.body == nil && selectedFace == nil
      payload["bodyAssociated"] = associated.body != nil
      payload["associationAmbiguous"] = associated.ambiguous
      var excluded: [CGRect] = []
      if let body = associated.body, let bounds = bodyBounds(body) { excluded.append(bounds.insetBy(dx: -0.04, dy: -0.04)) }
      if let face = selectedFace {
        let box = face.boundingBox
        excluded.append(CGRect(x: box.midX - box.width * 1.7, y: box.minY - box.height * 4, width: box.width * 3.4, height: box.height * 5.3))
      }
      let motionStart = ProcessInfo.processInfo.systemUptime
      payload["cameraMotion"] = motion.estimate(image, at: captureMs, orientation: orientation, excluding: excluded)
      motionMs = (ProcessInfo.processInfo.systemUptime - motionStart) * 1000
    } catch { motion.reset() }
    payload["timestampMs"] = captureMs
    payload["captureTimestampMs"] = captureMs
    payload["sequence"] = sequence
    payload["analysisTimestampMs"] = Date().timeIntervalSince1970 * 1000
    payload["timing"] = ["poseMs": poseMs, "faceMs": faceMs, "motionMs": motionMs, "totalMs": (ProcessInfo.processInfo.systemUptime - start) * 1000]
    return payload
  }
}
