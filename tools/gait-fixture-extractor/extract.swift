// Offline gait-fixture extractor (#118).
//
// Runs the SAME Vision request the on-device module runs
// (VNDetectHumanBodyPoseRequest, largest-central-body selection, y flipped to
// screen space) over a video file, and emits GaitKeypointSample JSON that the
// FixtureGaitVisionProvider can replay. Fixtures therefore reproduce
// production behaviour rather than approximating it.
//
// Usage: swift extract.swift <video> <out.json> [targetFps]

import AVFoundation
import Foundation
import Vision

let gaitJointNames: [(eventName: String, visionName: VNHumanBodyPoseObservation.JointName)] = [
  ("leftShoulder", .leftShoulder),
  ("rightShoulder", .rightShoulder),
  ("leftHip", .leftHip),
  ("rightHip", .rightHip)
]

struct BodyMetrics {
  let area: CGFloat
  let centerDistanceSquared: CGFloat
}

func bodyMetrics(_ observation: VNHumanBodyPoseObservation) -> BodyMetrics? {
  guard let recognized = try? observation.recognizedPoints(.all) else { return nil }
  let points = recognized.values.filter { $0.confidence > 0 }
  guard let first = points.first else { return nil }
  var minimumX = first.location.x, maximumX = first.location.x
  var minimumY = first.location.y, maximumY = first.location.y
  for point in points.dropFirst() {
    minimumX = min(minimumX, point.location.x)
    maximumX = max(maximumX, point.location.x)
    minimumY = min(minimumY, point.location.y)
    maximumY = max(maximumY, point.location.y)
  }
  let centerX = (minimumX + maximumX) / 2
  let centerY = (minimumY + maximumY) / 2
  let offsetX = centerX - 0.5
  let offsetY = centerY - 0.5
  return BodyMetrics(
    area: (maximumX - minimumX) * (maximumY - minimumY),
    centerDistanceSquared: offsetX * offsetX + offsetY * offsetY
  )
}

/// Mirrors largestCentralBody() in GaitVisionPayloads.swift.
func largestCentralBody(_ observations: [VNHumanBodyPoseObservation]) -> VNHumanBodyPoseObservation? {
  observations.compactMap { observation -> (VNHumanBodyPoseObservation, BodyMetrics)? in
    guard let metrics = bodyMetrics(observation) else { return nil }
    return (observation, metrics)
  }.max { left, right in
    if left.1.area == right.1.area {
      return left.1.centerDistanceSquared > right.1.centerDistanceSquared
    }
    return left.1.area < right.1.area
  }?.0
}

let arguments = CommandLine.arguments
guard arguments.count >= 3 else {
  FileHandle.standardError.write(
    "usage: swift extract.swift <video> <out.json> [targetFps]\n".data(using: .utf8)!
  )
  exit(2)
}
let inputPath = arguments[1]
let outputPath = arguments[2]
let targetFps = arguments.count > 3 ? (Double(arguments[3]) ?? 15) : 15
let minimumFrameIntervalMs = 1_000.0 / targetFps

let asset = AVURLAsset(url: URL(fileURLWithPath: inputPath))
var videoTrack: AVAssetTrack?
var loadFailure: Error?
let loadSemaphore = DispatchSemaphore(value: 0)
Task {
  do { videoTrack = try await asset.loadTracks(withMediaType: .video).first } catch { loadFailure = error }
  loadSemaphore.signal()
}
loadSemaphore.wait()

if let loadFailure {
  FileHandle.standardError.write("failed to load tracks: \(loadFailure)\n".data(using: .utf8)!)
  exit(1)
}
guard let track = videoTrack else {
  FileHandle.standardError.write("no video track in \(inputPath)\n".data(using: .utf8)!)
  exit(1)
}

let reader: AVAssetReader
do { reader = try AVAssetReader(asset: asset) } catch {
  FileHandle.standardError.write("reader init failed: \(error)\n".data(using: .utf8)!)
  exit(1)
}
let output = AVAssetReaderTrackOutput(
  track: track,
  outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
)
output.alwaysCopiesSampleData = false
reader.add(output)
reader.startReading()

var samples: [[String: Any]] = []
var framesRead = 0
var framesAnalysed = 0
var framesWithFullTorso = 0
var lastEmittedMs = -Double.greatestFiniteMagnitude

while let buffer = output.copyNextSampleBuffer() {
  framesRead += 1
  let presentationMs = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(buffer)) * 1_000
  guard presentationMs - lastEmittedMs >= minimumFrameIntervalMs else { continue }
  guard let pixelBuffer = CMSampleBufferGetImageBuffer(buffer) else { continue }
  lastEmittedMs = presentationMs
  framesAnalysed += 1

  let request = VNDetectHumanBodyPoseRequest()
  let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: .up, options: [:])
  do { try handler.perform([request]) } catch { continue }

  let observations = (request.results ?? []) as [VNHumanBodyPoseObservation]
  guard let body = largestCentralBody(observations) else {
    samples.append(["timestampMs": presentationMs, "landmarks": [String: Any]()])
    continue
  }

  var landmarks: [String: Any] = [:]
  for joint in gaitJointNames {
    guard let point = try? body.recognizedPoint(joint.visionName), point.confidence > 0 else { continue }
    landmarks[joint.eventName] = [
      "x": Double(point.location.x),
      "y": 1 - Double(point.location.y),
      "confidence": Double(point.confidence)
    ]
  }
  if landmarks.count == gaitJointNames.count {
    let confident = gaitJointNames.allSatisfy { joint in
      guard let entry = landmarks[joint.eventName] as? [String: Double],
            let confidence = entry["confidence"] else { return false }
      return confidence >= 0.6
    }
    if confident { framesWithFullTorso += 1 }
  }
  samples.append(["timestampMs": presentationMs, "landmarks": landmarks])
}

if reader.status == .failed {
  FileHandle.standardError.write("read failed: \(String(describing: reader.error))\n".data(using: .utf8)!)
  exit(1)
}

// Rebase timestamps to zero so fixtures are independent of source trim points.
let baseMs = samples.compactMap { $0["timestampMs"] as? Double }.min() ?? 0
let rebased = samples.map { sample -> [String: Any] in
  var copy = sample
  copy["timestampMs"] = ((sample["timestampMs"] as? Double ?? 0) - baseMs).rounded()
  return copy
}

let data = try JSONSerialization.data(withJSONObject: rebased, options: [.prettyPrinted, .sortedKeys])
try data.write(to: URL(fileURLWithPath: outputPath))

let summary = """
{"input":"\(inputPath)","framesRead":\(framesRead),"framesAnalysed":\(framesAnalysed),\
"samplesEmitted":\(rebased.count),"framesWithConfidentTorso":\(framesWithFullTorso)}
"""
print(summary)
