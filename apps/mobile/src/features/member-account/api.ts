import { getSupabaseClient } from "../../lib/supabase-client";

export type MemberProfile = {
  firstName: string;
  lastName: string;
  memberNumber: string;
  phone: string;
  joiningDate: string;
  memberStatus: "pending_membership" | "active" | "suspended";
  organizationName: string;
  membershipStatus: "paid" | "partial" | "unpaid";
  membershipAmountDue: number;
  membershipAmountPaid: number;
};

export type MemberTransaction = {
  id: string;
  kind: "membership" | "monthly" | "exceptional";
  label: string;
  month: string | null;
  amount: number;
  paidOn: string;
  paymentSource: "manual" | "wave";
  reference: string | null;
};

export type MemberTransactionsPage = { items: MemberTransaction[]; total: number };
export type MemberTransactionDetail = MemberTransaction & {
  memberName: string;
  memberNumber: string;
  organizationName: string;
};

export async function getMyMemberProfile(): Promise<MemberProfile> {
  const { data, error } = await getSupabaseClient().rpc("get_my_member_profile", {} as never);
  if (error || !data) throw error ?? new Error("Profil indisponible.");
  return data as unknown as MemberProfile;
}

export async function getMyMemberTransactions(offset = 0, limit = 30): Promise<MemberTransactionsPage> {
  const { data, error } = await getSupabaseClient().rpc("get_my_member_transactions", { page_limit: limit, page_offset: offset } as never);
  if (error || !data) throw error ?? new Error("Transactions indisponibles.");
  return data as unknown as MemberTransactionsPage;
}

export async function getMyMemberTransaction(id: string): Promise<MemberTransactionDetail | null> {
  const { data, error } = await getSupabaseClient().rpc("get_my_member_transaction", { target_payment_id: id } as never);
  if (error) throw error;
  return data as MemberTransactionDetail | null;
}
