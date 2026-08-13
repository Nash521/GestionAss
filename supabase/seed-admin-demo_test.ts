import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  demoOrganizationUpdate,
  isLocalSupabaseUrl,
} from "./seed-admin-demo.ts";

Deno.test("seed rejects a non-local Supabase URL", () => {
  assertEquals(isLocalSupabaseUrl("https://project.supabase.co"), false);
  assertEquals(isLocalSupabaseUrl("http://127.0.0.1:54321"), true);
});

Deno.test("seed supplies the default membership fee only when it is absent", () => {
  assertEquals(demoOrganizationUpdate(null), { membership_fee_amount: 1000 });
  assertEquals(demoOrganizationUpdate(undefined), {
    membership_fee_amount: 1000,
  });
  assertEquals(demoOrganizationUpdate(0), null);
  assertEquals(demoOrganizationUpdate(2500), null);
});
