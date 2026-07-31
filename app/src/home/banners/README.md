# Condition banners

This module owns the banner choice attached to each saved condition.

- `bannerCatalog.ts` is the typed manifest for the 21 approved Family C
  painted banners in `design/banners`. It also chooses a deterministic default
  from the condition catalog's activity family.
- `bannerPhotoPicker.ts` is the system-boundary adapter for selecting and
  cropping an own-photo banner. The builder depends on the small
  `BannerPhotoPicker` interface so the whole save flow is testable without
  opening the operating-system picker.
- Banner selections are local-only values persisted beside their condition in
  Home's AsyncStorage store. Curated choices persist by id; own photos persist
  by the local URI returned by Expo Image Picker.

Do not add assets here. New visual assets must first satisfy `design/STYLE.md`
and be recorded in `design/banners/FOUNDRY.md`.
