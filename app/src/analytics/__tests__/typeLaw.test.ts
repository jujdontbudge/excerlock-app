import path from "node:path";

import ts from "typescript";

/**
 * The type-level test. `__typechecks__/trackTypeLaw.ts` is a file whose legal
 * calls must compile and whose `@ts-expect-error` calls must not — so it has
 * zero diagnostics if and only if the type law holds. This test compiles it
 * with the app's own tsconfig and asserts exactly that.
 */
const TYPE_LAW_FILE = path.resolve(__dirname, "../__typechecks__/trackTypeLaw.ts");
const APP_TSCONFIG = path.resolve(__dirname, "../../../tsconfig.json");

function compilerOptions(): ts.CompilerOptions {
  const { config, error } = ts.readConfigFile(APP_TSCONFIG, ts.sys.readFile);
  if (error) {
    throw new Error(ts.flattenDiagnosticMessageText(error.messageText, "\n"));
  }
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, path.dirname(APP_TSCONFIG));
  return { ...parsed.options, noEmit: true, skipLibCheck: true, types: [] };
}

function describeDiagnostic(diagnostic: ts.Diagnostic): string {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ");
  if (!diagnostic.file || diagnostic.start === undefined) {
    return message;
  }
  const { line } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  return `${path.basename(diagnostic.file.fileName)}:${line + 1} ${message}`;
}

describe("AnalyticsKit type law", () => {
  const program = ts.createProgram([TYPE_LAW_FILE], compilerOptions());
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .filter((diagnostic) => !diagnostic.file?.fileName.includes("/node_modules/typescript/"));

  it("compiles the legal calls and rejects every illegal one", () => {
    expect(diagnostics.map(describeDiagnostic)).toEqual([]);
  });

  it("actually checked the file it claims to check", () => {
    const checked = program.getSourceFile(TYPE_LAW_FILE);
    expect(checked).toBeDefined();
    expect(checked?.text).toContain("@ts-expect-error");
    expect(program.getSourceFiles().some((file) => file.fileName.endsWith("/AnalyticsKit.ts"))).toBe(
      true,
    );
  });
});
