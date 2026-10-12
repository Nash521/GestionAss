import assert from "node:assert/strict";
import test from "node:test";

test("web login skips device-only biometric storage", async () => {
  const biometric = await import("../src/lib/biometric-session.web.ts");

  assert.equal(await biometric.canEnableBiometricLogin(), false);
  assert.equal(await biometric.isBiometricLoginEnabled(), false);
  assert.equal(await biometric.unlockWithBiometrics(), false);
  await assert.rejects(
    biometric.enableBiometricLogin({}),
    /Authentification biométrique indisponible/,
  );
  await biometric.clearBiometricLogin();
});
