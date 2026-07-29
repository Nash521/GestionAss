export const OTP_EXPIRY_MS = 10 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 5 * 60 * 1000;
export const OTP_ATTEMPT_LIMIT = 5;

export type Otp = { code: string; codeHash: Uint8Array };

/** Uses rejection sampling so each six-digit value has equal probability. */
function secureSixDigitNumber(): number {
  const upperBound = 2 ** 32;
  const acceptedLimit = upperBound - (upperBound % 1_000_000);
  const bytes = new Uint32Array(1);
  do {
    crypto.getRandomValues(bytes);
  } while (bytes[0] >= acceptedLimit);
  return bytes[0] % 1_000_000;
}

export async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

export async function createOtp(): Promise<Otp> {
  const code = secureSixDigitNumber().toString().padStart(6, "0");
  return { code, codeHash: await sha256(code) };
}

/** Constant-time comparison for equally-sized hashes. */
export function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  let difference = left.length ^ right.length;
  const maxLength = Math.max(left.length, right.length);
  for (let index = 0; index < maxLength; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

export async function safeVerifyOtp(code: string, expectedHash: Uint8Array): Promise<boolean> {
  return timingSafeEqual(await sha256(code), expectedHash);
}

export function hashToDatabase(hash: Uint8Array): string {
  return `\\x${Array.from(hash, (value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function hashFromDatabase(value: string): Uint8Array {
  const hex = value.startsWith("\\x") ? value.slice(2) : value;
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) throw new Error("Invalid OTP hash format");
  return Uint8Array.from(hex.match(/.{2}/g)!, (pair) => Number.parseInt(pair, 16));
}

export function isExpired(expiresAt: string, now = new Date()): boolean {
  return new Date(expiresAt).getTime() < now.getTime();
}

export function isResendAllowed(lastSentAt: string, now = new Date()): boolean {
  return now.getTime() - new Date(lastSentAt).getTime() >= OTP_RESEND_COOLDOWN_MS;
}
