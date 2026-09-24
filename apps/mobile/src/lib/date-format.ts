export function formatFinanceDate(value: string | null | undefined): string {
  if (!value) return "Date indisponible";
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(isDateOnly ? `${value}T00:00:00.000Z` : value);
  if (!Number.isFinite(date.getTime())) return "Date indisponible";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", ...(isDateOnly ? { timeZone: "UTC" } : {}) }).format(date);
}
