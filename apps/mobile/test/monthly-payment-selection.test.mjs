import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyPaymentSelection } from '../src/features/members/monthly-payment-selection.ts';

test('two payments place the half and full balance at the only two markers', () => {
  const selection = monthlyPaymentSelection({ amountDue: 5000, amountPaid: 0, amountRemaining: 5000, paymentCount: 0, maxPayments: 2 });
  assert.deepEqual(selection.markers.map((marker) => marker.targetPaid), [2500, 5000]);
  assert.deepEqual(selection.options.map((option) => option.amount), [2500, 5000]);
  assert.equal(selection.suggestedAmount, 2500);
});

test('the second and final payment must settle the balance', () => {
  const selection = monthlyPaymentSelection({ amountDue: 5000, amountPaid: 2500, amountRemaining: 2500, paymentCount: 1, maxPayments: 2 });
  assert.deepEqual(selection.options.map((option) => option.amount), [2500]);
  assert.equal(selection.paidFraction, 0.5);
  assert.equal(selection.mustSettle, true);
});

test('one-payment setting offers only the full balance', () => {
  const selection = monthlyPaymentSelection({ amountDue: 5000, amountPaid: 0, amountRemaining: 5000, paymentCount: 0, maxPayments: 1 });
  assert.deepEqual(selection.markers.map((marker) => marker.targetPaid), [5000]);
  assert.deepEqual(selection.options.map((option) => option.amount), [5000]);
});

test('odd totals round the half marker to a whole XOF', () => {
  const selection = monthlyPaymentSelection({ amountDue: 1001, amountPaid: 0, amountRemaining: 1001, paymentCount: 0, maxPayments: 2 });
  assert.deepEqual(selection.markers.map((marker) => marker.targetPaid), [501, 1001]);
  const remaining = monthlyPaymentSelection({ amountDue: 1001, amountPaid: 501, amountRemaining: 500, paymentCount: 1, maxPayments: 2 });
  assert.deepEqual(remaining.options.map((option) => option.amount), [500]);
});

test('an older off-grid partial payment can only settle its remaining balance', () => {
  const selection = monthlyPaymentSelection({ amountDue: 1000, amountPaid: 400, amountRemaining: 600, paymentCount: 1, maxPayments: 2 });
  assert.equal(selection.legacyBalanceOnly, true);
  assert.deepEqual(selection.options.map((option) => option.amount), [600]);
});

test('settled or historically over-limit dues cannot offer another payment', () => {
  assert.deepEqual(monthlyPaymentSelection({ amountDue: 1000, amountPaid: 1000, amountRemaining: 0, paymentCount: 2, maxPayments: 2 }).options, []);
  assert.deepEqual(monthlyPaymentSelection({ amountDue: 1000, amountPaid: 400, amountRemaining: 600, paymentCount: 3, maxPayments: 2 }).options, []);
});
