import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMemberContributionYear, isAnnualProgressVisible } from '../src/features/members/contribution-year.ts';

const due = (month, status, paid, dueDate = `${month}-28`) => ({
  id: month, month: `${month}-01`, dueDate, amountDue: 1000,
  amountPaid: paid, amountRemaining: 1000 - paid, status,
});

test('the civil-year calendar distinguishes paid, partial, late, upcoming and unissued months', () => {
  const result = buildMemberContributionYear([
    due('2026-01', 'paid', 1000),
    due('2026-02', 'partial', 400),
    due('2026-03', 'unpaid', 0),
    due('2026-10', 'unpaid', 0),
    due('2025-12', 'paid', 1000),
  ], 1000, 2026, '2026-10-01');

  assert.equal(result.months.length, 12);
  assert.deepEqual(result.months.map((month) => month.status), [
    'paid', 'partial', 'late', 'not_issued', 'not_issued', 'not_issued',
    'not_issued', 'not_issued', 'not_issued', 'upcoming', 'upcoming', 'upcoming',
  ]);
  assert.equal(result.annualGoal, 12000);
  assert.equal(result.paid, 1400);
  assert.equal(result.percentage, 1400 / 12000 * 100);
});

test('the annual progress remains finite when the association has no monthly target', () => {
  const result = buildMemberContributionYear([], 0, 2026, '2026-10-01');
  assert.equal(result.annualGoal, 0);
  assert.equal(result.percentage, 0);
  assert.equal(result.months.length, 12);
});

test('the annual animation starts only when its section enters the visible scroll area', () => {
  assert.equal(isAnnualProgressVisible(900, 600, 0), false);
  assert.equal(isAnnualProgressVisible(900, 600, 500), true);
  assert.equal(isAnnualProgressVisible(100, 600, 500), false);
  assert.equal(isAnnualProgressVisible(100, 600, 0), true);
});
