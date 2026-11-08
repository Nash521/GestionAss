import { getSupabaseClient } from "../../lib/supabase-client";
import type { PaymentNotificationContent } from "./format";

export type PaymentNotification = PaymentNotificationContent & {
  id: string;
  memberId: string;
  isMemberRecipient: boolean;
  createdAt: string;
  readAt: string | null;
};

type NotificationRow = {
  id: string; member_id: string; member_name: string;
  kind: PaymentNotification["kind"]; due_label: string | null;
  amount: number | string; remaining_amount: number | string;
  is_member_recipient: boolean; created_at: string; read_at: string | null;
};

export async function getPaymentNotifications(limit = 50): Promise<PaymentNotification[]> {
  const { data, error } = await getSupabaseClient().from("payment_notifications")
    .select("id,member_id,member_name,kind,due_label,amount,remaining_amount,is_member_recipient,created_at,read_at")
    .order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as NotificationRow[]).map((row) => ({
    id: row.id, memberId: row.member_id, memberName: row.member_name,
    kind: row.kind, dueLabel: row.due_label, amount: Number(row.amount),
    remainingAmount: Number(row.remaining_amount), isMemberRecipient: row.is_member_recipient,
    createdAt: row.created_at, readAt: row.read_at,
  }));
}

export async function getUnreadPaymentNotificationCount(): Promise<number> {
  const { count, error } = await getSupabaseClient().from("payment_notifications")
    .select("id", { count: "exact", head: true }).is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc("mark_payment_notification_read", { notification_id: id } as never);
  if (error) throw error;
}
