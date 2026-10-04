import { unlinkSync } from 'node:fs';
import { readPng, type Raster } from './png.ts';
import { screenshot, tree, type AxNode } from './sim.ts';
import { sleep } from './shell.ts';

export type Frame = AxNode['frame'];
export type CentringFinding = { label: string; type: string; frame: Frame; problem: string };
export type CentringReport = { checked: number; unmeasured: number; moving: number; findings: CentringFinding[] };

export const centringTolerance = 1;
const stackTolerance = 1.5;
const edgePadding = 28;
const groupGap = 17;
const borderInset = 2;
const fillDistance = 48;
const inkDistance = 64;
const minimumFill = 0.45;
const maximumBackdrop = 0.12;
const chainGap = 24;
const tallRatio = 1.6;
const markRatio = 0.4;
const baselineSlack = 0.5;
const tabFade = 56;
const overlayReach = 14;
const measuredTypes = new Set(['Button', 'CheckBox', 'RadioButton', 'Image', 'GenericElement', 'Cell', 'TextField']);
const overlayLabels = [/^gearshape/, /^!, /];
const largestIcon = 64;
const settleMs = 600;
const motionDistance = 24;
const motionShare = 0.002;

type Box = { left: number; right: number; top: number; bottom: number };
type Part = Box & { pixels: number };
type Line = { text: Box | null; objects: Box[] };
type Measured = { parts: Part[]; fillShare: number; backdrop: number; fill: [number, number, number]; clipped: { x: boolean; y: boolean } };

const area = (frame: Frame) => frame.width * frame.height;
const intersects = (a: Frame, b: Frame) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const contains = (outer: Frame, inner: Frame) =>
  inner.x >= outer.x - 0.5 && inner.y >= outer.y - 0.5 && inner.x + inner.width <= outer.x + outer.width + 0.5 && inner.y + inner.height <= outer.y + outer.height + 0.5;

function masks(nodes: AxNode[], screen: Frame): Frame[] {
  const regions: Frame[] = [{ x: 0, y: 0, width: screen.width, height: 50 }];
  for (const node of nodes) {
    if (!overlayLabels.some((pattern) => pattern.test(node.AXLabel ?? ''))) continue;
    const f = node.frame;
    regions.push({ x: f.x - overlayReach, y: f.y - overlayReach, width: f.width + 2 * overlayReach, height: f.height + 2 * overlayReach });
  }
  const bottomRows = new Map<string, AxNode[]>();
  for (const node of nodes) {
    const f = node.frame;
    if (f.y < screen.height * 0.8 || f.width > screen.width / 2) continue;
    const key = `${Math.round(f.y)}:${Math.round(f.height)}`;
    bottomRows.set(key, [...(bottomRows.get(key) ?? []), node]);
  }
  for (const row of bottomRows.values()) {
    if (row.length < 3) continue;
    const top = Math.min(...row.map((node) => node.frame.y));
    regions.push({ x: 0, y: top - tabFade, width: screen.width, height: screen.height - top + tabFade, tabs: row } as Frame & { tabs: AxNode[] });
  }
  return regions;
}

function dominant(raster: Raster, x0: number, y0: number, x1: number, y1: number): [number, number, number] {
  const counts = new Map<number, number>();
  let best = 0, bestKey = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * raster.width + x) * 3;
      const key = ((raster.rgb[i]! >> 2) << 12) | ((raster.rgb[i + 1]! >> 2) << 6) | (raster.rgb[i + 2]! >> 2);
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      if (count > best) { best = count; bestKey = key; }
    }
  }
  return [((bestKey >> 12) << 2) + 2, (((bestKey >> 6) & 63) << 2) + 2, ((bestKey & 63) << 2) + 2];
}

