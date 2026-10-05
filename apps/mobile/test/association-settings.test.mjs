import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateAssociationSettings } from '../src/features/admin-configuration/association.ts';

test('association settings normalize contact details and reject invalid input', () => {
  assert.deepEqual(validateAssociationSettings({ name: '  Mon Association  ', address: '  Abidjan  ', phone: ' 07 01 02 03 04 ', email: ' ADMIN@example.ci ', logoPath: null }), {
    name: 'Mon Association', address: 'Abidjan', phone: '+2250701020304', email: 'ADMIN@example.ci', logoPath: null,
  });
  assert.throws(() => validateAssociationSettings({ name: ' ', address: '', phone: '', email: '', logoPath: null }), /nom/i);
  assert.throws(() => validateAssociationSettings({ name: 'Test', address: '', phone: '123', email: '', logoPath: null }), /téléphone/i);
  assert.throws(() => validateAssociationSettings({ name: 'Test', address: '', phone: '', email: 'bad', logoPath: null }), /e-mail/i);
});

test('administrator settings expose editable association details and logo upload', async () => {
  const screen = await readFile(new URL('../app/(admin)/settings/finance.tsx', import.meta.url), 'utf8');
  assert.match(screen, /Informations de l’association/);
  assert.match(screen, /Choisir un logo/);
  for (const label of ['Nom', 'Adresse', 'Téléphone', 'E-mail']) assert.match(screen, new RegExp(label));
  assert.match(screen, /saveAssociationSettings/);
});
