const localUrl = Deno.env.get("LOCAL_SUPABASE_URL");
const localServiceKey = Deno.env.get("LOCAL_SUPABASE_SERVICE_ROLE_KEY");

const start = (environment: Record<string, string> = {}) => new Deno.Command(Deno.execPath(), {
  args: ["run", "--allow-net", "--allow-env", "supabase/functions/create-admin-member/index.ts"],
  env: environment,
  stdout: "null",
  stderr: "null",
}).spawn();

const stop = (child: Deno.ChildProcess) => { try { child.kill("SIGTERM"); } catch { /* already stopped */ } };

Deno.test("create-admin-member rejects requests without a bearer token", async () => {
  const child = start();
  await new Promise((resolve) => setTimeout(resolve, 200));
  try {
    const response = await fetch("http://127.0.0.1:8000", { method: "POST" });
    if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`);
  } finally { stop(child); }
});

Deno.test("create-admin-member rejects an invalid or mismatched request body", async () => {
  const child = start({ SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_SERVICE_ROLE_KEY: "test" });
  await new Promise((resolve) => setTimeout(resolve, 200));
  try {
    const response = await fetch("http://127.0.0.1:8000", {
      method: "POST",
      headers: { authorization: "Bearer invalid", "content-type": "application/json" },
      body: JSON.stringify({ firstName: "Awa", lastName: "Kone", phone: "+2250701020304", password: "Strong!Pass1", passwordConfirmation: "Other!Pass1", role: "member" }),
    });
    if (response.status !== 400) throw new Error(`expected 400, got ${response.status}`);
  } finally { stop(child); }
});

Deno.test("create-admin-member returns 503 when its Supabase dependency is unavailable", async () => {
  const child = start({ SUPABASE_URL: "http://127.0.0.1:1", SUPABASE_SERVICE_ROLE_KEY: "test" });
  await new Promise((resolve) => setTimeout(resolve, 200));
  try {
    const response = await fetch("http://127.0.0.1:8000", {
      method: "POST",
      headers: { authorization: "Bearer token", "content-type": "application/json" },
      body: JSON.stringify({ firstName: "Awa", lastName: "Kone", phone: "+2250701020304", password: "Strong!Pass1", passwordConfirmation: "Strong!Pass1", role: "member" }),
    });
    if (response.status !== 503) throw new Error(`expected 503, got ${response.status}`);
  } finally { stop(child); }
});

Deno.test("create-admin-member returns 503 when Supabase configuration is absent", async () => {
  const child = start({ SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "" });
  await new Promise((resolve) => setTimeout(resolve, 200));
  try {
    const response = await fetch("http://127.0.0.1:8000", { method: "POST", headers: { authorization: "Bearer token", "content-type": "application/json" }, body: JSON.stringify({ firstName: "Awa", lastName: "Kone", phone: "+2250701020304", password: "Strong!Pass1", passwordConfirmation: "Strong!Pass1", role: "member" }) });
    if (response.status !== 503) throw new Error(`expected 503, got ${response.status}`);
  } finally { stop(child); }
});

Deno.test({
  name: "create-admin-member removes the Auth account when provisioning fails",
  ignore: !localUrl || !localServiceKey,
  fn: async () => {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2?target=deno");
    const database = createClient(localUrl!, localServiceKey!, { auth: { persistSession: false } });
    const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 8);
    const callerPhone = `+22505${suffix}`, candidatePhone = `+22507${suffix}`;
    let callerId: string | undefined;
    const child = start({ SUPABASE_URL: localUrl!, SUPABASE_SERVICE_ROLE_KEY: localServiceKey! });
    await new Promise((resolve) => setTimeout(resolve, 250));
    try {
      const { data: caller, error: callerError } = await database.auth.admin.createUser({ phone: callerPhone, password: "Strong!Pass1", phone_confirm: true });
      if (callerError || !caller.user) throw callerError ?? new Error("caller creation failed");
      callerId = caller.user.id;
      const { data: login, error: loginError } = await database.auth.signInWithPassword({ phone: callerPhone, password: "Strong!Pass1" });
      if (loginError || !login.session) throw loginError ?? new Error("caller login failed");
      const response = await fetch("http://127.0.0.1:8000", { method: "POST", headers: { authorization: `Bearer ${login.session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ firstName: "Koffi", lastName: "Yao", phone: candidatePhone, password: "Member!Pass1", passwordConfirmation: "Member!Pass1", role: "member" }) });
      if (response.status !== 400) throw new Error(`expected 400, got ${response.status}`);
      const { data: users, error: usersError } = await database.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (usersError) throw usersError;
      if (users.users.some((user) => user.phone === candidatePhone)) throw new Error("failed provisioning left an Auth account");
    } finally {
      if (callerId) await database.auth.admin.deleteUser(callerId);
      stop(child);
    }
  },
});

