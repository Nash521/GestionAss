begin;

select plan(61);

select has_column('public', 'organizations', 'monthly_contribution_amount', 'organizations stores the monthly contribution amount');
select has_column('public', 'organizations', 'monthly_contribution_due_day', 'organizations stores the monthly contribution due day');
select has_table('public', 'contribution_payments', 'contribution payments ledger exists');
select has_column('public', 'contribution_payments', 'membership_fee_id', 'contribution payments can reference membership fees');
select has_column('public', 'contribution_payments', 'monthly_contribution_due_id', 'contribution payments can reference monthly dues');
select has_column('public', 'contribution_payments', 'exceptional_contribution_due_id', 'contribution payments can reference exceptional dues');
select ok(exists (select 1 from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey) where c.conrelid = 'public.contribution_payments'::regclass and c.contype = 'f' and a.attname = 'membership_fee_id' and c.confrelid = 'public.membership_fees'::regclass), 'membership fee payment reference has its required foreign key');
select ok(exists (select 1 from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey) where c.conrelid = 'public.contribution_payments'::regclass and c.contype = 'f' and a.attname = 'monthly_contribution_due_id' and c.confrelid = 'public.monthly_contribution_dues'::regclass), 'monthly contribution payment reference has its required foreign key');
select ok(exists (select 1 from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey) where c.conrelid = 'public.contribution_payments'::regclass and c.contype = 'f' and a.attname = 'exceptional_contribution_due_id' and c.confrelid = 'public.exceptional_contribution_dues'::regclass), 'exceptional contribution payment reference has its required foreign key');
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
select public.record_contribution_payment('51000000-0000-0000-0000-000000000001', 'monthly', (select id from monthly_due), 200, '2026-03-10', 'REC-001', 'manual');
select is((select amount_paid from public.monthly_contribution_dues where id = (select id from monthly_due)), 200::numeric, 'a partial payment updates the due paid amount');
select public.record_contribution_payment('51000000-0000-0000-0000-000000000001', 'monthly', (select id from monthly_due), 300, '2026-03-11', 'REC-002', 'wave');
select ok((select status = 'paid' and remaining_amount = 0 from public.monthly_contribution_dues where id = (select id from monthly_due)), 'a final payment settles the due');
select is((select count(*) from public.contribution_payments where monthly_contribution_due_id = (select id from monthly_due)), 2::bigint, 'partial and final payments create two monthly ledger rows');
select ok((select bool_and(membership_fee_id is null and exceptional_contribution_due_id is null) from public.contribution_payments where monthly_contribution_due_id = (select id from monthly_due)), 'monthly ledger rows use only the monthly due reference');
select throws_ok($$ select public.record_contribution_payment('51000000-0000-0000-0000-000000000001', 'monthly', (select id from monthly_due), 1, '2026-03-12', 'REC-003', 'manual') $$, 'Payment exceeds remaining amount', 'an overpayment is rejected');
select is((select remaining_amount from public.monthly_contribution_dues where id = (select id from monthly_due)), 0::numeric, 'a rejected overpayment leaves the balance unchanged');
select throws_ok($$ update public.contribution_payments set payment_reference = 'CHANGED' where monthly_contribution_due_id = (select id from monthly_due) $$, 'Contribution payments are immutable', 'contribution payment ledger rows cannot be updated');
select throws_ok($$ delete from public.contribution_payments where monthly_contribution_due_id = (select id from monthly_due) $$, 'Contribution payments are immutable', 'contribution payment ledger rows cannot be deleted');

