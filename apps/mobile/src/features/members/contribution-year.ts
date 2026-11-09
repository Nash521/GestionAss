import type { ContributionDue } from "./api";

export type CalendarStatus = "paid" | "partial" | "late" | "upcoming" | "not_issued";
export type CalendarMonth = { month: string; status: CalendarStatus; due: ContributionDue | null };

export function isAnnualProgressVisible(chartTop: number, viewportHeight: number, scrollOffset: number) {
  return viewportHeight > 0 && chartTop < scrollOffset + viewportHeight * 0.85 && chartTop + 180 > scrollOffset;
}

export function buildMemberContributionYear(dues: ContributionDue[], monthlyRate: number, year: number, today: string) {
  const byMonth = new Map(dues.filter((due) => due.month?.startsWith(`${year}-`)).map((due) => [due.month!.slice(0, 7), due]));
  const months: CalendarMonth[] = Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, "0")}`;
    const due = byMonth.get(month) ?? null;
    const status: CalendarStatus = !due ? (month > today.slice(0, 7) ? "upcoming" : "not_issued") : due.status === "paid" ? "paid" : due.status === "partial" ? "partial" : due.dueDate < today ? "late" : "upcoming";
    return { month, status, due };
  });
  const annualGoal = Math.max(0, monthlyRate) * 12;
  const paid = months.reduce((total, month) => total + (month.due?.amountPaid ?? 0), 0);
  const percentage = annualGoal > 0 ? Math.min(100, paid / annualGoal * 100) : 0;
  return { months, annualGoal, paid, percentage };
}
