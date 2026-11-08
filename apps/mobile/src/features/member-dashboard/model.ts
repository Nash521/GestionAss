export type MemberMonthlyDue = {
  id: string;
  month: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;
  status: "paid" | "partial" | "unpaid";
};

export type MemberExceptionalDue = {
  id: string;
  label: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
};

export type MemberDashboardData = {
  firstName: string;
  organizationName: string;
  monthlyRate: number;
  monthlyDues: MemberMonthlyDue[];
  exceptionalDues: MemberExceptionalDue[];
};

export function buildMemberDashboard(data: MemberDashboardData, year: number) {
  const monthly = data.monthlyDues.filter((due) => due.month.startsWith(`${year}-`));
  const exceptional = data.exceptionalDues.filter((due) => due.dueDate.startsWith(`${year}-`));
  const monthlyPaid = monthly.reduce((sum, due) => sum + due.amountPaid, 0);
  const monthlyDue = monthly.reduce((sum, due) => sum + due.amountDue, 0);
  const exceptionalPaid = exceptional.reduce((sum, due) => sum + due.amountPaid, 0);
  const exceptionalDue = exceptional.reduce((sum, due) => sum + due.amountDue, 0);
  const annualGoal = Math.max(0, data.monthlyRate) * 12;
  return {
    totalPaid: monthlyPaid + exceptionalPaid,
    totalDue: monthlyDue + exceptionalDue,
    monthsPaid: monthly.filter((due) => due.amountDue > 0 && due.amountRemaining === 0).length,
    monthsUnsettled: monthly.filter((due) => due.amountRemaining > 0).length,
    exceptionalPaid,
    annualGoal,
    annualPaid: monthlyPaid,
    percentage: annualGoal > 0 ? Math.min(100, monthlyPaid / annualGoal * 100) : 0,
  };
}
