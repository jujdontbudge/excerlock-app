export type Box = { minX: number; minY: number; maxX: number; maxY: number };
type Point = [number, number];
type Transform = (point: Point) => Point;

const SAMPLES = 96;

function tokens(d: string): string[] {
  return d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? [];
}

function arcPoints(from: Point, rx: number, ry: number, angle: number, large: boolean, sweep: boolean, to: Point): Point[] {
  if (rx === 0 || ry === 0) return [to];
  const phi = (angle * Math.PI) / 180;
  const cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (from[0] - to[0]) / 2, dy = (from[1] - to[1]) / 2;
  const x1 = cos * dx + sin * dy, y1 = -sin * dx + cos * dy;
  rx = Math.abs(rx); ry = Math.abs(ry);
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lambda > 1) { rx *= Math.sqrt(lambda); ry *= Math.sqrt(lambda); }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const factor = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cx1 = (factor * rx * y1) / ry, cy1 = (-factor * ry * x1) / rx;
  const cx = cos * cx1 - sin * cy1 + (from[0] + to[0]) / 2;
  const cy = sin * cx1 + cos * cy1 + (from[1] + to[1]) / 2;
  const vecAngle = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const start = vecAngle(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let delta = vecAngle((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  const points: Point[] = [];
  for (let i = 1; i <= SAMPLES; i += 1) {
    const theta = start + (delta * i) / SAMPLES;
    points.push([cx + rx * Math.cos(theta) * cos - ry * Math.sin(theta) * sin, cy + rx * Math.cos(theta) * sin + ry * Math.sin(theta) * cos]);
  }
  return points;
}

function cubic(p0: Point, p1: Point, p2: Point, p3: Point): Point[] {
  const points: Point[] = [];
  for (let i = 1; i <= SAMPLES; i += 1) {
    const t = i / SAMPLES, u = 1 - t;
    points.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return points;
}

export function pathPoints(d: string): Point[] {
  const list = tokens(d);
  const points: Point[] = [];
  let i = 0, command = '', current: Point = [0, 0], start: Point = [0, 0], control: Point | null = null, previous = '';
  const number = () => Number(list[i++]);
  const flag = () => {
    const token = list[i] ?? '';
    if (token.length > 1 && (token[0] === '0' || token[0] === '1') && !token.includes('.')) {
      list[i] = token.slice(1);
      return token[0] === '1';
    }
    i += 1;
    return token === '1';
  };
  while (i < list.length) {
    if (/[A-Za-z]/.test(list[i]!)) command = list[i++]!;
    else if (command === 'M') command = 'L';
    else if (command === 'm') command = 'l';
    const relative = command === command.toLowerCase();
    const base = relative ? current : ([0, 0] as Point);
    const upper = command.toUpperCase();
    const at = (x: number, y: number): Point => [base[0] + x, base[1] + y];
    if (upper === 'Z') {
      current = start;
      points.push(current);
      control = null;
      previous = 'Z';
      if (i < list.length && !/[A-Za-z]/.test(list[i]!)) command = 'L';
      continue;
    }
    if (upper === 'M') { current = at(number(), number()); start = current; points.push(current); control = null; }
    else if (upper === 'L') { current = at(number(), number()); points.push(current); control = null; }
    else if (upper === 'H') { current = [relative ? current[0] + number() : number(), current[1]]; points.push(current); control = null; }
    else if (upper === 'V') { current = [current[0], relative ? current[1] + number() : number()]; points.push(current); control = null; }
    else if (upper === 'C') {
      const p1 = at(number(), number()), p2 = at(number(), number()), p3 = at(number(), number());
      points.push(...cubic(current, p1, p2, p3)); control = p2; current = p3;
    } else if (upper === 'S') {
      const p1: Point = control && /[CcSs]/.test(previous) ? [2 * current[0] - control[0], 2 * current[1] - control[1]] : current;
      const p2 = at(number(), number()), p3 = at(number(), number());
      points.push(...cubic(current, p1, p2, p3)); control = p2; current = p3;
    } else if (upper === 'Q') {
      const q = at(number(), number()), p3 = at(number(), number());
      const p1: Point = [current[0] + (2 / 3) * (q[0] - current[0]), current[1] + (2 / 3) * (q[1] - current[1])];
      const p2: Point = [p3[0] + (2 / 3) * (q[0] - p3[0]), p3[1] + (2 / 3) * (q[1] - p3[1])];
      points.push(...cubic(current, p1, p2, p3)); control = q; current = p3;
    } else if (upper === 'T') {
      const q: Point = control && /[QqTt]/.test(previous) ? [2 * current[0] - control[0], 2 * current[1] - control[1]] : current;
      const p3 = at(number(), number());
      const p1: Point = [current[0] + (2 / 3) * (q[0] - current[0]), current[1] + (2 / 3) * (q[1] - current[1])];
      const p2: Point = [p3[0] + (2 / 3) * (q[0] - p3[0]), p3[1] + (2 / 3) * (q[1] - p3[1])];
      points.push(...cubic(current, p1, p2, p3)); control = q; current = p3;
    } else if (upper === 'A') {
      const rx = number(), ry = number(), angle = number(), large = flag(), sweep = flag();
      const to = at(number(), number());
      points.push(...arcPoints(current, rx, ry, angle, large, sweep, to)); current = to; control = null;
    } else throw new Error(`Unsupported path command ${command}`);
    previous = command;
  }
  return points;
}

function attr(tag: string, name: string): string | undefined {
  return tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
}

function bound(points: Point[], grow = 0): Box {
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const [x, y] of points) {
    box.minX = Math.min(box.minX, x - grow); box.maxX = Math.max(box.maxX, x + grow);
    box.minY = Math.min(box.minY, y - grow); box.maxY = Math.max(box.maxY, y + grow);
  }
  return box;
}

export function svgBounds(xml: string): Box {
  const stack: Transform[] = [(point) => point];
  const boxes: Box[] = [];
  const apply = (points: Point[]) => points.map((point) => stack.reduceRight((value, transform) => transform(value), point));
  const parts = xml.match(/<\/?[a-z]+[^>]*>/g) ?? [];
  let root = true;
  for (const tag of parts) {
    if (tag.startsWith('</')) {
      if (tag === '</svg>' || tag === '</g>') stack.pop();
      continue;
    }
    const name = tag.match(/^<([a-z]+)/)![1];
    const selfClosing = tag.endsWith('/>');
    if (name === 'svg') {
      if (!root) throw new Error('nested <svg> is drawn at the wrong place by react-native-svg, which ignores its x and y; wrap the art in <g transform> instead');
      stack.push((point) => point);
      root = false;
    } else if (name === 'g') {
      const steps = [...(attr(tag, 'transform') ?? '').matchAll(/(translate|scale|rotate)\(([^)]*)\)/g)].map(([, kind, args]): Transform => {
        const [a = 0, b, c] = (args ?? '').trim().split(/[\s,]+/).map(Number);
        if (kind === 'translate') return ([px, py]) => [px + a, py + (b ?? 0)];
        if (kind === 'scale') return ([px, py]) => [px * a, py * (b ?? a)];
        const angle = (a * Math.PI) / 180, cx = b ?? 0, cy = c ?? 0;
        return ([px, py]) => [cx + (px - cx) * Math.cos(angle) - (py - cy) * Math.sin(angle), cy + (px - cx) * Math.sin(angle) + (py - cy) * Math.cos(angle)];
      });
      stack.push((point) => steps.reduceRight((value, step) => step(value), point));
      if (selfClosing) stack.pop();
    } else if (name === 'path') {
      const stroke = attr(tag, 'stroke');
      const width = stroke && stroke !== 'none' ? Number(attr(tag, 'stroke-width') ?? 1) : 0;
      boxes.push(bound(apply(pathPoints(attr(tag, 'd') ?? '')), width / 2));
    } else if (name === 'rect') {
      const x = Number(attr(tag, 'x') ?? 0), y = Number(attr(tag, 'y') ?? 0), w = Number(attr(tag, 'width')), h = Number(attr(tag, 'height'));
      const r = Math.min(Number(attr(tag, 'rx') ?? 0), w / 2, h / 2);
      const outline = r > 0
        ? pathPoints(`M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`)
        : ([[x, y], [x + w, y], [x + w, y + h], [x, y + h]] as Point[]);
      boxes.push(bound(apply(outline)));
    } else if (name === 'circle') {
      const cx = Number(attr(tag, 'cx') ?? 0), cy = Number(attr(tag, 'cy') ?? 0), r = Number(attr(tag, 'r'));
      boxes.push(bound(apply(pathPoints(`M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`))));
    }
  }
  return {
    minX: Math.min(...boxes.map((box) => box.minX)),
    minY: Math.min(...boxes.map((box) => box.minY)),
    maxX: Math.max(...boxes.map((box) => box.maxX)),
    maxY: Math.max(...boxes.map((box) => box.maxY)),
  };
}
