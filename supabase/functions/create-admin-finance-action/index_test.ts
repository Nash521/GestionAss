import { createHandler } from "./index.ts";

const dueId = "123e4567-e89b-42d3-a456-426614174000";
const request = (body: unknown, authorization = "Bearer token") => new Request("http://localhost", { method: "POST", headers: { authorization, "content-type": "application/json" }, body: JSON.stringify(body) });
type DatabaseError = { status?: number; message?: string };
type Database = { auth: { getUser: (token: string) => Promise<{ data: { user: { id: string } | null }; error: DatabaseError | null }> }; rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: DatabaseError | null }> };
const handler = (database?: Database) => createHandler(() => database as never);
const identity = { data: { user: { id: "00000000-0000-4000-8000-000000000001" } }, error: null };

Deno.test("create-admin-finance-action answers CORS preflight", async () => {
  if ((await handler()(new Request("http://localhost", { method: "OPTIONS" }))).status !== 200) throw new Error("expected 200");
});
Deno.test("create-admin-finance-action rejects unknown or inexact payloads before database access", async () => {
  let called = false;
  const db = { auth: { getUser: async () => { called = true; return identity; } }, rpc: async () => ({ data: null, error: null }) };
  const response = await handler(db)(request({ action: "recordPayment", kind: "monthly", dueId, amount: 100, paidOn: "2026-08-20", reference: "", source: "manual", unexpected: true }));
  if (response.status !== 400 || called) throw new Error("expected exact validation before database access");
});
Deno.test("create-admin-finance-action validates each action's business fields", async () => {
  const invalidBodies = [
    { action: "generateMonthly", month: "2026-13-01" },
    { action: "createExceptional", label: " ", amount: 1, dueDate: "2026-08-20", targetMemberIds: [] },
    { action: "recordPayment", kind: "monthly", dueId: "invalid", amount: 0, paidOn: "2026-08-20", reference: "", source: "manual" },
    { action: "createDisbursement", label: "Expense", amount: 1, disbursedOn: "2026-08-20", type: "general_expense", beneficiaryMemberId: null, exceptionalContributionId: null, justification: " " },
    { action: "updateMonthlySettings", monthlyAmount: 0, dueDay: 29 },
  ];
  for (const body of invalidBodies) if ((await handler()(request(body))).status !== 400) throw new Error(`expected 400 for ${body.action}`);
});
Deno.test("create-admin-finance-action requires an authenticated caller", async () => {
  const response = await handler()(request({ action: "generateMonthly", month: "2026-08-01" }, ""));
  if (response.status !== 401) throw new Error("expected 401");
});
Deno.test("create-admin-finance-action hides identity provider outages", async () => {
  const response = await handler({ auth: { getUser: async () => ({ data: { user: null }, error: { message: "identity host secret" } }) }, rpc: async () => ({ data: null, error: null }) })(request({ action: "generateMonthly", month: "2026-08-01" }));
  if (response.status !== 503 || (await response.json()).error !== "Service unavailable") throw new Error("expected safe identity outage response");
});
Deno.test("create-admin-finance-action routes actions with authenticated admin id", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const db = { auth: { getUser: async () => identity }, rpc: async (name: string, args: Record<string, unknown>) => { calls.push({ name, args }); return { data: "result-id", error: null }; } };
  const inputs = [
    { action: "getMonthlySettings" },
    { action: "generateMonthly", month: "2026-08-01" },
    { action: "createExceptional", label: "Solidarite", amount: 200, dueDate: "2026-08-20", targetMemberIds: [dueId] },
    { action: "recordPayment", kind: "monthly", dueId, amount: 100, paidOn: "2026-08-20", reference: "ref", source: "manual" },
    { action: "createDisbursement", label: "Aid", amount: 50, disbursedOn: "2026-08-20", type: "member_aid", beneficiaryMemberId: dueId, exceptionalContributionId: null, justification: "Medical" },
    { action: "updateMonthlySettings", monthlyAmount: 1000, dueDay: 5 },
  ];
  for (const input of inputs) if ((await handler(db)(request(input))).status !== 200) throw new Error(`expected success for ${input.action}`);
  const names = calls.map((call) => call.name).join(",");
  if (names !== "get_monthly_contribution_settings,generate_monthly_contribution_dues,create_exceptional_contribution,record_contribution_payment,create_disbursement,update_monthly_contribution_settings") throw new Error(`unexpected RPCs: ${names}`);
  if (calls.some((call) => call.args.admin_id !== identity.data.user.id)) throw new Error("expected authenticated admin id");
});
Deno.test("create-admin-finance-action maps business errors to 400 and outages to safe 503", async () => {
  const business = await handler({ auth: { getUser: async () => identity }, rpc: async () => ({ data: null, error: { message: "Payment exceeds remaining amount" } }) })(request({ action: "generateMonthly", month: "2026-08-01" }));
  const outage = await handler({ auth: { getUser: async () => identity }, rpc: async () => ({ data: null, error: { message: "host password" } }) })(request({ action: "generateMonthly", month: "2026-08-01" }));
  if (business.status !== 400 || outage.status !== 503 || (await outage.json()).error !== "Service unavailable") throw new Error("expected safe error mapping");
});
