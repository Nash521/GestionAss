begin;

select plan(17);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'monthly-history-admin@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'monthly-history-member@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'monthly-history-other-admin@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'monthly-history-other-member@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.organizations (id, name, membership_fee_amount, monthly_contribution_amount, monthly_contribution_due_day)
values ('62000000-0000-0000-0000-000000000001', 'Organisation historique', 0, 1000, 15),
       ('62000000-0000-0000-0000-000000000002', 'Organisation voisine', 0, 1000, 15);
insert into public.users (id, organization_id, role, is_active) values
  ('61000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000001', 'admin', true),
  ('61000000-0000-0000-0000-000000000002', '62000000-0000-0000-0000-000000000001', 'member', true),
  ('61000000-0000-0000-0000-000000000003', '62000000-0000-0000-0000-000000000002', 'admin', true),
  ('61000000-0000-0000-0000-000000000004', '62000000-0000-0000-0000-000000000002', 'member', true);
insert into public.members (id, organization_id, user_id, member_number, first_name, last_name, phone, status, created_by)
values ('63000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000002', 'H-000001', 'Awa', 'Historique', '+2250700000101', 'active', '61000000-0000-0000-0000-000000000001'),
       ('63000000-0000-0000-0000-000000000002', '62000000-0000-0000-0000-000000000002', '61000000-0000-0000-0000-000000000004', 'H-000002', 'Benoit', 'Voisin', '+2250700000102', 'active', '61000000-0000-0000-0000-000000000003');

select public.generate_monthly_contribution_dues('61000000-0000-0000-0000-000000000001', '2026-03-01');
create temporary table history_due as select id from public.monthly_contribution_dues where member_id='63000000-0000-0000-0000-000000000001' and contribution_month='2026-03-01';
select public.record_contribution_payment('61000000-0000-0000-0000-000000000001', 'monthly', (select id from history_due), 400, '2026-03-10', 'HIST-001', 'manual');
select public.record_contribution_payment('61000000-0000-0000-0000-000000000001', 'monthly', (select id from history_due), 350, '2026-03-11', 'HIST-002', 'wave');
select public.record_contribution_payment('61000000-0000-0000-0000-000000000001', 'monthly', (select id from history_due), 250, '2026-03-12', 'HIST-003', 'manual');
select public.generate_monthly_contribution_dues('61000000-0000-0000-0000-000000000003', '2026-03-01');
create temporary table other_history_due as select id from public.monthly_contribution_dues where member_id='63000000-0000-0000-0000-000000000002' and contribution_month='2026-03-01';
select public.record_contribution_payment('61000000-0000-0000-0000-000000000003', 'monthly', (select id from other_history_due), 100, '2026-03-13', 'OTHER-001', 'wave');

select is((public.get_admin_finance('61000000-0000-0000-0000-000000000001', 'monthly', 0, 20)->'metadata'->>'total')::integer, 3, 'monthly total counts payment events, not due balances');
select is(jsonb_array_length(public.get_admin_finance('61000000-0000-0000-0000-000000000001', 'monthly', 0, 20)->'items'), 3, 'each payment is returned as a separate transaction');
select is((public.get_admin_finance('61000000-0000-0000-0000-000000000001', 'monthly', 0, 20)->'items'->0->>'amount')::numeric, 250::numeric, 'transaction amount is not the cumulative paid amount');
select is(public.get_admin_finance('61000000-0000-0000-0000-000000000001', 'monthly', 0, 20)->'items'->0->>'source', 'manual', 'the payment method is exposed');
select is(public.get_admin_finance('61000000-0000-0000-0000-000000000001', 'monthly', 0, 20)->'items'->0->>'statusAfterPayment', 'paid', 'the last historical event settles the due');
select is(public.get_admin_finance('61000000-0000-0000-0000-000000000001', 'monthly', 0, 20)->'items'->0->'remainingAfterPayment', 'null'::jsonb, 'a settled payment has no remaining balance');
select is(public.get_admin_finance('61000000-0000-0000-0000-000000000001', 'monthly', 0, 20)->'items'->1->>'statusAfterPayment', 'partial', 'an earlier event remains historically partial');
select is((public.get_admin_finance('61000000-0000-0000-0000-000000000001', 'monthly', 0, 20)->'items'->1->>'remainingAfterPayment')::numeric, 250::numeric, 'remaining balance is computed at the selected event');
select is(public.get_admin_finance('61000000-0000-0000-0000-000000000001', 'monthly', 0, 20)->'items'->1->>'source', 'wave', 'Wave remains distinguishable from cash payments');
select is(public.get_admin_finance('61000000-0000-0000-0000-000000000001', 'monthly', 0, 20)->'items'->2->>'statusAfterPayment', 'partial', 'the first event is historically partial');
select is((public.get_admin_finance('61000000-0000-0000-0000-000000000001', 'monthly', 0, 20)->'items'->2->>'remainingAfterPayment')::numeric, 600::numeric, 'first event has its correct historical remainder');
select is(public.get_admin_finance('61000000-0000-0000-0000-000000000001', 'monthly', 0, 20)->'items'->0->>'month', '2026-03-01', 'transaction includes the contribution month');
select is(public.get_admin_finance('61000000-0000-0000-0000-000000000001', 'monthly', 0, 20)->'items'->0->>'firstName', 'Awa', 'transaction includes the member identity');
select is(public.get_admin_finance('61000000-0000-0000-0000-000000000001', 'monthly', 0, 20)->'items'->0->>'paidOn', '2026-03-12', 'transaction includes its payment date');
select is(public.get_admin_finance('61000000-0000-0000-0000-000000000001', 'monthly', 0, 20)->'items'->0->>'id', (select id::text from public.contribution_payments where payment_reference='HIST-003'), 'latest payment appears first in descending order');
select is((public.get_admin_finance('61000000-0000-0000-0000-000000000001', 'monthly', 1, 1)->'items'->0->>'amount')::numeric, 350::numeric, 'monthly history applies offset and limit to transaction rows');
select ok(not (public.get_admin_finance('61000000-0000-0000-0000-000000000001', 'monthly', 0, 20)->'items' @> jsonb_build_array(jsonb_build_object('memberId', '63000000-0000-0000-0000-000000000002'))), 'monthly payment history is isolated from another organization');

select * from finish();
rollback;
