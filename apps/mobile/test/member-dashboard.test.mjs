import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMemberDashboard } from '../src/features/member-dashboard/model.ts';

const due = (month, amountDue, amountPaid) => ({
  id: month, month: `${month}-01`, dueDate: `${month}-28`, amountDue, amountPaid,
  amountRemaining: amountDue - amountPaid,
  status: amountPaid === amountDue ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid',
});

test('member dashboard totals stay within the selected civil year and count issued months', () => {
  const result = buildMemberDashboard({
    firstName: 'Awa', organizationName: 'Association Démo', monthlyRate: 1500,
    monthlyDues: [due('2025-12', 1000, 1000), due('2026-01', 1500, 1500), due('2026-02', 1500, 500), due('2026-03', 1500, 0)],
    exceptionalDues: [
      { id: 'old', label: 'Ancien', dueDate: '2025-12-31', amountDue: 800, amountPaid: 800 },
      { id: 'new', label: 'Solidarité', dueDate: '2026-06-10', amountDue: 2000, amountPaid: 1200 },
    ],
  }, 2026);
  assert.equal(result.totalPaid, 3200);
  assert.equal(result.totalDue, 6500);
  assert.equal(result.monthsPaid, 1);
  assert.equal(result.monthsUnsettled, 2);
  assert.equal(result.exceptionalPaid, 1200);
  assert.equal(result.annualGoal, 18000);
  assert.equal(result.annualPaid, 2000);
  assert.equal(result.percentage, 2000 / 18000 * 100);
});

test('member dashboard handles a year without dues without inventing paid months', () => {
  const result = buildMemberDashboard({ firstName: 'Awa', organizationName: 'Association Démo', monthlyRate: 0, monthlyDues: [], exceptionalDues: [] }, 2027);
  assert.equal(result.totalPaid, 0);
  assert.equal(result.totalDue, 0);
  assert.equal(result.monthsPaid, 0);
  assert.equal(result.monthsUnsettled, 0);
  assert.equal(result.percentage, 0);
});