function content(raster: Raster, scale: number, frame: Frame): Measured | null {
  const x0 = Math.max(0, Math.round((frame.x + borderInset) * scale)), y0 = Math.max(0, Math.round((frame.y + borderInset) * scale));
  const x1 = Math.min(raster.width, Math.round((frame.x + frame.width - borderInset) * scale)), y1 = Math.min(raster.height, Math.round((frame.y + frame.height - borderInset) * scale));
  const w = x1 - x0, h = y1 - y0;
  if (w < 6 || h < 6) return null;
  const [br, bg, bb] = dominant(raster, x0, y0, x1, y1);
  const near = new Uint8Array(w * h);
  const ink = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = ((y + y0) * raster.width + x + x0) * 3;
      const d = Math.hypot(raster.rgb[i]! - br, raster.rgb[i + 1]! - bg, raster.rgb[i + 2]! - bb);
      near[y * w + x] = d <= fillDistance ? 1 : 0;
      ink[y * w + x] = d > inkDistance ? 1 : 0;
    }
  }
  const label = new Int32Array(w * h).fill(-1);
  const stack: number[] = [];
  const flood = (seed: number, id: number, accept: (p: number) => boolean, diagonal: boolean) => {
    let size = 0;
    stack.push(seed);
    label[seed] = id;
    while (stack.length) {
      const p = stack.pop()!;
      size += 1;
      const px = p % w, py = (p - px) / w;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if ((dx === 0 && dy === 0) || (!diagonal && dx !== 0 && dy !== 0)) continue;
          const nx = px + dx, ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (label[q] === -1 && accept(q)) { label[q] = id; stack.push(q); }
        }
      }
    }
    return size;
  };
  let fillId = -1, fillSize = 0, next = 0;
  for (let p = 0; p < w * h; p += 1) {
    if (!near[p] || label[p] !== -1) continue;
    const size = flood(p, next, (q) => near[q] === 1, false);
    if (size > fillSize) { fillSize = size; fillId = next; }
    next += 1;
  }
  if (fillId < 0 || fillSize / (w * h) < minimumFill) return { parts: [], fillShare: fillSize / (w * h), backdrop: 0, fill: [br, bg, bb], clipped: { x: false, y: false } };
  const fill = (p: number) => label[p] === fillId;
  const outside = new Uint8Array(w * h);
  const edge: number[] = [];
  for (let x = 0; x < w; x += 1) edge.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y += 1) edge.push(y * w, y * w + w - 1);
  for (const seed of edge) {
    if (fill(seed) || outside[seed]) continue;
    outside[seed] = 1;
    stack.push(seed);
    while (stack.length) {
      const p = stack.pop()!;
      const px = p % w, py = (p - px) / w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (!outside[q] && !fill(q)) { outside[q] = 1; stack.push(q); }
      }
    }
  }
  const blob = (seed: number, seen: Uint8Array, accept: (p: number) => boolean): Part => {
    let left = w, right = 0, top = h, bottom = 0, pixels = 0;
    seen[seed] = 1;
    stack.push(seed);
    while (stack.length) {
      const q = stack.pop()!;
      const qx = q % w, qy = (q - qx) / w;
      pixels += 1;
      left = Math.min(left, qx); right = Math.max(right, qx + 1); top = Math.min(top, qy); bottom = Math.max(bottom, qy + 1);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = qx + dx, ny = qy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const r = ny * w + nx;
          if (!seen[r] && accept(r)) { seen[r] = 1; stack.push(r); }
        }
      }
    }
    return { left, right, top, bottom, pixels };
  };
  const seen = new Uint8Array(w * h);
  const parts: Part[] = [];
  const inside = (p: number) => !fill(p) && !outside[p] && ink[p] === 1;
  for (let p = 0; p < w * h; p += 1) {
    if (seen[p] || !inside(p)) continue;
    const { left, right, top, bottom, pixels } = blob(p, seen, inside);
    if (pixels < 4) continue;
    parts.push({ left: (left + x0) / scale, right: (right + x0) / scale, top: (top + y0) / scale, bottom: (bottom + y0) / scale, pixels });
  }
  const clipped = { x: false, y: false };
  const cut = (p: number) => outside[p] === 1 && ink[p] === 1;
  for (let p = 0; p < w * h; p += 1) {
    if (seen[p] || !cut(p)) continue;
    const piece = blob(p, seen, cut);
    const sides = [piece.left === 0, piece.right === w, piece.top === 0, piece.bottom === h];
    if (sides.filter(Boolean).length !== 1) continue;
    const reach = borderInset * scale;
    if (sides[0] || sides[1]) clipped.x ||= height(piece) < h / 2 && piece.right - piece.left >= reach;
    else clipped.y ||= piece.right - piece.left < w / 2 && height(piece) >= reach;
  }
  let backdrop = 0;
  for (let p = 0; p < w * h; p += 1) backdrop += outside[p] && ink[p] ? 1 : 0;
  return { parts, fillShare: fillSize / (w * h), backdrop: backdrop / (w * h), fill: [br, bg, bb], clipped };
}

