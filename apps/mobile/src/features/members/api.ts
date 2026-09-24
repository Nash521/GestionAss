import { invokeRegistrationFunction, type AccountRole } from "../../lib/supabase-client";

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

export type CreateAdminMemberInput = {
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  passwordConfirmation: string;
  role: AccountRole;
};

export type AdminMemberAction = "update" | "reactivate";

export type DisciplinaryCase = {
  id: string;
  memberId: string;
  reason: string;
  plannedDurationDays: number | null;
  observations: string | null;
  evidence: string | null;
  contributionPolicy: "continue" | "stop";
  status: "open" | "confirmed" | "dismissed" | "closed";
  sanction: "none" | "warning" | "suspension" | "removal";
  openedAt: string;
  openedBy: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
};

export type DisciplinaryCaseListResult = { cases: DisciplinaryCase[] };
export type DisciplinaryCaseOpenInput = {
  memberId: string;
  reason: string;
  durationDays: number;
  observations?: string;
  evidence?: string;
  contributionPolicy: "continue" | "stop";
};
export type DisciplinaryCaseDecisionInput = {
  caseId: string;
  outcome: "confirmed" | "dismissed";
  sanction: "none" | "warning" | "suspension" | "removal";
  observations?: string;
};
export type DisciplinaryCaseInput =
  | ({ action: "open" } & DisciplinaryCaseOpenInput)
  | ({ action: "decide" } & DisciplinaryCaseDecisionInput);

export function getAdminMembers(filters: AdminMembersFilters = {}) {
  return invokeRegistrationFunction<AdminMembersPage>("get-admin-members", {
    query: filters.query ?? "",
    memberStatus: filters.memberStatus ?? "all",
    paymentStatus: filters.paymentStatus ?? "all",
    role: filters.role ?? "all",
    offset: filters.offset ?? 0,
    limit: filters.limit ?? 50,
  });
}

export function createAdminMember(input: CreateAdminMemberInput) {
  return invokeRegistrationFunction<{ memberId: string }>("create-admin-member", input);
}

export function getAdminMemberDetail(memberId: string) {
  return invokeRegistrationFunction<AdminMemberDetail>("get-admin-member-detail", { memberId });
}

export function manageAdminMember(input: { memberId: string; action: AdminMemberAction; firstName?: string; lastName?: string; phone?: string }) {
  return invokeRegistrationFunction<{ status: AdminMember["memberStatus"] }>("manage-admin-member", input);
}

export function listDisciplinaryCases(memberId: string) {
  return invokeRegistrationFunction<DisciplinaryCaseListResult>("manage-member-disciplinary-case", { action: "list", memberId });
}

export function openDisciplinaryCase(input: DisciplinaryCaseOpenInput) {
  return invokeRegistrationFunction<{ caseId: string }>("manage-member-disciplinary-case", { action: "open", ...input });
}

export function decideDisciplinaryCase(input: DisciplinaryCaseDecisionInput) {
  return invokeRegistrationFunction<{ status: AdminMember["memberStatus"] }>("manage-member-disciplinary-case", { action: "decide", ...input });
}
