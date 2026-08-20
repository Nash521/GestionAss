begin;

select plan(40);

select has_column('public', 'organizations', 'monthly_contribution_amount', 'organizations stores the monthly contribution amount');
select has_column('public', 'organizations', 'monthly_contribution_due_day', 'organizations stores the monthly contribution due day');
select has_table('public', 'contribution_payments', 'contribution payments ledger exists');
select has_function('public', 'generate_monthly_contribution_dues', array['uuid', 'date'], 'monthly due generation RPC exists');
select has_function('public', 'create_exceptional_contribution', array['uuid', 'text', 'numeric', 'date', 'uuid[]'], 'exceptional contribution RPC exists');
select has_function('public', 'record_contribution_payment', array['uuid', 'text', 'uuid', 'numeric', 'date', 'text', 'text'], 'contribution payment RPC exists');
select has_function('public', 'create_disbursement', array['uuid', 'text', 'numeric', 'date', 'text', 'uuid', 'uuid', 'text'], 'disbursement RPC exists');
select has_function('public', 'get_admin_finance', array['uuid', 'text', 'integer', 'integer'], 'admin finance RPC exists');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'finance-admin-one@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'finance-admin-two@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'finance-active-one@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'finance-active-two@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'finance-suspended@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'finance-other@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.organizations (id, name, membership_fee_amount, monthly_contribution_amount, monthly_contribution_due_day) values
  ('52000000-0000-0000-0000-000000000001', 'Organisation finance une', 0, 500, 15),
  ('52000000-0000-0000-0000-000000000002', 'Organisation finance deux', 0, 900, 20);

