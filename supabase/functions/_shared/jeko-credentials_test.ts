import { decryptJekoSecret, encryptJekoSecret } from "./jeko-credentials.ts";
Deno.test("Jèko credentials are encrypted with an organization-bound random nonce", async () => {
  const master = btoa("a".repeat(32));
  const first = await encryptJekoSecret("secret-value", master, "organization-a");
  const second = await encryptJekoSecret("secret-value", master, "organization-a");
  if (await decryptJekoSecret(first, master, "organization-a") !== "secret-value") throw new Error("Unable to decrypt");
  let crossTenantRejected = false;
  try { await decryptJekoSecret(first, master, "organization-b"); } catch { crossTenantRejected = true; }
  if (!crossTenantRejected) throw new Error("Cross-organization decryption accepted");
  if (first === second || first.includes("secret-value")) throw new Error("Secret was not encrypted randomly");
  const raw = Uint8Array.from(atob(first), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("a".repeat(32)), "AES-GCM", false, ["decrypt"]);
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(0, 12), additionalData: new TextEncoder().encode("organization-a") }, key, raw.slice(12));
  if (new TextDecoder().decode(clear) !== "secret-value") throw new Error("Could not decrypt");
  let rejected = false;
  try { await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(0, 12), additionalData: new TextEncoder().encode("organization-b") }, key, raw.slice(12)); } catch { rejected = true; }
  if (!rejected) throw new Error("Wrong organization accepted");
});
