import AVFoundation
import Foundation
import ImageIO
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
var transform = CGAffineTransform.identity
var loadFailure: Error?
let loadSemaphore = DispatchSemaphore(value: 0)
Task {
  do {
    videoTrack = try await asset.loadTracks(withMediaType: .video).first
    if let track = videoTrack { transform = try await track.load(.preferredTransform) }
  } catch { loadFailure = error }
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

func orientation(_ t: CGAffineTransform) -> CGImagePropertyOrientation {
  let a = Int(t.a.rounded()), b = Int(t.b.rounded()), c = Int(t.c.rounded()), d = Int(t.d.rounded())
  switch (a, b, c, d) {
  case (0, 1, -1, 0): return .right
  case (0, -1, 1, 0): return .left
  case (-1, 0, 0, -1): return .down
  case (-1, 0, 0, 1): return .upMirrored
  case (1, 0, 0, -1): return .downMirrored
  case (0, 1, 1, 0): return .leftMirrored
  case (0, -1, -1, 0): return .rightMirrored
  default: return .up
  }
}
let imageOrientation = orientation(transform)
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
var analysisEndMs = 0.0
var originMs: Double?
let poseRequest = VNDetectHumanBodyPoseRequest()
let faceRequest = VNDetectFaceRectanglesRequest()

while let buffer = output.copyNextSampleBuffer() {
  framesRead += 1
  let presentationMs = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(buffer)) * 1_000
  if originMs == nil { originMs = presentationMs }
  let captureMs = presentationMs - originMs!
  guard captureMs + 0.5 - lastEmittedMs >= minimumFrameIntervalMs, captureMs >= analysisEndMs else { continue }
  guard let pixelBuffer = CMSampleBufferGetImageBuffer(buffer) else { continue }
  lastEmittedMs = captureMs
  framesAnalysed += 1

  let startedAt = ProcessInfo.processInfo.systemUptime
  let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: imageOrientation, options: [:])
  do { try handler.perform([poseRequest, faceRequest]) } catch { continue }
  let elapsedMs = (ProcessInfo.processInfo.systemUptime - startedAt) * 1_000
  analysisEndMs = captureMs + elapsedMs
  let body = largestCentralBody(poseRequest.results ?? [])
  let face = (faceRequest.results ?? []).max { $0.boundingBox.height < $1.boundingBox.height }
  guard body != nil || face != nil else { continue }
  var landmarks: [String: Any] = [:]
  for joint in gaitJointNames {
    guard let body, let point = try? body.recognizedPoint(joint.visionName) else { continue }
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
  var sample: [String: Any] = ["timestampMs": analysisEndMs, "landmarks": landmarks]
  if let face {
    let box = face.boundingBox
    sample["head"] = ["x": Double(box.midX), "y": 1 - Double(box.midY), "height": Double(box.height), "confidence": Double(face.confidence)]
  }
  samples.append(sample)
}

if reader.status == .failed {
  FileHandle.standardError.write("read failed: \(String(describing: reader.error))\n".data(using: .utf8)!)
  exit(1)
}

let rebased = samples.map { sample -> [String: Any] in
  var copy = sample
  copy["timestampMs"] = sample["timestampMs"] as? Double ?? 0
  return copy
}

let document: [String: Any] = ["samples": rebased, "extraction": ["version": 2, "payload": "build17", "targetFps": targetFps, "orientation": imageOrientation.rawValue, "timing": "capture-relative plus measured serial Vision duration", "transform": [transform.a, transform.b, transform.c, transform.d, transform.tx, transform.ty]]]
let data = try JSONSerialization.data(withJSONObject: document, options: [.prettyPrinted, .sortedKeys])
try data.write(to: URL(fileURLWithPath: outputPath))

let summary = """
{"input":"\(inputPath)","framesRead":\(framesRead),"framesAnalysed":\(framesAnalysed),\
"samplesEmitted":\(rebased.count),"framesWithConfidentTorso":\(framesWithFullTorso)}
"""
print(summary)
