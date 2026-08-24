import AVFoundation
import ExpoModulesCore

final class GaitVisionPreviewView: ExpoView {
  private let previewLayer = AVCaptureVideoPreviewLayer()

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    previewLayer.videoGravity = .resizeAspectFill
    layer.addSublayer(previewLayer)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer.frame = bounds
  }

  func attach(session: AVCaptureSession?) {
    previewLayer.session = session
    guard
      let connection = previewLayer.connection,
      connection.isVideoMirroringSupported
    else { return }
    connection.automaticallyAdjustsVideoMirroring = false
    connection.isVideoMirrored = true
  }

  deinit {
    previewLayer.session = nil
  }
}
