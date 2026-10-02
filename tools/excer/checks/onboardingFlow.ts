import { createHash } from 'node:crypto';
import ts from 'typescript';
import { fromRoot } from '../lib/paths.ts';
import { read } from '../lib/files.ts';
import { run } from '../lib/shell.ts';
import { verdict, type Check } from './types.ts';

export const onboardingFlowFiles = [
  'app-next/src/packages/onboarding/lib/flow.ts',
  'app-next/src/packages/onboarding/lib/stepId.ts',
  'app-next/src/packages/model/answers.ts',
  'app-next/src/packages/onboarding/flowOrder.ts',
  'app-next/src/packages/ports/OnboardingFlowPort.ts',
  'app-next/src/packages/onboarding/onboardingStore.ts',
  'app-next/src/packages/onboarding/lib/useOnboarding.ts',
  'app-next/src/packages/conditions/answersDraft.ts',
  'app-next/src/packages/onboarding/lib/validation.ts',
];
const contractPath = 'app-next/config/onboardingFlow.json';

function tokens(source: string): string[] {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, source);
  const result: string[] = [];
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) result.push(scanner.getTokenText());
  return result;
}

function choiceContract(source: string): string[] {
  const file = ts.createSourceFile('choices.ts', source, ts.ScriptTarget.Latest, true);
  const display = new Set(['title', 'label', 'caption', 'icon', 'plan']);
  const printer = ts.createPrinter({ removeComments: true });
  const contract: string[] = [];
  const semantic = (node: ts.Node) => {
    const transformed = ts.transform(node, [(context) => {
      const visit: ts.Visitor = (child) => {
        if (ts.isPropertyAssignment(child) && display.has(child.name.getText(file).replace(/^['"]|['"]$/g, ''))) return undefined;
        if (ts.isAsExpression(child) || ts.isSatisfiesExpression(child)) return ts.visitNode(child.expression, visit);
        return ts.visitEachChild(child, visit, context);
      };
      return (root) => ts.visitNode(root, visit)!;
    }]);
    contract.push(...tokens(printer.printNode(ts.EmitHint.Unspecified, transformed.transformed[0]!, file)));
    transformed.dispose();
  };
  for (const statement of file.statements) {
    if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
      if (declaration.initializer) { contract.push(declaration.name.getText(file)); semantic(declaration.initializer); }
    }
    else if (ts.isFunctionDeclaration(statement)) semantic(statement);
  }
  return contract;
}

export function onboardingFlowFingerprint(): string {
  const files = onboardingFlowFiles.map((file) => [file, tokens(read(fromRoot(file)))]);
  const choices = ['onboardingChoicesCopy.ts', 'activityBaselineCopy.ts', 'bodyTargetCopy.ts'].map((name) => {
    const source = read(fromRoot('app-next/src/packages/onboarding/lib', name));
    return [name, choiceContract(source)];
  });
  return createHash('sha256').update(JSON.stringify([...files, ...choices])).digest('hex');
}

export const onboardingFlowVersion: Check = {
  name: 'onboarding-flow-version',
  why: 'Page order, branching, answer meaning and flag order handling require a new onboarding flow version (ADR 0060).',
  tier: 'static',
  run() {
    const declared = JSON.parse(read(fromRoot(contractPath))) as { version: number; fingerprint: string };
    const problems: string[] = [];
    if (!Number.isSafeInteger(declared.version) || declared.version < 1) problems.push('onboarding flow version must be a positive integer');
    if (declared.fingerprint !== onboardingFlowFingerprint()) problems.push('Onboarding flow changed. Increment config/onboardingFlow.json version and record its new fingerprint with ./excer ota-lab fingerprint. Copy and visual changes keep the version.');
    for (const ref of ['HEAD', 'origin/main']) {
      const previous = run('git', ['show', `${ref}:${contractPath}`]);
      if (previous.code !== 0) continue;
      const old = JSON.parse(previous.stdout) as typeof declared;
      if (old.fingerprint !== declared.fingerprint && declared.version <= old.version) problems.push(`Flow fingerprint changed without a version bump above ${ref} version ${old.version}`);
      if (declared.version < old.version) problems.push(`Flow version regressed below ${ref}`);
    }
    return verdict(problems);
  },
};
