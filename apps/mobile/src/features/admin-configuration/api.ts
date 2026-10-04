import { decode } from "base64-arraybuffer";
import { getSupabaseClient } from "../../lib/supabase-client";
import { validateLogoBytes, type AssociationConfiguration, type AssociationSettings } from "./association";
import { normalizeWavePaymentLink } from "./wave";

const bucket = "association-logos";

export async function getWavePaymentLink(): Promise<string | null> {
  const { data, error } = await getSupabaseClient().rpc("get_admin_wave_payment_link");
  if (error) throw error;
  return (data as { url?: string | null } | null)?.url ?? null;
}

export async function saveWavePaymentLink(value: string): Promise<string | null> {
  const url = normalizeWavePaymentLink(value);
  const { data, error } = await getSupabaseClient().rpc("update_admin_wave_payment_link", { payment_url: url } as never);
  if (error) throw error;
  return (data as { url?: string | null } | null)?.url ?? null;
}

export async function getAssociationSettings(): Promise<AssociationConfiguration> {
  const { data, error } = await getSupabaseClient().rpc("get_admin_association_settings");
  if (error || !data) throw error ?? new Error("Informations de l’association introuvables.");
  return data as AssociationConfiguration;
}

export async function saveAssociationSettings(settings: AssociationSettings): Promise<AssociationConfiguration> {
  const { data, error } = await getSupabaseClient().rpc("update_admin_association_settings", { settings } as never);
  if (error || !data) throw error ?? new Error("Impossible d’enregistrer l’association.");
  return data as AssociationConfiguration;
}

export async function getAssociationLogoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await getSupabaseClient().storage.from(bucket).createSignedUrl(path, 3600);
  if (error || !data) throw error ?? new Error("Impossible de charger le logo.");
  return data.signedUrl;
}

export async function uploadAssociationLogo(base64: string, mimeType: string, organizationId: string): Promise<{ path: string; url: string }> {
  if (!/^[a-f0-9-]{36}$/i.test(organizationId)) throw new Error("Association invalide.");
  if (base64.length > Math.ceil((5 * 1024 * 1024) / 3) * 4 + 4) throw new Error("Le logo doit faire au maximum 5 Mo.");
  const bytes = decode(base64);
  validateLogoBytes(new Uint8Array(bytes), mimeType);
  const extension = mimeType === "image/png" ? "png" : "jpg";
  const path = `${organizationId}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}.${extension}`;
  const storage = getSupabaseClient().storage.from(bucket);
  const { error } = await storage.upload(path, bytes, { contentType: mimeType, upsert: false });
  if (error) throw new Error("Impossible de téléverser le logo. Le précédent est conservé.");
  const url = await getAssociationLogoUrl(path);
  if (!url) throw new Error("Logo indisponible.");
  return { path, url };
}
