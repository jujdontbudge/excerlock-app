import { Dimensions, StyleSheet } from 'react-native';
type Node = { type: unknown; props: Record<string, unknown>; children?: unknown[] };
/** The accessibility "XL" text size: twice the default, above every cap the design system sets. */
export const XL_FONT_SCALE = 2;
/** Runs `fn` with the window reporting `fontScale`, then restores the default metrics. */
export async function withFontScale<T>(fontScale: number, fn: () => Promise<T>): Promise<T> {
  const window = Dimensions.get('window'),
    screen = Dimensions.get('screen');
  Dimensions.set({ window: { ...window, fontScale }, screen: { ...screen, fontScale } });
  try {
    return await fn();
  } finally {
    Dimensions.set({ window, screen });
  }
}
const text = (value: unknown): string =>
  typeof value === 'string'
    ? value
    : Array.isArray(value)
      ? value.map(text).join('')
      : value && typeof value === 'object'
        ? text((value as Node).children)
        : '';
type Style = { height?: unknown; flexDirection?: string; position?: string; lineHeight?: number; fontSize?: number };
const styleOf = (n: Node): Style => (StyleSheet.flatten(n.props?.style as never) as Style | undefined) ?? {};
/** Illustration hosts draw text as vector art; they scale as a whole and are not reflow targets. */
const artwork = new Set(['RNSVGSvgView', 'RNSVGText', 'RNSVGTSpan']);
const scaleFor = (n: Node, fontScale: number) =>
  n.props.allowFontScaling === false
    ? 1
    : Math.min(fontScale, typeof n.props.maxFontSizeMultiplier === 'number' ? n.props.maxFontSizeMultiplier : fontScale);
/**
 * The vertical room a subtree needs once text is scaled: a text line's height times its scale and
 * line count, summed down a column and taken at its tallest across a row or absolute layer.
 * Padding and wrapping are ignored, so a verdict of "does not fit" is a floor, not a guess.
 */
function requiredHeight(value: unknown, fontScale: number): number {
  if (Array.isArray(value)) return stacked(value, {}, fontScale);
  if (!value || typeof value !== 'object') return 0;
  const n = value as Node;
  if (artwork.has(String(n.type))) return 0;
  const style = styleOf(n);
  if (n.type === 'Text') {
    const label = text(n.children);
    if (!label.trim()) return 0;
    const line = style.lineHeight ?? (style.fontSize ?? 14) * 1.2;
    return label.split('\n').length * line * scaleFor(n, fontScale);
  }
  return stacked(n.children ?? [], style, fontScale);
}
/** Children laid out by `style`: summed down a column, tallest across a row, absolute layers on top. */
function stacked(children: unknown[], style: Style, fontScale: number): number {
  const nodes = children.filter((c) => c && typeof c === 'object') as Node[];
  const flowing = nodes.filter((c) => styleOf(c).position !== 'absolute'),
    layered = nodes.filter((c) => styleOf(c).position === 'absolute');
  const row = style.flexDirection === 'row' || style.flexDirection === 'row-reverse';
  const flow = row
    ? Math.max(0, ...flowing.map((c) => requiredHeight(c, fontScale)))
    : flowing.reduce((sum, c) => sum + requiredHeight(c, fontScale), 0);
  return Math.max(flow, ...layered.map((c) => requiredHeight(c, fontScale)));
}
export type ClipFinding = { text: string; height: number; needs: number };
/**
 * Fixed-height views whose scaled text needs more vertical room than they give. A finding names
 * the text so the owning component is findable.
 */
export function clipAudit(root: unknown, fontScale = XL_FONT_SCALE): ClipFinding[] {
  const findings: ClipFinding[] = [];
  function walk(value: unknown) {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== 'object') return;
    const n = value as Node;
    if (artwork.has(String(n.type))) return;
    const height = styleOf(n).height;
    if (typeof height === 'number' && n.type !== 'Text') {
      const needs = Math.round(stacked(n.children ?? [], styleOf(n), fontScale));
      if (needs > height) findings.push({ text: text(n.children).trim().slice(0, 80), height, needs });
    }
    n.children?.forEach(walk);
  }
  walk(root);
  return findings;
}
export type TypeDigest = { text: string; scales: boolean; cap: number | null }[];
/** Every visible string with how it scales, compact enough to snapshot per screen. */
export function typeDigest(root: unknown): TypeDigest {
  const digest: TypeDigest = [];
  function walk(value: unknown) {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== 'object') return;
    const n = value as Node;
    if (artwork.has(String(n.type))) return;
    const label = text(n.children).trim();
    if (n.type === 'Text' && label) {
      digest.push({
        text: label,
        scales: n.props.allowFontScaling !== false,
        cap: typeof n.props.maxFontSizeMultiplier === 'number' ? n.props.maxFontSizeMultiplier : null,
      });
      return;
    }
    n.children?.forEach(walk);
  }
  walk(root);
  return digest;
}
