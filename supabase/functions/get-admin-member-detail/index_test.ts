import { createHandler } from "./index.ts";

const memberId = "123e4567-e89b-42d3-a456-426614174000";
const request = (body: unknown, authorization = "Bearer token") => new Request("http://localhost", {
  method: "POST",
  headers: { authorization, "content-type": "application/json" },
  body: JSON.stringify(body),
});

type Database = {
  auth: { getUser: (token: string) => Promise<{ data: { user: { id: string } | null }; error: { status?: number; message?: string } | null }> };
  rpc: (name: string, args: Record<string, string>) => Promise<{ data: unknown; error: { status?: number; message?: string } | null }>;
};

const handler = (database?: Database) => createHandler(() => database as never);
const identity = { data: { user: { id: "00000000-0000-4000-8000-000000000001" } }, error: null };

Deno.test("get-admin-member-detail answers CORS preflight", async () => {
  const response = await handler()(new Request("http://localhost", { method: "OPTIONS" }));
  if (response.status !== 200) throw new Error(`expected 200, got ${response.status}`);
});

Deno.test("get-admin-member-detail rejects requests without a bearer token", async () => {
  const response = await handler()(new Request("http://localhost", { method: "POST" }));
  if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`);
});

Deno.test("get-admin-member-detail rejects malformed requests before calling Supabase", async () => {
  const response = await handler()(request({ memberId: "not-a-uuid" }));
  if (response.status !== 400) throw new Error(`expected 400, got ${response.status}`);
});

Deno.test("get-admin-member-detail rejects an invalid or expired session", async () => {
  const response = await handler({
    auth: { getUser: async () => ({ data: { user: null }, error: { status: 401, message: "Unauthorized" } }) },
    rpc: async () => ({ data: null, error: null }),
  })(request({ memberId }));
  if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`);
});

Deno.test("get-admin-member-detail maps a missing member to 404", async () => {
  const response = await handler({
    auth: { getUser: async () => identity },
    rpc: async () => ({ data: null, error: { message: "Member not found" } }),
  })(request({ memberId }));
  const body = await response.json();
  if (response.status !== 404 || body.error !== "Membre introuvable.") throw new Error("expected the member-not-found response");
});

Deno.test("get-admin-member-detail hides a scoped non-admin RPC denial", async () => {
  const response = await handler({
    auth: { getUser: async () => identity },
    rpc: async () => ({ data: null, error: { message: "Member not found" } }),
  })(request({ memberId }));
  const body = await response.json();
  if (response.status !== 404 || body.error !== "Membre introuvable.") throw new Error("expected a non-leaking scoped denial");
});

Deno.test("get-admin-member-detail hides cross-organization members", async () => {
  const response = await handler({
    auth: { getUser: async () => identity },
    rpc: async () => ({ data: null, error: { message: "Member not found" } }),
  })(request({ memberId }));
  const body = await response.json();
  if (response.status !== 404 || body.error !== "Membre introuvable.") throw new Error("expected a non-leaking cross-organization response");
});

Deno.test("get-admin-member-detail returns the detail payload unchanged", async () => {
  const detail = {
    member: { id: memberId, firstName: "Awa", lastName: "Yao", memberNumber: "M-000001" },
    membershipFee: { amountDue: 1000, amountPaid: 700, amountRemaining: 300, status: "partial" },
    monthlyDues: [{ id: "monthly-1", month: "2026-02-01", dueDate: "2026-02-28", amountDue: 500, amountPaid: 200, amountRemaining: 300, status: "partial" }],
    exceptionalDues: [{ id: "exceptional-1", label: "Solidarite", dueDate: "2026-02-15", amountDue: 1000, amountPaid: 300, amountRemaining: 700, status: "partial" }],
    aid: { count: 1, totalReceived: 250, items: [{ id: "aid-1", label: "Aide medicale", amount: 250, disbursedOn: "2026-02-20" }] },
    summary: { totalContributed: 1200, monthlyPaid: 200, monthlyRemaining: 300, exceptionalPaid: 300, exceptionalRemaining: 700 },
    chart: Array.from({ length: 6 }, (_, index) => ({ month: `2026-0${index + 1}-01`, paid: index * 100, unpaid: 500 - index * 10 })),
  };
  let rpcName = "", rpcArgs: Record<string, string> = {};
  const response = await handler({
    auth: { getUser: async () => identity },
    rpc: async (name, args) => { rpcName = name; rpcArgs = args; return { data: detail, error: null }; },
  })(request({ memberId }));
  const body = await response.json();
  const keys = Object.keys(body).sort().join(",");
  const expected = "aid,chart,exceptionalDues,member,membershipFee,monthlyDues,summary";
  if (response.status !== 200 || keys !== expected) throw new Error(`expected detail keys, got ${keys}`);
  if (rpcName !== "get_admin_member_detail" || rpcArgs.admin_id !== identity.data.user.id || rpcArgs.target_member_id !== memberId) throw new Error("expected scoped detail RPC parameters");
  if (body.member.memberNumber !== "M-000001" || body.membershipFee.amountRemaining !== 300) throw new Error("member or membership fee fields changed");
  if (body.monthlyDues[0].amountPaid !== 200 || body.exceptionalDues[0].amountRemaining !== 700) throw new Error("contribution due fields changed");
  if (body.aid.count !== 1 || body.aid.items[0].amount !== 250 || body.summary.exceptionalPaid !== 300) throw new Error("aid or summary fields changed");
  if (body.chart.length !== 6 || body.chart[5].paid !== 500 || body.chart[5].unpaid !== 450) throw new Error("chart values changed");
});
