import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/lib/supabase.ts", import.meta.url), "utf8");

test("finance client exposes complete domain types", () => {
  for (const name of ["AdminFinance", "FinanceTab", "MonthlyDue", "ExceptionalContribution", "Disbursement", "FinanceMember", "AdminFinanceAction"]) {
    assert.match(source, new RegExp(`(?:type|interface) ${name}\\b`));
  }
  assert.match(source, /FinanceTab = "monthly" \| "exceptional" \| "disbursements"/);
});

test("getAdminFinance uses exact pagination payload", () => {
  assert.match(source, /getAdminFinance\s*\(tab:\s*FinanceTab,\s*offset\s*=\s*0,\s*limit\s*=\s*30\)/);
  assert.match(source, /"get-admin-finance"/);
  assert.match(source, /tab,\s*offset,\s*limit/);
});

test("createAdminFinanceAction forwards discriminated action payload", () => {
  assert.match(source, /createAdminFinanceAction\s*\(action:\s*AdminFinanceAction\)/);
  assert.match(source, /"create-admin-finance-action"/);
});
