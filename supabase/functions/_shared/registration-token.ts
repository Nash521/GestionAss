export const REGISTRATION_TOKEN_EXPIRY_MS = 10 * 60 * 1000;

export type RegistrationTokenPurpose = "invite" | "otp";
export type RegistrationTokenPayload = {
  invitationId: string;
  phone: string;
  purpose: RegistrationTokenPurpose;
  expiresAt: number;
};

type RegistrationTokenInput = Omit<RegistrationTokenPayload, "expiresAt">;

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function encodeBase64Url(value: Uint8Array | string): string {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
    const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function sign(value: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

function isPayload(value: unknown): value is RegistrationTokenPayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  const expectedKeys = ["expiresAt", "invitationId", "phone", "purpose"];
  if (Object.keys(payload).sort().join(",") !== expectedKeys.join(",")) return false;
  return typeof payload.invitationId === "string" &&
    typeof payload.phone === "string" &&
    (payload.purpose === "invite" || payload.purpose === "otp") &&
    typeof payload.expiresAt === "number" && Number.isFinite(payload.expiresAt);
}

export async function issueRegistrationToken(
  input: RegistrationTokenInput,
  secret: string,
  now = Date.now(),
): Promise<string> {
  const payload = encodeBase64Url(JSON.stringify({ ...input, expiresAt: now + REGISTRATION_TOKEN_EXPIRY_MS }));
  return `${payload}.${encodeBase64Url(await sign(payload, secret))}`;
}

export async function verifyRegistrationToken(
  token: string,
  secret: string,
): Promise<RegistrationTokenPayload | null> {
  const segments = token.split(".");
  if (segments.length !== 2) return null;
  const [encodedPayload, encodedSignature] = segments;
  if (!encodedPayload || !encodedSignature) return null;

  const signature = decodeBase64Url(encodedSignature);
  if (signature === null || !timingSafeEqual(await sign(encodedPayload, secret), signature)) return null;

  const payloadBytes = decodeBase64Url(encodedPayload);
  if (payloadBytes === null) return null;
  try {
    const payload = JSON.parse(decoder.decode(payloadBytes));
    return isPayload(payload) && payload.expiresAt > Date.now() ? payload : null;
  } catch {
    return null;
  }
}
