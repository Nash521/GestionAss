import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isLocalSupabaseUrl } from "./seed-admin-demo.ts";

Deno.test("seed rejects a non-local Supabase URL", () => {
  assertEquals(isLocalSupabaseUrl("https://project.supabase.co"), false);
  assertEquals(isLocalSupabaseUrl("http://127.0.0.1:54321"), true);
});
