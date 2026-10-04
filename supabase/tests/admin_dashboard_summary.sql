begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(22);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'dashboard-admin@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'dashboard-paid@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'dashboard-unpaid@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'dashboard-other-admin@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'dashboard-other-member@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.organizations (id, name, membership_fee_amount, monthly_contribution_amount)
values ('72000000-0000-0000-0000-000000000001', 'Association tableau de bord', 1000, 1000),
       ('72000000-0000-0000-0000-000000000002', 'Association voisine tableau de bord', 1000, 7000);
insert into public.users (id, organization_id, role, is_active) values
  ('71000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'admin', true),
  ('71000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000001', 'member', true),
  ('71000000-0000-0000-0000-000000000003', '72000000-0000-0000-0000-000000000001', 'member', true),
  ('71000000-0000-0000-0000-000000000004', '72000000-0000-0000-0000-000000000002', 'admin', true),
  ('71000000-0000-0000-0000-000000000005', '72000000-0000-0000-0000-000000000002', 'member', true);
insert into public.members (id, organization_id, user_id, member_number, first_name, last_name, phone, status, created_by) values
  ('73000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000002', 'DASH-0001', 'Awa', 'Payée', '+2250700000201', 'active', '71000000-0000-0000-0000-000000000001'),
  ('73000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000003', 'DASH-0002', 'Yao', 'Impayé', '+2250700000202', 'active', '71000000-0000-0000-0000-000000000001'),
  ('73000000-0000-0000-0000-000000000003', '72000000-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000005', 'DASH-0003', 'Mariam', 'Voisine', '+2250700000203', 'active', '71000000-0000-0000-0000-000000000004');
insert into public.membership_fees (member_id, amount_due, amount_paid, remaining_amount, status) values
  ('73000000-0000-0000-0000-000000000001', 1000, 1000, 0, 'paid'),
  ('73000000-0000-0000-0000-000000000002', 1000, 0, 1000, 'unpaid'),
  ('73000000-0000-0000-0000-000000000003', 1000, 1000, 0, 'paid');
insert into public.monthly_contribution_dues (member_id, contribution_month, due_date, amount_due, amount_paid, remaining_amount, status) values
  ('73000000-0000-0000-0000-000000000001', date_trunc('month', current_date - interval '1 month')::date, (date_trunc('month', current_date - interval '1 month')::date + 14), 1000, 400, 600, 'partial'),
  ('73000000-0000-0000-0000-000000000002', date_trunc('month', current_date)::date, date_trunc('month', current_date)::date + 27, 1000, 0, 1000, 'unpaid'),
  ('73000000-0000-0000-0000-000000000003', date_trunc('month', current_date)::date, date_trunc('month', current_date)::date + 27, 7000, 0, 7000, 'unpaid');
insert into public.exceptional_contributions (id, organization_id, label, amount, due_date, created_by) values
  ('74000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'Urgence test', 5000, current_date + 30, '71000000-0000-0000-0000-000000000001'),
  ('74000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002', 'Autre urgence', 9000, current_date + 30, '71000000-0000-0000-0000-000000000004');
insert into public.exceptional_contribution_dues (exceptional_contribution_id, member_id, amount_due, amount_paid, remaining_amount, status) values
  ('74000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', 5000, 2000, 3000, 'partial'),
  ('74000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000002', 5000, 0, 5000, 'unpaid'),
  ('74000000-0000-0000-0000-000000000002', '73000000-0000-0000-0000-000000000003', 9000, 0, 9000, 'unpaid');
insert into public.disbursements (organization_id, label, amount, disbursed_on, created_by, disbursement_type, justification)
values ('72000000-0000-0000-0000-000000000001', 'Frais test', 300, current_date, '71000000-0000-0000-0000-000000000001', 'general_expense', 'Test'),
       ('72000000-0000-0000-0000-000000000002', 'Frais voisin', 900, current_date, '71000000-0000-0000-0000-000000000004', 'general_expense', 'Test');
insert into public.contribution_payments (organization_id, monthly_contribution_due_id, amount, payment_source, paid_on, recorded_by, created_at)
select m.organization_id, d.id, 400, 'manual', (date_trunc('month', current_date - interval '1 month')::date + 10), '71000000-0000-0000-0000-000000000001', now() + interval '1 second'
from public.monthly_contribution_dues d join public.members m on m.id = d.member_id
where d.member_id = '73000000-0000-0000-0000-000000000001';
insert into public.contribution_payments (organization_id, monthly_contribution_due_id, amount, payment_source, paid_on, recorded_by)
select m.organization_id, d.id, 7000, 'manual', current_date, '71000000-0000-0000-0000-000000000004'
from public.monthly_contribution_dues d join public.members m on m.id = d.member_id
where d.member_id = '73000000-0000-0000-0000-000000000003';

select is(public.get_admin_dashboard_summary('71000000-0000-0000-0000-000000000001')->>'organizationName', 'Association tableau de bord', 'dashboard identifies the admin organization');
select is((public.get_admin_dashboard_summary('71000000-0000-0000-0000-000000000001')->>'totalMembers')::integer, 1, 'only paid membership fees count as members');
select is((public.get_admin_dashboard_summary('71000000-0000-0000-0000-000000000001')->>'membersLate')::integer, 1, 'paid members with overdue monthly dues count as late');
select is((public.get_admin_dashboard_summary('71000000-0000-0000-0000-000000000001')->>'membersPaid')::integer, 0, 'late member is not current');
select is((public.get_admin_dashboard_summary('71000000-0000-0000-0000-000000000001')->>'totalMonthlyOutstanding')::numeric, 1600::numeric, 'monthly outstanding includes issued dues even before the membership fee is paid');
select is((public.get_admin_dashboard_summary('71000000-0000-0000-0000-000000000001')->>'totalExceptionalOutstanding')::numeric, 8000::numeric, 'exceptional outstanding includes every selected recipient');
select is((public.get_admin_dashboard_summary('71000000-0000-0000-0000-000000000001')->>'totalCash')::numeric, 3100::numeric, 'cash includes actual receipts from all contribution types less expenses');
select is((public.get_admin_dashboard_summary('71000000-0000-0000-0000-000000000001')->>'totalExpenses')::numeric, 300::numeric, 'expenses remain scoped to the organization');
select is(jsonb_array_length(public.get_admin_dashboard_summary('71000000-0000-0000-0000-000000000001')->'contributionChart'), 6, 'dashboard chart covers six months');
select is((public.get_admin_dashboard_summary('71000000-0000-0000-0000-000000000001')->'contributionChart'->4->>'expected')::numeric, 1000::numeric, 'previous month expected amount includes issued monthly dues');
select is((public.get_admin_dashboard_summary('71000000-0000-0000-0000-000000000001')->'contributionChart'->4->>'collected')::numeric, 400::numeric, 'previous month collected amount uses actual monthly payments');
select is((public.get_admin_dashboard_summary('71000000-0000-0000-0000-000000000001')->'contributionChart'->5->>'collected')::numeric, 0::numeric, 'current month excludes receipts of another organization');
select is(jsonb_array_length(public.get_admin_dashboard_summary('71000000-0000-0000-0000-000000000001')->'recentTransactions'), 2, 'recent transactions include only this organization');
select is((public.get_admin_dashboard_summary('71000000-0000-0000-0000-000000000001')->'recentTransactions'->0->>'kind'), 'monthly', 'monthly payment is included');
select is((public.get_admin_dashboard_summary('71000000-0000-0000-0000-000000000001')->'recentTransactions'->0->>'memberName'), 'Awa Payée', 'payment identifies its member');
select is((public.get_admin_dashboard_summary('71000000-0000-0000-0000-000000000001')->'recentTransactions'->1->>'kind'), 'expense', 'disbursement is included');
insert into public.contribution_payments (organization_id, membership_fee_id, amount, payment_source, paid_on, recorded_by, created_at)
select m.organization_id, f.id, 1000, 'manual', current_date, '71000000-0000-0000-0000-000000000001', now() + interval '2 seconds'
from public.membership_fees f join public.members m on m.id = f.member_id
where m.id = '73000000-0000-0000-0000-000000000001';
insert into public.contribution_payments (organization_id, exceptional_contribution_due_id, amount, payment_source, paid_on, recorded_by, created_at)
select c.organization_id, d.id, 2000, 'manual', current_date, '71000000-0000-0000-0000-000000000001', now() + interval '3 seconds'
from public.exceptional_contribution_dues d join public.exceptional_contributions c on c.id = d.exceptional_contribution_id
where d.member_id = '73000000-0000-0000-0000-000000000001';
select ok(exists(select 1 from jsonb_array_elements(public.get_admin_dashboard_summary('71000000-0000-0000-0000-000000000001')->'recentTransactions') t where t->>'kind' = 'membership'), 'membership fee receipt is included');
select ok(exists(select 1 from jsonb_array_elements(public.get_admin_dashboard_summary('71000000-0000-0000-0000-000000000001')->'recentTransactions') t where t->>'kind' = 'exceptional'), 'exceptional contribution receipt is included');
insert into public.disbursements (organization_id, label, amount, disbursed_on, created_by, disbursement_type, justification, created_at)
select '72000000-0000-0000-0000-000000000001', 'Dépense ' || n, 10, current_date,
  '71000000-0000-0000-0000-000000000001', 'general_expense', 'Test', now() + ((n + 10) || ' seconds')::interval
from generate_series(1, 6) as n;
select is(jsonb_array_length(public.get_admin_dashboard_summary('71000000-0000-0000-0000-000000000001')->'recentTransactions'), 5, 'recent transaction list is limited to five');
select is((public.get_admin_dashboard_summary('71000000-0000-0000-0000-000000000001')->'recentTransactions'->0->>'label'), 'Dépense 6', 'most recently recorded transaction is first');
select is((public.get_admin_dashboard_summary('71000000-0000-0000-0000-000000000001')->'recentTransactions'->4->>'label'), 'Dépense 2', 'only five most recent transactions remain');
select throws_ok($$ select public.get_admin_dashboard_summary('71000000-0000-0000-0000-000000000003') $$, 'Unauthorized', 'member cannot request an admin dashboard');

select * from finish();
rollback;
