import { rel } from '../lib/paths.ts';
import { analyticsEvents, appRoutes, loadFeatures, requiredSections, routeFile, scenarioIds, serverEndpoints } from '../lib/features.ts';
import { verdict, type Check } from './types.ts';

export function featureProblems(): string[] {
  const features = loadFeatures();
  if (features.length === 0) return ['no feature files in .agents/skills/verify-excerlock/references/features'];
  const problems: string[] = [];
  const ids = new Set(features.map((feature) => feature.id));
  const scenarios = new Set(scenarioIds());
  const endpoints = new Set(serverEndpoints());
  const events = new Set(analyticsEvents());
  const claimed = new Set<string>();
  for (const feature of features) {
    const where = rel(feature.file);
    if (!feature.title) problems.push(`${where}: missing title`);
    const missing = requiredSections.filter((section) => !feature.sections.includes(section));
    if (missing.length > 0) problems.push(`${where}: missing sections ${missing.map((s) => `"## ${s}"`).join(', ')}`);
    for (const route of feature.routes) {
      claimed.add(route);
      if (!routeFile(route)) problems.push(`${where}: route ${route} has no file under app-next/app`);
    }
    const used = [...feature.scenarios, ...feature.proofs.flatMap((proof) => (proof.scenario ? [proof.scenario] : []))];
    for (const scenario of used) if (!scenarios.has(scenario)) problems.push(`${where}: unknown scenario ${scenario}`);
    for (const endpoint of feature.server) if (!endpoints.has(endpoint)) problems.push(`${where}: unknown endpoint ${endpoint}`);
    for (const event of feature.events) if (!events.has(event)) problems.push(`${where}: unknown analytics event ${event}`);
    for (const dependency of feature.depends) if (!ids.has(dependency)) problems.push(`${where}: depends on unknown feature ${dependency}`);
    for (const proof of feature.proofs) {
      if (!proof.scenario && !proof.open) problems.push(`${where}: proof ${proof.name} needs a scenario or open`);
      if (proof.expect.length === 0) problems.push(`${where}: proof ${proof.name} expects nothing`);
    }
  }
  for (const route of appRoutes()) if (!claimed.has(route)) problems.push(`route ${route} belongs to no feature`);
  return problems;
}

export const featureMap: Check = {
  name: 'feature-map',
  why: 'Every route belongs to a feature, and every feature names real routes, scenarios, endpoints and events.',
  tier: 'static',
  run() {
    return verdict(featureProblems(), `${loadFeatures().length} features`);
  },
};