const height = (box: Box) => box.bottom - box.top;
const centreY = (box: Box) => (box.top + box.bottom) / 2;

const bound = (parts: Box[]): Box => ({
  left: Math.min(...parts.map((p) => p.left)),
  right: Math.max(...parts.map((p) => p.right)),
  top: Math.min(...parts.map((p) => p.top)),
  bottom: Math.max(...parts.map((p) => p.bottom)),
});

function clusters<T extends Box>(parts: T[], gap: number): T[][] {
  const sorted = [...parts].sort((a, b) => a.left - b.left);
  const out: { right: number; parts: T[] }[] = [];
  for (const part of sorted) {
    const last = out[out.length - 1];
    if (last && part.left - last.right <= gap) { last.parts.push(part); last.right = Math.max(last.right, part.right); }
    else out.push({ right: part.right, parts: [part] });
  }
  return out.map((cluster) => cluster.parts);
}

function rows(parts: Part[]): Part[][] {
  const out: { span: Box; parts: Part[] }[] = [];
  for (const part of [...parts].sort((a, b) => height(b) - height(a))) {
    const row = out.find((candidate) => centreY(part) >= candidate.span.top && centreY(part) <= candidate.span.bottom);
    if (row) { row.parts.push(part); row.span = bound([row.span, part]); }
    else out.push({ span: { ...part }, parts: [part] });
  }
  return out.map((row) => row.parts);
}

function line(row: Part[]): Line {
  const near = (a: Part, b: Part) => Math.abs(a.bottom - b.bottom) <= baselineSlack;
  const anchor = [...row].sort((a, b) => row.filter((p) => near(p, b)).length - row.filter((p) => near(p, a)).length || b.bottom - a.bottom)[0];
  const cluster = anchor ? row.filter((p) => near(p, anchor)) : [];
  if (cluster.length < 2) return { text: null, objects: [bound(row)] };
  const baseline = Math.min(...cluster.map((p) => p.bottom));
  const sitting = cluster;
  const top = Math.min(...sitting.map((p) => p.top));
  const cap = baseline - top;
  const from = Math.min(...sitting.map((p) => p.left)), to = Math.max(...sitting.map((p) => p.right));
  const glyph = (p: Part) => (p.left + p.right) / 2 >= from - cap && (p.left + p.right) / 2 <= to + cap && height(p) <= 1.45 * cap && p.top >= top - 0.25 * cap;
  const text = row.filter(glyph);
  const others = row.filter((p) => !glyph(p));
  return { text: { left: Math.min(...text.map((p) => p.left)), right: Math.max(...text.map((p) => p.right)), top, bottom: baseline }, objects: clusters(others, groupGap).map(bound) };
}

const fmt = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;

