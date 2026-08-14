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

Deno.test("get-admin-member-detail maps a missing member to 404", async () => {
  const response = await handler({
    auth: { getUser: async () => identity },
    rpc: async () => ({ data: null, error: { message: "Member not found" } }),
  })(request({ memberId }));
  const body = await response.json();
  if (response.status !== 404 || body.error !== "Membre introuvable.") throw new Error("expected the member-not-found response");
});

Deno.test("get-admin-member-detail returns the detail payload unchanged", async () => {
  const detail = { member: {}, membershipFee: {}, monthlyDues: [], exceptionalDues: [], aid: {}, summary: {}, chart: [] };
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
});
