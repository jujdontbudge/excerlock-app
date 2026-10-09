import AVFoundation
import Foundation
import ImageIO
import Vision
import CoreImage

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
let analyzer = GaitFrameAnalyzer()
let context = CIContext(options: [.cacheIntermediates: false])
var sequence: UInt64 = 0

func cameraSize(_ input: CVPixelBuffer) -> CVPixelBuffer? {
  let source = CIImage(cvPixelBuffer: input).oriented(forExifOrientation: Int32(imageOrientation.rawValue))
  let extent = source.extent
  let scale = 640 / max(extent.width, extent.height)
  let width = Int((extent.width * scale).rounded()), height = Int((extent.height * scale).rounded())
  var result: CVPixelBuffer?
  let attributes: [CFString: Any] = [kCVPixelBufferIOSurfacePropertiesKey: [:]]
  guard CVPixelBufferCreate(kCFAllocatorDefault, width, height, kCVPixelFormatType_32BGRA, attributes as CFDictionary, &result) == kCVReturnSuccess, let result else { return nil }
  let normalized = source.transformed(by: CGAffineTransform(translationX: -extent.minX, y: -extent.minY)).transformed(by: CGAffineTransform(scaleX: scale, y: scale))
  context.render(normalized, to: result)
  return result
}

while let buffer = output.copyNextSampleBuffer() {
  framesRead += 1
  let presentationMs = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(buffer)) * 1_000
  guard presentationMs.isFinite else { continue }
  if originMs == nil { originMs = presentationMs }
  let captureMs = presentationMs - originMs!
  guard captureMs + 0.5 - lastEmittedMs >= minimumFrameIntervalMs else { continue }
  lastEmittedMs = captureMs
  sequence += 1
  guard captureMs >= analysisEndMs else {
    analyzer.reset()
    samples.append(["timestampMs": captureMs, "captureTimestampMs": captureMs, "analysisTimestampMs": analysisEndMs, "sequence": sequence, "empty": true, "landmarks": [String: Any]()])
    continue
  }
  guard let original = CMSampleBufferGetImageBuffer(buffer), let pixelBuffer = cameraSize(original) else { continue }
  framesAnalysed += 1
  var sample = analyzer.analyze(pixelBuffer, captureMs: captureMs, sequence: sequence, orientation: .up)
  let timing = sample["timing"] as? [String: Double] ?? [:]
  analysisEndMs = captureMs + (timing["totalMs"] ?? 0)
  sample["analysisTimestampMs"] = analysisEndMs
  if let joints = sample["landmarks"] as? [String: [String: Double]],
     ["leftShoulder", "rightShoulder", "leftHip", "rightHip"].allSatisfy({ (joints[$0]?["confidence"] ?? 0) >= 0.6 }) { framesWithFullTorso += 1 }
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

let document: [String: Any] = ["samples": rebased, "extraction": ["version": 3, "payload": "build18", "targetFps": targetFps, "orientation": imageOrientation.rawValue, "timing": "capture PTS plus measured serial Vision duration; busy frames explicit empty; macOS timing", "transform": [transform.a, transform.b, transform.c, transform.d, transform.tx, transform.ty]]]
let data = try JSONSerialization.data(withJSONObject: document, options: [.prettyPrinted, .sortedKeys])
try data.write(to: URL(fileURLWithPath: outputPath))

let summary = """
{"input":"\(inputPath)","framesRead":\(framesRead),"framesAnalysed":\(framesAnalysed),\
"samplesEmitted":\(rebased.count),"framesWithConfidentTorso":\(framesWithFullTorso)}
"""
print(summary)
