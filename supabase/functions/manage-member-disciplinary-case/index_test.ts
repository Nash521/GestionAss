import { createHandler } from "./index.ts";

const identity = { data: { user: { id: "51000000-0000-4000-8000-000000000001" } }, error: null };
const memberId = "53000000-0000-4000-8000-000000000001";
const caseId = "54000000-0000-4000-8000-000000000001";
const listInput = { action: "list", memberId };
const openInput = {
  action: "open",
  memberId,
  reason: "Manquement au règlement",
  durationDays: 30,
  contributionPolicy: "continue",
};
const decideInput = {
  action: "decide",
  caseId,
  outcome: "confirmed",
  sanction: "suspension",
};

type ErrorValue = { status?: number; message?: string };
type RpcCall = { name: string; args: Record<string, unknown> };
type DatabaseOptions = {
  identity?: typeof identity | { data: { user: null }; error: ErrorValue | null };
  identityError?: ErrorValue | null;
  rpcResult?: { data: unknown; error: ErrorValue | null };
};

const request = (body: unknown, authorization: string | null = "Bearer session-token") => new Request("http://localhost", {
  method: "POST",
  headers: { ...(authorization ? { authorization } : {}), "content-type": "application/json" },
  body: JSON.stringify(body),
});

const database = (options: DatabaseOptions = {}) => {
  const calls: RpcCall[] = [];
  const db = {
    auth: {
      getUser: async (token: string) => {
        if (token !== "session-token") throw new Error("unexpected token passed to auth");
        return options.identityError === undefined
          ? options.identity ?? identity
          : { data: { user: null }, error: options.identityError };
      },
    },
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return options.rpcResult ?? { data: null, error: null };
    },
  };
  return { db, calls };
};

Deno.test("disciplinary endpoint answers CORS preflight without a database", async () => {
  const response = await createHandler() (new Request("http://localhost", { method: "OPTIONS" }));
  if (response.status !== 200 || response.headers.get("access-control-allow-methods") !== "POST, OPTIONS") {
    throw new Error("expected CORS preflight response");
  }
});

Deno.test("disciplinary endpoint rejects methods other than POST", async () => {
  const response = await createHandler()(new Request("http://localhost", { method: "GET" }));
  if (response.status !== 405) throw new Error("expected 405");
});

Deno.test("disciplinary endpoint requires a well-formed bearer token", async () => {
  for (const authorization of [undefined, "session-token", "Bearer "]) {
    const fake = database();
    const response = await createHandler(() => fake.db as never)(request(listInput, authorization ?? null));
    if (response.status !== 401 || fake.calls.length !== 0) throw new Error("expected 401 before database RPC");
  }
});

Deno.test("disciplinary endpoint rejects malformed JSON", async () => {
  const fake = database();
  const response = await createHandler(() => fake.db as never)(new Request("http://localhost", {
    method: "POST",
    headers: { authorization: "Bearer session-token", "content-type": "application/json" },
    body: "{",
  }));
  if (response.status !== 400 || fake.calls.length !== 0) throw new Error("expected invalid JSON rejection");
});

Deno.test("disciplinary endpoint rejects unknown keys and invalid UUIDs before authentication", async () => {
  for (const input of [
    { ...listInput, unexpected: true },
    { action: "list", memberId: "not-a-uuid" },
  ]) {
    const fake = database();
    const response = await createHandler(() => fake.db as never)(request(input));
    if (response.status !== 400 || fake.calls.length !== 0) throw new Error("expected strict request validation");
  }
});

Deno.test("disciplinary endpoint rejects malformed open and decision inputs", async () => {
  const invalidInputs = [
    { ...openInput, reason: "   " },
    { ...openInput, durationDays: 0 },
    { ...openInput, contributionPolicy: "pause" },
    { ...openInput, observations: 42 },
    { ...openInput, extra: true },
    { ...decideInput, outcome: "dismissed" },
    { ...decideInput, caseId: "not-a-uuid" },
    { ...decideInput, extra: true },
  ];
  for (const input of invalidInputs) {
    const fake = database();
    const response = await createHandler(() => fake.db as never)(request(input));
    if (response.status !== 400 || fake.calls.length !== 0) throw new Error(`expected invalid input rejection for ${JSON.stringify(input)}`);
  }
});

