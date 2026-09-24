import { createHandler } from "./index.ts";

const adminId = "51000000-0000-4000-8000-000000000001";
const memberId = "53000000-0000-4000-8000-000000000001";
const identity = { data: { user: { id: adminId } }, error: null };
const valid = { memberId, action: "update", firstName: "Awa", lastName: "Kone", phone: "+2250700000001" };

type RpcCall = { name: string; args: Record<string, unknown> };
type Database = {
  auth: { getUser: (token: string) => Promise<typeof identity> };
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: null }>;
};

const request = (body: unknown) => new Request("http://localhost", {
  method: "POST",
  headers: { authorization: "Bearer session-token", "content-type": "application/json" },
  body: JSON.stringify(body),
});

async function withDatabase(database: Database, body: unknown) {
  const previousUrl = Deno.env.get("SUPABASE_URL");
  const previousKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  Deno.env.set("SUPABASE_URL", "http://127.0.0.1:54321");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "local-test-key");
  try {
    return await createHandler(() => database as never)(request(body));
  } finally {
    if (previousUrl === undefined) Deno.env.delete("SUPABASE_URL");
    else Deno.env.set("SUPABASE_URL", previousUrl);
    if (previousKey === undefined) Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
    else Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", previousKey);
  }
}

const makeDatabase = (calls: RpcCall[]): Database => ({
  auth: { getUser: async () => identity },
  rpc: async (name, args) => {
    calls.push({ name, args });
    return { data: "active", error: null };
  },
});

Deno.test("manage-admin-member rejects direct suspension and archive before RPC", async () => {
  for (const action of ["suspend", "archive"]) {
    const calls: RpcCall[] = [];
    const response = await withDatabase(makeDatabase(calls), { memberId, action });
    if (response.status !== 400 || calls.length !== 0) throw new Error(`${action} must be rejected before database RPC`);
  }
});

Deno.test("manage-admin-member preserves update and manual reactivation with authenticated admin id", async () => {
  for (const input of [valid, { memberId, action: "reactivate" }]) {
    const calls: RpcCall[] = [];
    const response = await withDatabase(makeDatabase(calls), input);
    if (response.status !== 200 || calls.length !== 1) throw new Error(`${input.action} should reach the lifecycle RPC`);
    if (calls[0].name !== "manage_admin_member" || calls[0].args.admin_id !== adminId || calls[0].args.target_member_id !== memberId || calls[0].args.action !== input.action) {
      throw new Error(`${input.action} must forward the authenticated admin identity`);
    }
  }
});
