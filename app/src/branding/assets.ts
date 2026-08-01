/**
 * The single source of truth for ExcerLock's launch branding.
 *
 * These constants are the contract between `app.json`, the Family E foundry
 * scripts, and the guardrails. Changing a path or the background here without
 * regenerating the assets fails the branding tests rather than shipping a build
 * with a missing or mismatched icon.
 */

/** Flat single-stop orange — the midpoint of the palette's #F98529 → #EB2E02. */
export const ICON_BACKGROUND = "#F25A16";

export const ICON_PATH = "./assets/icon.png";

export const SPLASH_LOGO_PATH = "./assets/splash-logo.png";

/** Splash logo width in points, passed to expo-splash-screen's `imageWidth`. */
export const SPLASH_LOGO_WIDTH = 180;
