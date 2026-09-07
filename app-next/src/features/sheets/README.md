# Shared sheets

`FakeAppPicker` is the Phase 1 replacement for Apple's private app-selection UI. It exports only counts and an opaque handle; generic selection keys stay inside the fake picker. `GymPicker` is a thin opener for the full-screen `/gym-picker` route, with optional `placeId` for editing. It preserves the setup/settings callback contract through a one-shot route session.

The app picker still uses BottomSheet. The gym picker now uses a real Apple map and worldwide on-device search; see `../gym-picker/README.md`. Saved gyms remain local, behind GymPort. Closing, saving or unmounting a gym route completes its session at most once.
