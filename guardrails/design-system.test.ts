import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { tokens } from "../app-next/src/design-system/tokens";
import { fromRoot, readUtf8, repoRelative, walkFiles } from "./repo-files";

/**
 * Issue #145: one design-system token source and one enforcement seam.
 *
 * The migration ships in waves. An assertion is either off because its wave has not
 * run yet, or on and passing; none is weakened to make a wave pass. Raise this number
 * as each wave lands.
 */
const WAVE = 4;
const staged = (wave: number) => it.runIf(WAVE >= wave);

const tokenModule = "app-next/src/design-system/tokens.ts";
const illustrationModule = "app-next/src/design-system/illustrationTokens.ts";

// ---------------------------------------------------------------------------
// Baloo 2 metrics, read from the shipped font files rather than hardcoded.

type FontMetrics = { digitTop: number; asciiTop: number; accentTop: number; descent: number };

function readFontMetrics(path: string): FontMetrics {
  const bytes = readFileSync(path);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tables: Record<string, number> = {};
  for (let i = 0; i < view.getUint16(4); i++) {
    const at = 12 + i * 16;
    tables[bytes.toString("latin1", at, at + 4)] = view.getUint32(at + 8);
  }
  const [head, hhea, cmap, loca, glyf] = ["head", "hhea", "cmap", "loca", "glyf"].map((tag) => {
    const at = tables[tag];
    if (at === undefined) throw new Error(`${path} has no ${tag} table`);
    return at;
  }) as [number, number, number, number, number];
  const unitsPerEm = view.getUint16(head + 18);
  const longLoca = view.getInt16(head + 50) === 1;
  const descent = -view.getInt16(hhea + 6) / unitsPerEm;

  let format4 = -1;
  for (let i = 0; i < view.getUint16(cmap + 2); i++) {
    const record = cmap + 4 + i * 8;
    const subtable = cmap + view.getUint32(record + 4);
    if (view.getUint16(subtable) === 4) format4 = subtable;
  }
  const segX2 = view.getUint16(format4 + 6);
  const glyphFor = (code: number) => {
    for (let s = 0; s < segX2; s += 2) {
      const end = view.getUint16(format4 + 14 + s);
      if (end < code) continue;
      const start = view.getUint16(format4 + 16 + segX2 + s);
      if (start > code) return 0;
      const delta = view.getInt16(format4 + 16 + 2 * segX2 + s);
      const rangeAt = format4 + 16 + 3 * segX2 + s;
      const range = view.getUint16(rangeAt);
      if (!range) return (code + delta) & 0xffff;
      const glyph = view.getUint16(rangeAt + range + 2 * (code - start));
      return glyph ? (glyph + delta) & 0xffff : 0;
    }
    return 0;
  };
  const glyphTop = (glyph: number) => {
    const glyphOffset = (index: number) =>
      longLoca ? view.getUint32(loca + index * 4) : view.getUint16(loca + index * 2) * 2;
    const start = glyphOffset(glyph);
    return glyphOffset(glyph + 1) > start ? view.getInt16(glyf + start + 8) / unitsPerEm : 0;
  };
  const top = (from: number, to: number) => {
    let max = 0;
    for (let code = from; code <= to; code++) max = Math.max(max, glyphTop(glyphFor(code)));
    return max;
  };
  return { digitTop: top(0x30, 0x39), asciiTop: top(0x20, 0x7e), accentTop: top(0xa0, 0xff), descent };
}

const fontFile = (family: string) => {
  const face = family.replace(/^Baloo2_/, "");
  return fromRoot("node_modules", "@expo-google-fonts", "baloo-2", face, `${family}.ttf`);
};

/** Roles that only ever render digits and separators. */
const numeralRoles = new Set(["metric", "metricSmall"]);
const approvedSizes = [48, 30, 22, 18, 14, 12];
const approvedRoles = ["metric", "display", "metricSmall", "section", "body", "label", "support", "micro"];

// ---------------------------------------------------------------------------
// WCAG contrast, computed the same way as the token unit test.

