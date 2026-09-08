# runtime

Composition boundary that supplies ports to features.

`devFlag.ts` is the single release-hygiene gate for developer-only routes and runtime controls. It is enabled
only by `__DEV__` or an explicit `EXPO_PUBLIC_DEV_MENU=1` build environment value.
