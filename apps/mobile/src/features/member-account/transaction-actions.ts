import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform, Share } from "react-native";
import type { MemberTransactionDetail } from "./api";

export const formatMoney = (amount: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
export const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T00:00:00`));
export const formatMonth = (value: string) => new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(`${value.slice(0, 7)}-01T00:00:00`));
export const transactionTitle = (item: MemberTransactionDetail) => item.kind === "exceptional" ? `Cotisation exceptionnelle · ${item.label}` : item.kind === "monthly" && item.month ? `Mensualité · ${formatMonth(item.month)}` : item.label;
export const transactionMethod = (item: MemberTransactionDetail) => item.paymentSource === "wave" ? "Wave" : "Espèces";

export function transactionSummary(item: MemberTransactionDetail) {
  return [
    `Reçu de paiement · ${item.organizationName}`,
    `Membre : ${item.memberName} (${item.memberNumber})`,
    `Transaction : ${transactionTitle(item)}`,
    `Montant : ${formatMoney(item.amount)}`,
    `Date : ${formatDate(item.paidOn)}`,
    `Mode : ${transactionMethod(item)}`,
    ...(item.reference ? [`Référence : ${item.reference}`] : []),
    `Identifiant : ${item.id}`,
  ].join("\n");
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);

export function transactionHtml(item: MemberTransactionDetail) {
  const row = (label: string, value: string) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#102b3d;padding:36px}h1{font-size:24px}h2{font-size:18px;color:#007d74}.amount{font-size:30px;font-weight:bold;color:#007d74;margin:24px 0}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #e1ebe9;padding:11px;text-align:left}th{color:#65758a;font-weight:normal;width:38%}footer{color:#65758a;font-size:11px;margin-top:36px}</style></head><body><h1>${escapeHtml(item.organizationName)}</h1><h2>Reçu de paiement</h2><p class="amount">+${escapeHtml(formatMoney(item.amount))}</p><table>${row("Transaction", transactionTitle(item))}${row("Membre", item.memberName)}${row("Numéro de membre", item.memberNumber)}${row("Date du paiement", formatDate(item.paidOn))}${item.month ? row("Période", formatMonth(item.month)) : ""}${row("Mode de paiement", transactionMethod(item))}${item.reference ? row("Référence", item.reference) : ""}${row("Identifiant", item.id)}</table><footer>Reçu généré depuis l’espace membre.</footer></body></html>`;
}

export async function shareTransaction(item: MemberTransactionDetail): Promise<"shared" | "copied"> {
  const summary = transactionSummary(item);
  if (Platform.OS === "web") {
    await navigator.clipboard.writeText(summary);
    return "copied";
  }
  await Share.share({ message: summary, title: "Reçu de paiement" });
  return "shared";
}

export async function exportTransactionPdf(item: MemberTransactionDetail) {
  if (Platform.OS === "web") {
    const printStyles = document.createElement("style");
    printStyles.textContent = '@media print { [role="button"] { display: none !important; } body { background: white !important; } }';
    document.head.appendChild(printStyles);
    try { await Print.printToFileAsync({ html: transactionHtml(item) }); }
    finally { printStyles.remove(); }
    return;
  }
  const { uri } = await Print.printToFileAsync({ html: transactionHtml(item) });
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "Exporter le reçu PDF" });
}