function luminance(hex: string) {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const [r = 0, g = 0, b = 0] = channels;
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}
function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// ---------------------------------------------------------------------------
// Source scanning.

type Source = { path: string; code: string };

/** Removes comments while keeping string contents and line numbers intact. */
function stripComments(source: string) {
  let out = "";
  let quote: string | null = null;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    const next = source[i + 1];
    if (quote) {
      out += c;
      if (c === "\\") {
        out += next ?? "";
        i++;
      } else if (c === quote) quote = null;
      continue;
    }
    if (c === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      out += "\n";
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) {
        if (source[i] === "\n") out += "\n";
        i++;
      }
      i++;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") quote = c;
    out += c;
  }
  return out;
}

const sources: Source[] = [
  ...walkFiles(fromRoot("app-next", "src"), new Set([".ts", ".tsx"])),
  ...walkFiles(fromRoot("app-next", "app"), new Set([".ts", ".tsx"])),
]
  .filter((path) => !/__tests__|\.test\.tsx?$|\.d\.ts$/.test(path))
  .map((path) => ({ path: repoRelative(path), code: stripComments(readUtf8(path)) }));

const uiSources = sources.filter(({ path }) => path !== tokenModule && path !== illustrationModule);

/** Illustration artwork may read the illustration module; UI chrome may not. */
const illustrationFiles = [
  /^app-next\/src\/features\/onboarding\/condition-demo\//,
  /^app-next\/src\/features\/onboarding\/welcome\/(AppTile|BlockedBadge|BrandMark|WelcomeArtwork|ScheduleCard)\.tsx$/,
  /^app-next\/src\/features\/onboarding\/progress\/(ProgressArtwork|ProgressBars|ProgressBadge|ProgressCurve)\.tsx$/,
  /^app-next\/src\/features\/onboarding\/control\/(ControlArtwork|ActivityTile|LockedAppsRow)\.tsx$/,
  /^app-next\/src\/features\/onboarding\/profile\/ReferralIcon\.tsx$/,
  // Pictograms and padlock artwork are drawn to their own proportions, above the UI icon scale.
  /^app-next\/src\/design-system\/(Pictogram|UnlockLockFrame)\.tsx$/,
  /^app-next\/src\/motion\/LivingIcon\.tsx$/,
  /^app-next\/src\/features\/home\/HomeLockStatus\.tsx$/,
  /^app-next\/src\/features\/rules\/PlanCelebration\.tsx$/,
  /^app-next\/src\/features\/rules\/PlanTrialPreview\.tsx$/,
  /^app-next\/src\/icons\//,
];
const isIllustration = (path: string) => illustrationFiles.some((pattern) => pattern.test(path));

function lineOf(code: string, index: number) {
  return code.slice(0, index).split("\n").length;
}

function findAll(pattern: RegExp, files: Source[] = uiSources) {
  const hits: string[] = [];
  for (const { path, code } of files) {
    for (const match of code.matchAll(pattern)) {
      hits.push(`${path}:${lineOf(code, match.index ?? 0)} ${match[0].trim().slice(0, 90)}`);
    }
  }
  return hits;
}

/** The balanced `{...}` object literal that encloses `index`. */
function enclosingObject(code: string, index: number) {
  let depth = 0;
  let start = index;
  for (; start >= 0; start--) {
    if (code[start] === "}") depth++;
    if (code[start] === "{") {
      if (depth === 0) break;
      depth--;
    }
  }
  depth = 0;
  let end = index;
  for (; end < code.length; end++) {
    if (code[end] === "{") depth++;
    if (code[end] === "}") {
      if (depth === 0) break;
      depth--;
    }
  }
  return code.slice(start, end + 1);
}