function anchored(boxes: Box[], mixed: boolean[], f: Frame): boolean[] {
  const fromLeft: boolean[] = [], fromRight: boolean[] = [];
  const left = (box: Box) => box.left - f.x, right = (box: Box) => f.x + f.width - box.right;
  boxes.forEach((box, i) => {
    const previous = boxes[i - 1];
    fromLeft[i] = (left(box) <= edgePadding && (mixed[i] || right(box) > edgePadding)) || (!!previous && !!fromLeft[i - 1] && box.left - previous.right <= chainGap);
  });
  for (let i = boxes.length - 1; i >= 0; i -= 1) {
    const box = boxes[i]!, next = boxes[i + 1];
    fromRight[i] = (right(box) <= edgePadding && (mixed[i] || left(box) > edgePadding)) || (!!next && !!fromRight[i + 1] && next.left - box.right <= chainGap);
  }
  return boxes.map((_, i) => !!fromLeft[i] || !!fromRight[i]);
}

function surface(raster: Raster, scale: number, f: Frame, fill: [number, number, number]): boolean {
  const ring = 3;
  let differs = 0, total = 0;
  const sample = (x: number, y: number) => {
    const px = Math.round(x * scale), py = Math.round(y * scale);
    if (px < 0 || py < 0 || px >= raster.width || py >= raster.height) return;
    const i = (py * raster.width + px) * 3;
    total += 1;
    if (Math.hypot(raster.rgb[i]! - fill[0], raster.rgb[i + 1]! - fill[1], raster.rgb[i + 2]! - fill[2]) > fillDistance) differs += 1;
  };
  for (let x = f.x + f.width * 0.25; x <= f.x + f.width * 0.75; x += 2) { sample(x, f.y - ring); sample(x, f.y + f.height + ring); }
  for (let y = f.y + f.height * 0.25; y <= f.y + f.height * 0.75; y += 2) { sample(f.x - ring, y); sample(f.x + f.width + ring, y); }
  return total > 0 && differs / total > 0.5;
}

function moved(a: Raster, b: Raster, scale: number, f: Frame): boolean {
  const x0 = Math.max(0, Math.round(f.x * scale)), y0 = Math.max(0, Math.round(f.y * scale));
  const x1 = Math.min(a.width, Math.round((f.x + f.width) * scale)), y1 = Math.min(a.height, Math.round((f.y + f.height) * scale));
  let changed = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * a.width + x) * 3;
      if (Math.max(Math.abs(a.rgb[i]! - b.rgb[i]!), Math.abs(a.rgb[i + 1]! - b.rgb[i + 1]!), Math.abs(a.rgb[i + 2]! - b.rgb[i + 2]!)) > motionDistance) changed += 1;
    }
  }
  return changed > motionShare * (x1 - x0) * (y1 - y0);
}

