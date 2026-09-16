import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { eventsOwnedBy, isRegisteredEvent, ownerOf } from '@excerlock/analytics-events';
import { CLIENT_EVENT_ALLOWLIST } from '../PostHogAnalyticsAdapter';

/**
 * The single-emitter guardrail the registry docstring promises (D4, ARCHITECTURE
 * §5 #6), pointed at the shipping app: every `track()`/`capture()` call site is
 * walked against the registry's declared owners, so an unregistered or
 * wrong-side event cannot reach the transport.
 */
const appNextRoot = path.resolve(__dirname, '../../../..');

/** The emitter boundary may forward a dynamic name; no product file may. */
const emitterBoundary = [
  'src/runtime/analytics/PostHogAnalyticsAdapter.ts',
  'src/runtime/analytics/createPostHogRuntime.ts',
  'src/research/linkedTrace/',
];

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' || entry.name === '__previews__' || entry.name === 'node_modules'
        ? []
        : sourceFiles(target);
    }
    return /\.[jt]sx?$/.test(entry.name) ? [target] : [];
  });
}

function productFiles(): string[] {
  return [...sourceFiles(path.join(appNextRoot, 'src')), ...sourceFiles(path.join(appNextRoot, 'app'))]
    .map((file) => path.relative(appNextRoot, file))
    .filter((file) => !emitterBoundary.some((boundary) => file === boundary || file.startsWith(boundary)));
}

function parse(file: string): ts.SourceFile {
  return ts.createSourceFile(file, fs.readFileSync(path.join(appNextRoot, file), 'utf8'), ts.ScriptTarget.Latest, true);
}

type TransportCall = { event?: string; file: string; line: number };

/** `x.track(...)` / `x.capture(...)` — `this.track(...)` is not a transport call. */
function transportCalls(file: string): TransportCall[] {
  const source = parse(file);
  const calls: TransportCall[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      (node.expression.name.text === 'track' || node.expression.name.text === 'capture') &&
      node.expression.expression.kind !== ts.SyntaxKind.ThisKeyword
    ) {
      const argument = node.arguments[0];
      calls.push({
        event: argument && ts.isStringLiteralLike(argument) ? argument.text : undefined,
        file,
        line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return calls;
}

/** Every string literal in a file — comments never count as emissions. */
function stringLiterals(file: string): string[] {
  const source = parse(file);
  const literals: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteralLike(node)) literals.push(node.text);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return literals;
}

const files = productFiles();
const calls = files.flatMap(transportCalls);

test('every transport call site emits a registry client event with a static literal', () => {
  const violations = calls
    .map(({ event, file, line }) => {
      const where = `${file}:${line}`;
      if (!event) return `${where} forwards a dynamic event name (D3 requires a static literal)`;
      if (!isRegisteredEvent(event)) return `${where} emits unregistered event ${event}`;
      if (ownerOf(event) !== 'client') return `${where} emits ${event}, owned by ${ownerOf(event)}`;
      return null;
    })
    .filter((violation): violation is string => violation !== null);
  expect(violations).toEqual([]);
});

test('no product file names a server- or Adapty-owned event', () => {
  const foreign = new Set<string>([...eventsOwnedBy('adapty'), ...eventsOwnedBy('server')]);
  const violations = files.flatMap((file) =>
    stringLiterals(file)
      .filter((literal) => foreign.has(literal))
      .map((literal) => `${file} names ${literal}`),
  );
  expect(violations).toEqual([]);
});

test('the runtime allowlist is exactly the registry client-owned set', () => {
  expect([...CLIENT_EVENT_ALLOWLIST].sort()).toEqual([...eventsOwnedBy('client')].sort());
  expect(['paywall_viewed', 'purchase_started', 'purchase_failed', 'restore_started', 'restore_succeeded', 'restore_failed']
    .filter((event) => !CLIENT_EVENT_ALLOWLIST.has(event))).toEqual([]);
  expect(['trial_started', 'trial_converted', 'subscription_started', 'subscription_renewed', 'billing_issue_detected', 'entered_grace_period']
    .filter((event) => CLIENT_EVENT_ALLOWLIST.has(event))).toEqual([]);
});

test('the walk reaches the shipping app rather than passing vacuously', () => {
  expect(files.length).toBeGreaterThan(100);
  expect(calls.length).toBeGreaterThan(10);
  expect(calls.map((call) => call.event)).toContain('gym_presence_ended');
});
