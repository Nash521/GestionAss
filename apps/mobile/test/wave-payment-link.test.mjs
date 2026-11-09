import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { normalizeWavePaymentLink } from '../src/features/admin-configuration/wave.ts';

test('Wave payment link accepts only official merchant links', () => {
  assert.equal(normalizeWavePaymentLink('  https://pay.wave.com/m/ASSOCIATION_1  '), 'https://pay.wave.com/m/ASSOCIATION_1');
  assert.equal(normalizeWavePaymentLink('https://pay.wave.com/mqr/ASSOCIATION-1'), 'https://pay.wave.com/mqr/ASSOCIATION-1');
  assert.equal(normalizeWavePaymentLink('  '), null);
  for (const value of ['http://pay.wave.com/m/test', 'https://pay.wave.com.evil.test/m/test', 'https://other.test/m/test', 'https://pay.wave.com@evil.test/m/test', 'https://pay.wave.com/m/test?redirect=https://evil.test', 'https://pay.wave.com/m/test#fragment', 'https://pay.wave.com:444/m/test']) {
    assert.throws(() => normalizeWavePaymentLink(value), /Wave/i);
  }
});

test('Wave settings expose the merchant link without implying payment confirmation', async () => {
  const screen = await readFile(new URL('../app/(admin)/settings/finance.tsx', import.meta.url), 'utf8');
  assert.match(screen, /Lien de paiement Wave Business/);
  assert.match(screen, /saveWavePaymentLink/);
  assert.match(screen, /ne confirme pas automatiquement/i);
});
