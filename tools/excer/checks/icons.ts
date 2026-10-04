import { createRequire } from 'node:module';
import { join } from 'node:path';
import { appRoot, repoRoot } from '../lib/paths.ts';
import { svgBounds } from '../lib/svgBounds.ts';
import { verdict, type Check } from './types.ts';

const require = createRequire(join(repoRoot, 'package.json'));
const grid = 24;
const tolerance = 0.1;

type Bundler = { build(options: object): Promise<{ outputFiles: { text: string }[] }> };
type IconModule = { iconXml(name: string): string; paths: Record<string, string> };

export async function loadIcons(): Promise<IconModule> {
  const esbuild = require('esbuild') as Bundler;
  const bundle = await esbuild.build({
    stdin: { contents: "export { iconXml } from './lib/art'; export { paths } from './paths';", resolveDir: join(appRoot, 'src', 'packages', 'ui'), loader: 'ts' },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral',
    logLevel: 'silent',
  });
  const text = bundle.outputFiles[0]?.text ?? '';
  return (await import(`data:text/javascript;base64,${Buffer.from(text).toString('base64')}`)) as IconModule;
}

export function iconProblems(icons: IconModule): string[] {
  const problems: string[] = [];
  for (const name of Object.keys(icons.paths)) {
    let box;
    try {
      box = svgBounds(icons.iconXml(name));
    } catch (error) {
      problems.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const dx = (box.minX + box.maxX) / 2 - grid / 2, dy = (box.minY + box.maxY) / 2 - grid / 2;
    if (Math.abs(dx) > tolerance || Math.abs(dy) > tolerance)
      problems.push(`${name}: ink centre is ${dx.toFixed(2)}, ${dy.toFixed(2)} units from the middle of its ${grid}-unit box; move the geometry so its bounds are symmetric`);
    if (box.minX < 0 || box.minY < 0 || box.maxX > grid || box.maxY > grid)
      problems.push(`${name}: ink spills outside the ${grid}-unit box (${box.minX.toFixed(2)}..${box.maxX.toFixed(2)}, ${box.minY.toFixed(2)}..${box.maxY.toFixed(2)})`);
  }
  return problems;
}

export const iconCentring: Check = {
  name: 'icon-centring',
  why: 'Every Icon glyph is centred in its 24-unit box and stays inside it; nested <svg> is banned because react-native-svg ignores its x and y.',
  tier: 'static',
  async run() {
    const icons = await loadIcons();
    return verdict(iconProblems(icons), `${Object.keys(icons.paths).length} icons centred`);
  },
};
