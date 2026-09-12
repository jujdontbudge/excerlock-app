const { getDefaultConfig } = require('expo/metro-config');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const config = getDefaultConfig(__dirname);
const path = require('node:path');
const { researchEnabled } = require('./plugins/linkedRecorderResearchConfig');
const linkedRecorderResearch = researchEnabled(process.env);
// Babel and virtual-module selection depend on this opt-in. Metro's persistent
// transform cache must not reuse research transforms in a later ordinary build.
const cacheVersion = linkedRecorderResearch
  ? 'excerlock-linked-recorder-research-v1'
  : 'excerlock-ordinary-v1';
// Captures are development output, never modules. Otherwise saving evidence can
// trigger an HMR refresh banner in the very recording being captured.
const defaults = config.resolver.blockList ? [].concat(config.resolver.blockList) : [];
const blockList = [...defaults, /[/\\]app-next[/\\](evidence|build|coverage|dist)[/\\].*/];
// Dev routes must not enter preview/production route contexts or bundles.
// NODE_ENV covers local release exports; EXCERLOCK_ENV also covers dev-server previews.
if (process.env.NODE_ENV === 'production' || ['preview', 'prod'].includes(process.env.EXCERLOCK_ENV)) {
  blockList.push(/[/\\]app-next[/\\]app[/\\]dev\.tsx$/, /[/\\]app-next[/\\]src[/\\]features[/\\]dev[/\\].*/);
}
if (!linkedRecorderResearch) {
  blockList.push(
    /[/\\]app-next[/\\]app[/\\]linked-trace\.tsx$/,
    /[/\\]app-next[/\\]src[/\\]research[/\\]linkedTrace[/\\].*\.research\.(ts|tsx)$/,
  );
}
// This native app does not collect browser replay. Keep native crash reporting
// and Sentry debug IDs while excluding the SDK's unused web replay graph.
const sentryConfig = getSentryExpoConfig(__dirname, { includeWebReplay: false });
sentryConfig.cacheVersion = cacheVersion;
sentryConfig.resolver.blockList = blockList;
const aliases = {
  ...(sentryConfig.resolver.alias ?? {}),
  '@linked-trace': path.resolve(
    __dirname,
    linkedRecorderResearch
      ? 'src/research/linkedTrace/LinkedTrace.research.ts'
      : 'src/research/linkedTrace/LinkedTrace.disabled.ts',
  ),
  '@linked-trace-screen': path.resolve(
    __dirname,
    linkedRecorderResearch
      ? 'src/research/linkedTrace/LinkedTraceScreen.research.tsx'
      : 'src/research/linkedTrace/LinkedTraceScreen.disabled.tsx',
  ),
  '@posthog-runtime': path.resolve(
    __dirname,
    linkedRecorderResearch
      ? 'src/research/linkedTrace/createPostHogRuntime.research.ts'
      : 'src/runtime/analytics/createPostHogRuntime.ts',
  ),
  '@sentry-binding': path.resolve(
    __dirname,
    linkedRecorderResearch
      ? 'src/research/linkedTrace/SentryBinding.research.ts'
      : 'src/runtime/observability/SentryBinding.ts',
  ),
  '@sentry-capture': path.resolve(
    __dirname,
    linkedRecorderResearch
      ? 'src/research/linkedTrace/SentryCapture.research.ts'
      : 'src/runtime/observability/SentryCapture.ts',
  ),
};
// Metro does not resolve `resolver.alias` itself. Resolve these exact virtual
// modules explicitly, while preserving Sentry's resolver for replay exclusion.
const sentryResolveRequest = sentryConfig.resolver.resolveRequest;
sentryConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  const replacement = aliases[moduleName];
  if (replacement) return context.resolveRequest(context, replacement, platform);
  if (sentryResolveRequest) return sentryResolveRequest(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};
module.exports = sentryConfig;
