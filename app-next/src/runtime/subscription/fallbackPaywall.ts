/**
 * B3 — the bundled fallback paywall.
 *
 * Adapty generates one fallback file per platform in the dashboard
 * (Placements → Fallbacks); there is no CLI or API route to export it, so the
 * downloaded JSON is committed as an asset and replaced by hand.
 *
 * Two places must agree on the very same file:
 * - `config/native.ts` passes it to the `react-native-adapty` config plugin as
 *   `fallbackFile.ios`, so `expo prebuild` registers the JSON as an iOS bundle
 *   resource.
 * - the adapter registers the matching basename with `setFallback` during
 *   activation, before the first placement load.
 *
 * The iOS SDK resolves that name against `Bundle.main`, so the fallback ships
 * inside the binary: an EAS Update can change the paywall JS but never this
 * resource, and a fresh export therefore needs a fresh binary.
 */
export const ADAPTY_FALLBACK_FILE_NAME = 'adapty-fallback.json';

/** Repo-relative path, as the Expo config plugin expects it. */
export const ADAPTY_FALLBACK_ASSET_PATH = `./assets/${ADAPTY_FALLBACK_FILE_NAME}`;
