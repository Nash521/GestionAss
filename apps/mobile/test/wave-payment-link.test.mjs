import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { monthlyWaveLinkForPayment, normalizeWavePaymentLink, waveMerchantId, wavePaymentLinkAmount } from '../src/features/admin-configuration/wave.ts';

test('Wave payment link accepts only official merchant links', () => {
  assert.equal(normalizeWavePaymentLink('  https://pay.wave.com/m/ASSOCIATION_1  '), 'https://pay.wave.com/m/ASSOCIATION_1');
  assert.equal(normalizeWavePaymentLink('https://pay.wave.com/mqr/ASSOCIATION-1'), 'https://pay.wave.com/mqr/ASSOCIATION-1');
  const countryLink = 'https://pay.wave.com/m/M_ci_XpqzXnuWpPqy/c/ci/?amount=1000';
  assert.equal(normalizeWavePaymentLink(countryLink), countryLink);
  assert.equal(wavePaymentLinkAmount(countryLink), 1000);
  assert.equal(waveMerchantId(countryLink), 'M_ci_XpqzXnuWpPqy');
  assert.equal(waveMerchantId('https://pay.wave.com/mqr/M_ci_XpqzXnuWpPqy?amount=2500'), 'M_ci_XpqzXnuWpPqy');
  assert.equal(normalizeWavePaymentLink('  '), null);
  for (const value of ['http://pay.wave.com/m/test', 'https://pay.wave.com.evil.test/m/test', 'https://other.test/m/test', 'https://pay.wave.com@evil.test/m/test', 'https://pay.wave.com/m/test?redirect=https://evil.test', 'https://pay.wave.com/m/test#fragment', 'https://pay.wave.com:444/m/test', 'https://pay.wave.com/m/test?amount=1000&redirect=evil', 'https://pay.wave.com/m/test?amount=0']) {
    assert.throws(() => normalizeWavePaymentLink(value), /Wave/i);
  }
});

test('monthly amount selects the matching fixed Wave link', () => {
  const links = { fullUrl: 'https://pay.wave.com/m/full?amount=5000', halfUrl: 'https://pay.wave.com/m/half?amount=2500' };
  assert.equal(monthlyWaveLinkForPayment(links, 5000, 0, 5000), links.fullUrl);
  assert.equal(monthlyWaveLinkForPayment(links, 5000, 0, 2500), links.halfUrl);
  assert.equal(monthlyWaveLinkForPayment(links, 5000, 2500, 2500), links.halfUrl);
  assert.equal(monthlyWaveLinkForPayment(links, 5001, 0, 2500), null);
  assert.equal(monthlyWaveLinkForPayment(links, 5000, 0, 1000), null);
  assert.equal(monthlyWaveLinkForPayment({ ...links, halfUrl: 'https://pay.wave.com/m/half?amount=1000' }, 5000, 0, 2500), null);
});

test('finance settings configure fixed Wave links instead of merchant API credentials', async () => {
  const screen = await readFile(new URL('../app/(admin)/settings/finance.tsx', import.meta.url), 'utf8');
  assert.match(screen, /updateAdminWaveMonthlyLinks/);
  assert.match(screen, /Lien mensualité complète/);
  assert.match(screen, /Lien demi-mensualité/);
  assert.doesNotMatch(screen, /savePaymentProviderKey|Clé API/);
});
