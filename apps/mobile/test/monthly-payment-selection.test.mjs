import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyPaymentSelection } from '../src/features/members/monthly-payment-selection.ts';

test('1500 XOF split into three payments offers only 500, 1000 or 1500 XOF', () => {
  const selection = monthlyPaymentSelection({ amountDue: 1500, amountPaid: 0, amountRemaining: 1500, paymentCount: 0, maxPayments: 3 });
  assert.deepEqual(selection.options.map((option) => option.amount), [500, 1000, 1500]);
  assert.deepEqual(selection.options.map((option) => option.targetPaid), [500, 1000, 1500]);
  assert.equal(selection.suggestedAmount, 500);
});

test('already paid installments disappear and the last allowed payment settles the balance', () => {
  const onePaid = monthlyPaymentSelection({ amountDue: 1500, amountPaid: 500, amountRemaining: 1000, paymentCount: 1, maxPayments: 3 });
  assert.deepEqual(onePaid.options.map((option) => option.amount), [500, 1000]);
  assert.equal(onePaid.paidFraction, 1 / 3);
  const lastSlot = monthlyPaymentSelection({ amountDue: 1500, amountPaid: 1000, amountRemaining: 500, paymentCount: 2, maxPayments: 3 });
  assert.deepEqual(lastSlot.options.map((option) => option.amount), [500]);
  assert.equal(lastSlot.mustSettle, true);
});

test('indivisible totals round each cumulative marker to whole XOF', () => {
  const selection = monthlyPaymentSelection({ amountDue: 1000, amountPaid: 0, amountRemaining: 1000, paymentCount: 0, maxPayments: 3 });
  assert.deepEqual(selection.options.map((option) => option.targetPaid), [333, 667, 1000]);
  const onePaid = monthlyPaymentSelection({ amountDue: 1000, amountPaid: 333, amountRemaining: 667, paymentCount: 1, maxPayments: 3 });
  assert.deepEqual(onePaid.options.map((option) => option.amount), [334, 667]);
});

test('a legacy off-grid partial payment offers only its remaining balance', () => {
  const selection = monthlyPaymentSelection({ amountDue: 1000, amountPaid: 400, amountRemaining: 600, paymentCount: 1, maxPayments: 3 });
  assert.equal(selection.legacyBalanceOnly, true);
  assert.deepEqual(selection.options.map((option) => option.amount), [600]);
});

test('a settled month or exhausted payment limit cannot propose another payment', () => {
  assert.deepEqual(monthlyPaymentSelection({ amountDue: 1000, amountPaid: 1000, amountRemaining: 0, paymentCount: 2, maxPayments: 3 }).options, []);
  assert.deepEqual(monthlyPaymentSelection({ amountDue: 1000, amountPaid: 400, amountRemaining: 600, paymentCount: 3, maxPayments: 3 }).options, []);
});
