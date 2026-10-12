export function normalizeWavePaymentLink(value: string): string | null {
  const link = value.trim();
  if (!link) return null;
  try {
    const url = new URL(link);
    if (url.protocol !== "https:" || url.hostname !== "pay.wave.com" || url.port || url.username || url.password || url.search || url.hash || !/^\/(m|mqr)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)) throw new Error();
    return url.toString();
  } catch {
    throw new Error("Saisissez un lien marchand Wave valide (https://pay.wave.com/m/… ou /mqr/…).");
  }
}

export type WaveMonthlyLinks = { fullUrl: string | null; halfUrl: string | null };

export function monthlyWaveLinkForPayment(links: WaveMonthlyLinks, amountDue: number, amountPaid: number, amount: number): string | null {
  if (!Number.isInteger(amount) || amount <= 0 || amount > amountDue - amountPaid) return null;
  if (amountPaid === 0 && amount === amountDue) return links.fullUrl;
  if (amountDue % 2 === 0 && amount === amountDue / 2) return links.halfUrl;
  return null;
}
