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
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "./supabase-client") return { invokeRegistrationFunction: async () => ({}), getSupabaseClient: () => ({}), getFunctionErrorMessage: async () => null };
  if (request === "../features/members/api") return {};
  return originalLoad.call(this, request, parent, isMain);
};
try {
  finance._compile(compiled, finance.filename);
} finally {
  Module._load = originalLoad;
}

test("finance client exposes complete domain types", () => {
  for (const name of ["AdminFinance", "FinanceTab", "MonthlyDue", "MonthlyPaymentTransaction", "ExceptionalContribution", "Disbursement", "FinanceMember", "AdminFinanceAction"]) {
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

test("finance overview exposes only exceptional contributions and disbursements", () => {
  const page = fs.readFileSync(new URL("../app/(admin)/finances.tsx", import.meta.url), "utf8");
  assert.match(page, /COTISATIONS EXCEPTIONNELLES/);
  assert.match(page, /D\xE9caissements/);
  assert.match(page, /sequence/);
  assert.match(page, /getAdminFinance/);
  assert.doesNotMatch(page, /MonthlyPaymentCard|MONTHLY_PREVIEW_SIZE|monthly-transactions|key:\s*"monthly"|setTab<FinanceTab>\("monthly"\)/);
  assert.match(page, /router\.push/);
  assert.match(page, /totalCollected/);
  assert.match(page, /totalDisbursed/);
  assert.match(page, /name="gift"/);
  assert.match(page, /name="arrow-up-right"/);
  assert.match(page, /tabText:[^}]*fontSize:\s*12/);
  assert.match(page, /backgroundColor:\s*"#075E58"/);
  assert.match(page, /borderRadius:\s*\d+/);
  assert.match(page, /tabActive:[^}]*backgroundColor:\s*"#075E58"/);
  assert.match(page, /flex:\s*1/);
  assert.match(page, /maxWidth:\s*800/);
  assert.doesNotMatch(page, /horizontal/);
});

test("finance overview never renders items loaded for a different selected tab", () => {
  const page = fs.readFileSync(new URL("../app/(admin)/finances.tsx", import.meta.url), "utf8");
  assert.match(page, /loadedTab/);
  assert.match(page, /loadedTab\s*!==\s*tab/);
});

test("monthly history remains a separate route but is absent from the finance overview", () => {
  const page = fs.readFileSync(new URL("../app/(admin)/finances.tsx", import.meta.url), "utf8");
  const history = fs.readFileSync(new URL("../app/(admin)/finances/monthly-transactions.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /Mensualit|monthly-transactions|MonthlyPaymentCard/);
  assert.match(history, /MonthlyPaymentCard/);
});

test("monthly payment card keeps the list compact and opens payment details on tap", () => {
  const card = fs.readFileSync(new URL("../src/features/finance/monthly-payment-card.tsx", import.meta.url), "utf8");
  assert.match(card, /accessibilityRole="button"/);
  assert.match(card, /onPress=\{\(\) => setDetailsVisible\(true\)\}/);
  assert.match(card, /formatFinanceDate\(item\.paidOn\)/);
  assert.match(card, /money\(item\.amount\)/);
  assert.match(card, /item\.statusAfterPayment/);
  assert.match(card, /<Modal[\s\S]*visible=\{detailsVisible\}/);
  for (const detail of ["Mois concerné", "Mode de paiement", "remainingAfterPayment", "wa.me", "Espèces", "Wave"]) assert.match(card, new RegExp(detail));
  assert.match(card, /statusAfterPayment\s*===\s*"partial"/);
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

test("finance forms separate exceptional contributions from disbursements", () => {
  const form = fs.readFileSync(new URL("../app/(admin)/finances/new.tsx", import.meta.url), "utf8");
  for (const field of ["createExceptional", "createDisbursement", "justification", "beneficiaryMemberId", "exceptionalContributionId"]) assert.match(form, new RegExp(field));
  assert.match(form, /targetMemberIds: \[\]/);
  for (const removed of ["Générer les mensualités", "Type de cotisation", "Sélectionner un membre", "Membres ciblés"]) assert.doesNotMatch(form, new RegExp(removed));
  assert.match(fs.readFileSync(new URL("../app/(admin)/settings/finance.tsx", import.meta.url), "utf8"), /dueDay/);
});

test("exceptional contribution form targets all active members", () => {
  const form = fs.readFileSync(new URL("../app/(admin)/finances/new.tsx", import.meta.url), "utf8");
  assert.match(form, /targetMemberIds: \[\]/);
  assert.match(form, /La cotisation sera créée pour tous les membres actifs/);
  assert.doesNotMatch(form, /generateMonthly/);
});

test("finance settings loads existing values before enabling save", () => {
  const client = fs.readFileSync(new URL("../src/lib/supabase.ts", import.meta.url), "utf8");
  const action = fs.readFileSync(new URL("../../../supabase/functions/create-admin-finance-action/index.ts", import.meta.url), "utf8");
  const settings = fs.readFileSync(new URL("../app/(admin)/settings/finance.tsx", import.meta.url), "utf8");
  assert.match(client, /getMonthlyContributionSettings/);
  assert.match(action, /getMonthlySettings/);
  assert.match(action, /get_monthly_contribution_settings/);
  assert.match(settings, /getMonthlyContributionSettings/);
  assert.match(settings, /useEffect/);
  assert.match(settings, /loading/);
  assert.match(settings, /Nombre maximal de versements/);
  assert.match(settings, /maxPayments: limit/);
});
