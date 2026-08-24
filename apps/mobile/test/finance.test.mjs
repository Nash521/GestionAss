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

test("finance overview exposes tabs, guarded loading, pagination and WhatsApp reminders", () => {
  const page = fs.readFileSync(new URL("../app/(admin)/finances.tsx", import.meta.url), "utf8");
  assert.match(page, /Mensualit/);
  assert.match(page, /Cotisations\s+exceptionnelles/);
  assert.match(page, /D\xE9caissements/);
  assert.match(page, /requestSequence/);
  assert.match(page, /getAdminFinance/);
  assert.match(page, /wa\.me/);
  assert.match(page, /encodeURIComponent/);
  assert.match(page, /router\.push/);
  assert.match(page, /totalPaid/);
  assert.match(page, /totalExpected/);
  assert.match(page, /totalDisbursed/);
  assert.match(page, /memberId/);
  assert.match(page, /icon:\s*"calendar"/);
  assert.match(page, /icon:\s*"gift"/);
  assert.match(page, /icon:\s*"external-link"/);
  assert.match(page, /tabText:[^}]*fontSize:\s*10/);
  assert.match(page, /backgroundColor:\s*"#FFF"/);
  assert.match(page, /borderRadius:\s*\d+/);
  assert.match(page, /activeTab[\s\S]*backgroundColor:\s*"#00A99D"/);
  assert.match(page, /flex:\s*1/);
  assert.match(page, /minWidth:\s*0/);
  assert.doesNotMatch(page, /horizontal/);
});

test("finance migration returns monthly member identity for reminders", () => {
  const sql = fs.readFileSync(new URL("../../../supabase/migrations/202608200001_finance_management.sql", import.meta.url), "utf8");
  assert.match(sql, /'firstName',first_name/);
  assert.match(sql, /'lastName',last_name/);
  assert.match(sql, /'phone',phone/);
});

test("admin navigation routes finance instead of showing a placeholder", () => {
  const chrome = fs.readFileSync(new URL("../src/components/admin-chrome.tsx", import.meta.url), "utf8");
  assert.match(chrome, /router\.push\("\/\(admin\)\/finances"\)/);
});

test("finance forms expose contextual fields and settings route", () => {
  const form = fs.readFileSync(new URL("../app/(admin)/finances/new.tsx", import.meta.url), "utf8");
  assert.match(form, /exceptional/); assert.match(form, /payment/); assert.match(form, /disbursement/);
  for (const field of ["justification", "targetMemberIds", "dueId", "reference", "beneficiaryMemberId", "exceptionalContributionId"]) assert.match(form, new RegExp(field));
  assert.match(fs.readFileSync(new URL("../app/(admin)/settings/finance.tsx", import.meta.url), "utf8"), /dueDay/);
});