select throws_ok($$ select public.create_disbursement('51000000-0000-0000-0000-000000000001', ' ', 100, '2026-03-21', 'general_expense', null, null, null) $$, 'Justification is required', 'a general expense requires a nonblank justification');
select throws_ok($$ select public.create_disbursement('51000000-0000-0000-0000-000000000001', 'Aide externe', 100, '2026-03-21', 'member_aid', '53000000-0000-0000-0000-000000000004', null, 'preuve') $$, 'Member not found', 'member aid rejects a member outside the organization');
select throws_ok($$ select public.create_disbursement('51000000-0000-0000-0000-000000000001', 'Relation etrangere', 100, '2026-03-21', 'exceptional_contribution_payment', null, '54000000-0000-0000-0000-000000000001', 'preuve') $$, 'Contribution not found', 'an exceptional contribution payment rejects a foreign contribution relation');
select public.create_disbursement('51000000-0000-0000-0000-000000000001', 'Depense generale', 100, '2026-03-21', 'general_expense', null, null, 'facture generale');
select public.create_disbursement('51000000-0000-0000-0000-000000000001', 'Aide Awa', 150, '2026-03-22', 'member_aid', '53000000-0000-0000-0000-000000000001', null, 'recu aide');
select public.create_disbursement('51000000-0000-0000-0000-000000000001', 'Paiement solidarite', 200, '2026-03-23', 'exceptional_contribution_payment', null, (select id from all_active_exceptional), 'recu contribution');
select ok(public.get_admin_finance('51000000-0000-0000-0000-000000000001', 'disbursements', 0, 50)->'items' @> jsonb_build_array(jsonb_build_object('label', 'Depense generale')), 'general expenses appear in the disbursements JSON tab');
select ok(public.get_admin_finance('51000000-0000-0000-0000-000000000001', 'disbursements', 0, 50)->'items' @> jsonb_build_array(jsonb_build_object('label', 'Aide Awa')), 'member aid appears in the disbursements JSON tab');
select ok(public.get_admin_finance('51000000-0000-0000-0000-000000000001', 'disbursements', 0, 50)->'items' @> jsonb_build_array(jsonb_build_object('label', 'Paiement solidarite')), 'exceptional contribution payments appear in the disbursements JSON tab');
select throws_ok($$ select public.create_disbursement('51000000-0000-0000-0000-000000000001', 'Type invalide', 100, '2026-03-24', 'invalid_type', null, null, 'preuve') $$, 'Invalid disbursement type', 'an invalid disbursement type is rejected');
select public.create_disbursement('51000000-0000-0000-0000-000000000002', 'Depense externe', 100, '2026-03-24', 'general_expense', null, null, 'facture externe');

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

select ok(not (public.get_admin_finance('51000000-0000-0000-0000-000000000001', 'monthly', 0, 50)->'items' @> jsonb_build_array(jsonb_build_object('memberId', '53000000-0000-0000-0000-000000000004'))), 'monthly finance JSON is isolated between organizations');
select ok(not (public.get_admin_finance('51000000-0000-0000-0000-000000000001', 'exceptional', 0, 50)->'items' @> jsonb_build_array(jsonb_build_object('id', '54000000-0000-0000-0000-000000000001'))), 'exceptional finance JSON is isolated between organizations');
select ok(not (public.get_admin_finance('51000000-0000-0000-0000-000000000001', 'disbursements', 0, 50)->'items' @> jsonb_build_array(jsonb_build_object('label', 'Depense externe'))), 'disbursement finance JSON is isolated between organizations');
select ok(public.get_admin_finance('51000000-0000-0000-0000-000000000001', 'monthly', 0, 50)->'items' @> jsonb_build_array(jsonb_build_object('memberId', '53000000-0000-0000-0000-000000000001')), 'a populated monthly finance page includes an organization member');
select ok((public.get_admin_finance('51000000-0000-0000-0000-000000000001', 'monthly', 0, 50)->'metadata') @> jsonb_build_object('offset', 0, 'limit', 50) and (public.get_admin_finance('51000000-0000-0000-0000-000000000001', 'monthly', 0, 50)->'metadata'->>'total')::integer > 0, 'a populated monthly finance page returns pagination metadata');
select ok(public.get_admin_finance('51000000-0000-0000-0000-000000000001', 'exceptional', 0, 50)->'items' @> jsonb_build_array(jsonb_build_object('label', 'Solidarite')), 'a populated exceptional finance page includes an organization contribution');
select ok((public.get_admin_finance('51000000-0000-0000-0000-000000000001', 'exceptional', 0, 50)->'metadata') @> jsonb_build_object('offset', 0, 'limit', 50) and (public.get_admin_finance('51000000-0000-0000-0000-000000000001', 'exceptional', 0, 50)->'metadata'->>'total')::integer > 0, 'a populated exceptional finance page returns pagination metadata');
select is((public.get_admin_finance('51000000-0000-0000-0000-000000000001', 'monthly', 0, 50)->'summary'->>'totalExpected')::numeric, 1000::numeric, 'monthly finance summary expects two active members at 500 each');
select ok(public.get_admin_finance('51000000-0000-0000-0000-000000000001', 'monthly', 99, 50) @> '{"items": [], "metadata": {"offset": 99}}'::jsonb, 'an empty monthly finance page preserves JSON metadata');
select ok(public.get_admin_finance('51000000-0000-0000-0000-000000000001', 'exceptional', 99, 50) @> '{"items": [], "metadata": {"offset": 99}}'::jsonb, 'an empty exceptional finance page preserves JSON metadata');
select ok(public.get_admin_finance('51000000-0000-0000-0000-000000000001', 'disbursements', 99, 50) @> '{"items": [], "metadata": {"offset": 99}}'::jsonb, 'an empty disbursement finance page preserves JSON metadata');

select * from finish();
rollback;
