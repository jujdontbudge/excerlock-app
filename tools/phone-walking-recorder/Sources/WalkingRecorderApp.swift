import SwiftUI

@main
struct WalkingRecorderApp: App {
    @StateObject private var controller = CaptureController()

    var body: some Scene {
        WindowGroup {
            RecorderHomeView(controller: controller)
                .preferredColorScheme(.light)
        }
    }
}
