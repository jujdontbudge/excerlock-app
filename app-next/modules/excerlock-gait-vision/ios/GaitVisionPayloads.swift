import Foundation
import Vision

typealias GaitVisionPayload = [String: Any]

private let gaitJointNames: [
  (eventName: String, visionName: VNHumanBodyPoseObservation.JointName)
] = [
  ("leftShoulder", .leftShoulder),
  ("rightShoulder", .rightShoulder),
  ("leftHip", .leftHip),
  ("rightHip", .rightHip)
]

/**
 * One sample per analysed frame. Body landmarks come from pose detection and
 * are absent whenever Vision finds no body — the normal case on a treadmill
 * console, where the phone sees head and shoulders only. The head comes from
 * face detection, which stays reliable at that framing; the gait detector
 * reads walking from head bob when hips are out of view.
 */
func gaitVisionPayload(
  body: VNHumanBodyPoseObservation?,
  face: VNFaceObservation?,
  receivedAt: Date = Date()
) -> GaitVisionPayload {
  var landmarks: [String: GaitVisionPayload] = [:]
  if let body {
    for joint in gaitJointNames {
      guard let point = try? body.recognizedPoint(joint.visionName) else {
        continue
      }
      landmarks[joint.eventName] = [
        "x": Double(point.location.x),
        "y": 1 - Double(point.location.y),
        "confidence": Double(point.confidence)
      ]
    }
  }
  var payload: GaitVisionPayload = [
    "timestampMs": receivedAt.timeIntervalSince1970 * 1_000,
    "landmarks": landmarks
  ]
  if let face {
    let box = face.boundingBox
    payload["head"] = [
      "x": Double(box.midX),
      "y": 1 - Double(box.midY),
      "height": Double(box.height),
      "confidence": Double(face.confidence)
    ]
  }
  return payload
}

func largestFace(_ observations: [VNFaceObservation]) -> VNFaceObservation? {
  observations.max { left, right in
    left.boundingBox.height < right.boundingBox.height
  }
}

func largestCentralBody(
  _ observations: [VNHumanBodyPoseObservation]
) -> VNHumanBodyPoseObservation? {
  observations.compactMap { observation -> BodyCandidate? in
    guard let metrics = bodyMetrics(observation) else { return nil }
    return BodyCandidate(observation: observation, metrics: metrics)
  }.max { left, right in
    if left.metrics.area == right.metrics.area {
      return left.metrics.centerDistanceSquared >
        right.metrics.centerDistanceSquared
    }
    return left.metrics.area < right.metrics.area
  }?.observation
}

private struct BodyCandidate {
  let observation: VNHumanBodyPoseObservation
  let metrics: BodyMetrics
}

private struct BodyMetrics {
  let area: CGFloat
  let centerDistanceSquared: CGFloat
}

private func bodyMetrics(
  _ observation: VNHumanBodyPoseObservation
) -> BodyMetrics? {
  guard let recognized = try? observation.recognizedPoints(.all) else {
    return nil
  }
  let points = recognized.values.filter { $0.confidence > 0 }
  guard let first = points.first else { return nil }
  var minimumX = first.location.x
  var maximumX = first.location.x
  var minimumY = first.location.y
  var maximumY = first.location.y
  for point in points.dropFirst() {
    minimumX = min(minimumX, point.location.x)
    maximumX = max(maximumX, point.location.x)
    minimumY = min(minimumY, point.location.y)
    maximumY = max(maximumY, point.location.y)
  }
  let width = maximumX - minimumX
  let height = maximumY - minimumY
  let centerX = (minimumX + maximumX) / 2
  let centerY = (minimumY + maximumY) / 2
  let offsetX = centerX - 0.5
  let offsetY = centerY - 0.5
  return BodyMetrics(
    area: width * height,
    centerDistanceSquared: offsetX * offsetX + offsetY * offsetY
  )
}
