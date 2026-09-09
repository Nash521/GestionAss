import { isStrongPassword } from "./password.ts";

Deno.test("isStrongPassword requires all four password rules", () => {
  const rejected = ["abcdefgh", "Abcdefgh", "Abcdefg1", "Abcdefg!"];
  for (const password of rejected) {
    if (isStrongPassword(password)) throw new Error(`accepted weak password: ${password}`);
  }
  if (!isStrongPassword("Motdepasse1!")) throw new Error("rejected a compliant password");
});
