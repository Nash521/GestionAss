# Mobile login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the login page from the approved maquette and route members by their validated membership state.

**Architecture:** The mobile app signs in with Supabase Auth using a normalized Ivorian phone number, then calls one authenticated Edge Function for the route decision. The function uses server-side credentials to determine the minimal `pending`, `active`, or `unavailable` result.

**Tech Stack:** Expo Router, React Native, Supabase Auth, Supabase Edge Functions, Node test runner, Deno test runner.

---

### Task 1: Resolve an authenticated member destination

**Files:**
- Create: `supabase/functions/get-session-destination/index.ts`
- Create: `supabase/functions/get-session-destination/index_test.ts`

- [ ] **Step 1: Write the failing unauthenticated-function test**

```ts
Deno.test("get-session-destination rejects requests without a bearer token", async () => {
  const response = await fetch("http://127.0.0.1:8000", { method: "POST" });
  if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `deno test --allow-net --allow-env --allow-run supabase/functions/get-session-destination/index_test.ts`

Expected: FAIL because the function does not exist.

- [ ] **Step 3: Implement the minimal authenticated status resolver**

```ts
const caller = createClient(url, anonKey, { global: { headers: { Authorization: request.headers.get("Authorization")! } } });
const { data: { user } } = await caller.auth.getUser();
if (!user) return response({ error: "Unauthorized" }, 401);
const { data: account } = await database.from("users").select("is_active").eq("id", user.id).maybeSingle();
const { data: request } = await database.from("membership_requests").select("status").eq("user_id", user.id).maybeSingle();
return response({ destination: account?.is_active ? "active" : request?.status === "pending" ? "pending" : "unavailable" });
```

- [ ] **Step 4: Add pending, active, and unavailable assertions, then run the test**

```ts
for (const [fixture, destination] of [["pending", "pending"], ["active", "active"], ["rejected", "unavailable"]] as const) {
  const body = await resolveFixture(fixture);
  if (body.destination !== destination) throw new Error(`expected ${destination}`);
}
```

Run: `deno test --allow-net --allow-env --allow-run supabase/functions/get-session-destination/index_test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the resolver**

```bash
git add supabase/functions/get-session-destination
git commit -m "feat: resolve authenticated member destination"
```

### Task 2: Add login services and route contract tests

**Files:**
- Modify: `apps/mobile/src/lib/supabase.ts`
- Modify: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Write failing source-contract tests**

```js
test('the login screen signs in then resolves its member destination', async () => {
  const source = await readFile(new URL('../app/(auth)/login.tsx', import.meta.url), 'utf8');
  assert.match(source, /signInWithPassword\(\{ phone, password \}\)/);
  assert.match(source, /get-session-destination/);
  assert.match(source, /router\.replace\("\/request-pending"\)/);
  assert.match(source, /router\.replace\("\/home"\)/);
});
```

- [ ] **Step 2: Run the mobile test to verify it fails**

Run: `pnpm --filter mobile test`

Expected: FAIL because `login.tsx` has no authentication flow.

- [ ] **Step 3: Add typed client helpers**

```ts
export type SessionDestination = "pending" | "active" | "unavailable";
export async function signInWithPhone(phone: string, password: string) {
  const { error } = await getSupabase().auth.signInWithPassword({ phone, password });
  if (error) throw error;
}
export async function getSessionDestination() {
  return invokeRegistrationFunction<{ destination: SessionDestination }>("get-session-destination", {});
}
```

- [ ] **Step 4: Run the mobile test to verify it passes**

Run: `pnpm --filter mobile test`

Expected: PASS.

- [ ] **Step 5: Commit the client contract**

```bash
git add apps/mobile/src/lib/supabase.ts apps/mobile/test/routes.test.mjs
git commit -m "test: define mobile login route contract"
```

### Task 3: Build the login and supporting routes

**Files:**
- Modify: `apps/mobile/app/(auth)/login.tsx`
- Create: `apps/mobile/app/(auth)/password-reset.tsx`
- Create: `apps/mobile/app/home.tsx`
- Modify: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Write failing visual and link-contract tests**

```js
test('the login screen exposes password recovery and account creation', async () => {
  const source = await readFile(new URL('../app/(auth)/login.tsx', import.meta.url), 'utf8');
  assert.match(source, /Numéro de téléphone/);
  assert.match(source, /Mot de passe oublié/);
  assert.match(source, /href="\/password-reset"/);
  assert.match(source, /href="\/sign-up"/);
});
```

- [ ] **Step 2: Run the mobile test to verify it fails**

Run: `pnpm --filter mobile test`

Expected: FAIL because password recovery and authentication controls are absent.

- [ ] **Step 3: Implement the minimal visual form and routing**

```tsx
const submit = async () => {
  if (!/^\+2250[157]\d{8}$/.test(phone) || !password) return setError("Veuillez renseigner vos identifiants.");
  setLoading(true); setError(null);
  try {
    await signInWithPhone(phone, password);
    const { destination } = await getSessionDestination();
    if (destination === "pending") return router.replace("/request-pending");
    if (destination === "active") return router.replace("/home");
    setError("Votre compte n’est pas disponible.");
  } catch { setError("Numéro ou mot de passe incorrect."); }
  finally { setLoading(false); }
};
```

Implement `/password-reset` with the French message `Cette fonctionnalité arrive bientôt.` and a link back to `/login`. Implement `/home` with a concise `Bienvenue sur GestionAss` heading.

- [ ] **Step 4: Run the mobile test and type check**

Run: `pnpm --filter mobile test; pnpm --filter mobile typecheck`

Expected: PASS with no TypeScript errors.

- [ ] **Step 5: Commit the mobile interface**

```bash
git add apps/mobile/app apps/mobile/test/routes.test.mjs
git commit -m "feat: add mobile member login"
```

### Task 4: Verify the complete change

**Files:** no additional files.

- [ ] **Step 1: Run all workspace tests**

Run: `pnpm test`

Expected: all mobile and package tests pass.

- [ ] **Step 2: Run all workspace type checks**

Run: `pnpm typecheck`

Expected: all workspace type checks pass.

- [ ] **Step 3: Run Edge Function tests**

Run: `deno test --allow-net --allow-env --allow-run supabase/functions/get-session-destination/index_test.ts`

Expected: PASS for unauthenticated, pending, active, and unavailable responses.

- [ ] **Step 4: Inspect the final diff and commit any verification-only test updates**

```bash
git status --short
git diff --check
git add supabase/functions/get-session-destination apps/mobile
git commit -m "test: verify member login flow"
```
