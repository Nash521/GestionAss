export type PaymentProvider = "wave" | "orange_money" | "mtn_momo";
export const paymentProviders: PaymentProvider[] = ["wave", "orange_money", "mtn_momo"];

function encryptionKey(): Promise<CryptoKey> {
  const encoded = Deno.env.get("PAYMENT_CREDENTIAL_ENCRYPTION_KEY");
  if (!encoded) throw new Error("Payment encryption is not configured");
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0)); }
  catch { throw new Error("Invalid payment encryption key"); }
  if (bytes.length !== 32) throw new Error("Invalid payment encryption key");
  return crypto.subtle.importKey("raw", new Uint8Array(bytes).buffer, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const decode = (value: string) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
const associatedData = (organizationId: string, provider: PaymentProvider) => new TextEncoder().encode(`${organizationId}:${provider}`);

export async function encryptPaymentCredential(value: string, organizationId: string, provider: PaymentProvider): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: associatedData(organizationId, provider) }, await encryptionKey(), new TextEncoder().encode(value)));
  return `v1:${encode(iv)}:${encode(ciphertext)}`;
}

export async function decryptPaymentCredential(value: string, organizationId: string, provider: PaymentProvider): Promise<string> {
  const [version, iv, ciphertext] = value.split(":");
  if (version !== "v1" || !iv || !ciphertext) throw new Error("Invalid encrypted credential");
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(decode(iv)), additionalData: associatedData(organizationId, provider) }, await encryptionKey(), new Uint8Array(decode(ciphertext)).buffer);
  return new TextDecoder().decode(clear);
}
