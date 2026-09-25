import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, normalize, relative, resolve } from 'node:path';
import { walk } from '../lib/files.ts';
import { appRoot, rel, serverRoot } from '../lib/paths.ts';
import { must, out, UsageError } from '../lib/shell.ts';

export const moveHelp = `excer move <source...> <destination>

Moves app-next or server files with git mv and rewrites every relative import
that points at them or out of them (app-next: src, app, modules, index.js;
server: src). It also updates path strings in tsconfig.json, metro.config.js and
drizzle.config.ts. The destination is a directory, or a file path when you move
one file. Run ./excer check afterwards.`;

const specifierPattern = /(from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)(['"])(\.{1,2}(?:\/[^'"]*)?)\2/g;
const suffixes = ['', '.ts', '.tsx', '.js', '.cjs', '.json', '/index.ts', '/index.tsx', '/index.js'];
type Project = { root: string; scan: string[]; configs: string[] };
const projects: Project[] = [
  { root: appRoot, scan: ['src', 'app', 'modules', 'index.js'], configs: ['tsconfig.json', 'metro.config.js'] },
  { root: serverRoot, scan: ['src'], configs: ['drizzle.config.ts', 'tsconfig.json'] },
];

const isFile = (path: string) => existsSync(path) && statSync(path).isFile();

function resolveSpecifier(from: string, specifier: string): { file: string; suffix: string } | null {
  const base = normalize(join(dirname(from), specifier));
  for (const suffix of suffixes) if (isFile(base + suffix)) return { file: base + suffix, suffix };
  if (/\.js$/.test(base) && isFile(base.replace(/\.js$/, '.ts'))) return { file: base.replace(/\.js$/, '.ts'), suffix: 'js' };
  return null;
}

function specifierBetween(from: string, to: string, suffix: string, original: string): string {
  let specifier = relative(dirname(from), to);
  if (suffix === 'js') specifier = specifier.replace(/\.ts$/, '.js');
  else if (suffix.startsWith('/index')) specifier = dirname(specifier);
  else if (suffix && suffix !== '.json' && !original.endsWith(suffix)) specifier = specifier.slice(0, -suffix.length);
  return specifier.startsWith('.') ? specifier : `./${specifier}`;
}

function plan(args: string[]): Map<string, string> {
  if (args.length < 2) throw new UsageError(moveHelp);
  const destination = resolve(args[args.length - 1] ?? '');
  const sources = args.slice(0, -1).map((path) => resolve(path));
  const intoDirectory = sources.length > 1 || args[args.length - 1]?.endsWith('/') || (existsSync(destination) && statSync(destination).isDirectory());
  const moves = new Map<string, string>();
  for (const source of sources) {
    if (!isFile(source)) throw new UsageError(`${rel(source)} is not a file`);
    if (!projects.some((project) => source.startsWith(project.root + '/'))) throw new UsageError(`${rel(source)} is outside app-next and server`);
    const target = intoDirectory ? join(destination, basename(source)) : destination;
    if (existsSync(target)) throw new UsageError(`${rel(target)} already exists`);
    moves.set(source, target);
  }
  return moves;
}

export function moveCommand(args: string[]): number {
  const moves = plan(args);
  const after = (path: string) => moves.get(path) ?? path;
  const touched = projects.filter((project) => [...moves.keys()].some((source) => source.startsWith(project.root + '/')));
  const scanned = touched.flatMap((project) =>
    project.scan.flatMap((entry) => (isFile(join(project.root, entry)) ? [join(project.root, entry)] : walk(join(project.root, entry)))),
  );
  const edits = new Map<string, string>();
  const unresolved: string[] = [];
  for (const file of scanned) {
    const source = readFileSync(file, 'utf8');
    const rewritten = source.replace(specifierPattern, (whole, lead: string, quote: string, specifier: string) => {
      const target = resolveSpecifier(file, specifier);
      if (!target) {
        unresolved.push(`${rel(file)}: ${specifier}`);
        return whole;
      }
      if (!moves.has(file) && !moves.has(target.file)) return whole;
      return `${lead}${quote}${specifierBetween(after(file), after(target.file), target.suffix, specifier)}${quote}`;
    });
    if (rewritten !== source) edits.set(after(file), rewritten);
  }
  for (const [from, to] of moves) {
    mkdirSync(dirname(to), { recursive: true });
    must('git', ['mv', from, to]);
  }
  for (const [file, text] of edits) writeFileSync(file, text);
  for (const project of touched) {
    for (const name of project.configs) {
      const path = join(project.root, name);
      if (!isFile(path)) continue;
      let text = readFileSync(path, 'utf8');
      const before = text;
      for (const [from, to] of moves) {
        const [a, b] = [relative(project.root, from), relative(project.root, to)];
        const bare = (value: string) => value.replace(/\.(tsx?)$/, '');
        text = text.split(`'${a}'`).join(`'${b}'`).split(`"./${a}"`).join(`"./${b}"`).split(`"./${bare(a)}"`).join(`"./${bare(b)}"`);
      }
      if (text !== before) writeFileSync(path, text);
    }
  }
  out.ok(`moved ${moves.size} file(s), rewrote imports in ${edits.size}`);
  for (const line of unresolved.slice(0, 10)) out.info(`unresolved (left as is): ${line}`);
  return 0;
}