Deno.test({
  name: "create-admin-member returns 401 when a valid caller is not an active admin",
  ignore: !localUrl || !localServiceKey,
  fn: async () => {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2?target=deno");
    const database = createClient(localUrl!, localServiceKey!, { auth: { persistSession: false } });
    const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 8);
    const callerPhone = `+22505${suffix}`, candidatePhone = `+22507${suffix}`;
    let callerId: string | undefined;
    const child = start({ SUPABASE_URL: localUrl!, SUPABASE_SERVICE_ROLE_KEY: localServiceKey! });
    await new Promise((resolve) => setTimeout(resolve, 250));
    try {
      const { data: caller, error: callerError } = await database.auth.admin.createUser({ phone: callerPhone, password: "Strong!Pass1", phone_confirm: true });
      if (callerError || !caller.user) throw callerError ?? new Error("caller creation failed");
      callerId = caller.user.id;
      const { data: login, error: loginError } = await database.auth.signInWithPassword({ phone: callerPhone, password: "Strong!Pass1" });
      if (loginError || !login.session) throw loginError ?? new Error("caller login failed");
      const response = await fetch("http://127.0.0.1:8000", { method: "POST", headers: { authorization: `Bearer ${login.session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ firstName: "Koffi", lastName: "Yao", phone: candidatePhone, password: "Member!Pass1", passwordConfirmation: "Member!Pass1", role: "member" }) });
      if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`);
    } finally {
      if (callerId) await database.auth.admin.deleteUser(callerId);
      stop(child);
    }
  },
});

Deno.test({
  name: "create-admin-member provisions an active organization member with a usable password",
  ignore: !localUrl || !localServiceKey,
  fn: async () => {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2?target=deno");
    const database = createClient(localUrl!, localServiceKey!, { auth: { persistSession: false } });
    const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 8);
    const phone = `+22507${suffix}`;
    const adminPhone = `+22505${suffix}`;
    const organizationId = crypto.randomUUID();
    let adminId: string | undefined;
    let memberId: string | undefined;
    const child = start({ SUPABASE_URL: localUrl!, SUPABASE_SERVICE_ROLE_KEY: localServiceKey! });
    await new Promise((resolve) => setTimeout(resolve, 250));
    try {
      const { error: organizationError } = await database.from("organizations").insert({ id: organizationId, name: `Function ${suffix}` });
      if (organizationError) throw organizationError;
      const { data: admin, error: adminError } = await database.auth.admin.createUser({ phone: adminPhone, password: "Strong!Pass1", phone_confirm: true });
      if (adminError || !admin.user) throw adminError ?? new Error("admin creation failed");
      adminId = admin.user.id;
      const { error: accountError } = await database.from("users").insert({ id: adminId, organization_id: organizationId, role: "admin", is_active: true });
      if (accountError) throw accountError;
      const { data: login, error: loginError } = await database.auth.signInWithPassword({ phone: adminPhone, password: "Strong!Pass1" });
      if (loginError || !login.session) throw loginError ?? new Error("admin login failed");
      const response = await fetch("http://127.0.0.1:8000", {
        method: "POST",
        headers: { authorization: `Bearer ${login.session.access_token}`, "content-type": "application/json" },
        body: JSON.stringify({ firstName: "Koffi", lastName: "Yao", phone, password: "Member!Pass1", passwordConfirmation: "Member!Pass1", role: "member" }),
      });
      if (response.status !== 201) throw new Error(`expected 201, got ${response.status}: ${await response.text()}`);
      ({ memberId } = await response.json());
      const { data: member, error: memberError } = await database.from("members").select("id,organization_id,user_id,status,users!inner(role,is_active)").eq("id", memberId).single();
      const account = Array.isArray(member?.users) ? member.users[0] : member?.users;
      if (memberError || member.organization_id !== organizationId || member.status !== "active" || account?.role !== "member" || !account.is_active) throw memberError ?? new Error("provisioned records are invalid");
      const { error: memberLoginError } = await database.auth.signInWithPassword({ phone, password: "Member!Pass1" });
      if (memberLoginError) throw memberLoginError;
    } finally {
      if (memberId) {
        const { data: member } = await database.from("members").select("user_id").eq("id", memberId).maybeSingle();
        if (member?.user_id) await database.auth.admin.deleteUser(member.user_id);
      }
      if (adminId) await database.auth.admin.deleteUser(adminId);
      await database.from("organizations").delete().eq("id", organizationId);
      stop(child);
    }
  },
});
