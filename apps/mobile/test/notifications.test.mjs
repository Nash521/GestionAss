import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { notificationCopy } from '../src/features/notifications/format.ts';

test('payment notifications distinguish all three contribution types and partial payments', () => {
  const base = { amount: 500, memberName: 'Awa Traoré', dueLabel: null, remainingAmount: 0 };
  assert.match(notificationCopy({ ...base, kind: 'monthly' }, false).title, /mensualité/i);
  assert.match(notificationCopy({ ...base, kind: 'membership' }, false).title, /adhésion/i);
  assert.match(notificationCopy({ ...base, kind: 'exceptional', dueLabel: 'Solidarité' }, false).title, /Solidarité/);
  assert.match(notificationCopy({ ...base, kind: 'monthly', remainingAmount: 1000 }, true).body, /500/);
  assert.match(notificationCopy({ ...base, kind: 'monthly' }, true).body, /vous/i);
});

test('new exceptional contribution announcement includes the amount and deadline', () => {
  const copy = notificationCopy({ eventType: 'exceptional_created', kind: 'exceptional', memberName: 'Awa', dueLabel: 'Solidarité', dueDate: '2026-11-15', amount: 5000, remainingAmount: 5000 }, true);
  assert.match(copy.title, /Solidarité/);
  assert.match(copy.body, /5\s?000/);
  assert.match(copy.body, /15 nov/);
});

test('notifications are built from recorded payments, isolated per recipient, and accessible in the app', async () => {
  const migration = await readFile(new URL('../../../supabase/migrations/202610020006_payment_notifications.sql', import.meta.url), 'utf8');
  const page = await readFile(new URL('../app/notifications.tsx', import.meta.url), 'utf8');
  const chrome = await readFile(new URL('../src/components/admin-chrome.tsx', import.meta.url), 'utf8');
  assert.match(migration, /after insert on public\.contribution_payments/i);
  assert.match(migration, /recipient_id = auth\.uid\(\)/i);
  assert.match(migration, /unique \(payment_id, recipient_id\)/i);
  assert.match(page, /markNotificationRead/);
  assert.match(chrome, /accessibilityLabel="Notifications"/);
});
