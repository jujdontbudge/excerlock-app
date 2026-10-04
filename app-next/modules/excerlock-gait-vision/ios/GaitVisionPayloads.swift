import Foundation
import Vision

typealias GaitVisionPayload = [String: Any]

private let gaitJointNames: [(String, VNHumanBodyPoseObservation.JointName)] = [
  ("leftShoulder", .leftShoulder), ("rightShoulder", .rightShoulder),
  ("leftHip", .leftHip), ("rightHip", .rightHip), ("nose", .nose),
  ("leftEar", .leftEar), ("rightEar", .rightEar), ("neck", .neck),
  ("leftKnee", .leftKnee), ("rightKnee", .rightKnee),
  ("leftAnkle", .leftAnkle), ("rightAnkle", .rightAnkle)
]

func gaitVisionPayload(body: VNHumanBodyPoseObservation?, face: VNFaceObservation?, receivedAt: Date = Date()) -> GaitVisionPayload {
  var landmarks: [String: GaitVisionPayload] = [:]
  if let body {
    for (name, joint) in gaitJointNames {
      guard let point = try? body.recognizedPoint(joint) else { continue }
      landmarks[name] = ["x": Double(point.location.x), "y": 1 - Double(point.location.y), "confidence": Double(point.confidence)]
    }
  }
  var payload: GaitVisionPayload = ["timestampMs": receivedAt.timeIntervalSince1970 * 1_000, "landmarks": landmarks]
  if let face {
    let box = face.boundingBox
    payload["head"] = ["x": Double(box.midX), "y": 1 - Double(box.midY), "height": Double(box.height), "confidence": Double(face.confidence)]
  }
  return payload
}

func largestFace(_ observations: [VNFaceObservation]) -> VNFaceObservation? {
  observations.max { $0.boundingBox.height < $1.boundingBox.height }
}

func bodyBounds(_ observation: VNHumanBodyPoseObservation) -> CGRect? {
  guard let recognized = try? observation.recognizedPoints(.all) else { return nil }
  let points = recognized.values.filter { $0.confidence > 0.3 }
  guard let first = points.first else { return nil }
  var minX = first.location.x, maxX = minX, minY = first.location.y, maxY = minY
  for point in points.dropFirst() {
    minX = min(minX, point.location.x); maxX = max(maxX, point.location.x)
    minY = min(minY, point.location.y); maxY = max(maxY, point.location.y)
  }
  return CGRect(x: minX, y: minY, width: maxX - minX, height: maxY - minY)
}

func largestCentralBody(_ observations: [VNHumanBodyPoseObservation]) -> VNHumanBodyPoseObservation? {
  observations.compactMap { body -> (VNHumanBodyPoseObservation, CGRect)? in
    guard let box = bodyBounds(body) else { return nil }; return (body, box)
  }.max { a, b in
    let aa = a.1.width * a.1.height, ba = b.1.width * b.1.height
    if aa == ba { return pow(a.1.midX - 0.5, 2) + pow(a.1.midY - 0.5, 2) > pow(b.1.midX - 0.5, 2) + pow(b.1.midY - 0.5, 2) }
    return aa < ba
  }?.0
}

func associatedBody(_ observations: [VNHumanBodyPoseObservation], face: VNFaceObservation?) -> (body: VNHumanBodyPoseObservation?, ambiguous: Bool) {
  guard let face else { return (nil, false) }
  let box = face.boundingBox
  let candidates = observations.compactMap { body -> (VNHumanBodyPoseObservation, Double)? in
    guard let nose = try? body.recognizedPoint(.nose), nose.confidence >= 0.5,
          box.insetBy(dx: -box.width * 0.2, dy: -box.height * 0.2).contains(nose.location),
          let neck = try? body.recognizedPoint(.neck), neck.confidence >= 0.4,
          abs(neck.location.x - box.midX) < box.width,
          neck.location.y < box.midY,
          box.midY - neck.location.y < box.height * 2.5 else { return nil }
    let distance = hypot((nose.location.x - box.midX) / box.width, (nose.location.y - box.midY) / box.height)
    return (body, Double(distance))
  }.sorted { $0.1 < $1.1 }
  guard let first = candidates.first else { return (nil, false) }
  if candidates.count > 1 && candidates[1].1 - first.1 < 0.25 { return (nil, true) }
  return (first.0, false)
}
