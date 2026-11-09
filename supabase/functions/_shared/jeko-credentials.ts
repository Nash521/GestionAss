/** Encrypt credentials using a server-only, randomly generated 32-byte key. */
export async function encryptJekoSecret(secret: string, masterKey: string, organizationId: string): Promise<string> {
  const raw = Uint8Array.from(atob(masterKey), (c) => c.charCodeAt(0));
  if (raw.length !== 32) throw new Error("Invalid encryption key");
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(organizationId) }, key, new TextEncoder().encode(secret)));
  return btoa(String.fromCharCode(...iv, ...ciphertext));
}

/** Decrypt only on the server; organization ID is authenticated as associated data. */
export async function decryptJekoSecret(encoded: string, masterKey: string, organizationId: string): Promise<string> {
  const raw = Uint8Array.from(atob(masterKey), (c) => c.charCodeAt(0));
  if (raw.length !== 32) throw new Error("Invalid encryption key");
  const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  if (bytes.length < 29) throw new Error("Invalid ciphertext");
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12), additionalData: new TextEncoder().encode(organizationId) }, key, bytes.slice(12));
  return new TextDecoder().decode(plain);
}
