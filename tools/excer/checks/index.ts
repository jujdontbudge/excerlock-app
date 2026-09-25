import { agentLayout, analyticsEmitter, ciPinned, deployHostKey, flagRegistry, noTests, researchIsolation, shieldCopyParity, updatesOwner } from './boundaries.ts';
import { dependencyFloors, publicConfigSecrets, sentryCore } from './dependencies.ts';
import { featureMap } from './features.ts';
import { comments, illustrationTokens, rawColours, rawType } from './ratchets.ts';
import { expoDependencies, lint, releaseBundle, typecheck } from './toolchain.ts';
import type { Check } from './types.ts';

export const checks: Check[] = [
  typecheck,
  lint,
  noTests,
  comments,
  updatesOwner,
  analyticsEmitter,
  flagRegistry,
  shieldCopyParity,
  researchIsolation,
  rawColours,
  rawType,
  illustrationTokens,
  dependencyFloors,
  sentryCore,
  ciPinned,
  deployHostKey,
  agentLayout,
  featureMap,
  publicConfigSecrets,
  expoDependencies,
  releaseBundle,
];