/** Every JSX opening tag named by `names`, including its attributes. */
function openingTags(code: string, names: string[]) {
  const tags: Array<{ index: number; text: string; name: string }> = [];
  const pattern = new RegExp(`<(${names.map((n) => n.replace(".", "\\.")).join("|")})(?=[\\s/>])`, "g");
  for (const match of code.matchAll(pattern)) {
    let depth = 0;
    let i = match.index ?? 0;
    for (; i < code.length; i++) {
      if (code[i] === "{") depth++;
      if (code[i] === "}") depth--;
      if (code[i] === ">" && depth === 0 && code[i - 1] !== "=") break;
    }
    tags.push({ index: match.index ?? 0, text: code.slice(match.index, i + 1), name: match[1] ?? "" });
  }
  return tags;
}

/** Local JSX names bound to `name` imported from `module` (handles `X as Y`). */
function localNames(code: string, name: string, module: string) {
  const names: string[] = [];
  for (const [, specifiers] of code.matchAll(new RegExp(`import\\s*(?:\\w+\\s*,\\s*)?\\{([^}]*)\\}\\s*from\\s*'${module}'`, "g"))) {
    for (const specifier of (specifiers ?? "").split(",")) {
      const [imported, local] = specifier.trim().split(/\s+as\s+/);
      if (imported === name) names.push(local ?? imported);
    }
  }
  return names;
}

/** The body of `key: {...}` inside a StyleSheet in the same file. */
function styleEntry(code: string, key: string) {
  const match = new RegExp(`\\b${key}\\s*:\\s*\\{`).exec(code);
  return match ? enclosingObject(code, match.index + match[0].length) : "";
}

function report(hits: string[]) {
  return hits.length ? `\n${hits.join("\n")}` : "";
}

// ---------------------------------------------------------------------------
// Token consumers.

/** Type roles read their faces from `font`, so the token module counts as a consumer of it. */
const consumerText = sources.map(({ code }) => code).join("\n");

function leafPaths(value: unknown, path: string[] = []): string[][] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [path];
  const entries = Object.entries(value);
  // A type role or spring is one token even though it is an object.
  if (path[0] === "type" && path.length === 2) return [path];
  if (path[1] === "spring" && path.length === 3) return [path];
  return entries.flatMap(([key, child]) => leafPaths(child, [...path, key]));
}

function consumed(path: string[]) {
  const key = path[path.length - 1];
  const parent = path[path.length - 2];
  const patterns = [new RegExp(`\\b${parent}\\.${key}\\b`), new RegExp(`\\b${parent}\\[['"]${key}['"]\\]`)];
  if (path[0] === "type") patterns.push(new RegExp(`variant(=|:\\s*)\\{?['"]${key}['"]`));
  return patterns.some((pattern) => pattern.test(consumerText));
}

// ---------------------------------------------------------------------------

