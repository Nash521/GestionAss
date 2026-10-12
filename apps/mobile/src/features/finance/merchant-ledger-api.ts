import { getSupabaseClient } from "../../lib/supabase-client";

export type MerchantAccountSummary = {
  merchantId: string;
  current: boolean;
  calculatedBalance: number;
  movementCount: number;
};

export type MerchantMovementKind = "opening" | "receipt" | "disbursement" | "fee" | "refund" | "transfer_in" | "transfer_out" | "adjustment_in" | "adjustment_out";
export type MerchantMovement = {
  id: string;
  merchantId: string;
  kind: MerchantMovementKind;
  amount: number;
  occurredOn: string;
  description: string;
  reference: string | null;
  recordedAt: string;
};
export type MerchantLedger = { accounts: MerchantAccountSummary[]; movements: MerchantMovement[] };

export async function getAdminMerchantLedger(): Promise<MerchantLedger> {
  const { data, error } = await getSupabaseClient().rpc("get_admin_merchant_ledger");
  if (error || !data) throw error ?? new Error("Registre indisponible.");
  return data as MerchantLedger;
}

export async function recordAdminMerchantMovement(input: {
  merchantId: string;
  kind: MerchantMovementKind;
  amount: number;
  occurredOn: string;
  description: string;
  reference: string | null;
}): Promise<void> {
  const { error } = await getSupabaseClient().rpc("record_admin_merchant_movement", {
    target_merchant_id: input.merchantId,
    movement_kind: input.kind,
    movement_amount: input.amount,
    movement_date: input.occurredOn,
    movement_description: input.description,
    movement_reference: input.reference,
  } as never);
  if (error) throw error;
}
