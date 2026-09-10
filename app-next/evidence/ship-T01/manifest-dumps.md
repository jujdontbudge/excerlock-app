# Manifest dumps (excerpts from actual generated `ios/`, run 4)

Full files live in gitignored `app-next/ios/`; these excerpts are the evidence
record. Verified against the files on disk 2026-09-10 UTC.

## Main entitlements (`ios/ExcerLock/ExcerLock.entitlements`)

`aps-environment=development`, `applesignin=[Default]`,
`associated-domains=[applinks:excerlock.com]`, `family-controls=true`,
`healthkit=true`, `healthkit.background-delivery=true`,
`application-groups=[group.com.johansardar.excerlock]`.

## Appe x entitlements (all three `targets/*/generated.entitlements`, identical shape)

`family-controls=true` + `application-groups=[group.com.johansardar.excerlock]`
only. No healthkit/applesignin/aps/associated-domains keys.

## Info.plist usage values

- Motion: `ExcerLock uses Motion & Fitness data to verify that you're walking during Walk & Scroll sessions.`
- Camera: `Allow ExcerLock to use the front camera to verify treadmill walking while the app is open.`
- WhenInUse: `Allow ExcerLock to check whether you are at a saved gym and keep a Walk Session active.`
- AlwaysAndWhenInUse + Always: `Allow ExcerLock to detect arrivals at saved gyms when you opt into auto-detect.`
- HealthShare: `ExcerLock reads your activity to detect completed fitness conditions on this device.`
- FaceID: `Allow $(PRODUCT_NAME) to access your Face ID biometric data.` (expo-secure-store default)
- PhotoLibrary: `Allow ExcerLock to use a photo as a condition banner.`
- Tracking: `ExcerLock does not track you across apps or websites. No tracking prompt is shown in v1.`

## PrivacyInfo (`ios/ExcerLock/PrivacyInfo.xcprivacy`)

`NSPrivacyTracking=false`; collected: ProductInteraction(Analytics),
CrashData(AppFunctionality), PerformanceData(AppFunctionality),
DeviceID(Analytics+AppFunctionality, linked), PurchaseHistory(AppFunctionality,
linked), UserID(AppFunctionality, linked); reasons: CA92.1 (UserDefaults),
C617.1 (FileTimestamp), 35F9.1 (SystemBootTime), E174.1 (DiskSpace).

## Xcode targets (`project.pbxproj`)

`DeviceActivityMonitorExtension=com.johansardar.excerlock.monitor`,
`ShieldConfiguration=com.johansardar.excerlock.shield`,
`ShieldAction=com.johansardar.excerlock.shieldaction`; all `17.4`,
`AX3C2B78YD`, `../targets/<Dir>/generated.entitlements`. App target
`CODE_SIGN_ENTITLEMENTS=ExcerLock/ExcerLock.entitlements` (both configs).
AppDelegate carries `@_silgen_name` + `setupHealthKitBackgroundDelivery()` and
the `.mm` bridge is in app Sources.
