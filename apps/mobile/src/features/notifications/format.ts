export type PaymentNotificationKind = "membership" | "monthly" | "exceptional";
export type PaymentNotificationContent = {
  kind: PaymentNotificationKind;
  memberName: string;
  dueLabel: string | null;
  amount: number;
  remainingAmount: number;
};

export function notificationCopy(value: PaymentNotificationContent, forMember: boolean): { title: string; body: string } {
  const category = value.kind === "membership" ? "Droit d’adhésion"
    : value.kind === "monthly" ? "Mensualité"
    : `Cotisation exceptionnelle${value.dueLabel ? ` « ${value.dueLabel} »` : ""}`;
  const amount = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value.amount);
  return { title: forMember ? `${category} : paiement enregistré` : `${value.memberName} · ${category}`, body: `Versement de ${amount} enregistré ${forMember ? "pour vous" : "pour ce membre"}.` };
}
