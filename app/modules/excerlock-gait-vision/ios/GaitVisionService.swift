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
  private let poseRequest = VNDetectHumanBodyPoseRequest()
  private var frameIndex = 0
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
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      configureAndStart(onSample: onSample, completion: completion)
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
        guard let self else { return }
        if granted {
          self.configureAndStart(onSample: onSample, completion: completion)
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
      self.session?.stopRunning()
      self.session = nil
      completion?()
    }
  }

  func setPreview(_ view: GaitVisionPreviewView, active: Bool) {
    if active {
      stateLock.lock()
      let currentSession = session
      stateLock.unlock()
      DispatchQueue.main.async { [weak self, weak view] in
        guard let self, let view else { return }
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
    guard shouldAnalyzeNextFrame() else { return }
    let handler = VNImageRequestHandler(
      cmSampleBuffer: sampleBuffer,
      orientation: .leftMirrored,
      options: [:]
    )
    do {
      try handler.perform([poseRequest])
      guard
        isStarted,
        let body = largestCentralBody(poseRequest.results ?? [])
      else { return }
      currentSampleHandler()?(gaitVisionPayload(body))
    } catch {
      // A dropped Vision frame is not retained or retried. The gait detector's
      // signal-quality timeout owns user-visible failure handling.
    }
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
    completion: @escaping (Result<Void, Exception>) -> Void
  ) {
    sessionQueue.async { [weak self] in
      guard let self else { return }
      if self.isStarted {
        completion(.success(()))
        return
      }
      do {
        let session = try self.makeSession()
        self.setStarted(session: session, onSample: onSample)
        session.startRunning()
        completion(.success(()))
      } catch let exception as Exception {
        self.setStopped()
        completion(.failure(exception))
      } catch {
        self.setStopped()
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

  private func shouldAnalyzeNextFrame() -> Bool {
    stateLock.lock()
    defer { stateLock.unlock() }
    guard started else { return false }
    frameIndex += 1
    return frameIndex.isMultiple(of: 2)
  }

  private var isStarted: Bool {
    stateLock.lock()
    defer { stateLock.unlock() }
    return started
  }

  private func currentSampleHandler() -> ((GaitVisionPayload) -> Void)? {
    stateLock.lock()
    defer { stateLock.unlock() }
    return onSample
  }

  private func setStarted(
    session: AVCaptureSession,
    onSample: @escaping (GaitVisionPayload) -> Void
  ) {
    stateLock.lock()
    self.session = session
    self.onSample = onSample
    frameIndex = 0
    started = true
    stateLock.unlock()
    DispatchQueue.main.async { [weak self] in
      self?.previewView?.attach(session: session)
    }
  }

  private func setStopped() {
    stateLock.lock()
    started = false
    onSample = nil
    frameIndex = 0
    stateLock.unlock()
    DispatchQueue.main.async { [weak self] in
      self?.previewView?.attach(session: nil)
    }
  }
}
