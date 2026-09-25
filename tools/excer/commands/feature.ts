import { featureProblems } from '../checks/features.ts';
import { appRoutes, findFeature, loadFeatures, type Feature } from '../lib/features.ts';
import { rel } from '../lib/paths.ts';
import { option, out, UsageError } from '../lib/shell.ts';

export const help = `excer feature <command>

The feature map: one file per feature area in
.agents/skills/verify-excerlock/references/features/.
  list                         id, title, routes and proofs per feature
  show <id>                    print the feature file
  graph [--format mermaid|json|dot] [--focus <id>]
                               features, routes, scenarios, endpoints and events
  check                        validate the map against the code
  routes                       every app route and the feature that owns it`;

type Edge = [string, string, string];

function graph(features: Feature[]): { nodes: Map<string, string>; edges: Edge[] } {
  const nodes = new Map<string, string>();
  const edges: Edge[] = [];
  for (const feature of features) {
    const self = `feature:${feature.id}`;
    nodes.set(self, feature.title);
    const link = (kind: string, value: string, label: string) => {
      nodes.set(`${kind}:${value}`, value);
      edges.push([self, `${kind}:${value}`, label]);
    };
    feature.routes.forEach((route) => link('route', `/${route}`, 'screen'));
    [...new Set([...feature.scenarios, ...feature.proofs.flatMap((proof) => (proof.scenario ? [proof.scenario] : []))])].forEach((s) => link('scenario', s, 'demo'));
    feature.server.forEach((endpoint) => link('endpoint', endpoint, 'calls'));
    feature.events.forEach((event) => link('event', event, 'emits'));
    feature.depends.forEach((dependency) => edges.push([self, `feature:${dependency}`, 'depends on']));
  }
  return { nodes, edges };
}

const safeId = (id: string) => id.replace(/[^\w]/g, '_');

function render(format: string, features: Feature[]): string {
  const { nodes, edges } = graph(features);
  if (format === 'json') return JSON.stringify({ nodes: [...nodes].map(([id, label]) => ({ id, label })), edges: edges.map(([from, to, label]) => ({ from, to, label })) }, null, 2);
  if (format === 'dot') {
    const lines = [...nodes].map(([id, label]) => `  "${id}" [label="${label.replace(/"/g, "'")}" shape=${id.startsWith('feature:') ? 'box' : 'ellipse'}];`);
    return `digraph excerlock {\n  rankdir=LR;\n${lines.join('\n')}\n${edges.map(([a, b, l]) => `  "${a}" -> "${b}" [label="${l}"];`).join('\n')}\n}`;
  }
  const shape = (id: string, label: string) => {
    const text = label.replace(/"/g, "'");
    if (id.startsWith('feature:')) return `${safeId(id)}["${text}"]`;
    if (id.startsWith('route:')) return `${safeId(id)}(["${text}"])`;
    if (id.startsWith('endpoint:')) return `${safeId(id)}[/"${text}"/]`;
    return `${safeId(id)}("${text}")`;
  };
  return ['flowchart LR', ...[...nodes].map(([id, label]) => `  ${shape(id, label)}`), ...edges.map(([a, b, l]) => `  ${safeId(a)} -->|${l}| ${safeId(b)}`)].join('\n');
}

export function featureCommand(args: string[]): number {
  const format = option(args, 'format') ?? 'mermaid';
  const focus = option(args, 'focus');
  const [command, id] = args;
  const features = loadFeatures();
  switch (command) {
    case 'list':
      for (const feature of features)
        console.log(`${feature.id.padEnd(16)}${feature.title.padEnd(42)}${String(feature.routes.length).padStart(2)} routes  ${feature.proofs.length} proofs`);
      return 0;
    case 'show':
      if (!id) throw new UsageError('excer feature show <id>');
      console.log(`# ${rel(findFeature(id).file)}\n`);
      console.log(findFeature(id).body.trim());
      return 0;
    case 'graph': {
      const selected = focus ? features.filter((feature) => feature.id === focus || feature.depends.includes(focus) || findFeature(focus).depends.includes(feature.id)) : features;
      console.log(render(format, selected));
      return 0;
    }
    case 'check': {
      const problems = featureProblems();
      if (problems.length === 0) out.ok(`feature map matches the code (${features.length} features)`);
      else {
        out.fail('feature map drifted from the code');
        out.detail(problems.join('\n'));
      }
      return problems.length === 0 ? 0 : 1;
    }
    case 'routes':
      for (const route of appRoutes()) {
        const owners = features.filter((feature) => feature.routes.includes(route)).map((feature) => feature.id);
        console.log(`/${route}`.padEnd(34) + (owners.join(', ') || '(none)'));
      }
      return 0;
    default:
      throw new UsageError(help);
  }
}
