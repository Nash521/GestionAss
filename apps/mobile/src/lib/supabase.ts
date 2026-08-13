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
};

export function getAdminMembers(filters: AdminMembersFilters = {}) {
  return invokeRegistrationFunction<AdminMembersPage>("get-admin-members", {
    query: filters.query ?? "", memberStatus: filters.memberStatus ?? "all",
    paymentStatus: filters.paymentStatus ?? "all", role: filters.role ?? "all", offset: 0, limit: 50,
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
