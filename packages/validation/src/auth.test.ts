import { describe, expect, it } from "vitest";

import { normalizeIvorianPhone, signUpSchema } from "./auth";

describe("normalizeIvorianPhone", () => {
  it("normalizes a local mobile number", () => {
    expect(normalizeIvorianPhone("07 01 02 03 04")).toBe("+2250701020304");
  });

  it("normalizes a number with the +225 prefix", () => {
    expect(normalizeIvorianPhone("+225 07 01 02 03 04")).toBe(
      "+2250701020304",
    );
  });

  it.each([
    "+221770102030",
    "2250701020304",
    "+2252250701020304",
    "070102030",
    "07010203040",
    "0801020304",
    "abc07 01 02 03 04",
    "07😀01 02 03 04",
  ])("rejects malformed or unsupported phone input: %s", (phone) => {
    expect(() => normalizeIvorianPhone(phone)).toThrow(
      "Numéro ivoirien invalide",
    );
  });
});

describe("signUpSchema", () => {
  it("normalizes the phone number for a valid request", () => {
    const result = signUpSchema.parse({
      firstName: "Awa",
      lastName: "Koné",
      phone: "07 01 02 03 04",
      password: "Password1!",
    });

    expect(result.phone).toBe("+2250701020304");
  });

  it.each(["Short1!", "lowercase1!", "NoDigits!", "NoSpecial1"])(
    "rejects a password that does not meet the policy: %s",
    (password) => {
      expect(
        signUpSchema.safeParse({
          firstName: "Awa",
          lastName: "Koné",
          phone: "0701020304",
          password,
        }).success,
      ).toBe(false);
    },
  );

  it("reports every violated password rule", () => {
    const result = signUpSchema.safeParse({
      firstName: "Awa",
      lastName: "Koné",
      phone: "0701020304",
      password: "short",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toEqual([
        "Le mot de passe doit contenir au moins 8 caractères.",
        "Le mot de passe doit contenir une majuscule.",
        "Le mot de passe doit contenir un chiffre.",
        "Le mot de passe doit contenir un caractère spécial.",
      ]);
    }
  });

  it("reports malformed phone input as a Zod validation error", () => {
    const result = signUpSchema.safeParse({
      firstName: "Awa",
      lastName: "Koné",
      phone: "abc07 01 02 03 04",
      password: "Password1!",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.phone).toEqual([
        "Numéro ivoirien invalide",
      ]);
    }
  });

  it.each(["firstName", "lastName"] as const)(
    "requires a nonblank %s",
    (field) => {
      const result = signUpSchema.safeParse({
        firstName: "Awa",
        lastName: "Koné",
        phone: "0701020304",
        password: "Password1!",
        [field]: "   ",
      });

      expect(result.success).toBe(false);
    },
  );
});