export function analyseCentring(raster: Raster, nodes: AxNode[], ignore: string[] = [], still?: Raster): CentringReport {
  const app = nodes.find((node) => node.type === 'Application');
  if (!app) throw new Error('accessibility tree has no Application node');
  const screen = app.frame;
  const scale = raster.width / screen.width;
  const blocked = masks(nodes, screen);
  const report: CentringReport = { checked: 0, unmeasured: 0, moving: 0, findings: [] };
  for (const node of nodes) {
    const f = node.frame;
    const label = (node.AXLabel ?? '').replace(/\s+/g, ' ').trim();
    if (!measuredTypes.has(node.type ?? '') || f.width < 16 || f.height < 16) continue;
    if (overlayLabels.some((pattern) => pattern.test(label)) || ignore.some((name) => label === name || label.startsWith(`${name},`))) continue;
    if ((node as AxNode & { role_description?: string }).role_description === 'switch') continue;
    if (node.type !== 'TextField' && /^-?\d+(\.\d+)?%?$/.test(node.AXValue ?? '')) continue;
    if (node.type === 'Image' && Math.max(f.width, f.height) > largestIcon) continue;
    if (f.x < 0 || f.y < 0 || f.x + f.width > screen.width + 0.5 || f.y + f.height > screen.height + 0.5) continue;
    if (area(f) > 0.5 * area(screen)) continue;
    const overlaps = blocked.some((region) => !(region as Frame & { tabs?: AxNode[] }).tabs?.includes(node) && intersects(region, f));
    if (overlaps) continue;
    const covered = nodes.some((other) => other !== node && other.type !== 'Application' && measuredTypes.has(other.type ?? '') && intersects(other.frame, f) && !contains(f, other.frame) && !contains(other.frame, f));
    if (covered) continue;
    if (still && moved(raster, still, scale, f)) { report.moving += 1; continue; }
    const found = content(raster, scale, f);
    if (!found) continue;
    if (found.parts.length === 0 || found.backdrop > maximumBackdrop || (found.clipped.y && node.type !== 'TextField')) { report.unmeasured += 1; continue; }
    report.checked += 1;
    const problem = (text: string) => report.findings.push({ label: label || node.type || '?', type: node.type ?? '?', frame: f, problem: text });
    if (found.clipped.y) { problem('text is drawn outside its field'); continue; }
    const cx = f.x + f.width / 2, cy = f.y + f.height / 2;
    const own = surface(raster, scale, f, found.fill);
    const groups = clusters(found.parts, groupGap).map((group) => {
      const heights = group.map(height).sort((a, b) => a - b);
      const median = heights[Math.floor(heights.length / 2)] ?? 0;
      const tall = group.filter((p) => height(p) > tallRatio * median);
      const small = group.filter((p) => height(p) <= tallRatio * median && height(p) >= markRatio * median);
      const stack = small.length ? rows(small).map(line) : [];
      const objects = [...stack.flatMap((row) => row.objects), ...clusters(tall, groupGap).map(bound)];
      const texts = stack.flatMap((row) => (row.text ? [row.text] : []));
      return { group, box: bound(group), stack, objects, texts };
    });
    const edge = anchored(groups.map((g) => g.box), groups.map((g) => g.texts.length > 0 && g.objects.length > 0), f);
    groups.forEach(({ group, box, stack, objects, texts }, i) => {
      const dx = (box.left + box.right) / 2 - cx;
      if (!found.clipped.x && !edge[i] && Math.abs(dx) > centringTolerance)
        problem(`content ${fmt(dx)}pt off centre horizontally and not aligned to an edge (left gap ${(box.left - f.x).toFixed(1)}, right gap ${(f.x + f.width - box.right).toFixed(1)})`);
      if (texts.length === 0) {
        const dy = centreY(bound(group)) - cy;
        if (Math.abs(dy) > centringTolerance) problem(`icon ${fmt(dy)}pt off centre vertically`);
        return;
      }
      const all = [...texts, ...objects];
      const level = all.length > 0 && Math.max(...all.map((b) => b.top)) < Math.min(...all.map((b) => b.bottom));
      if (stack.length <= 1 && level) {
        for (const text of texts) {
          const dy = centreY(text) - cy;
          if (Math.abs(dy) > centringTolerance) problem(`text ${fmt(dy)}pt off centre vertically`);
        }
        for (const object of objects) {
          const dy = centreY(object) - cy;
          if (Math.abs(dy) > centringTolerance) problem(`icon ${fmt(dy)}pt off centre vertically`);
        }
      } else if (own) {
        const dy = centreY(bound([...texts, ...objects])) - cy;
        if (Math.abs(dy) > stackTolerance) problem(`stacked content ${fmt(dy)}pt off centre vertically`);
      }
    });
  }
  return report;
}

export async function checkScreenCentring(udid: string, shot: string, ignore: string[] = []): Promise<CentringReport> {
  const nodes = tree(udid);
  await sleep(settleMs);
  const again = screenshot(udid, shot.replace(/\.png$/, '.settled.png'));
  try {
    return analyseCentring(readPng(shot), nodes, ignore, readPng(again));
  } finally {
    unlinkSync(again);
  }
}

export const describeFinding = (finding: CentringFinding) => `"${finding.label}" ${finding.problem}`;

