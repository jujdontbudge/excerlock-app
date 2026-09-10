import SwiftUI

struct TotalActivityView: View {
  let totalActivity: String

  var body: some View {
    Text(totalActivity)
  }
}

// In order to support previews for this extension's custom views, make sure
// its source files are members of the app's Xcode target as well as members
// of the extension's target. Use Xcode's File Inspector to modify a file's
// Target Membership.
#Preview {
  TotalActivityView(totalActivity: "1h 23m")
}
