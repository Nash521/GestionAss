import { createClient, type Session } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (client) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configuration Supabase manquante.");
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export async function invokeRegistrationFunction<T>(name: string, body: Record<string, unknown>) {
  const { data, error } = await getSupabaseClient().functions.invoke<T>(name, { body });
  if (error || !data) throw error ?? new Error("Réponse Supabase manquante.");
  return data;
}

export async function getFunctionErrorMessage(error: unknown) {
  const context = typeof error === "object" && error !== null ? (error as { context?: unknown }).context : null;
  if (!context || typeof context !== "object" || !("clone" in context)) return null;
  try {
    const response = context as { clone: () => { json: () => Promise<unknown> } };
    const body = await response.clone().json();
    return typeof body === "object" && body !== null && typeof (body as { error?: unknown }).error === "string" ? (body as { error: string }).error : null;
  } catch { return null; }
}

export type SessionDestination = "pending" | "active" | "unavailable";
export type AccountRole = "admin" | "member";

export async function signInWithPhone(phone: string, password: string) {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({ phone, password });
  if (error || !data.session) throw error ?? new Error("Session Supabase manquante.");
  return data.session as Session;
}

export async function getSessionDestination() {
  return invokeRegistrationFunction<{ destination: SessionDestination; role?: AccountRole }>("get-session-destination", {});
}

export type DashboardSummary = { organizationName: string; totalMembers: number; membersPaid: number; membersLate: number; totalDue: number; totalCollected: number; totalOutstanding: number };
export function getAdminDashboard() { return invokeRegistrationFunction<DashboardSummary>("get-admin-dashboard", {}); }

export type AdminMember = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: AccountRole;
  memberStatus: "pending_membership" | "active" | "suspended" | "removed";
  paymentStatus: "paid" | "unpaid" | "partial";
  amountRemaining: number | null;
};

export type ContributionDue = {
  id: string;
  label?: string;
  month?: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;
  status: "paid" | "partial" | "unpaid";
};

export type AidDisbursement = { id: string; label: string; amount: number; disbursedOn: string };
export type MemberChartPoint = { month: string; paid: number; unpaid: number };
export type AdminMemberDetail = {
  member: AdminMember & { memberNumber: string; joiningDate: string };
  membershipFee: { amountDue: number; amountPaid: number; amountRemaining: number; status: "paid" | "partial" | "unpaid" };
  monthlyDues: ContributionDue[];
  exceptionalDues: Required<Pick<ContributionDue, "id" | "label" | "dueDate" | "amountDue" | "amountPaid" | "amountRemaining" | "status">>[];
  aid: { count: number; totalReceived: number; items: AidDisbursement[] };
  summary: { totalContributed: number; monthlyPaid: number; monthlyRemaining: number; exceptionalPaid: number; exceptionalRemaining: number };
  chart: MemberChartPoint[];
};

export function getAdminMemberDetail(memberId: string) {
  return invokeRegistrationFunction<AdminMemberDetail>("get-admin-member-detail", { memberId });
}

export type AdminMembersPage = {
  totalMembers: number;
  membersLate: number;
  membersPaid: number;
  members: AdminMember[];
};

export type AdminMembersFilters = {
  query?: string;
  memberStatus?: "all" | AdminMember["memberStatus"];
  paymentStatus?: "all" | AdminMember["paymentStatus"];
  role?: "all" | AccountRole;
  offset?: number;
  limit?: number;
};

export function getAdminMembers(filters: AdminMembersFilters = {}) {
  return invokeRegistrationFunction<AdminMembersPage>("get-admin-members", {
    query: filters.query ?? "", memberStatus: filters.memberStatus ?? "all",
    paymentStatus: filters.paymentStatus ?? "all", role: filters.role ?? "all", offset: filters.offset ?? 0, limit: filters.limit ?? 50,
  });
}

export type CreateAdminMemberInput = {
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  passwordConfirmation: string;
  role: AccountRole;
};

export function createAdminMember(input: CreateAdminMemberInput) {
  return invokeRegistrationFunction<{ memberId: string }>("create-admin-member", input);
}

export type FinanceTab = "monthly" | "exceptional" | "disbursements";
export type FinanceStatus = "paid" | "partial" | "unpaid";
export type ContributionStatus = FinanceStatus;
export type FinanceMember = { id: string; firstName: string; lastName: string; phone?: string; memberNumber?: string };
export type FinancePayment = { id: string; amount: number; paidOn: string; reference: string; source: "manual" | "wave" };
export type MonthlyDue = {
  id: string; memberId: string; firstName?: string; lastName?: string; phone?: string; month: string; dueDate: string;
  amountDue: number; amountPaid: number; amountRemaining: number; status: FinanceStatus;
};
export type ExceptionalContribution = {
  id: string; label: string; amount: number; dueDate: string; createdAt: string;
};
export type Disbursement = {
  id: string; memberId: string | null; label: string; amount: number; disbursedOn: string;
  type: "general_expense" | "member_aid" | "exceptional_contribution_payment";
  exceptionalContributionId: string | null; justification: string;
};
export type AdminFinance = {
  items: MonthlyDue[] | ExceptionalContribution[] | Disbursement[];
  metadata: { offset: number; limit: number; total: number };
  summary: Record<string, number>;
};

export type AdminFinanceAction =
  | { action: "generateMonthly"; month: string }
  | { action: "createExceptional"; label: string; amount: number; dueDate: string; targetMemberIds: string[] }
  | { action: "recordPayment"; kind: "membership" | "monthly" | "exceptional"; dueId: string; amount: number; paidOn: string; reference?: string; source: "manual" | "wave" }
  | { action: "createDisbursement"; label: string; amount: number; disbursedOn: string; type: "general_expense" | "member_aid" | "exceptional_contribution_payment"; beneficiaryMemberId: string | null; exceptionalContributionId: string | null; justification: string }
  | { action: "updateMonthlySettings"; monthlyAmount: number; dueDay: number };
  

type FinanceInvoker = <T>(name: string, body: Record<string, unknown>) => Promise<T>;
export const buildAdminFinanceQuery = (tab: FinanceTab, offset = 0, limit = 30) => ({ tab, offset, limit });

export function getAdminFinance(tab: FinanceTab, offset = 0, limit = 30, invoke: FinanceInvoker = invokeRegistrationFunction) {
  return invoke<AdminFinance>("get-admin-finance", buildAdminFinanceQuery(tab, offset, limit));
}

export function createAdminFinanceAction(action: AdminFinanceAction, invoke: FinanceInvoker = invokeRegistrationFunction) {
  return invoke<{ id: string | number }>("create-admin-finance-action", action);
}
