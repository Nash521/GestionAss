begin;

select plan(35);

select has_function('public', 'open_member_disciplinary_case', array['uuid', 'uuid', 'text', 'integer', 'text', 'text', 'public.suspension_contribution_policy'], 'case opening RPC exists');
select has_function('public', 'decide_member_disciplinary_case', array['uuid', 'uuid', 'public.disciplinary_case_status', 'public.disciplinary_sanction', 'text'], 'case decision RPC exists');
select has_function('public', 'get_member_disciplinary_cases', array['uuid', 'uuid'], 'organization-scoped case listing RPC exists');
select has_index('public', 'member_disciplinary_cases', 'member_disciplinary_cases_one_open_per_member_idx', 'only one open case is allowed for each member');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'discipline-admin-one@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'discipline-admin-two@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'discipline-member-one@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'discipline-member-two@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'discipline-member-three@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'discipline-last-admin@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.organizations (id, name, membership_fee_amount, monthly_contribution_amount, monthly_contribution_due_day) values
  ('52000000-0000-0000-0000-000000000001', 'Organisation workflow disciplinaire une', 1000, 500, 5),
  ('52000000-0000-0000-0000-000000000002', 'Organisation workflow disciplinaire deux', 1500, 700, 10);

insert into public.users (id, organization_id, role, is_active) values
  ('51000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 'admin', true),
  ('51000000-0000-0000-0000-000000000003', '52000000-0000-0000-0000-000000000001', 'member', true),
  ('51000000-0000-0000-0000-000000000004', '52000000-0000-0000-0000-000000000001', 'member', true),
  ('51000000-0000-0000-0000-000000000005', '52000000-0000-0000-0000-000000000001', 'member', true),
  ('51000000-0000-0000-0000-000000000006', '52000000-0000-0000-0000-000000000002', 'admin', true);

insert into public.members (id, organization_id, user_id, member_number, first_name, last_name, phone, status, created_by) values
  ('53000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000003', 'D-000001', 'Awa', 'Kone', '+2250700000101', 'active', '51000000-0000-0000-0000-000000000001'),
  ('53000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000004', 'D-000002', 'Binta', 'Yao', '+2250500000102', 'active', '51000000-0000-0000-0000-000000000001'),
  ('53000000-0000-0000-0000-000000000003', '52000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000005', 'D-000003', 'Cisse', 'Diallo', '+2250100000103', 'active', '51000000-0000-0000-0000-000000000001'),
  ('53000000-0000-0000-0000-000000000004', '52000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000006', 'D-000001', 'Admin', 'Unique', '+2250700000104', 'active', '51000000-0000-0000-0000-000000000006');

insert into public.membership_fees (member_id, amount_due, amount_paid, remaining_amount, status)
values ('53000000-0000-0000-0000-000000000002', 1000, 400, 600, 'partial');

create temporary table disciplinary_fixture_cases (label text primary key, id uuid not null);

insert into disciplinary_fixture_cases (label, id)
select 'dismissed', public.open_member_disciplinary_case(
  '51000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000001',
  'Dossier rejeté', 30, null, null, 'continue'
);
insert into disciplinary_fixture_cases (label, id)
select 'continue', public.open_member_disciplinary_case(
  '51000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000002',
  'Suspension avec maintien des cotisations', 30, null, null, 'continue'
);
insert into disciplinary_fixture_cases (label, id)
select 'stop', public.open_member_disciplinary_case(
  '51000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000003',
  'Suspension sans nouvelles cotisations', 30, null, null, 'stop'
);

select is(jsonb_array_length(public.get_member_disciplinary_cases('51000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000001')->'cases'), 1, 'listing returns cases for the selected member');
select ok((public.get_member_disciplinary_cases('51000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000001')->'cases'->0) ?& array['id', 'memberId', 'reason', 'plannedDurationDays', 'observations', 'evidence', 'contributionPolicy', 'status', 'sanction', 'openedAt', 'openedBy', 'decidedAt', 'decidedBy'], 'listing serializes all mobile case fields');
select throws_ok($$ select public.get_member_disciplinary_cases('51000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000004') $$, 'Member not found', 'listing hides a member from another organization');
select throws_ok($$ select public.open_member_disciplinary_case('51000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000004', 'Cross-organization case', 30, null, null, 'continue') $$, 'Member not found', 'case opening hides a member from another organization');
select throws_ok($$ select public.open_member_disciplinary_case('51000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000001', 'Duplicate open case', 30, null, null, 'continue') $$, 'An open disciplinary case already exists', 'a member cannot have two open cases');

select is((select status::text from public.member_disciplinary_cases where id = (select id from disciplinary_fixture_cases where label = 'dismissed')), 'open', 'opening leaves the case open');
select is((select sanction::text from public.member_disciplinary_cases where id = (select id from disciplinary_fixture_cases where label = 'dismissed')), 'none', 'opening does not pre-apply a sanction');
select is((select opened_by::text from public.member_disciplinary_cases where id = (select id from disciplinary_fixture_cases where label = 'dismissed')), '51000000-0000-0000-0000-000000000001', 'opening records its authenticated administrator');
select is((select status::text from public.members where id = '53000000-0000-0000-0000-000000000001'), 'active', 'opening an investigation does not suspend the member');
select ok((select is_active from public.users where id = '51000000-0000-0000-0000-000000000003'), 'opening an investigation leaves the member account active');

select is(public.decide_member_disciplinary_case('51000000-0000-0000-0000-000000000001', (select id from disciplinary_fixture_cases where label = 'dismissed'), 'dismissed', 'none', null)::text, 'active', 'dismissal preserves the active member state');
select is((select status::text from public.members where id = '53000000-0000-0000-0000-000000000001'), 'active', 'a dismissed case leaves the member active');
select ok(public.open_member_disciplinary_case('51000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000001', 'Avertissement', 10, null, null, 'continue') is not null, 'a new case can open after a prior case is decided');
select is(public.decide_member_disciplinary_case('51000000-0000-0000-0000-000000000001', (select id from public.member_disciplinary_cases where member_id = '53000000-0000-0000-0000-000000000001' and status = 'open'), 'confirmed', 'warning', null)::text, 'active', 'a warning does not suspend the member');
select is((select status::text from public.members where id = '53000000-0000-0000-0000-000000000001'), 'active', 'warning decision preserves active membership');

select is(public.decide_member_disciplinary_case('51000000-0000-0000-0000-000000000001', (select id from disciplinary_fixture_cases where label = 'continue'), 'confirmed', 'suspension', null)::text, 'suspended', 'a confirmed suspension changes membership status');
select is((select status::text from public.members where id = '53000000-0000-0000-0000-000000000002'), 'suspended', 'confirmed suspension suspends the member');
select ok(not (select is_active from public.users where id = '51000000-0000-0000-0000-000000000004'), 'confirmed suspension deactivates the member account');
select ok(exists (select 1 from public.member_lifecycle_audit where member_id = '53000000-0000-0000-0000-000000000002' and action = 'suspend' and previous_status = 'active' and next_status = 'suspended' and actor_id = '51000000-0000-0000-0000-000000000001'), 'confirmed suspension records the suspend audit action');
select ok((public.get_member_disciplinary_cases('51000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000002')->'cases'->0) @> jsonb_build_object('decidedBy', '51000000-0000-0000-0000-000000000001') and (public.get_member_disciplinary_cases('51000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000002')->'cases'->0->>'decidedAt') is not null, 'case list exposes the administrator and timestamp that recorded the decision');

select is(public.decide_member_disciplinary_case('51000000-0000-0000-0000-000000000001', (select id from disciplinary_fixture_cases where label = 'stop'), 'confirmed', 'suspension', null)::text, 'suspended', 'a stop-policy suspension is applied only after decision');
select is(public.generate_monthly_contribution_dues('51000000-0000-0000-0000-000000000001', '2026-10-01'), 2, 'monthly generation includes active members and suspended continue-policy members');
select ok(exists (select 1 from public.monthly_contribution_dues where member_id = '53000000-0000-0000-0000-000000000002' and contribution_month = '2026-10-01'), 'continue policy generates a due after the suspension decision');
select ok(not exists (select 1 from public.monthly_contribution_dues where member_id = '53000000-0000-0000-0000-000000000003' and contribution_month = '2026-10-01'), 'stop policy does not generate a due during suspension');
select ok(exists (select 1 from public.membership_fees where member_id = '53000000-0000-0000-0000-000000000002' and remaining_amount = 600), 'suspension preserves the member financial ledger');

insert into disciplinary_fixture_cases (label, id)
select 'last-admin-suspension', public.open_member_disciplinary_case(
  '51000000-0000-0000-0000-000000000006', '53000000-0000-0000-0000-000000000004',
  'Décision à protéger', 30, null, null, 'stop'
);
select throws_ok($$ select public.decide_member_disciplinary_case('51000000-0000-0000-0000-000000000006', (select id from disciplinary_fixture_cases where label = 'last-admin-suspension'), 'confirmed', 'suspension', null) $$, 'Cannot sanction the last active administrator', 'the last active administrator cannot be suspended');
select ok((select is_active from public.users where id = '51000000-0000-0000-0000-000000000006'), 'failed suspension leaves the last admin account active');
select is(public.decide_member_disciplinary_case('51000000-0000-0000-0000-000000000006', (select id from disciplinary_fixture_cases where label = 'last-admin-suspension'), 'dismissed', 'none', null)::text, 'active', 'the protected administrator case can be dismissed');
insert into disciplinary_fixture_cases (label, id)
select 'last-admin-removal', public.open_member_disciplinary_case(
  '51000000-0000-0000-0000-000000000006', '53000000-0000-0000-0000-000000000004',
  'Exclusion à protéger', 30, null, null, 'stop'
);
select throws_ok($$ select public.decide_member_disciplinary_case('51000000-0000-0000-0000-000000000006', (select id from disciplinary_fixture_cases where label = 'last-admin-removal'), 'confirmed', 'removal', null) $$, 'Cannot sanction the last active administrator', 'the last active administrator cannot be removed');
select is((select status::text from public.members where id = '53000000-0000-0000-0000-000000000004'), 'active', 'failed removal leaves the last administrator member active');
select ok(not exists (select 1 from public.member_lifecycle_audit where member_id = '53000000-0000-0000-0000-000000000004' and action in ('suspend', 'remove')), 'failed sanctions do not leave lifecycle audit entries');

select * from finish();
rollback;
