export function normalizeWavePaymentLink(value: string): string | null {
  const link = value.trim();
  if (!link) return null;
  try {
    const url = new URL(link);
    if (url.protocol !== "https:" || url.hostname !== "pay.wave.com" || url.port || url.username || url.password || url.hash || !/^\/(m|mqr)\/[A-Za-z0-9_-]+(?:\/c\/[a-z]{2})?\/?$/.test(url.pathname)) throw new Error();
    if (url.search && (url.searchParams.size !== 1 || !/^[1-9]\d*$/.test(url.searchParams.get("amount") ?? ""))) throw new Error();
    return url.toString();
  } catch {
    throw new Error("Saisissez un lien marchand Wave valide, avec uniquement le paramètre amount si un montant est indiqué.");
  }
}

export function wavePaymentLinkAmount(value: string): number | null {
  const url = normalizeWavePaymentLink(value);
  if (!url) return null;
  const amount = new URL(url).searchParams.get("amount");
  return amount ? Number(amount) : null;
}

export type WaveMonthlyLinks = { fullUrl: string | null; halfUrl: string | null };

export function monthlyWaveLinkForPayment(links: WaveMonthlyLinks, amountDue: number, amountPaid: number, amount: number): string | null {
  if (!Number.isInteger(amount) || amount <= 0 || amount > amountDue - amountPaid) return null;
  if (amountPaid === 0 && amount === amountDue && links.fullUrl && wavePaymentLinkAmount(links.fullUrl) === amount) return links.fullUrl;
  if (amountDue % 2 === 0 && amount === amountDue / 2 && links.halfUrl && wavePaymentLinkAmount(links.halfUrl) === amount) return links.halfUrl;
  return null;
}
