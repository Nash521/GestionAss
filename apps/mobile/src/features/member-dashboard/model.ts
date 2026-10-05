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

export const abidjanToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Abidjan", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export function activeExceptionalDues(dues: MemberExceptionalDue[], today: string) {
  return dues.filter((due) => due.dueDate > today && due.amountDue > due.amountPaid)
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate));
}

export function buildMemberDashboard(data: MemberDashboardData, year: number) {
  const monthly = data.monthlyDues;
  const exceptional = data.exceptionalDues;
  const monthlyPaid = monthly.reduce((sum, due) => sum + due.amountPaid, 0);
  const monthlyDue = monthly.reduce((sum, due) => sum + due.amountDue, 0);
  const exceptionalPaid = exceptional.reduce((sum, due) => sum + due.amountPaid, 0);
  const exceptionalDue = exceptional.reduce((sum, due) => sum + due.amountDue, 0);
  const annualPaid = monthly.filter((due) => due.month.startsWith(`${year}-`)).reduce((sum, due) => sum + due.amountPaid, 0);
  const annualGoal = Math.max(0, data.monthlyRate) * 12;
  return {
    totalPaid: monthlyPaid + exceptionalPaid,
    totalDue: monthlyDue + exceptionalDue,
    monthsPaid: monthly.filter((due) => due.amountDue > 0 && due.amountRemaining === 0).length,
    monthsUnsettled: monthly.filter((due) => due.amountRemaining > 0).length,
    exceptionalPaid,
    annualGoal,
    annualPaid,
    percentage: annualGoal > 0 ? Math.min(100, annualPaid / annualGoal * 100) : 0,
  };
}
