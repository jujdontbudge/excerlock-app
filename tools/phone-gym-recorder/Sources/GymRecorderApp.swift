import SwiftUI

@main
struct GymRecorderApp: App {
    @StateObject private var controller = CaptureController()

    var body: some Scene {
        WindowGroup {
            GymRecorderHomeView(controller: controller)
                .preferredColorScheme(.light)
        }
    }
}
