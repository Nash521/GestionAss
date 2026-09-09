import { z } from "zod";

const invalidIvorianPhoneMessage = "Numéro ivoirien invalide";

export function normalizeIvorianPhone(value: string): string {
  const phoneFormat = /^(?:0[157](?: ?\d{2}){4}|\+225 ?0[157](?: ?\d{2}){4})$/;

  if (!phoneFormat.test(value)) {
    throw new Error(invalidIvorianPhoneMessage);
  }

  const localNumber = value.replace("+225", "").replace(/ /g, "");
  return `+225${localNumber}`;
}

export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .regex(/[a-z]/, "Le mot de passe doit contenir une minuscule.")
  .regex(/[A-Z]/, "Le mot de passe doit contenir une majuscule.")
  .regex(/\d/, "Le mot de passe doit contenir un chiffre.")
  .regex(/[^A-Za-z0-9]/, "Le mot de passe doit contenir un caractère spécial.");

const ivorianPhoneSchema = z.string().transform((value, context) => {
  try {
    return normalizeIvorianPhone(value);
  } catch {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: invalidIvorianPhoneMessage,
    });
    return z.NEVER;
  }
});

export const signUpSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: ivorianPhoneSchema,
  password: passwordSchema,
});
