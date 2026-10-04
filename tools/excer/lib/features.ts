import { existsSync, readdirSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { appRoot, featuresDir, fromRoot, routesDir, scenariosDir, serverRoot } from './paths.ts';
import { read, walk } from './files.ts';

export const requiredSections = ['Sub-features', 'How to get to it (user POV)', 'Driving it with excer', 'Gotchas'];

export type ProofAction = { kind: 'tap' | 'type' | 'open' | 'location' | 'expect'; value: string };
export type Proof = { name: string; scenario?: string; open?: string; openWait?: number; prompt?: string; relaunch?: boolean; relaunchAfterExpect?: boolean; afterRelaunchExpect?: string[]; actions?: ProofAction[]; tap?: string[]; gesture?: 'back'; expect: string[]; absent?: string[]; wait: number; thenTap?: string[]; thenOpen?: string; thenExpect?: string[]; denyRoutes?: 'protected'; denyExpect?: string[]; notifications?: ('home' | 'unlock')[]; notificationExpect?: string[] };

export type Feature = {
  id: string;
  title: string;
  file: string;
  routes: string[];
  scenarios: string[];
  server: string[];
  events: string[];
  depends: string[];
  sections: string[];
  proofs: Proof[];
  body: string;
};

function parseValue(raw: string): string | string[] {
  const value = raw.trim();
  if (value.startsWith('[') && value.endsWith(']'))
    return value
      .slice(1, -1)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  return value;
}

function frontMatter(source: string): [Record<string, string | string[]>, string] {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(source);
  if (!match) return [{}, source];
  const fields: Record<string, string | string[]> = {};
  for (const line of (match[1] ?? '').split('\n')) {
    const pair = /^([\w-]+):\s*(.*)$/.exec(line);
    if (pair?.[1]) fields[pair[1]] = parseValue(pair[2] ?? '');
  }
  return [fields, source.slice(match[0].length)];
}

const list = (value: string | string[] | undefined) => (Array.isArray(value) ? value : value ? [value] : []);

function parseProofs(body: string): Proof[] {
  return [...body.matchAll(/```proof\n([\s\S]*?)```/g)].map((block) => {
    const fields: Record<string, string> = {};
    for (const line of (block[1] ?? '').split('\n')) {
      const pair = /^([\w-]+):\s*(.*)$/.exec(line.trim());
      if (pair?.[1]) fields[pair[1]] = (pair[2] ?? '').trim();
    }
    const proof: Proof = {
      name: fields.name ?? 'unnamed',
      expect: (fields.expect ?? '').split('|').map((item) => item.trim()).filter(Boolean),
      wait: Number(fields.wait ?? 15),
    };
    if (fields.absent) proof.absent = fields.absent.split('|').map((item) => item.trim()).filter(Boolean);
    if (fields.scenario) proof.scenario = fields.scenario;
    if (fields.open) proof.open = fields.open;
    if (fields['open-wait']) {
      proof.openWait = Number(fields['open-wait']);
      if (!Number.isFinite(proof.openWait) || proof.openWait < 0) throw new Error(`Invalid open-wait in ${proof.name}`);
    }
    if (fields.prompt) proof.prompt = fields.prompt;
    if (fields.relaunch === 'true') proof.relaunch = true;
    if (fields['relaunch-after-expect'] === 'true') proof.relaunchAfterExpect = true;
    if (fields['after-relaunch-expect']) proof.afterRelaunchExpect = fields['after-relaunch-expect'].split('|').map((item) => item.trim()).filter(Boolean);
    if (fields['then-tap']) proof.thenTap = fields['then-tap'].split('|').map((item) => item.trim()).filter(Boolean);
    if (fields['then-open']) proof.thenOpen = fields['then-open'];
    if (fields['then-expect']) proof.thenExpect = fields['then-expect'].split('|').map((item) => item.trim()).filter(Boolean);
    if (fields['deny-routes'] === 'protected') proof.denyRoutes = 'protected';
    if (fields['deny-expect']) proof.denyExpect = fields['deny-expect'].split('|').map((item) => item.trim()).filter(Boolean);
    if (fields.notifications) proof.notifications = fields.notifications.split('|').map((item) => item.trim()).filter((item): item is 'home' | 'unlock' => item === 'home' || item === 'unlock');
    if (fields['notification-expect']) proof.notificationExpect = fields['notification-expect'].split('|').map((item) => item.trim()).filter(Boolean);
    if (fields.actions) proof.actions = fields.actions.split('|').map((item) => item.trim()).filter(Boolean).map((item) => {
      const pair = /^(tap|type|open|location|expect)\s+(.+)$/.exec(item);
      if (!pair?.[1] || !pair[2]) throw new Error(`Invalid proof action "${item}" in ${proof.name}`);
      return { kind: pair[1] as ProofAction['kind'], value: pair[2] };
    });
    if (fields.tap) proof.tap = fields.tap.split('|').map((item) => item.trim()).filter(Boolean);
    if (fields.gesture === 'back') proof.gesture = 'back';
    return proof;
  });
}

export function loadFeatures(): Feature[] {
  if (!existsSync(featuresDir)) return [];
  return readdirSync(featuresDir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => {
      const file = join(featuresDir, name);
      const [fields, body] = frontMatter(read(file));
      return {
        id: String(fields.id ?? basename(name, '.md')),
        title: String(fields.title ?? ''),
        file,
        routes: list(fields.routes),
        scenarios: list(fields.scenarios),
        server: list(fields.server),
        events: list(fields.events),
        depends: list(fields.depends),
        sections: [...body.matchAll(/^## (.+)$/gm)].map((match) => (match[1] ?? '').trim()),
        proofs: parseProofs(body),
        body,
      };
    });
}

export function findFeature(id: string): Feature {
  const features = loadFeatures();
  const feature = features.find((candidate) => candidate.id === id);
  if (!feature) throw new Error(`Unknown feature "${id}". Known: ${features.map((f) => f.id).join(', ')}`);
  return feature;
}

export function appRoutes(): string[] {
  return walk(routesDir, ['.tsx', '.ts'])
    .map((file) => relative(routesDir, file).replace(/\.tsx?$/, ''))
    .filter((route) => !/(^|\/)_layout$/.test(route) && !route.endsWith('+not-found'))
    .sort();
}

export function protectedAppRoutes(): { route: string; href: string }[] {
  return appRoutes()
    .filter((route) =>
      route.startsWith('(tabs)/') ||
      route === 'builder' ||
      route === 'gym-picker' ||
      route.startsWith('permissions/') ||
      route.startsWith('settings/') ||
      route.startsWith('unlock/') ||
      route.startsWith('diagnostics/'),
    )
    .map((route) => ({
      route,
      href: `/${route}`
        .replace(/\/\([^/]+\)/g, '')
        .replace(/\/index$/, '')
        .replace('[step]', 'X1')
        .replace('[doc]', 'privacy')
        .replace('[name]', 'motion'),
    }));
}

export function scenarioIds(): string[] {
  return walk(scenariosDir, ['.ts'])
    .flatMap((file) => [...read(file).matchAll(/base\(\s*'([^']+)'/g)].map((match) => match[1] ?? ''))
    .filter(Boolean)
    .sort();
}

export function serverEndpoints(): string[] {
  const index = read(join(serverRoot, 'src', 'index.ts'));
  const prefix = /prefix:\s*"([^"]+)"/.exec(index)?.[1] ?? '/v1';
  return walk(join(serverRoot, 'src', 'routes'), ['.ts'])
    .flatMap((file) => {
      const source = read(file);
      return [
        ...[...source.matchAll(/\.(get|post|put|delete|patch)(?:<[^>]*>)?\(\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]),
        ...[...source.matchAll(/\.(get|post|put|delete|patch)(?:<[\s\S]*?>)?\(\s*\n\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]),
      ];
    })
    .map(([method, path]) => `${String(method).toUpperCase()} ${prefix}${path}`)
    .filter((value, index, all) => all.indexOf(value) === index)
    .sort();
}

export function analyticsEvents(): string[] {
  const names = walk(fromRoot('packages', 'analytics-events', 'src', 'events'), ['.ts']).flatMap((file) =>
    [...read(file).matchAll(/^\s{2}([a-z][a-z0-9_]+):\s*\{/gm)].map((match) => match[1] ?? ''),
  );
  return [...new Set(names.filter(Boolean))].sort();
}

export function routeFile(route: string): string | undefined {
  return ['.tsx', '.ts'].map((ext) => join(appRoot, 'app', route + ext)).find(existsSync);
}
