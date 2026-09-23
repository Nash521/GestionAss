import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
};

type DatabaseError = { code?: string; status?: number; message?: string };
type Identity = { data: { user: { id: string } | null }; error: DatabaseError | null };
type RpcResult = { data: unknown; error: DatabaseError | null };
type Database = {
  auth: { getUser: (token: string) => Promise<Identity> };
  rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResult>;
};
type DatabaseFactory = () => Database | null;

type CaseListInput = { action: "list"; memberId: string };
type CaseOpenInput = {
  action: "open";
  memberId: string;
  reason: string;
  durationDays: number;
  observations?: string;
  evidence?: string;
  contributionPolicy: "continue" | "stop";
};
type CaseDecisionInput = {
  action: "decide";
  caseId: string;
  outcome: "confirmed" | "dismissed";
  sanction: "none" | "warning" | "suspension" | "removal";
  observations?: string;
};
type Input = CaseListInput | CaseOpenInput | CaseDecisionInput;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, expected: string[]) => {
  const actual = Object.keys(value);
  return actual.length === expected.length && expected.every((key) => Object.hasOwn(value, key));
};
const isUuid = (value: unknown): value is string => typeof value === "string" && uuidPattern.test(value);
const optionalTextIsValid = (value: unknown) => value === undefined || (typeof value === "string" && value.length <= 5000);
const normalizedOptionalText = (value: string | undefined) => value?.trim() || null;

const parseInput = (body: unknown): Input | null => {
  if (!isRecord(body) || typeof body.action !== "string") return null;

  if (body.action === "list") {
    return exactKeys(body, ["action", "memberId"]) && isUuid(body.memberId)
      ? { action: "list", memberId: body.memberId }
      : null;
  }

  if (body.action === "open") {
    const expected = ["action", "memberId", "reason", "durationDays", "contributionPolicy"];
    const optional = ["observations", "evidence"];
    if (!exactKeys(body, [...expected, ...Object.keys(body).filter((key) => optional.includes(key))])
      || Object.keys(body).some((key) => !expected.includes(key) && !optional.includes(key))
      || !isUuid(body.memberId)
      || typeof body.reason !== "string"
      || body.reason.trim().length < 1
      || body.reason.trim().length > 2000
      || !Number.isInteger(body.durationDays)
      || (body.durationDays as number) < 1
      || (body.durationDays as number) > 3650
      || (body.contributionPolicy !== "continue" && body.contributionPolicy !== "stop")
      || !optionalTextIsValid(body.observations)
      || !optionalTextIsValid(body.evidence)) {
      return null;
    }
    return {
      action: "open",
      memberId: body.memberId,
      reason: body.reason.trim(),
      durationDays: body.durationDays as number,
      ...(typeof body.observations === "string" ? { observations: body.observations } : {}),
      ...(typeof body.evidence === "string" ? { evidence: body.evidence } : {}),
      contributionPolicy: body.contributionPolicy,
    };
  }

  if (body.action === "decide") {
    const expected = ["action", "caseId", "outcome", "sanction"];
    const optional = ["observations"];
    if (!exactKeys(body, [...expected, ...Object.keys(body).filter((key) => optional.includes(key))])
      || Object.keys(body).some((key) => !expected.includes(key) && !optional.includes(key))
      || !isUuid(body.caseId)
      || (body.outcome !== "confirmed" && body.outcome !== "dismissed")
      || !["none", "warning", "suspension", "removal"].includes(body.sanction as string)
      || (body.outcome === "dismissed" && body.sanction !== "none")
      || !optionalTextIsValid(body.observations)) {
      return null;
    }
    return {
      action: "decide",
      caseId: body.caseId,
      outcome: body.outcome,
      sanction: body.sanction as CaseDecisionInput["sanction"],
      ...(typeof body.observations === "string" ? { observations: body.observations } : {}),
    };
  }

  return null;
};

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

const databaseFromEnvironment = (): Database | null => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } }) as unknown as Database;
};

const mapRpcError = (error: DatabaseError): { status: number; message: string } => {
  const message = error.message ?? "";
  if (/unauthorized/i.test(message) || error.status === 401 || error.status === 403) {
    return { status: 403, message: "Forbidden" };
  }
  if (/not found/i.test(message)) return { status: 404, message: "Not found" };
  if (/already exists|invalid member transition|cannot sanction|last active administrator/i.test(message)) {
    return { status: 409, message: "Conflict" };
  }
  if (/invalid investigation|invalid request/i.test(message)) return { status: 400, message: "Invalid request" };
  return { status: 503, message: "Service unavailable" };
};

export const createHandler = (databaseFactory: DatabaseFactory = databaseFromEnvironment) =>
  async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") return new Response("ok", { headers });
    if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);

    const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!bearer) return response({ error: "Unauthorized" }, 401);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return response({ error: "Invalid request" }, 400);
    }

    const input = parseInput(body);
    if (!input) return response({ error: "Invalid request" }, 400);

    let database: Database | null;
    try {
      database = databaseFactory();
    } catch {
      return response({ error: "Service unavailable" }, 503);
    }
    if (!database) return response({ error: "Service unavailable" }, 503);

    let identity: Identity;
    try {
      identity = await database.auth.getUser(bearer);
    } catch {
      return response({ error: "Service unavailable" }, 503);
    }
    if (identity.error) {
      const unauthorized = identity.error.status === 401 || identity.error.status === 403;
      return response({ error: unauthorized ? "Unauthorized" : "Service unavailable" }, unauthorized ? 401 : 503);
    }
    if (!identity.data.user) return response({ error: "Unauthorized" }, 401);

    let rpcName: string;
    let rpcArgs: Record<string, unknown>;
    if (input.action === "list") {
      rpcName = "get_member_disciplinary_cases";
      rpcArgs = { admin_id: identity.data.user.id, target_member_id: input.memberId };
    } else if (input.action === "open") {
      rpcName = "open_member_disciplinary_case";
      rpcArgs = {
        admin_id: identity.data.user.id,
        target_member_id: input.memberId,
        reason_value: input.reason,
        duration_days: input.durationDays,
        observations_value: normalizedOptionalText(input.observations),
        evidence_value: normalizedOptionalText(input.evidence),
        contribution_policy_value: input.contributionPolicy,
      };
    } else {
      rpcName = "decide_member_disciplinary_case";
      rpcArgs = {
        admin_id: identity.data.user.id,
        case_id: input.caseId,
        outcome_value: input.outcome,
        sanction_value: input.sanction,
        observations_value: normalizedOptionalText(input.observations),
      };
    }

    try {
      const { data, error } = await database.rpc(rpcName, rpcArgs);
      if (error) {
        const mapped = mapRpcError(error);
        if (mapped.status === 503) console.error("manage-member-disciplinary-case RPC failed", { action: input.action, code: error.code });
        return response({ error: mapped.message }, mapped.status);
      }
      if (input.action === "list") return response(data);
      if (input.action === "open") return response({ caseId: data });
      return response({ status: data });
    } catch {
      console.error("manage-member-disciplinary-case RPC failed", { action: input.action });
      return response({ error: "Service unavailable" }, 503);
    }
  };

if (import.meta.main) {
  Deno.serve({ port: Number(Deno.env.get("PORT") ?? "8000") }, createHandler());
}
