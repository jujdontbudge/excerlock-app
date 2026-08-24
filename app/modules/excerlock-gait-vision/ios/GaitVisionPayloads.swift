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

func gaitVisionPayload(
  _ observation: VNHumanBodyPoseObservation,
  receivedAt: Date = Date()
) -> GaitVisionPayload {
  var landmarks: [String: GaitVisionPayload] = [:]
  for joint in gaitJointNames {
    guard let point = try? observation.recognizedPoint(joint.visionName) else {
      continue
    }
    landmarks[joint.eventName] = [
      "x": Double(point.location.x),
      "y": 1 - Double(point.location.y),
      "confidence": Double(point.confidence)
    ]
  }
  return [
    "timestampMs": receivedAt.timeIntervalSince1970 * 1_000,
    "landmarks": landmarks
  ]
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
