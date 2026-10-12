export type PaymentNotificationKind = "membership" | "monthly" | "exceptional";
export type PaymentNotificationContent = {
  kind: PaymentNotificationKind;
  eventType?: "payment" | "exceptional_created";
  memberName: string;
  dueLabel: string | null;
  dueDate?: string | null;
  amount: number;
  remainingAmount: number;
};

export function notificationCopy(value: PaymentNotificationContent, forMember: boolean): { title: string; body: string } {
  if (value.eventType === "exceptional_created") {
    const amountDue = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value.amount);
    const deadline = value.dueDate ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(`${value.dueDate}T00:00:00`)) : null;
    return { title: `Nouvelle cotisation exceptionnelle${value.dueLabel ? ` · ${value.dueLabel}` : ""}`, body: `${amountDue} à régler${deadline ? ` avant le ${deadline}` : ""}. Touchez pour voir les détails du paiement.` };
  }
  const category = value.kind === "membership" ? "Droit d’adhésion"
    : value.kind === "monthly" ? "Mensualité"
    : `Cotisation exceptionnelle${value.dueLabel ? ` « ${value.dueLabel} »` : ""}`;
  const amount = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value.amount);
  return { title: forMember ? `${category} : paiement enregistré` : `${value.memberName} · ${category}`, body: `Versement de ${amount} enregistré ${forMember ? "pour vous" : "pour ce membre"}.` };
}
