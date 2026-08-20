import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import Module from "node:module";

const source = fs.readFileSync(new URL("../src/lib/supabase.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const finance = new Module("supabase-finance-test");
finance.filename = new URL("../src/lib/supabase.ts", import.meta.url).pathname;
finance.paths = Module._nodeModulePaths(process.cwd());
finance._compile(compiled, finance.filename);

test("finance client exposes complete domain types", () => {
  for (const name of ["AdminFinance", "FinanceTab", "MonthlyDue", "ExceptionalContribution", "Disbursement", "FinanceMember", "AdminFinanceAction"]) {
    assert.match(source, new RegExp(`(?:type|interface) ${name}\\b`));
  }
  assert.match(source, /FinanceTab = "monthly" \| "exceptional" \| "disbursements"/);
});

test("getAdminFinance uses exact pagination payload", () => {
  assert.match(source, /getAdminFinance\s*\(tab:\s*FinanceTab,\s*offset\s*=\s*0,\s*limit\s*=\s*30/);
  assert.match(source, /"get-admin-finance"/);
  assert.match(source, /tab,\s*offset,\s*limit/);
});

test("createAdminFinanceAction forwards discriminated action payload", () => {
  assert.match(source, /createAdminFinanceAction\s*\(action:\s*AdminFinanceAction/);
  assert.match(source, /"create-admin-finance-action"/);
});

test("getAdminFinance forwards endpoint and pagination at runtime", async () => {
  const calls = [];
  const result = await finance.exports.getAdminFinance("exceptional", 10, 20, async (...args) => { calls.push(args); return { items: [], metadata: { offset: 10, limit: 20, total: 0 }, summary: {} }; });
  assert.deepEqual(calls, [["get-admin-finance", { tab: "exceptional", offset: 10, limit: 20 }]]);
  assert.equal(result.metadata.limit, 20);
});

test("createAdminFinanceAction forwards the exact action payload at runtime", async () => {
  const calls = [];
  const action = { action: "generateMonthly", month: "2026-08-01" };
  const result = await finance.exports.createAdminFinanceAction(action, async (...args) => { calls.push(args); return { id: 3 }; });
  assert.deepEqual(calls, [["create-admin-finance-action", action]]);
  assert.equal(result.id, 3);
});
