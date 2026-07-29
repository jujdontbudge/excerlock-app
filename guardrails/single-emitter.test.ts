import { existsSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import { fromRoot, readUtf8, repoRelative, walkFiles } from "./repo-files";

type EventOwner = "adapty" | "client" | "server";

type OwnerDeclaration = {
  event: string;
  file: string;
  owner: EventOwner;
};

type CaptureCall = {
  event?: string;
  file: string;
  side: "client" | "server";
};

const codeExtensions = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);
const eventOwners = new Set<EventOwner>(["adapty", "client", "server"]);

function propertyName(property: ts.ObjectLiteralElementLike): string | undefined {
  const { name } = property;
  return name && (ts.isIdentifier(name) || ts.isStringLiteral(name))
    ? name.text
    : undefined;
}

function stringProperty(object: ts.ObjectLiteralExpression, key: string): string | undefined {
  const property = object.properties.find(
    (candidate): candidate is ts.PropertyAssignment =>
      ts.isPropertyAssignment(candidate) && propertyName(candidate) === key,
  );
  return property && ts.isStringLiteral(property.initializer)
    ? property.initializer.text
    : undefined;
}

function sourceFile(path: string): ts.SourceFile {
  return ts.createSourceFile(path, readUtf8(path), ts.ScriptTarget.Latest, true);
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function stringLiteralTypes(type: ts.TypeNode): string[] {
  if (ts.isUnionTypeNode(type)) {
    return type.types.flatMap(stringLiteralTypes);
  }
  if (ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) {
    return [type.literal.text];
  }
  return [];
}

function eventRegistryName(name: string): boolean {
  return /event(?:s|names?|types?|keys?)?$/i.test(name);
}

function eventValues(expression: ts.Expression): string[] {
  const value = unwrapExpression(expression);

  if (ts.isArrayLiteralExpression(value)) {
    return value.elements.flatMap((element) => {
      const item = ts.isExpression(element) ? unwrapExpression(element) : undefined;
      return item && (ts.isStringLiteral(item) || ts.isNoSubstitutionTemplateLiteral(item))
        ? [item.text]
        : [];
    });
  }
  if (ts.isObjectLiteralExpression(value)) {
    return value.properties.flatMap((property) => propertyName(property) ?? []);
  }
  return [];
}

function readDeclaredEvents(path: string): string[] {
  const events = new Set<string>();

  function visit(node: ts.Node): void {
    if (
      ts.isTypeAliasDeclaration(node) &&
      eventRegistryName(node.name.text)
    ) {
      stringLiteralTypes(node.type).forEach((event) => events.add(event));
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      eventRegistryName(node.name.text) &&
      node.initializer
    ) {
      eventValues(node.initializer).forEach((event) => events.add(event));
    }
    if (ts.isEnumDeclaration(node) && eventRegistryName(node.name.text)) {
      node.members.forEach((member) => {
        if (member.initializer && ts.isStringLiteral(member.initializer)) {
          events.add(member.initializer.text);
        }
      });
    }
    if (ts.isObjectLiteralExpression(node)) {
      const event = stringProperty(node, "name") ?? stringProperty(node, "event");
      if (event) {
        events.add(event);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile(path));
  return [...events];
}

function readOwnerDeclarations(path: string): OwnerDeclaration[] {
  const declarations: OwnerDeclaration[] = [];

  function visit(node: ts.Node): void {
    if (ts.isObjectLiteralExpression(node)) {
      const owner = stringProperty(node, "owner") as EventOwner | undefined;
      const parentEvent = ts.isPropertyAssignment(node.parent)
        ? propertyName(node.parent)
        : undefined;
      const event = stringProperty(node, "name") ?? stringProperty(node, "event") ?? parentEvent;

      if (event && owner && eventOwners.has(owner)) {
        declarations.push({ event, file: repoRelative(path), owner });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile(path));
  return declarations;
}

function isTestFile(path: string): boolean {
  return path.includes("/__tests__/") || /\.(?:spec|test)\.[cm]?[jt]sx?$/.test(path);
}

function isTypedAnalyticsWrapper(file: string): boolean {
  return (
    file.startsWith("app/src/analytics/") ||
    file === "server/src/analytics.ts" ||
    file === "server/src/services/analytics.ts"
  );
}

function readCaptureCalls(path: string, side: CaptureCall["side"]): CaptureCall[] {
  const calls: CaptureCall[] = [];

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      const isCapture =
        (ts.isIdentifier(node.expression) && node.expression.text === "capture") ||
        (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "capture");

      if (isCapture) {
        const eventArgument = node.arguments[0];
        const event =
          eventArgument &&
          (ts.isStringLiteral(eventArgument) || ts.isNoSubstitutionTemplateLiteral(eventArgument))
            ? eventArgument.text
            : undefined;
        calls.push({ event, file: repoRelative(path), side });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile(path));
  return calls;
}

describe("analytics single-emitter guardrail", () => {
  it("gives every event exactly one owner and rejects wrong-side capture calls", () => {
    const analyticsRoot = fromRoot("packages", "analytics-events");
    const registryFiles = walkFiles(analyticsRoot, codeExtensions);
    const declaredEvents = new Set(registryFiles.flatMap(readDeclaredEvents));
    const declarations = registryFiles.flatMap(readOwnerDeclarations);
    const declarationsByEvent = Map.groupBy(declarations, ({ event }) => event);
    const captureCalls = [
      ...walkFiles(fromRoot("app"), codeExtensions)
        .filter((path) => !isTestFile(path))
        .flatMap((path) => readCaptureCalls(path, "client")),
      ...walkFiles(fromRoot("server"), codeExtensions)
        .filter((path) => !isTestFile(path))
        .flatMap((path) => readCaptureCalls(path, "server")),
    ];

    if (!existsSync(analyticsRoot)) {
      expect(captureCalls, "Capture calls require the typed analytics-events registry").toEqual([]);
      return;
    }

    expect(declaredEvents.size, "analytics-events must enumerate its typed event names").toBeGreaterThan(0);
    const ownershipProblems = [...declaredEvents]
      .map((event) => ({ event, declarations: declarationsByEvent.get(event) ?? [] }))
      .filter(({ declarations: eventDeclarations }) => eventDeclarations.length !== 1);
    expect(ownershipProblems, "Each analytics event must have exactly one owner declaration").toEqual([]);

    expect(
      captureCalls.filter(({ event, file }) => !event && !isTypedAnalyticsWrapper(file)),
      "Only typed AnalyticsKit wrappers may forward a dynamic event to capture()",
    ).toEqual([]);
    const wrongSideCaptureSites = captureCalls.filter(({ event, side }) => {
      if (!event) {
        return false;
      }
      const owner = declarationsByEvent.get(event)?.[0]?.owner;
      return owner !== side;
    });
    expect(wrongSideCaptureSites, "Capture calls must run only on their event's declared owner side").toEqual([]);
  });
});
