import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient, invokeRegistrationFunction, type AccountRole } from "./supabase-client";

export { getSupabaseClient, invokeRegistrationFunction, getFunctionErrorMessage } from "./supabase-client";
export type { AccountRole } from "./supabase-client";
export * from "../features/members/api";

export type SessionDestination = "pending" | "active" | "unavailable";

export async function signInWithPhone(phone: string, password: string) {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({ phone, password });
  if (error || !data.session) throw error ?? new Error("Session Supabase manquante.");
  return data.session as Session;
}

export async function getSessionDestination() {
  return invokeRegistrationFunction<{ destination: SessionDestination; role?: AccountRole }>("get-session-destination", {});
}

export type DashboardSummary = { organizationName: string; totalMembers: number; membersPaid: number; membersLate: number; totalMonthlyOutstanding: number; totalCash: number; totalExpenses: number };
export function getAdminDashboard() { return invokeRegistrationFunction<DashboardSummary>("get-admin-dashboard", {}); }

export type OpenDue = { id: string; kind: "membership" | "monthly" | "exceptional"; label: string; dueDate: string | null; amountDue: number; amountPaid: number; amountRemaining: number; status: FinanceStatus };
export function getMemberOpenDues(memberId: string) { return invokeRegistrationFunction<{ dues: OpenDue[] }>("get-member-open-dues", { memberId }); }

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
export type MonthlyContributionSettings = { monthlyAmount: number; dueDay: number };

export type AdminFinanceAction =
  | { action: "getMonthlySettings" }
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

export function getMonthlyContributionSettings(invoke: FinanceInvoker = invokeRegistrationFunction) {
  return invoke<{ id: MonthlyContributionSettings }>("create-admin-finance-action", { action: "getMonthlySettings" });
}
