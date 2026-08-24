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

  func captureOutput(
    _ output: AVCaptureOutput,
    didOutput sampleBuffer: CMSampleBuffer,
    from connection: AVCaptureConnection
  ) {
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
