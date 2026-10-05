export type MonthlyPaymentContext = { amountDue: number; amountPaid: number; amountRemaining: number; paymentCount: number; maxPayments: number };

export function monthlyPaymentSelection(context: MonthlyPaymentContext) {
  const remainingSlots = Math.max(0, context.maxPayments - context.paymentCount);
  const canPay = context.amountDue > 0 && context.amountRemaining > 0 && remainingSlots > 0;
  const targets = Array.from({ length: Math.max(0, context.maxPayments) }, (_, index) => index + 1 === context.maxPayments
    ? context.amountDue
    : Math.round(context.amountDue * (index + 1) / context.maxPayments));
  const legacyBalanceOnly = context.amountPaid > 0 && !targets.includes(context.amountPaid);
  const markers = targets.map((targetPaid, index) => {
    const amount = targetPaid - context.amountPaid;
    const available = canPay && amount > 0 && amount <= context.amountRemaining
      && (!legacyBalanceOnly && remainingSlots > 1 || targetPaid === context.amountDue);
    return { index: index + 1, targetPaid, amount, available };
  });
  const options = markers.filter((marker) => marker.available);
  return {
    amountDue: context.amountDue,
    amountPaid: context.amountPaid,
    amountRemaining: context.amountRemaining,
    remainingSlots,
    paidFraction: context.amountDue > 0 ? Math.min(1, Math.max(0, context.amountPaid / context.amountDue)) : 0,
    markers,
    options,
    suggestedAmount: options[0]?.amount ?? 0,
    legacyBalanceOnly,
    mustSettle: canPay && remainingSlots === 1,
  };
}
