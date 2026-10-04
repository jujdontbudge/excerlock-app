import AVFoundation
import ExpoModulesCore
import Foundation
import ImageIO
import Vision

final class GaitVisionService: NSObject,
  AVCaptureVideoDataOutputSampleBufferDelegate
{
  private let sessionQueue = DispatchQueue(
    label: "com.johansardar.excerlock.gait-vision.session",
    qos: .userInitiated
  )
  private let visionQueue = DispatchQueue(
    label: "com.johansardar.excerlock.gait-vision.analysis",
    qos: .userInitiated
  )
  private let stateLock = NSLock()
  private let analyzer = GaitFrameAnalyzer()
  private var sequence: UInt64 = 0
  private var generation: UInt64 = 0
  private var anchorWallMs = 0.0
  private var anchorHostSeconds = 0.0
  private var onSample: ((GaitVisionPayload) -> Void)?
  private weak var previewView: GaitVisionPreviewView?
  private var session: AVCaptureSession?
  private var started = false
  private var harnessWriter: AVAssetWriter?
  private var harnessWriterInput: AVAssetWriterInput?
  private var harnessWriterStarted = false

  func start(
    onSample: @escaping (GaitVisionPayload) -> Void,
    completion: @escaping (Result<Void, Exception>) -> Void
  ) {
    let operation = reserveStart()
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      configureAndStart(onSample: onSample, generation: operation, completion: completion)
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
        guard let self else { return }
        if granted {
          self.configureAndStart(onSample: onSample, generation: operation, completion: completion)
        } else {
          completion(.failure(GaitVisionDeniedException()))
        }
      }
    case .denied, .restricted:
      completion(.failure(GaitVisionDeniedException()))
    @unknown default:
      completion(.failure(GaitVisionUnavailableException()))
    }
  }

  func stop(completion: (() -> Void)? = nil) {
    setStopped()
    sessionQueue.async { [weak self] in
      guard let self else {
        completion?()
        return
      }
      self.stateLock.lock()
      let session = self.session
      self.session = nil
      self.stateLock.unlock()
      session?.stopRunning()
      completion?()
    }
  }

  func setPreview(_ view: GaitVisionPreviewView, active: Bool) {
    if active {
      DispatchQueue.main.async { [weak self, weak view] in
        guard let self, let view else { return }
        self.stateLock.lock()
        let currentSession = self.started ? self.session : nil
        self.stateLock.unlock()
        self.previewView?.attach(session: nil)
        self.previewView = view
        view.attach(session: currentSession)
      }
    } else {
      DispatchQueue.main.async { [weak self, weak view] in
        guard let self, let view, self.previewView === view else { return }
        view.attach(session: nil)
        self.previewView = nil
      }
    }
  }

  func beginHarnessCapture(
    id: String,
    completion: @escaping (Result<String, Exception>) -> Void
  ) {
    visionQueue.async { [weak self] in
      guard let self else { return }
      guard self.harnessWriter == nil else {
        completion(.failure(GaitVisionCaptureException()))
        return
      }
      do {
        let directory = try self.harnessCaptureDirectory()
        let safeId = id.replacingOccurrences(
          of: "[^A-Za-z0-9._-]",
          with: "-",
          options: .regularExpression
        )
        let url = directory.appendingPathComponent(safeId).appendingPathExtension("mp4")
        try? FileManager.default.removeItem(at: url)
        let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
        let input = AVAssetWriterInput(
          mediaType: .video,
          outputSettings: [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: 640,
            AVVideoHeightKey: 480,
            AVVideoCompressionPropertiesKey: [
              AVVideoAverageBitRateKey: 700_000,
              AVVideoExpectedSourceFrameRateKey: 15,
              AVVideoMaxKeyFrameIntervalKey: 15
            ]
          ]
        )
        input.expectsMediaDataInRealTime = true
        guard writer.canAdd(input) else {
          throw GaitVisionCaptureException()
        }
        writer.add(input)
        self.harnessWriter = writer
        self.harnessWriterInput = input
        self.harnessWriterStarted = false
        completion(.success(url.absoluteString))
      } catch let exception as Exception {
        completion(.failure(exception))
      } catch {
        completion(.failure(GaitVisionCaptureException()))
      }
    }
  }

  func endHarnessCapture(completion: @escaping () -> Void) {
    visionQueue.async { [weak self] in
      guard let self, let writer = self.harnessWriter else {
        completion()
        return
      }
      let input = self.harnessWriterInput
      let started = self.harnessWriterStarted
      self.harnessWriter = nil
      self.harnessWriterInput = nil
      self.harnessWriterStarted = false
      guard started else {
        writer.cancelWriting()
        completion()
        return
      }
      input?.markAsFinished()
      writer.finishWriting(completionHandler: completion)
    }
  }

  func deleteHarnessCaptures(completion: @escaping (Result<Void, Exception>) -> Void) {
    visionQueue.async { [weak self] in
      guard let self else { return }
      guard self.harnessWriter == nil else {
        completion(.failure(GaitVisionCaptureException()))
        return
      }
      do {
        let directory = try self.harnessCaptureDirectory()
        let files = try FileManager.default.contentsOfDirectory(
          at: directory,
          includingPropertiesForKeys: nil
        )
        for file in files where file.pathExtension == "mp4" {
          try FileManager.default.removeItem(at: file)
        }
        completion(.success(()))
      } catch {
        completion(.failure(GaitVisionCaptureException()))
      }
    }
  }

  func captureOutput(
    _ output: AVCaptureOutput,
    didOutput sampleBuffer: CMSampleBuffer,
    from connection: AVCaptureConnection
  ) {
    appendHarnessFrame(sampleBuffer)
    guard let frame = nextFrame(sampleBuffer), let image = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
    let payload = analyzer.analyze(image, captureMs: frame.timestampMs, sequence: frame.sequence, orientation: .leftMirrored)
    sampleHandler(for: frame.generation)?(payload)
  }

  func captureOutput(_ output: AVCaptureOutput, didDrop sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
    guard let frame = nextFrame(sampleBuffer), isCurrent(frame.generation) else { return }
    analyzer.reset()
    sampleHandler(for: frame.generation)?(["timestampMs": frame.timestampMs, "captureTimestampMs": frame.timestampMs,
      "analysisTimestampMs": Date().timeIntervalSince1970 * 1000, "sequence": frame.sequence,
      "empty": true, "landmarks": [String: Any]()])
  }

  private func nextFrame(_ sample: CMSampleBuffer) -> (timestampMs: Double, sequence: UInt64, generation: UInt64)? {
    let pts = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sample))
    guard pts.isFinite else { return nil }
    stateLock.lock()
    defer { stateLock.unlock() }
    guard started else { return nil }
    sequence += 1
    return (anchorWallMs + (pts - anchorHostSeconds) * 1000, sequence, generation)
  }

  private func reserveStart() -> UInt64 {
    stateLock.lock(); defer { stateLock.unlock() }
    generation += 1
    started = false
    onSample = nil
    return generation
  }

  private func isCurrent(_ operation: UInt64) -> Bool {
    stateLock.lock(); defer { stateLock.unlock() }
    return generation == operation
  }

  private func appendHarnessFrame(_ sampleBuffer: CMSampleBuffer) {
    guard
      let writer = harnessWriter,
      let input = harnessWriterInput
    else { return }
    if !harnessWriterStarted {
      guard writer.startWriting() else { return }
      writer.startSession(atSourceTime: CMSampleBufferGetPresentationTimeStamp(sampleBuffer))
      harnessWriterStarted = true
    }
    if input.isReadyForMoreMediaData {
      input.append(sampleBuffer)
    }
  }

  private func harnessCaptureDirectory() throws -> URL {
    let root = try FileManager.default.url(
      for: .applicationSupportDirectory,
      in: .userDomainMask,
      appropriateFor: nil,
      create: true
    )
    let directory = root.appendingPathComponent(
      "HarnessFootage",
      isDirectory: true
    )
    try FileManager.default.createDirectory(
      at: directory,
      withIntermediateDirectories: true
    )
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    var mutableDirectory = directory
    try mutableDirectory.setResourceValues(values)
    return directory
  }

  private func configureAndStart(
    onSample: @escaping (GaitVisionPayload) -> Void,
    generation: UInt64,
    completion: @escaping (Result<Void, Exception>) -> Void
  ) {
    sessionQueue.async { [weak self] in
      guard let self else { return }
      guard self.isCurrent(generation) else { completion(.success(())); return }
      self.stateLock.lock()
      let previousSession = self.session
      self.stateLock.unlock()
      previousSession?.stopRunning()
      do {
        let session = try self.makeSession()
        guard self.isCurrent(generation) else { completion(.success(())); return }
        self.visionQueue.sync { self.analyzer.reset() }
        guard self.setStarted(session: session, onSample: onSample, generation: generation) else { completion(.success(())); return }
        session.startRunning()
        completion(.success(()))
      } catch let exception as Exception {
        self.setStopped(expected: generation)
        completion(.failure(exception))
      } catch {
        self.setStopped(expected: generation)
        completion(.failure(GaitVisionConfigurationException()))
      }
    }
  }

  private func makeSession() throws -> AVCaptureSession {
    guard let camera = AVCaptureDevice.default(
      .builtInWideAngleCamera,
      for: .video,
      position: .front
    ) else {
      throw GaitVisionUnavailableException()
    }
    let session = AVCaptureSession()
    guard session.canSetSessionPreset(.vga640x480) else {
      throw GaitVisionConfigurationException()
    }
    session.beginConfiguration()
    session.sessionPreset = .vga640x480
    do {
      let input = try AVCaptureDeviceInput(device: camera)
      guard session.canAddInput(input) else {
        throw GaitVisionConfigurationException()
      }
      session.addInput(input)

      let output = AVCaptureVideoDataOutput()
      output.alwaysDiscardsLateVideoFrames = true
      output.videoSettings = [
        kCVPixelBufferPixelFormatTypeKey as String:
          kCVPixelFormatType_420YpCbCr8BiPlanarFullRange
      ]
      output.setSampleBufferDelegate(self, queue: visionQueue)
      guard session.canAddOutput(output) else {
        throw GaitVisionConfigurationException()
      }
      session.addOutput(output)
      session.commitConfiguration()
    } catch {
      session.commitConfiguration()
      throw error
    }

    try camera.lockForConfiguration()
    defer { camera.unlockForConfiguration() }
    let frameDuration = CMTime(value: 1, timescale: 15)
    let supportsFifteenFps = camera.activeFormat.videoSupportedFrameRateRanges
      .contains { range in
        range.minFrameRate <= 15 && range.maxFrameRate >= 15
      }
    guard supportsFifteenFps else {
      throw GaitVisionConfigurationException()
    }
    camera.activeVideoMinFrameDuration = frameDuration
    camera.activeVideoMaxFrameDuration = frameDuration
    return session
  }

  private func sampleHandler(for operation: UInt64) -> ((GaitVisionPayload) -> Void)? {
    stateLock.lock()
    defer { stateLock.unlock() }
    return started && generation == operation ? onSample : nil
  }

  private func setStarted(
    session: AVCaptureSession,
    onSample: @escaping (GaitVisionPayload) -> Void,
    generation operation: UInt64
  ) -> Bool {
    stateLock.lock()
    guard generation == operation else { stateLock.unlock(); return false }
    self.session = session
    self.onSample = onSample
    sequence = 0
    anchorWallMs = Date().timeIntervalSince1970 * 1000
    anchorHostSeconds = CMTimeGetSeconds(CMClockGetTime(CMClockGetHostTimeClock()))
    started = true
    stateLock.unlock()
    DispatchQueue.main.async { [weak self] in
      guard let self, self.isCurrent(operation) else { return }
      self.previewView?.attach(session: session)
    }
    return true
  }

  @discardableResult
  private func setStopped(expected: UInt64? = nil) -> Bool {
    stateLock.lock()
    if let expected, generation != expected { stateLock.unlock(); return false }
    started = false
    generation += 1
    onSample = nil
    stateLock.unlock()
    DispatchQueue.main.async { [weak self] in
      self?.previewView?.attach(session: nil)
    }
    return true
  }
}
