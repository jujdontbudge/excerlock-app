import path from "node:path";

import ts from "typescript";

const TYPE_LAW_FILE = path.resolve(__dirname, "../__typechecks__/inputTypeLaw.ts");
const APP_TSCONFIG = path.resolve(__dirname, "../../../tsconfig.json");

function compilerOptions(): ts.CompilerOptions {
  const { config, error } = ts.readConfigFile(APP_TSCONFIG, ts.sys.readFile);
  if (error) {
    throw new Error(ts.flattenDiagnosticMessageText(error.messageText, "\n"));
  }
  const parsed = ts.parseJsonConfigFileContent(
    config,
    ts.sys,
    path.dirname(APP_TSCONFIG),
  );
  return { ...parsed.options, noEmit: true, skipLibCheck: true, types: [] };
}

function describeDiagnostic(diagnostic: ts.Diagnostic): string {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ");
  if (!diagnostic.file || diagnostic.start === undefined) return message;
  const { line } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  return `${path.basename(diagnostic.file.fileName)}:${line + 1} ${message}`;
}

describe("share-card input privacy law", () => {
  const program = ts.createProgram([TYPE_LAW_FILE], compilerOptions());
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .filter(
      (diagnostic) =>
        !diagnostic.file?.fileName.includes("/node_modules/typescript/"),
    );

  it("compiles aggregate/date inputs and rejects forbidden fields individually", () => {
    expect(diagnostics.map(describeDiagnostic)).toEqual([]);
  });

  it("actually checks the public narrow-input contract", () => {
    const checked = program.getSourceFile(TYPE_LAW_FILE);
    expect(checked).toBeDefined();
    expect(checked?.text).toContain("@ts-expect-error");
    expect(program.getSourceFiles().some((file) => file.fileName.endsWith("ShareCardInput.ts"))).toBe(
      true,
    );
  });
});
