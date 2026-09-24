import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import ts from "typescript";

const source = fs.readFileSync(new URL("../src/lib/date-format.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const dateFormat = new Module("date-format-test");
dateFormat.filename = new URL("../src/lib/date-format.ts", import.meta.url).pathname;
dateFormat.paths = Module._nodeModulePaths(process.cwd());
dateFormat._compile(compiled, dateFormat.filename);

test("finance date formatting falls back instead of crashing on an invalid date", () => {
  for (const value of ["not-a-date", "", null, undefined]) {
    assert.equal(dateFormat.exports.formatFinanceDate(value), "Date indisponible");
  }
});

test("finance date formatting accepts valid date values", () => {
  assert.match(dateFormat.exports.formatFinanceDate("2026-09-23"), /23.*2026/);
});
