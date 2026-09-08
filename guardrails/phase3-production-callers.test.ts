import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import { fromRoot, readUtf8, repoRelative, walkFiles } from "./repo-files";

const codeExtensions = new Set([".ts", ".tsx"]);

/**
 * A tested native adapter is dead code until production calls its accessor.
 *
 * `required` accessors must have a caller reachable from a route. `pending`
 * ones must NOT yet — so the run that wires one up fails here until its author
 * moves it, which is the same permanent-promotion pattern
 * `native-targets.json` uses for the extension targets. Nothing is allowed to
 * sit in neither list.
 */
const REQUIRED_ACCESSORS = {
  nativeGait: ["../runtime/NativeGait", "./NativeGait"],
  // P2-T04 — ScreenTimeAdapter, composed in createRuntime on a real device.
  createNativeScreenTimeModule: [
    "../engine/screentime/native/createNativeScreenTimeModule",
  ],
} as const;

const PENDING_ACCESSORS = {
  // P2-T05 — StepsAdapter, WalkingAdapter, GymAdapter
  createExcerlockMotionModuleClient: ["../engine/signals", "../../engine/signals"],
  createPhonePlacementModuleClient: ["../engine/signals", "../../engine/signals"],
  getLocationProvider: ["../engine/signals", "../../engine/signals"],
} as const;

type AccessorName =
  | keyof typeof REQUIRED_ACCESSORS
  | keyof typeof PENDING_ACCESSORS;

const ACCESSOR_MODULES: Readonly<Record<string, readonly string[]>> = {
  ...REQUIRED_ACCESSORS,
  ...PENDING_ACCESSORS,
};
const ACCESSORS = Object.keys(ACCESSOR_MODULES) as AccessorName[];

function isProductionFile(path: string): boolean {
  const file = repoRelative(path);
  return (
    !file.includes("/__tests__/") &&
    !file.includes("/testing/") &&
    !file.includes("/src/demo/") &&
    !/\.(?:spec|test)\.[jt]sx?$/.test(file)
  );
}

function calledImportedAccessors(
  path: string,
  sourceText: string = readUtf8(path),
): readonly string[] {
  const source = ts.createSourceFile(
    path,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );
  const importedAccessors = new Map<string, AccessorName>();
  const calls: string[] = [];

  source.statements.forEach((statement) => {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.importClause?.isTypeOnly === true ||
      !statement.importClause?.namedBindings ||
      !ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      return;
    }
    const moduleName = statement.moduleSpecifier.text;
    statement.importClause.namedBindings.elements.forEach((element) => {
      const importedName = element.propertyName?.text ?? element.name.text;
      if (
        !element.isTypeOnly &&
        ACCESSORS.includes(importedName as AccessorName) &&
        ACCESSOR_MODULES[importedName]?.includes(moduleName)
      ) {
        importedAccessors.set(element.name.text, importedName as AccessorName);
      }
    });
  });

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const accessor = importedAccessors.get(node.expression.text);
      if (accessor !== undefined) {
        calls.push(accessor);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return calls;
}

function importedModules(path: string): readonly string[] {
  const source = ts.createSourceFile(
    path,
    readUtf8(path),
    ts.ScriptTarget.Latest,
    true,
  );
  const modules: string[] = [];

  function visit(node: ts.Node): void {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      modules.push(node.moduleSpecifier.text);
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return modules;
}

/** app-next has no path alias; every internal import is relative. */
function resolveProductionModule(
  from: string,
  specifier: string,
): string | undefined {
  if (!specifier.startsWith(".")) {
    return undefined;
  }
  const base = resolve(dirname(from), specifier);
  return [
    `${base}.ts`,
    `${base}.tsx`,
    resolve(base, "index.ts"),
    resolve(base, "index.tsx"),
  ].find((candidate) => existsSync(candidate) && isProductionFile(candidate));
}

function productionFilesReachableFromRoutes(): readonly string[] {
  const routes = walkFiles(fromRoot("app-next", "app"), codeExtensions).filter(
    isProductionFile,
  );
  const reachable = new Set(routes);
  const pending = [...routes];

  while (pending.length > 0) {
    const path = pending.pop()!;
    for (const specifier of importedModules(path)) {
      const dependency = resolveProductionModule(path, specifier);
      if (dependency !== undefined && !reachable.has(dependency)) {
        reachable.add(dependency);
        pending.push(dependency);
      }
    }
  }

  return [...reachable];
}

describe("native production composition", () => {
  it("ignores same-named calls that are not imported accessors", () => {
    expect(
      calledImportedAccessors(
        "impostor.ts",
        `const object = { getLocationProvider() {} };
         object.getLocationProvider();`,
      ),
    ).toEqual([]);
    expect(
      calledImportedAccessors(
        "caller.ts",
        `import { getLocationProvider as location } from "../engine/signals";
         location();`,
      ),
    ).toEqual(["getLocationProvider"]);
  });

  it("gives every required native accessor a production caller", () => {
    const productionCalls = calledAccessorsByName();

    expect(
      Object.keys(REQUIRED_ACCESSORS).filter(
        (accessor) => (productionCalls.get(accessor) ?? []).length === 0,
      ),
      "A tested native adapter is still dead code until production calls its accessor",
    ).toEqual([]);
  });

  it("makes wiring a pending accessor promote it out of the pending list", () => {
    const productionCalls = calledAccessorsByName();

    expect(
      Object.keys(PENDING_ACCESSORS).filter(
        (accessor) => (productionCalls.get(accessor) ?? []).length > 0,
      ),
      "This accessor now has a production caller; move it into REQUIRED_ACCESSORS",
    ).toEqual([]);
  });
});

function calledAccessorsByName(): Map<string, string[]> {
  const productionCalls = new Map<string, string[]>();
  for (const path of productionFilesReachableFromRoutes()) {
    for (const accessor of calledImportedAccessors(path)) {
      const sites = productionCalls.get(accessor) ?? [];
      sites.push(repoRelative(path));
      productionCalls.set(accessor, sites);
    }
  }
  return productionCalls;
}
