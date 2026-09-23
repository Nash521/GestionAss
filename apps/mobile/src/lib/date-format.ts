export function formatFinanceDate(value: string | null | undefined): string {
  if (!value || !Number.isFinite(new Date(value).getTime())) return "Date indisponible";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}
