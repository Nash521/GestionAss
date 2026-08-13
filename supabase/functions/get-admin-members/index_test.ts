const localUrl = Deno.env.get("LOCAL_SUPABASE_URL");
const localServiceKey = Deno.env.get("LOCAL_SUPABASE_SERVICE_ROLE_KEY");

const start = (environment: Record<string, string> = {}) => new Deno.Command(Deno.execPath(), {
  args: ["run", "--allow-net", "--allow-env", "supabase/functions/get-admin-members/index.ts"],
  env: environment,
  stdout: "null",
  stderr: "null",
}).spawn();
const stop = (child: Deno.ChildProcess) => { try { child.kill("SIGTERM"); } catch { /* already stopped */ } };

Deno.test("get-admin-members rejects requests without a bearer token", async () => {
  const child = start();
  await new Promise((resolve) => setTimeout(resolve, 200));
  try {
    const response = await fetch("http://127.0.0.1:8000", { method: "POST" });
    if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`);
  } finally { stop(child); }
});

Deno.test("get-admin-members rejects invalid filters before calling Supabase", async () => {
  const child = start({ SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_SERVICE_ROLE_KEY: "test" });
  await new Promise((resolve) => setTimeout(resolve, 200));
  try {
    const response = await fetch("http://127.0.0.1:8000", { method: "POST", headers: { authorization: "Bearer token", "content-type": "application/json" }, body: JSON.stringify({ paymentStatus: "late" }) });
    if (response.status !== 400) throw new Error(`expected 400, got ${response.status}`);
  } finally { stop(child); }
});

Deno.test("get-admin-members returns 503 when its Supabase dependency is unavailable", async () => {
  const child = start({ SUPABASE_URL: "http://127.0.0.1:1", SUPABASE_SERVICE_ROLE_KEY: "test" });
  await new Promise((resolve) => setTimeout(resolve, 200));
  try {
    const response = await fetch("http://127.0.0.1:8000", { method: "POST", headers: { authorization: "Bearer token", "content-type": "application/json" }, body: JSON.stringify({}) });
    if (response.status !== 503) throw new Error(`expected 503, got ${response.status}`);
  } finally { stop(child); }
});

Deno.test("get-admin-members returns 503 when Supabase configuration is absent", async () => {
  const child = start({ SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "" });
  await new Promise((resolve) => setTimeout(resolve, 200));
  try {
    const response = await fetch("http://127.0.0.1:8000", { method: "POST", headers: { authorization: "Bearer token", "content-type": "application/json" }, body: JSON.stringify({}) });
    if (response.status !== 503) throw new Error(`expected 503, got ${response.status}`);
  } finally { stop(child); }
});

Deno.test({
  name: "get-admin-members returns 401 when a valid caller is not an active admin",
  ignore: !localUrl || !localServiceKey,
  fn: async () => {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2?target=deno");
    const database = createClient(localUrl!, localServiceKey!, { auth: { persistSession: false } });
    const phone = `+22505${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
    let callerId: string | undefined;
    const child = start({ SUPABASE_URL: localUrl!, SUPABASE_SERVICE_ROLE_KEY: localServiceKey! });
    await new Promise((resolve) => setTimeout(resolve, 250));
    try {
      const { data: caller, error: callerError } = await database.auth.admin.createUser({ phone, password: "Strong!Pass1", phone_confirm: true });
      if (callerError || !caller.user) throw callerError ?? new Error("caller creation failed");
      callerId = caller.user.id;
      const { data: login, error: loginError } = await database.auth.signInWithPassword({ phone, password: "Strong!Pass1" });
      if (loginError || !login.session) throw loginError ?? new Error("caller login failed");
      const response = await fetch("http://127.0.0.1:8000", { method: "POST", headers: { authorization: `Bearer ${login.session.access_token}`, "content-type": "application/json" }, body: "{}" });
      if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`);
    } finally {
      if (callerId) await database.auth.admin.deleteUser(callerId);
      stop(child);
    }
  },
});

Deno.test({
  name: "get-admin-members isolates an organization and preserves empty-page summary metadata",
  ignore: !localUrl || !localServiceKey,
  fn: async () => {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2?target=deno");
    const database = createClient(localUrl!, localServiceKey!, { auth: { persistSession: false } });
    const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 8);
    const organizationId = crypto.randomUUID(), otherOrganizationId = crypto.randomUUID();
    const adminPhone = `+22507${suffix}`;
    let adminId: string | undefined;
    const createdUsers: string[] = [];
    const child = start({ SUPABASE_URL: localUrl!, SUPABASE_SERVICE_ROLE_KEY: localServiceKey! });
    await new Promise((resolve) => setTimeout(resolve, 250));
    try {
      for (const [id, name] of [[organizationId, "Primary"], [otherOrganizationId, "Other"]] as const) {
        const { error } = await database.from("organizations").insert({ id, name: `${name} ${suffix}` }); if (error) throw error;
      }
      const { data: admin, error: adminError } = await database.auth.admin.createUser({ phone: adminPhone, password: "Strong!Pass1", phone_confirm: true });
      if (adminError || !admin.user) throw adminError ?? new Error("admin creation failed");
      adminId = admin.user.id;
      if (await database.from("users").insert({ id: adminId, organization_id: organizationId, role: "admin", is_active: true }).then(({ error }) => error)) throw new Error("admin account failed");
      const createMember = async (orgId: string, firstName: string, phonePrefix: string) => {
        const phone = `+2250${phonePrefix}${suffix}`;
        const { data: auth, error: authError } = await database.auth.admin.createUser({ phone, password: "Strong!Pass1", phone_confirm: true });
        if (authError || !auth.user) throw authError ?? new Error("member auth failed");
        createdUsers.push(auth.user.id);
        if (await database.from("users").insert({ id: auth.user.id, organization_id: orgId, role: "member", is_active: true }).then(({ error }) => error)) throw new Error("member account failed");
        const { data: member, error: memberError } = await database.from("members").insert({ organization_id: orgId, user_id: auth.user.id, member_number: `M-${createdUsers.length.toString().padStart(6, "0")}`, first_name: firstName, last_name: "Yao", phone, status: "active", created_by: adminId }).select("id").single();
        if (memberError) throw memberError;
        return member.id;
      };
      const koffiId = await createMember(organizationId, "Koffi", "5");
      const otherId = await createMember(otherOrganizationId, "Koffi", "1");
      await database.from("membership_fees").insert({ member_id: koffiId, amount_due: 1000, amount_paid: 1000, remaining_amount: 0, status: "paid" });
      await database.from("membership_fees").insert({ member_id: otherId, amount_due: 1000, amount_paid: 0, remaining_amount: 1000, status: "unpaid" });
      const { data: login, error: loginError } = await database.auth.signInWithPassword({ phone: adminPhone, password: "Strong!Pass1" });
      if (loginError || !login.session) throw loginError ?? new Error("admin login failed");
      const request = (body: Record<string, unknown>) => fetch("http://127.0.0.1:8000", { method: "POST", headers: { authorization: `Bearer ${login.session!.access_token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
      const search = await request({ query: "Koffi" });
      const searchBody = await search.json();
      if (search.status !== 200 || searchBody.totalMembers !== 1 || searchBody.members.length !== 1 || searchBody.members[0].id !== koffiId || searchBody.membersPaid !== 1) throw new Error("search did not isolate or summarize members");
      const empty = await request({ offset: 99 });
      const emptyBody = await empty.json();
      if (empty.status !== 200 || emptyBody.totalMembers !== 1 || emptyBody.members.length !== 0 || emptyBody.membersPaid !== 1 || emptyBody.membersLate !== 0) throw new Error("empty page lost summary metadata");
    } finally {
      for (const id of createdUsers) await database.auth.admin.deleteUser(id);
      if (adminId) await database.auth.admin.deleteUser(adminId);
      await database.from("organizations").delete().in("id", [organizationId, otherOrganizationId]);
      stop(child);
    }
  },
});
