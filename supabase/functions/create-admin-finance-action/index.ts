import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey" };
const response = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const date = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
type DatabaseError = { status?: number; message?: string };
type Database = { auth: { getUser: (token: string) => Promise<{ data: { user: { id: string } | null }; error: DatabaseError | null }> }; rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: DatabaseError | null }> };
type DatabaseFactory = () => Database;
type Input =
  | { action: "generateMonthly"; month: string }
  | { action: "createExceptional"; label: string; amount: number; dueDate: string; targetMemberIds: string[] }
  | { action: "recordPayment"; kind: "membership" | "monthly" | "exceptional"; dueId: string; amount: number; paidOn: string; reference: string; source: "manual" | "wave" }
  | { action: "createDisbursement"; label: string; amount: number; disbursedOn: string; type: "general_expense" | "member_aid" | "exceptional_contribution_payment"; beneficiaryMemberId: string | null; exceptionalContributionId: string | null; justification: string }
  | { action: "updateMonthlySettings"; monthlyAmount: number; dueDay: number };
const exact = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const validDate = (value: unknown): value is string => typeof value === "string" && date.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const nonBlank = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const positive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;
const nullableUuid = (value: unknown) => value === null || (typeof value === "string" && uuid.test(value));
const parseInput = (body: unknown): Input | null => {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const value = body as Record<string, unknown>;
  if (value.action === "generateMonthly" && exact(value, ["action", "month"]) && validDate(value.month)) return { action: value.action, month: value.month };
  if (value.action === "createExceptional" && exact(value, ["action", "label", "amount", "dueDate", "targetMemberIds"]) && nonBlank(value.label) && positive(value.amount) && validDate(value.dueDate) && Array.isArray(value.targetMemberIds) && value.targetMemberIds.every((id) => typeof id === "string" && uuid.test(id))) return value as Input;
  if (value.action === "recordPayment" && exact(value, ["action", "kind", "dueId", "amount", "paidOn", "reference", "source"]) && ["membership", "monthly", "exceptional"].includes(value.kind as string) && typeof value.dueId === "string" && uuid.test(value.dueId) && positive(value.amount) && validDate(value.paidOn) && typeof value.reference === "string" && ["manual", "wave"].includes(value.source as string)) return value as Input;
  if (value.action === "createDisbursement" && exact(value, ["action", "label", "amount", "disbursedOn", "type", "beneficiaryMemberId", "exceptionalContributionId", "justification"]) && nonBlank(value.label) && positive(value.amount) && validDate(value.disbursedOn) && ["general_expense", "member_aid", "exceptional_contribution_payment"].includes(value.type as string) && nullableUuid(value.beneficiaryMemberId) && nullableUuid(value.exceptionalContributionId) && nonBlank(value.justification) && ((value.type === "general_expense" && value.beneficiaryMemberId === null && value.exceptionalContributionId === null) || (value.type === "member_aid" && typeof value.beneficiaryMemberId === "string" && value.exceptionalContributionId === null) || (value.type === "exceptional_contribution_payment" && value.beneficiaryMemberId === null && typeof value.exceptionalContributionId === "string"))) return value as Input;
  const dueDay = value.dueDay;
  if (value.action === "updateMonthlySettings" && exact(value, ["action", "monthlyAmount", "dueDay"]) && typeof value.monthlyAmount === "number" && Number.isFinite(value.monthlyAmount) && value.monthlyAmount >= 0 && typeof dueDay === "number" && Number.isInteger(dueDay) && dueDay >= 1 && dueDay <= 28) return value as Input;
  return null;
};
const unauthorized = (error: DatabaseError) => error.status === 401 || error.status === 403 || /^unauthorized$/i.test(error.message ?? "");
const business = (error: DatabaseError) => /^(?:Label|Contribution amount|Due date|Member not found|Payment|Invalid payment|Invalid contribution|Contribution due|Justification|Disbursement|Invalid disbursement|General expense|Member is required|Member aid|Contribution is required|Exceptional contribution)/i.test(error.message ?? "");
const databaseFor = (factory?: DatabaseFactory): Database | null => { if (factory) return factory(); const url = Deno.env.get("SUPABASE_URL"); const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); return url && serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false } }) as unknown as Database : null; };
const rpcFor = (input: Input, adminId: string): [string, Record<string, unknown>] => {
  switch (input.action) {
    case "generateMonthly": return ["generate_monthly_contribution_dues", { admin_id: adminId, month_value: input.month }];
    case "createExceptional": return ["create_exceptional_contribution", { admin_id: adminId, contribution_label: input.label.trim(), contribution_amount: input.amount, contribution_due_date: input.dueDate, selected_member_ids: input.targetMemberIds }];
    case "recordPayment": return ["record_contribution_payment", { admin_id: adminId, due_kind: input.kind, due_id: input.dueId, payment_amount: input.amount, payment_date: input.paidOn, payment_reference_value: input.reference, payment_source_value: input.source }];
    case "createDisbursement": return ["create_disbursement", { admin_id: adminId, disbursement_label: input.label.trim(), disbursement_amount: input.amount, disbursement_date: input.disbursedOn, disbursement_type_value: input.type, target_member_id: input.beneficiaryMemberId, target_contribution_id: input.exceptionalContributionId, disbursement_justification: input.justification.trim() }];
    case "updateMonthlySettings": return ["update_monthly_contribution_settings", { admin_id: adminId, monthly_amount: input.monthlyAmount, due_day: input.dueDay }];
  }
};
export const createHandler = (databaseFactory?: DatabaseFactory) => async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]; if (!bearer) return response({ error: "Unauthorized" }, 401);
  let body: unknown; try { body = await request.json(); } catch { return response({ error: "Invalid request" }, 400); }
  const input = parseInput(body); if (!input) return response({ error: "Invalid request" }, 400);
  try {
    const database = databaseFor(databaseFactory); if (!database) return response({ error: "Service unavailable" }, 503);
    const { data: identity, error: identityError } = await database.auth.getUser(bearer); if (identityError) return response({ error: unauthorized(identityError) ? "Unauthorized" : "Service unavailable" }, unauthorized(identityError) ? 401 : 503); if (!identity.user) return response({ error: "Unauthorized" }, 401);
    const [name, args] = rpcFor(input, identity.user.id); const { data, error } = await database.rpc(name, args);
    if (error) return response({ error: unauthorized(error) ? "Unauthorized" : business(error) ? error.message ?? "Invalid request" : "Service unavailable" }, unauthorized(error) ? 401 : business(error) ? 400 : 503);
    return response({ id: data });
  } catch { return response({ error: "Service unavailable" }, 503); }
};
if (import.meta.main) Deno.serve({ port: Number(Deno.env.get("PORT") ?? "8000") }, createHandler());
