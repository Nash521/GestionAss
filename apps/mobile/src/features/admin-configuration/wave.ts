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
