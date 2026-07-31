import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import { fromRoot, readUtf8, repoRelative, walkFiles } from "./repo-files";

const codeExtensions = new Set([".ts", ".tsx"]);

const PHASE_3_ACCESSORS = [
  "getScreenTimeModule",
  "getLocationProvider",
  "createExcerlockMotionModuleClient",
  "getMilestoneHaptics",
] as const;

const ACCESSOR_MODULES: Readonly<Record<(typeof PHASE_3_ACCESSORS)[number], readonly string[]>> = {
  getScreenTimeModule: ["@/screentime"],
  getLocationProvider: ["@/signals"],
  createExcerlockMotionModuleClient: ["@/signals"],
  getMilestoneHaptics: ["@/analysis"],
};

function isProductionFile(path: string): boolean {
  const file = repoRelative(path);
  return (
    !file.includes("/__tests__/") &&
    !file.includes("/testing/") &&
    !file.startsWith("app/src/e2e/") &&
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
  const importedAccessors = new Map<
    string,
    (typeof PHASE_3_ACCESSORS)[number]
  >();
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
        PHASE_3_ACCESSORS.includes(
          importedName as (typeof PHASE_3_ACCESSORS)[number],
        ) &&
        ACCESSOR_MODULES[
          importedName as (typeof PHASE_3_ACCESSORS)[number]
        ].includes(moduleName)
      ) {
        importedAccessors.set(
          element.name.text,
          importedName as (typeof PHASE_3_ACCESSORS)[number],
        );
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

function resolveProductionModule(
  from: string,
  specifier: string,
): string | undefined {
  const base = specifier.startsWith("@/")
    ? fromRoot("app", "src", specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(from), specifier)
      : undefined;
  if (base === undefined) {
    return undefined;
  }

  return [
    `${base}.ts`,
    `${base}.tsx`,
    resolve(base, "index.ts"),
    resolve(base, "index.tsx"),
  ].find((candidate) => existsSync(candidate) && isProductionFile(candidate));
}

function productionFilesReachableFromRoutes(): readonly string[] {
  const routes = walkFiles(fromRoot("app", "app"), codeExtensions).filter(
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

describe("Phase 3 production composition", () => {
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
        `import { getLocationProvider as location } from "@/signals";
         location();`,
      ),
    ).toEqual(["getLocationProvider"]);
  });

  it("gives every native accessor a production caller", () => {
    const productionCalls = new Map<string, string[]>();
    const files = productionFilesReachableFromRoutes();

    for (const path of files) {
      for (const accessor of calledImportedAccessors(path)) {
        const sites = productionCalls.get(accessor) ?? [];
        sites.push(repoRelative(path));
        productionCalls.set(accessor, sites);
      }
    }

    const unreachable = PHASE_3_ACCESSORS.filter(
      (accessor) => (productionCalls.get(accessor) ?? []).length === 0,
    );

    expect(
      unreachable,
      "A tested native adapter is still dead code until production calls its accessor",
    ).toEqual([]);
  });
});
