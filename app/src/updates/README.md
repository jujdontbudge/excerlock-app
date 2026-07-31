# OTA updates

ExcerLock uses Expo Updates' default launch behavior: release builds check the
linked EAS Update service when the app starts, download a compatible update in
the background, and apply it on the next restart.

Compatibility is derived from the public app version. Every native dependency
or native-module change therefore requires a new app version and store binary
before JS using that native surface may be published as an OTA update.

Build channels are fixed in `app/eas.json`:

- `preview` is an internal-distribution binary pointed at the preview channel.
- `production` is the store binary pointed at the production channel.
- `e2e` remains the exact release-style simulator profile guarded by the test
  harness; it is not an OTA distribution binary.

Publish with the matching EAS environment, for example
`eas update --channel preview --environment preview`. Promote only the same
verified commit to production. The automated configuration test guards the
project URL, runtime policy, channels, and load-bearing Screen Time validator
order.