Deno.test("disciplinary endpoint maps expired identity tokens to 401", async () => {
  const fake = database({ identityError: { status: 401, message: "expired token" } });
  const response = await createHandler(() => fake.db as never)(request(listInput));
  if (response.status !== 401 || fake.calls.length !== 0) throw new Error("expected expired token rejection");
});

Deno.test("disciplinary endpoint hides identity provider outages", async () => {
  const fake = database({ identityError: { message: "auth.internal/password leaked" } });
  const response = await createHandler(() => fake.db as never)(request(listInput));
  const body = await response.json();
  if (response.status !== 503 || body.error !== "Service unavailable" || JSON.stringify(body).includes("password")) {
    throw new Error("expected safe identity outage response");
  }
});

Deno.test("disciplinary endpoint distinguishes an authenticated non-admin", async () => {
  const fake = database({ rpcResult: { data: null, error: { status: 403, message: "Unauthorized" } } });
  const response = await createHandler(() => fake.db as never)(request(listInput));
  if (response.status !== 403) throw new Error("expected forbidden response");
});

Deno.test("disciplinary endpoint maps cross-organization members to 404", async () => {
  const fake = database({ rpcResult: { data: null, error: { message: "Member not found" } } });
  const response = await createHandler(() => fake.db as never)(request(listInput));
  if (response.status !== 404) throw new Error("expected not found response");
});

Deno.test("disciplinary endpoint maps duplicate open cases to 409", async () => {
  const fake = database({ rpcResult: { data: null, error: { message: "An open disciplinary case already exists" } } });
  const response = await createHandler(() => fake.db as never)(request(openInput));
  if (response.status !== 409) throw new Error("expected conflict response");
});

Deno.test("disciplinary endpoint hides internal database errors", async () => {
  const fake = database({ rpcResult: { data: null, error: { message: "connection password secret" } } });
  const response = await createHandler(() => fake.db as never)(request(openInput));
  const body = await response.json();
  if (response.status !== 503 || body.error !== "Service unavailable" || JSON.stringify(body).includes("password")) {
    throw new Error("expected safe database outage response");
  }
});

Deno.test("disciplinary endpoint routes list with the authenticated admin id", async () => {
  const payload = { cases: [{ id: caseId, memberId }] };
  const fake = database({ rpcResult: { data: payload, error: null } });
  const response = await createHandler(() => fake.db as never)(request(listInput));
  const body = await response.json();
  if (response.status !== 200 || JSON.stringify(body) !== JSON.stringify(payload)) throw new Error("expected list payload");
  if (JSON.stringify(fake.calls) !== JSON.stringify([{ name: "get_member_disciplinary_cases", args: { admin_id: identity.data.user.id, target_member_id: memberId } }])) {
    throw new Error("expected organization-scoped list RPC");
  }
});

Deno.test("disciplinary endpoint routes open with normalized server-owned identity", async () => {
  const fake = database({ rpcResult: { data: caseId, error: null } });
  const response = await createHandler(() => fake.db as never)(request({ ...openInput, observations: "  note  ", evidence: "  preuve  " }));
  const body = await response.json();
  if (response.status !== 200 || body.caseId !== caseId) throw new Error("expected created case response");
  const expected = {
    name: "open_member_disciplinary_case",
    args: {
      admin_id: identity.data.user.id,
      target_member_id: memberId,
      reason_value: openInput.reason,
      duration_days: openInput.durationDays,
      observations_value: "note",
      evidence_value: "preuve",
      contribution_policy_value: "continue",
    },
  };
  if (JSON.stringify(fake.calls) !== JSON.stringify([expected])) throw new Error("expected exact opening RPC payload");
});

Deno.test("disciplinary endpoint routes decisions with authenticated identity", async () => {
  const fake = database({ rpcResult: { data: "suspended", error: null } });
  const response = await createHandler(() => fake.db as never)(request({ ...decideInput, observations: "Décision" }));
  const body = await response.json();
  if (response.status !== 200 || body.status !== "suspended") throw new Error("expected decision response");
  const expected = {
    name: "decide_member_disciplinary_case",
    args: {
      admin_id: identity.data.user.id,
      case_id: caseId,
      outcome_value: "confirmed",
      sanction_value: "suspension",
      observations_value: "Décision",
    },
  };
  if (JSON.stringify(fake.calls) !== JSON.stringify([expected])) throw new Error("expected exact decision RPC payload");
});