insert into public.users (id, organization_id, role, is_active) values
  ('51000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 'admin', true),
  ('51000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002', 'admin', true),
  ('51000000-0000-0000-0000-000000000003', '52000000-0000-0000-0000-000000000001', 'member', true),
  ('51000000-0000-0000-0000-000000000004', '52000000-0000-0000-0000-000000000001', 'member', true),
  ('51000000-0000-0000-0000-000000000005', '52000000-0000-0000-0000-000000000001', 'member', true),
  ('51000000-0000-0000-0000-000000000006', '52000000-0000-0000-0000-000000000002', 'member', true);

insert into public.members (id, organization_id, user_id, member_number, first_name, last_name, phone, status, created_by) values
  ('53000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000003', 'F-000001', 'Awa', 'Finance', '+2250700000101', 'active', '51000000-0000-0000-0000-000000000001'),
  ('53000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000004', 'F-000002', 'Benoit', 'Finance', '+2250700000102', 'active', '51000000-0000-0000-0000-000000000001'),
  ('53000000-0000-0000-0000-000000000003', '52000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000005', 'F-000003', 'Chloe', 'Finance', '+2250700000103', 'suspended', '51000000-0000-0000-0000-000000000001'),
  ('53000000-0000-0000-0000-000000000004', '52000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000006', 'F-000004', 'Djeneba', 'Externe', '+2250700000104', 'active', '51000000-0000-0000-0000-000000000002');

select public.generate_monthly_contribution_dues('51000000-0000-0000-0000-000000000001', '2026-03-01');
select is((select count(*) from public.monthly_contribution_dues where contribution_month = '2026-03-01'), 2::bigint, 'monthly generation creates dues only for active members');
select is((select due_date from public.monthly_contribution_dues where member_id = '53000000-0000-0000-0000-000000000001' and contribution_month = '2026-03-01'), '2026-03-15'::date, 'monthly generation uses the organization due day');
select public.generate_monthly_contribution_dues('51000000-0000-0000-0000-000000000001', '2026-03-01');
select is((select count(*) from public.monthly_contribution_dues where contribution_month = '2026-03-01'), 2::bigint, 'a second monthly generation creates no duplicate dues');

create temporary table all_active_exceptional as
select public.create_exceptional_contribution('51000000-0000-0000-0000-000000000001', 'Solidarite', 300, '2026-03-20', null::uuid[]) as id;
select is((select count(*) from public.exceptional_contribution_dues d join all_active_exceptional c on c.id = d.exceptional_contribution_id), 2::bigint, 'an exceptional contribution targets all active members when no selection is supplied');

create temporary table selected_exceptional as
select public.create_exceptional_contribution('51000000-0000-0000-0000-000000000001', 'Urgence', 200, '2026-03-25', array['53000000-0000-0000-0000-000000000001'::uuid]) as id;
select is((select count(*) from public.exceptional_contribution_dues d join selected_exceptional c on c.id = d.exceptional_contribution_id), 1::bigint, 'an exceptional contribution honors an explicit active-member selection');
select throws_ok($$ select public.create_exceptional_contribution('51000000-0000-0000-0000-000000000001', 'Refus externe', 200, '2026-03-25', array['53000000-0000-0000-0000-000000000004'::uuid]) $$, 'Member not found', 'an exceptional contribution rejects a member outside the organization');
insert into public.exceptional_contributions (id, organization_id, label, amount, due_date, created_by)
values ('54000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000002', 'Contribution etrangere', 200, '2026-03-25', '51000000-0000-0000-0000-000000000002');

create temporary table monthly_due as select id from public.monthly_contribution_dues where member_id = '53000000-0000-0000-0000-000000000001' and contribution_month = '2026-03-01';
select public.record_contribution_payment('51000000-0000-0000-0000-000000000001', 'monthly', (select id from monthly_due), 200, '2026-03-10', 'cash', 'REC-001');
select is((select amount_paid from public.monthly_contribution_dues where id = (select id from monthly_due)), 200::numeric, 'a partial payment updates the due paid amount');
select public.record_contribution_payment('51000000-0000-0000-0000-000000000001', 'monthly', (select id from monthly_due), 300, '2026-03-11', 'cash', 'REC-002');
select ok((select status = 'paid' and remaining_amount = 0 from public.monthly_contribution_dues where id = (select id from monthly_due)), 'a final payment settles the due');
select is((select count(*) from public.contribution_payments where contribution_due_id = (select id from monthly_due)), 2::bigint, 'partial and final payments create two immutable ledger rows');
select throws_ok($$ select public.record_contribution_payment('51000000-0000-0000-0000-000000000001', 'monthly', (select id from monthly_due), 1, '2026-03-12', 'cash', 'REC-003') $$, 'Payment exceeds remaining amount', 'an overpayment is rejected');
select is((select remaining_amount from public.monthly_contribution_dues where id = (select id from monthly_due)), 0::numeric, 'a rejected overpayment leaves the balance unchanged');

select throws_ok($$ select public.create_disbursement('51000000-0000-0000-0000-000000000001', ' ', 100, '2026-03-21', 'cash', null, null, null) $$, 'Justification is required', 'a disbursement requires a nonblank justification');
select throws_ok($$ select public.create_disbursement('51000000-0000-0000-0000-000000000001', 'Aide externe', 100, '2026-03-21', 'cash', '53000000-0000-0000-0000-000000000004', null, 'preuve') $$, 'Member not found', 'a disbursement rejects a member outside the organization');
select throws_ok($$ select public.create_disbursement('51000000-0000-0000-0000-000000000001', 'Relation etrangere', 100, '2026-03-21', 'cash', null, '54000000-0000-0000-0000-000000000001', 'preuve') $$, 'Contribution not found', 'a disbursement rejects a foreign contribution relation');

select ok(not has_function_privilege('anon', 'public.generate_monthly_contribution_dues(uuid, date)', 'execute'), 'anon cannot generate monthly dues');
select ok(not has_function_privilege('authenticated', 'public.generate_monthly_contribution_dues(uuid, date)', 'execute'), 'authenticated cannot generate monthly dues');
select ok(has_function_privilege('service_role', 'public.generate_monthly_contribution_dues(uuid, date)', 'execute'), 'service role can generate monthly dues');
select ok(not has_function_privilege('anon', 'public.create_exceptional_contribution(uuid, text, numeric, date, uuid[])', 'execute'), 'anon cannot create exceptional contributions');
select ok(not has_function_privilege('authenticated', 'public.create_exceptional_contribution(uuid, text, numeric, date, uuid[])', 'execute'), 'authenticated cannot create exceptional contributions');
select ok(has_function_privilege('service_role', 'public.create_exceptional_contribution(uuid, text, numeric, date, uuid[])', 'execute'), 'service role can create exceptional contributions');
select ok(not has_function_privilege('anon', 'public.record_contribution_payment(uuid, text, uuid, numeric, date, text, text)', 'execute'), 'anon cannot record contribution payments');
select ok(not has_function_privilege('authenticated', 'public.record_contribution_payment(uuid, text, uuid, numeric, date, text, text)', 'execute'), 'authenticated cannot record contribution payments');
select ok(has_function_privilege('service_role', 'public.record_contribution_payment(uuid, text, uuid, numeric, date, text, text)', 'execute'), 'service role can record contribution payments');
select ok(not has_function_privilege('anon', 'public.create_disbursement(uuid, text, numeric, date, text, uuid, uuid, text)', 'execute'), 'anon cannot create disbursements');
select ok(not has_function_privilege('authenticated', 'public.create_disbursement(uuid, text, numeric, date, text, uuid, uuid, text)', 'execute'), 'authenticated cannot create disbursements');
select ok(has_function_privilege('service_role', 'public.create_disbursement(uuid, text, numeric, date, text, uuid, uuid, text)', 'execute'), 'service role can create disbursements');
select ok(not has_function_privilege('anon', 'public.get_admin_finance(uuid, text, integer, integer)', 'execute'), 'anon cannot retrieve finance');
select ok(not has_function_privilege('authenticated', 'public.get_admin_finance(uuid, text, integer, integer)', 'execute'), 'authenticated cannot retrieve finance');
select ok(has_function_privilege('service_role', 'public.get_admin_finance(uuid, text, integer, integer)', 'execute'), 'service role can retrieve finance');

select ok(not exists (select 1 from public.get_admin_finance('51000000-0000-0000-0000-000000000001', 'all', 0, 50) where member_id = '53000000-0000-0000-0000-000000000004'), 'finance queries are isolated between organizations');
select is((select total_contributions from public.get_admin_finance('51000000-0000-0000-0000-000000000001', 'all', 99, 50) limit 1), 1000::numeric, 'an empty finance page preserves organization summary totals');
select ok((select contribution_id is null from public.get_admin_finance('51000000-0000-0000-0000-000000000001', 'all', 99, 50) limit 1), 'an empty finance page returns a summary-only row');

select * from finish();
rollback;
