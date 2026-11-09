/** Isolated, repeatable presentation data. NEVER point this script at hosted Supabase. */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ORG = "Association Présentation GestionAss";
const ADMIN_PHONE = "+2250701990000";
const PASSWORD = "Demo2026!";
const FIRST_NAMES = ["Awa", "Koffi", "Aïcha", "Adama", "Fatou", "Moussa", "Mariame", "Jean", "Aminata", "Yao"];
const LAST_NAMES = ["Koné", "Traoré", "Diallo", "Coulibaly", "Touré", "Kouassi", "Bamba", "Yao", "Soro", "Ouattara"];

export function localOnly(raw: string): boolean {
  try { const url = new URL(raw); return url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname); } catch { return false; }
}

export async function seedPresentation() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!localOnly(url) || !service) throw new Error("Ce script exige un Supabase local et une clé service locale.");
  const db = createClient(url, service, { auth: { persistSession: false } });
  const { data: orgs, error: orgError } = await db.from("organizations").select("id").eq("name", ORG).limit(1);
  if (orgError) throw orgError;
  let org = orgs?.[0];
  if (!org) {
    const { data, error } = await db.from("organizations").insert({ name: ORG, membership_fee_amount: 5000, monthly_contribution_amount: 3000, monthly_contribution_due_day: 1 }).select("id").single();
    if (error || !data) throw error ?? new Error("Impossible de créer l’association.");
    org = data;
  }
  const listed = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) throw listed.error;
  const users = listed.data.users;
  async function getOrCreate(phone: string) {
    const existing = users.find((u) => u.phone?.replace(/^\+/, "") === phone.slice(1));
    if (existing) {
      const { data, error } = await db.from("users").select("organization_id").eq("id", existing.id).maybeSingle();
      if (error) throw error;
      if (!data || data.organization_id !== org.id) throw new Error("Un numéro de démonstration appartient déjà à un autre compte.");
      return existing;
    }
    const { data, error } = await db.auth.admin.createUser({ phone, password: PASSWORD, phone_confirm: true });
    if (error || !data.user) throw error ?? new Error("Impossible de créer le compte.");
    users.push(data.user);
    return data.user;
  }
  const existingAdmin = users.find((u) => u.phone?.replace(/^\+/, "") === ADMIN_PHONE.slice(1));
  let admin;
  if (existingAdmin) admin = await getOrCreate(ADMIN_PHONE);
  else {
    const created = await db.auth.admin.createUser({ phone: ADMIN_PHONE, password: PASSWORD, phone_confirm: true });
    if (created.error || !created.data.user) throw created.error ?? new Error("Impossible de créer l’administrateur.");
    admin = created.data.user;
    const { error } = await db.from("users").insert({ id: admin.id, organization_id: org.id, role: "admin", is_active: true });
    if (error) throw error;
  }
  for (let i = 1; i <= 50; i++) {
    const phone = `+225070199${String(i).padStart(4, "0")}`;
    const existing = users.find((u) => u.phone?.replace(/^\+/, "") === phone.slice(1));
    if (existing) { await getOrCreate(phone); continue; }
    const created = await db.auth.admin.createUser({ phone, password: PASSWORD, phone_confirm: true });
    if (created.error || !created.data.user) throw created.error ?? new Error("Impossible de créer le membre.");
    users.push(created.data.user);
    const { error } = await db.rpc("provision_admin_member", { admin_id: admin.id, new_user_id: created.data.user.id, first_name: FIRST_NAMES[(i - 1) % FIRST_NAMES.length], last_name: LAST_NAMES[(i * 7 - 1) % LAST_NAMES.length], phone, requested_role: "member" });
    if (error) throw error;
  }
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth() + 1;
  for (let m = 1; m <= month; m++) {
    const date = `${year}-${String(m).padStart(2, "0")}-01`;
    const { error } = await db.rpc("generate_monthly_contribution_dues", { admin_id: admin.id, month_value: date });
    if (error) throw error;
  }
  const { data: members, error: membersError } = await db.from("members").select("id,member_number").eq("organization_id", org.id).order("member_number");
  if (membersError || !members) throw membersError ?? new Error("Membres introuvables.");
  const { data: dues, error: duesError } = await db.from("monthly_contribution_dues").select("id,member_id,contribution_month,remaining_amount").in("member_id", members.map((m) => m.id)).gte("contribution_month", `${year}-01-01`).lte("contribution_month", `${year}-${String(month).padStart(2, "0")}-01`).limit(1000);
  if (duesError || !dues) throw duesError ?? new Error("Mensualités introuvables.");
  const positions = new Map(members.map((m, i) => [m.id, i]));
  for (const due of dues) {
    if (Number(due.remaining_amount) !== 3000 || ((positions.get(due.member_id) ?? 0) + Number(due.contribution_month.slice(5, 7))) % 5 === 0) continue;
    const { error } = await db.rpc("record_contribution_payment", { admin_id: admin.id, due_kind: "monthly", due_id: due.id, payment_amount: 3000, payment_date: due.contribution_month, payment_reference_value: `DEMO-${due.id}`, payment_source_value: "manual" });
    if (error) throw error;
  }
  console.log(`Présentation prête : ${members.length} membres, année ${year}. Admin ${ADMIN_PHONE}, membre +2250701990001.`);
}
if (import.meta.main) await seedPresentation();