describe("design-system tokens", () => {
  it("reads Baloo 2's own metrics from the shipped font", () => {
    const regular = readFontMetrics(fontFile(tokens.font.regular));
    expect(regular.descent, "hhea descent / unitsPerEm").toBeCloseTo(0.524, 3);
    expect(regular.digitTop).toBeLessThan(regular.asciiTop);
    expect(regular.asciiTop).toBeLessThan(regular.accentTop);
  });

  it("has a consumer for every token", () => {
    const dead = leafPaths(tokens)
      .filter((path) => path[0] !== "conditionDemo")
      .filter((path) => !consumed(path))
      .map((path) => `${tokenModule} tokens.${path.join(".")} has no consumer`);
    expect(dead, report(dead)).toEqual([]);
  });

  it("keeps primary text at AA on every surface and the functional orange at AA on white", () => {
    const [top, middle, bottom] = tokens.surface.orangeGradient;
    const surfaces = { top, middle, bottom, card: tokens.surface.card, selected: tokens.surface.selected };
    const failures = Object.entries(surfaces)
      .map(([name, surface]) => [name, surface, contrast(tokens.text.primary, surface)] as const)
      .filter(([, , ratio]) => ratio < 4.5)
      .map(([name, surface, ratio]) => `text.primary on ${name} ${surface}: ${ratio.toFixed(2)}:1`);
    expect(failures, report(failures)).toEqual([]);
    expect(contrast(tokens.text.onAccent, tokens.brand.primary)).toBeGreaterThanOrEqual(4.5);
  });

  staged(1)("gives every type role a line height that clears Baloo 2's clip floor", () => {
    const failures = Object.entries(tokens.type).flatMap(([role, style]) => {
      const metrics = readFontMetrics(fontFile(style.fontFamily));
      const top = numeralRoles.has(role) ? metrics.digitTop : metrics.accentTop;
      const floor = (top + metrics.descent) * style.fontSize;
      return style.lineHeight >= floor
        ? []
        : [`${tokenModule} type.${role}: lineHeight ${style.lineHeight} < clip floor ${floor.toFixed(1)} (${style.fontFamily} ${style.fontSize}pt)`];
    });
    expect(failures, report(failures)).toEqual([]);
  });

  staged(1)("keeps every type role at or above the 12pt Baloo 2 legibility floor", () => {
    const small = Object.entries(tokens.type)
      .filter(([, style]) => style.fontSize < 12)
      .map(([role, style]) => `${tokenModule} type.${role}: ${style.fontSize}pt`);
    expect(small, report(small)).toEqual([]);
  });

  staged(1)("keeps every text tone at AA on every surface it may sit on", () => {
    const [top, middle, bottom] = tokens.surface.orangeGradient;
    const everywhere = { middle, bottom, card: tokens.surface.card, selected: tokens.surface.selected };
    const permitted: Record<string, { color: string; floor: number; on: Record<string, string> }> = {
      "text.primary": { color: tokens.text.primary, floor: 4.5, on: { top, ...everywhere } },
      // Secondary may not sit in the washed band at the top of a screen.
      "text.secondary": { color: tokens.text.secondary, floor: 4.5, on: everywhere },
      "text.onAccent": { color: tokens.text.onAccent, floor: 4.5, on: { primary: tokens.brand.primary } },
      // The single hero metric (48pt bold) is large text; it never sits in the washed band.
      "brand.primary (hero metric)": { color: tokens.brand.primary, floor: 3, on: everywhere },
      // Captain exception (issue #145 correction): the Analytics day caption stays orange, as in the
      // accepted UI. It sits in the washed band, so its floor is its measured contrast, not AA.
      "brand.primary (Analytics day caption)": { color: tokens.brand.primary, floor: 2.69, on: { top, ...everywhere } },
    };
    const failures = Object.entries(permitted).flatMap(([tone, { color, floor, on }]) =>
      Object.entries(on)
        .filter(([, surface]) => contrast(color, surface) < floor)
        .map(([name, surface]) => `${tone} ${color} on ${name} ${surface}: ${contrast(color, surface).toFixed(2)}:1 < ${floor}`),
    );
    expect(failures, report(failures)).toEqual([]);
    expect(Object.keys(tokens.text).sort()).toEqual(["onAccent", "primary", "secondary"]);
  });

  staged(3)("has eight type roles across the six approved sizes, each with a derived line height", () => {
    expect(Object.keys(tokens.type).sort()).toEqual([...approvedRoles].sort());
    const failures = Object.entries(tokens.type).flatMap(([role, style]) => {
      const factor = numeralRoles.has(role) ? 120 : 140;
      const expected = Math.ceil((style.fontSize * factor) / 100);
      return [
        ...(approvedSizes.includes(style.fontSize) ? [] : [`type.${role}: size ${style.fontSize} is not one of ${approvedSizes.join("/")}`]),
        ...(style.lineHeight === expected ? [] : [`type.${role}: lineHeight ${style.lineHeight}, formula gives ${expected}`]),
      ];
    });
    expect(failures, report(failures)).toEqual([]);
    const styles = Object.values(tokens.type).map((style) => `${style.fontSize}/${style.fontFamily}`);
    expect(new Set(styles).size, "two type roles share a size and face").toBe(styles.length);
  });

  staged(4)("limits spacing, radius, control, and icon scales to their approved members", () => {
    const scales = tokens as unknown as Record<string, Record<string, number>>;
    expect(tokens.space).toEqual({ xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 });
    expect(Object.keys(tokens.radius).sort()).toEqual(["card", "field", "pill", "sheet"]);
    expect(scales.control).toEqual({ full: 56, inline: 44, indicator: 32, row: 68 });
    expect(scales.icon).toEqual({ sm: 16, md: 24, lg: 36 });
    for (const scale of [tokens.space, tokens.radius, scales.control, scales.icon]) {
      const values = Object.values(scale ?? {});
      expect(new Set(values).size, `duplicate value in ${JSON.stringify(scale)}`).toBe(values.length);
    }
  });

  staged(6)("limits motion to four durations, two easings, and two springs", () => {
    expect(Object.keys(tokens.motion.duration)).toHaveLength(4);
    expect(Object.keys(tokens.motion.easing)).toHaveLength(2);
    expect(Object.keys(tokens.motion.spring)).toHaveLength(2);
    const durations = Object.values(tokens.motion.duration);
    expect(new Set(durations).size).toBe(durations.length);
    // The default easing is the Material 3 standard curve.
    expect(tokens.motion.easing.standard).toEqual([0.2, 0, 0, 1]);
  });
});

