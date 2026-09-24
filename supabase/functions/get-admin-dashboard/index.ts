import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey" };
const response = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve({ port: Number(Deno.env.get("PORT") ?? "8000") }, async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const authorization = request.headers.get("authorization");
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authorization) return response({ error: "Unauthorized" }, 401);
  if (!url || !serviceKey) return response({ error: "Service unavailable" }, 503);
  const database = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: identity, error: identityError } = await database.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
  if (identityError || !identity.user) return response({ error: "Unauthorized" }, 401);
  const { data: account } = await database.from("users").select("organization_id,role,is_active").eq("id", identity.user.id).maybeSingle();
  if (!account?.is_active || account.role !== "admin") return response({ error: "Unauthorized" }, 401);
  const [{ data: organization }, { data: fees }, { data: expenses }] = await Promise.all([
    database.from("organizations").select("name").eq("id", account.organization_id).maybeSingle(),
    database.from("membership_fees").select("amount_due,amount_paid,remaining_amount,status,member_id,members!inner(organization_id)").eq("members.organization_id", account.organization_id),
    database.from("disbursements").select("amount").eq("organization_id", account.organization_id),
  ]);
  const rows = fees ?? [];
  const sum = (key: "amount_due" | "amount_paid" | "remaining_amount") => rows.reduce((total, fee) => total + Number(fee[key] ?? 0), 0);
  const paidFees = rows.filter((fee) => fee.status === "paid");
  const memberIds = paidFees.map((fee) => fee.member_id);
  const { data: monthlyDues } = memberIds.length
    ? await database.from("monthly_contribution_dues").select("member_id,due_date,amount_paid,remaining_amount").in("member_id", memberIds)
    : { data: [] };
  const today = new Date().toISOString().slice(0, 10);
  const duesByMember = new Map<string, Array<{ due_date: string; remaining_amount: number }>>();
  for (const due of monthlyDues ?? []) {
    const list = duesByMember.get(due.member_id) ?? [];
    list.push({ due_date: due.due_date, remaining_amount: Number(due.remaining_amount ?? 0) });
    duesByMember.set(due.member_id, list);
  }
  const overdue = (memberId: string) => (duesByMember.get(memberId) ?? []).filter((due) => due.due_date < today);
  const membersPaid = paidFees.filter((fee) => overdue(fee.member_id).length > 0 && overdue(fee.member_id).every((due) => due.remaining_amount === 0));
  const membersLate = paidFees.filter((fee) => overdue(fee.member_id).some((due) => due.remaining_amount > 0));
  const monthlyCollected = (monthlyDues ?? []).reduce((total, due) => total + Number(due.amount_paid ?? 0), 0);
  const monthlyOutstanding = (monthlyDues ?? []).reduce((total, due) => total + Number(due.remaining_amount ?? 0), 0);
  const totalExpenses = (expenses ?? []).reduce((total, expense) => total + Number(expense.amount ?? 0), 0);
  const totalCash = sum("amount_paid") + monthlyCollected - totalExpenses;
  return response({ organizationName: organization?.name ?? "Association", totalMembers: paidFees.length, membersPaid: membersPaid.length, membersLate: membersLate.length, totalMonthlyOutstanding: monthlyOutstanding, totalCash, totalExpenses });
});
