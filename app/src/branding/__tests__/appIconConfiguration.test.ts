import { readFileSync } from "node:fs";
import { join } from "node:path";

import appConfig from "../../../app.json";
import { ICON_BACKGROUND, ICON_PATH, SPLASH_LOGO_PATH } from "../assets";

const APP_ROOT = join(__dirname, "..", "..", "..");

type PngHeader = { width: number; height: number; colorType: number };

/**
 * Read a PNG's IHDR directly. Apple rejects app icons that carry an alpha
 * channel at all, and that is a property of the file's color type — not
 * something a config assertion can catch.
 */
function readPngHeader(relativePath: string): PngHeader {
  const bytes = readFileSync(join(APP_ROOT, relativePath));

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    colorType: bytes.readUInt8(25),
  };
}

const PNG_TRUECOLOR = 2;
const PNG_TRUECOLOR_ALPHA = 6;

function splashPluginConfig(): Record<string, unknown> {
  // app.json's plugins array is heterogeneous — bare strings alongside
  // [name, config] tuples whose configs share no shape — so it is read as a
  // loose list here rather than fought with a narrowing predicate.
  const plugins = appConfig.expo.plugins as ReadonlyArray<unknown>;
  const entry = plugins.find(
    (plugin): plugin is [string, Record<string, unknown>] =>
      Array.isArray(plugin) && plugin[0] === "expo-splash-screen",
  );

  if (!entry) {
    throw new Error("expo-splash-screen is not configured in app.json");
  }

  return entry[1];
}

describe("app icon and splash configuration", () => {
  it("declares an icon and a splash screen, without which no build ships", () => {
    expect(appConfig.expo.icon).toBe(ICON_PATH);
    expect(splashPluginConfig()).toMatchObject({
      image: SPLASH_LOGO_PATH,
      backgroundColor: ICON_BACKGROUND,
    });
  });

  it("ships an opaque 1024 square icon, because Apple rejects alpha", () => {
    expect(readPngHeader(ICON_PATH)).toEqual({
      width: 1024,
      height: 1024,
      colorType: PNG_TRUECOLOR,
    });
  });

  it("keeps alpha on the splash logo so it sits on the plugin's background", () => {
    const header = readPngHeader(SPLASH_LOGO_PATH);

    expect(header.colorType).toBe(PNG_TRUECOLOR_ALPHA);
    expect(header.width).toBe(header.height);
  });

  it("leaves the Screen Time config validator last", () => {
    expect(appConfig.expo.plugins.at(-1)).toBe(
      "./plugins/withScreenTimeExtensionValidation",
    );
  });
});