describe("design-system source", () => {
  staged(1)("sets text orange only on a hero metric, an onboarding emphasis word, or the Analytics day caption", () => {
    const approved: Record<string, number> = {
      // The plan-build hero metric.
      "app-next/src/features/rules/PlanBuild.tsx": 1,
      // One emphasis word in each of the two loop-story onboarding headlines.
      "app-next/src/features/onboarding/scenes/LoopStory.tsx": 2,
      // Captain exception: the orange "Today" caption above the Analytics ring.
      "app-next/src/features/analytics/DailyActivityRing.tsx": 1,
    };
    const counts: Record<string, number> = {};
    for (const hit of findAll(/\bcolor:\s*(?:t|tokens)\.brand\.primary\b/g)) {
      const file = hit.slice(0, hit.indexOf(":"));
      counts[file] = (counts[file] ?? 0) + 1;
    }
    expect(counts).toEqual(approved);
  });

  staged(1)("never sets fontWeight: Baloo 2 faces are named, so iOS cannot synthesize a weight", () => {
    const hits = findAll(/\bfontWeight\b[^,\n}]*/g, sources);
    expect(hits, report(hits)).toEqual([]);
  });

  staged(1)("gives every typography declaration a font family, including SVG text and inputs", () => {
    const hits: string[] = [];
    for (const { path, code } of uiSources) {
      for (const match of code.matchAll(/\bfontSize\s*:/g)) {
        const object = enclosingObject(code, match.index ?? 0);
        if (!/fontFamily|\.\.\.[\w.]*type\./.test(object)) hits.push(`${path}:${lineOf(code, match.index ?? 0)} fontSize without fontFamily`);
      }
      const textTags = [
        ...localNames(code, "Text", "react-native-svg"),
        ...localNames(code, "TSpan", "react-native-svg"),
        ...localNames(code, "Text", "react-native"),
        ...localNames(code, "TextInput", "react-native"),
        "SvgText",
        "Animated.Text",
      ];
      for (const tag of openingTags(code, [...new Set(textTags)])) {
        const styles = [...tag.text.matchAll(/\b(?:s|styles)\.(\w+)/g)].map(([, key]) => styleEntry(code, key ?? ""));
        if (!/fontFamily|\btype\.\w+|\b(?:miniature|scene)\.\w+|\{\.\.\.props\}/.test([tag.text, ...styles].join("\n"))) {
          hits.push(`${path}:${lineOf(code, tag.index)} <${tag.name}> without fontFamily`);
        }
      }
    }
    expect(hits, report(hits)).toEqual([]);
  });

  staged(1)("never fades a text primitive, and never renders text at zero opacity", () => {
    const hits: string[] = [];
    for (const { path, code } of uiSources) {
      for (const tag of openingTags(code, ["Label", "Text", "Animated.Text"])) {
        if (/\bopacity\b/.test(tag.text)) hits.push(`${path}:${lineOf(code, tag.index)} ${tag.text.slice(0, 80)}`);
      }
    }
    expect(hits, report(hits)).toEqual([]);
  });

  staged(1)("never colours text with the retired muted grey", () => {
    const hits = findAll(/\btext\.muted\b/g);
    expect(hits, report(hits)).toEqual([]);
  });

  staged(2)("has exactly one back affordance and one close affordance", () => {
    const back = findAll(/\b(controls|c)\.back\b|\bname=\{?["']back["']|paths\.back\b/g).filter(
      (hit) => !hit.startsWith("app-next/src/design-system/BackButton.tsx"),
    );
    const close = findAll(/name=["']close["']|paths\.close\b/g).filter(
      (hit) => !hit.startsWith("app-next/src/design-system/CloseButton.tsx"),
    );
    expect([...back, ...close], report([...back, ...close])).toEqual([]);
  });

  staged(3)("uses only type roles, never raw font sizes or line heights", () => {
    const hits = findAll(/\b(fontSize|lineHeight)\s*[:=]\s*\{?\s*['"]?[^,}\n]*\d[^,}\n]*/g).filter(
      (hit) => !/\b(fontSize|lineHeight)\s*[:=]\s*\{?\s*[a-zA-Z_.]+\s*$/.test(hit.split(" ").slice(1).join(" ")),
    );
    expect(hits, report(hits)).toEqual([]);
  });

  staged(4)("uses only radius tokens, never raw corner literals", () => {
    const hits = findAll(/\bborder(Top|Bottom)?(Left|Right)?Radius\s*:\s*[^,}\n]*\d[^,}\n]*/g);
    expect(hits, report(hits)).toEqual([]);
  });

  staged(4)("sizes every UI icon with an icon token: no spacing token and no arithmetic", () => {
    const hits: string[] = [];
    for (const { path, code } of uiSources.filter(({ path }) => !isIllustration(path))) {
      for (const tag of openingTags(code, ["Icon"])) {
        const size = /\bsize=\{([^}]*)\}/.exec(tag.text)?.[1]?.trim();
        if (size !== undefined && !/^(t|tokens)\.icon\.(sm|md|lg)$/.test(size)) {
          hits.push(`${path}:${lineOf(code, tag.index)} size={${size}}`);
        }
      }
    }
    expect(hits, report(hits)).toEqual([]);
  });

  staged(4)("tints every icon by the one tone rule, never by an ad-hoc colour", () => {
    const hits = findAll(/<(?:Icon|LivingIcon|Pictogram)\b[^>]*?\btint=/g);
    expect(hits, report(hits)).toEqual([]);
  });

  staged(5)("keeps literal colours in the token module and the illustration module only", () => {
    const hits = findAll(/(?<=['"`\s(,])#[0-9A-Fa-f]{3,8}\b|\brgba?\(/g);
    expect(hits, report(hits)).toEqual([]);
  });

  staged(5)("has one token module, plus an illustration module that UI chrome may not import", () => {
    const satellites = sources
      .map(({ path }) => path)
      .filter((path) => /design-system\/\w+Tokens\.ts$/.test(path) && path !== illustrationModule);
    expect(satellites).toEqual([]);
    const importers = uiSources
      .filter(({ code }) => /from '[^']*illustrationTokens'/.test(code))
      .map(({ path }) => path)
      .filter((path) => !isIllustration(path));
    expect(importers, report(importers)).toEqual([]);
  });

  staged(6)("reaches every animation call site through a reduced-motion gate", () => {
    const outsideMotion = uiSources.filter(({ path }) => !path.startsWith("app-next/src/motion/"));
    const hits = findAll(
      /\b(withTiming|withSpring|withDecay|withRepeat|withSequence|withDelay)\(|\bEasing\.|\b(animationName|transitionProperty|animationTimingFunction|transitionTimingFunction)\b|\b(FadeIn\w*|FadeOut\w*|ZoomIn\w*|ZoomOut\w*|SlideIn\w*|SlideOut\w*|LinearTransition|LayoutAnimationConfig)\b|\bLayoutAnimation\.|\bAnimated\.(timing|spring)\(/g,
      outsideMotion,
    );
    expect(hits, report(hits)).toEqual([]);
  });
});
