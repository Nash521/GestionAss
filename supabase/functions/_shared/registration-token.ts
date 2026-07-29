export const REGISTRATION_TOKEN_EXPIRY_MS = 10 * 60 * 1000;
const MAX_REGISTRATION_TOKEN_LENGTH = 4_096;
const AES_GCM_IV_LENGTH = 12;

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

async function encryptionKey(secret: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
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
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH));
  const plaintext = encoder.encode(JSON.stringify({ ...input, expiresAt: now + REGISTRATION_TOKEN_EXPIRY_MS }));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    await encryptionKey(secret),
    plaintext,
  ));
  const encrypted = new Uint8Array(iv.length + ciphertext.length);
  encrypted.set(iv);
  encrypted.set(ciphertext, iv.length);
  const encodedEncrypted = encodeBase64Url(encrypted);
  return `${encodedEncrypted}.${encodeBase64Url(await sign(encodedEncrypted, secret))}`;
}

export async function verifyRegistrationToken(
  token: string,
  secret: string,
): Promise<RegistrationTokenPayload | null> {
  if (token.length > MAX_REGISTRATION_TOKEN_LENGTH) return null;
  const segments = token.split(".");
  if (segments.length !== 2) return null;
  const [encodedEncrypted, encodedSignature] = segments;
  if (!encodedEncrypted || !encodedSignature) return null;

  const signature = decodeBase64Url(encodedSignature);
  if (signature === null || signature.length !== 32) return null;
  if (!timingSafeEqual(await sign(encodedEncrypted, secret), signature)) return null;

  const encrypted = decodeBase64Url(encodedEncrypted);
  if (encrypted === null || encrypted.length <= AES_GCM_IV_LENGTH) return null;
  const iv = encrypted.slice(0, AES_GCM_IV_LENGTH);
  const ciphertext = encrypted.slice(AES_GCM_IV_LENGTH);

  try {
    const payloadBytes = new Uint8Array(await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource },
      await encryptionKey(secret),
      ciphertext as unknown as BufferSource,
    ));
    const payload = JSON.parse(decoder.decode(payloadBytes));
    return isPayload(payload) && payload.expiresAt > Date.now() ? payload : null;
  } catch {
    return null;
  }
}
