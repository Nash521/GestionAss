import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const cli = resolve(root, "node_modules/supabase/dist/supabase.js");
const status = JSON.parse(execFileSync(process.execPath, [cli, "status", "--output", "json"], {
  cwd: root,
  encoding: "utf8",
}));
const url = new URL(status.API_URL);
if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
  throw new Error("Ce script est réservé à Supabase local.");
}
if (!status.SERVICE_ROLE_KEY || !status.ANON_KEY) {
  throw new Error("Les clés de Supabase local sont indisponibles.");
}

const password = process.env.SEED_DEMO_PASSWORD;
if (!password || password.length < 8) throw new Error("Définissez SEED_DEMO_PASSWORD (8 caractères minimum) pour créer les comptes locaux.");
const organizationName = "Association Démo GestionAss";
const accounts = [
  { role: "admin", firstName: "Admin", lastName: "Démo", phone: "+2250701020304" },
  { role: "admin", firstName: "Awa", lastName: "Koné", phone: "+2250701020305" },
  { role: "member", firstName: "Mariam", lastName: "Traoré", phone: "+2250701020311" },
  { role: "member", firstName: "Koffi", lastName: "Yao", phone: "+2250701020312" },
  { role: "member", firstName: "Fatou", lastName: "Coulibaly", phone: "+2250701020313" },
  { role: "member", firstName: "Jean", lastName: "Kouassi", phone: "+2250701020314" },
  { role: "member", firstName: "Aminata", lastName: "Diallo", phone: "+2250701020315" },
  { role: "member", firstName: "Yacouba", lastName: "Ouattara", phone: "+2250701020316" },
  { role: "member", firstName: "Nadia", lastName: "Bamba", phone: "+2250701020317" },
  { role: "member", firstName: "Serge", lastName: "N'Dri", phone: "+2250701020318" },
  { role: "member", firstName: "Estelle", lastName: "Kouamé", phone: "+2250701020319" },
  { role: "member", firstName: "Ibrahim", lastName: "Cissé", phone: "+2250701020320" },
];

const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let { data: organization, error: organizationError } = await admin.from("organizations")
  .select("id").eq("name", organizationName).maybeSingle();
if (organizationError) throw organizationError;
if (!organization) {
  const created = await admin.from("organizations")
    .insert({ name: organizationName, membership_fee_amount: 1000 })
    .select("id").single();
  if (created.error) throw created.error;
  organization = created.data;
}

const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listed.error) throw listed.error;
const authUsers = new Map(listed.data.users.map((user) => [user.phone?.replace(/^\+/, ""), user]));
let firstAdminId;
for (const account of accounts) {
  let user = authUsers.get(account.phone.replace(/^\+/, ""));
  let createdHere = false;
  if (user) {
    const existing = await admin.from("users")
      .select("organization_id,role").eq("id", user.id).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data && (existing.data.organization_id !== organization.id || existing.data.role !== account.role)) {
      throw new Error(`Le numéro ${account.phone} appartient déjà à un autre compte.`);
    }
  } else {
    const created = await admin.auth.admin.createUser({
      phone: account.phone,
      password,
      phone_confirm: true,
    });
    if (created.error || !created.data.user) throw created.error ?? new Error("Compte Auth non créé.");
    user = created.data.user;
    createdHere = true;
  }

  try {
    if (account === accounts[0]) {
      firstAdminId = user.id;
      const saved = await admin.from("users").upsert({
        id: user.id,
        organization_id: organization.id,
        role: "admin",
        is_active: true,
      });
      if (saved.error) throw saved.error;
    } else {
      const existing = await admin.from("users").select("id").eq("id", user.id).maybeSingle();
      if (existing.error) throw existing.error;
      if (!existing.data) {
        const provisioned = await admin.rpc("provision_admin_member", {
          admin_id: firstAdminId,
          new_user_id: user.id,
          first_name: account.firstName,
          last_name: account.lastName,
          phone: account.phone,
          requested_role: account.role,
        });
        if (provisioned.error) throw provisioned.error;
      }
    }
    if (!createdHere) {
      const updated = await admin.auth.admin.updateUserById(user.id, { password, phone_confirm: true });
      if (updated.error) throw updated.error;
    }
  } catch (error) {
    if (createdHere) await admin.auth.admin.deleteUser(user.id);
    throw error;
  }
}

const publicClient = createClient(status.API_URL, status.ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
for (const account of accounts) {
  const login = await publicClient.auth.signInWithPassword({ phone: account.phone, password });
  if (login.error || !login.data.session) {
    throw login.error ?? new Error(`Connexion impossible pour ${account.phone}.`);
  }
  const destination = await publicClient.functions.invoke("get-session-destination", { body: {} });
  if (destination.error || destination.data?.destination !== "active" || destination.data?.role !== account.role) {
    throw destination.error ?? new Error(`Compte ${account.phone} non actif dans l'application.`);
  }
}

console.log(`Comptes locaux prêts : ${accounts.filter((a) => a.role === "admin").length} administrateurs, ${accounts.filter((a) => a.role === "member").length} membres.`);
console.log(`Mot de passe commun : ${password}`);
for (const account of accounts) {
  console.log(`${account.role}\t${account.phone}\t${account.firstName} ${account.lastName}`);
}
