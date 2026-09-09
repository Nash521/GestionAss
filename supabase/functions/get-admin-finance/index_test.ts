import { createHandler } from "./index.ts";

const request = (body: unknown, authorization = "Bearer token") => new Request("http://localhost", {
  method: "POST",
  headers: { authorization, "content-type": "application/json" },
  body: JSON.stringify(body),
});
type DatabaseError = { status?: number; message?: string };
type Database = {
  auth: { getUser: (token: string) => Promise<{ data: { user: { id: string } | null }; error: DatabaseError | null }> };
  rpc: (name: string, args: Record<string, string | number>) => Promise<{ data: unknown; error: DatabaseError | null }>;
};
const handler = (database?: Database) => createHandler(() => database as never);
const identity = { data: { user: { id: "00000000-0000-4000-8000-000000000001" } }, error: null };
const valid = { tab: "monthly", offset: 0, limit: 30 };

Deno.test("get-admin-finance answers CORS preflight", async () => {
  const response = await handler()(new Request("http://localhost", { method: "OPTIONS" }));
  if (response.status !== 200 || response.headers.get("access-control-allow-methods") !== "POST, OPTIONS") throw new Error("expected CORS response");
});
Deno.test("get-admin-finance requires authenticated POST requests", async () => {
  const response = await handler()(new Request("http://localhost", { method: "POST", body: "{}" }));
  if (response.status !== 401) throw new Error("expected 401");
});
Deno.test("get-admin-finance validates exact pagination payload before database access", async () => {
  let called = false;
  const response = await handler({ auth: { getUser: async () => { called = true; return identity; } }, rpc: async () => ({ data: null, error: null }) })(request({ tab: "invalid", offset: -1, limit: 51, extra: true }));
  if (response.status !== 400 || called) throw new Error("expected invalid request without database access");
});
Deno.test("get-admin-finance rejects malformed JSON", async () => {
  const response = await handler()(new Request("http://localhost", { method: "POST", headers: { authorization: "Bearer token" }, body: "{" }));
  if (response.status !== 400) throw new Error("expected 400");
});
Deno.test("get-admin-finance rejects expired sessions", async () => {
  const response = await handler({ auth: { getUser: async () => ({ data: { user: null }, error: { status: 401, message: "Unauthorized" } }) }, rpc: async () => ({ data: null, error: null }) })(request(valid));
  if (response.status !== 401) throw new Error("expected 401");
});
Deno.test("get-admin-finance hides identity provider outages", async () => {
  const response = await handler({ auth: { getUser: async () => ({ data: { user: null }, error: { message: "identity host secret" } }) }, rpc: async () => ({ data: null, error: null }) })(request(valid));
  if (response.status !== 503 || (await response.json()).error !== "Service unavailable") throw new Error("expected safe identity outage response");
});
Deno.test("get-admin-finance maps non-admin denial to unauthorized", async () => {
  const response = await handler({ auth: { getUser: async () => identity }, rpc: async () => ({ data: null, error: { status: 403, message: "Unauthorized" } }) })(request(valid));
  if (response.status !== 401) throw new Error("expected 401");
});
Deno.test("get-admin-finance hides database outages", async () => {
  const response = await handler({ auth: { getUser: async () => identity }, rpc: async () => ({ data: null, error: { message: "connection password secret" } }) })(request(valid));
  const body = await response.json();
  if (response.status !== 503 || body.error !== "Service unavailable") throw new Error("expected safe outage response");
});
Deno.test("get-admin-finance preserves the service RPC payload", async () => {
  const payload = { organization: { monthlyAmount: 1000 }, monthly: { items: [{ id: "due-1", amountRemaining: 500 }], metadata: { total: 1 } } };
  let rpcName = ""; let rpcArgs: Record<string, string | number> = {};
  const response = await handler({ auth: { getUser: async () => identity }, rpc: async (name, args) => { rpcName = name; rpcArgs = args; return { data: payload, error: null }; } })(request(valid));
  const body = await response.json();
  if (response.status !== 200 || JSON.stringify(body) !== JSON.stringify(payload)) throw new Error("expected unchanged payload");
  if (rpcName !== "get_admin_finance" || rpcArgs.admin_id !== identity.data.user.id || rpcArgs.tab_value !== "monthly" || rpcArgs.offset_value !== 0 || rpcArgs.limit_value !== 30) throw new Error("expected scoped finance RPC");
});
