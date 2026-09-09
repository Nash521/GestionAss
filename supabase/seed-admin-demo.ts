import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const DEMO_ADMIN = {
  organization: "Association Démo GestionAss",
  phone: "+2250701020304",
  password: "Teste01@",
};

export function isLocalSupabaseUrl(url: string) {
  try {
    const hostname = new URL(url).hostname;
    return hostname === "127.0.0.1" || hostname === "localhost";
  } catch {
    return false;
  }
}

export function demoOrganizationUpdate(
  membershipFeeAmount: number | null | undefined,
) {
  return membershipFeeAmount == null ? { membership_fee_amount: 1000 } : null;
}

export async function seedDemoAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey || !isLocalSupabaseUrl(url)) {
    throw new Error("This seed only runs against local Supabase.");
  }

  const database = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  let { data: organization, error: organizationError } = await database.from(
    "organizations",
  ).select("id, membership_fee_amount").eq("name", DEMO_ADMIN.organization)
    .maybeSingle();
  if (organizationError) throw organizationError;
  if (!organization) {
    const created = await database.from("organizations").insert({
      name: DEMO_ADMIN.organization,
      membership_fee_amount: 1000,
    }).select("id, membership_fee_amount").single();
    if (created.error || !created.data) {
      throw created.error ?? new Error("Unable to create demo organisation.");
    }
    organization = created.data;
  } else {
    const update = demoOrganizationUpdate(organization.membership_fee_amount);
    if (update) {
      const { error } = await database.from("organizations").update(update).eq(
        "id",
        organization.id,
      );
      if (error) throw error;
    }
  }
  if (!organization) throw new Error("Unable to create demo organisation.");

  const { data: listed, error: listError } = await database.auth.admin
    .listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  let user = listed.users.find((candidate) =>
    candidate.phone === DEMO_ADMIN.phone
  );
  if (!user) {
    const created = await database.auth.admin.createUser({
      phone: DEMO_ADMIN.phone,
      password: DEMO_ADMIN.password,
      phone_confirm: true,
    });
    if (created.error || !created.data.user) {
      throw created.error ?? new Error("Unable to create demo admin.");
    }
    user = created.data.user;
  } else {
    const { error } = await database.auth.admin.updateUserById(user.id, {
      password: DEMO_ADMIN.password,
      phone_confirm: true,
    });
    if (error) throw error;
  }

  const { error: accountError } = await database.from("users").upsert({
    id: user.id,
    organization_id: organization.id,
    role: "admin",
    is_active: true,
  });
  if (accountError) throw accountError;
  return { organization: DEMO_ADMIN.organization, phone: DEMO_ADMIN.phone };
}

if (import.meta.main) {
  seedDemoAdmin().then(({ organization, phone }) =>
    console.log(`Demo admin ready for ${organization}: ${phone}`)
  );
}
