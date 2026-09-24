begin;

select plan(62);

select has_function('public', 'provision_admin_member', array['uuid', 'uuid', 'text', 'text', 'text', 'public.account_role'], 'admin member provisioning RPC exists');
select has_function('public', 'list_admin_members', array['uuid', 'text', 'text', 'text', 'text', 'integer', 'integer'], 'admin member listing RPC exists');
select policies_are('public', 'members', array['active admin reads organization members']::name[], 'members are protected by the active-admin organization policy');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin-one@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'admin-two@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'awa@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'idriss@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'other@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'new@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'rejected@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000008', 'authenticated', 'authenticated', 'legacy@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000009', 'authenticated', 'authenticated', 'limit-existing@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000010', 'authenticated', 'authenticated', 'limit-new@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.organizations (id, name, membership_fee_amount) values
  ('42000000-0000-0000-0000-000000000001', 'Organisation membres une', 1000),
  ('42000000-0000-0000-0000-000000000002', 'Organisation membres deux', 1500);

insert into public.users (id, organization_id, role, is_active) values
  ('41000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', 'admin', true),
  ('41000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000002', 'admin', true),
  ('41000000-0000-0000-0000-000000000003', '42000000-0000-0000-0000-000000000001', 'member', true),
  ('41000000-0000-0000-0000-000000000004', '42000000-0000-0000-0000-000000000001', 'admin', true),
  ('41000000-0000-0000-0000-000000000005', '42000000-0000-0000-0000-000000000002', 'member', true),
  ('41000000-0000-0000-0000-000000000008', '42000000-0000-0000-0000-000000000001', 'member', true);

insert into public.members (id, organization_id, user_id, member_number, first_name, last_name, phone, status, created_by) values
  ('43000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000003', 'M-000001', 'Awa', 'Kone', '+2250700000001', 'active', '41000000-0000-0000-0000-000000000001'),
  ('43000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000004', 'M-000002', 'Idriss', 'Nguessan', '+2250500000002', 'active', '41000000-0000-0000-0000-000000000001'),
  ('43000000-0000-0000-0000-000000000003', '42000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000005', 'M-000001', 'Mariam', 'Traore', '+2250100000003', 'active', '41000000-0000-0000-0000-000000000002'),
  ('43000000-0000-0000-0000-000000000004', '42000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000008', 'LEGACY-%_ID', 'Percent%_Name', 'Sans\\Frais', '+2250700000008', 'active', '41000000-0000-0000-0000-000000000001');

insert into public.membership_fees (member_id, amount_due, amount_paid, remaining_amount, status) values
  ('43000000-0000-0000-0000-000000000001', 1000, 1000, 0, 'paid'),
  ('43000000-0000-0000-0000-000000000002', 1000, 400, 600, 'partial'),
  ('43000000-0000-0000-0000-000000000003', 1500, 0, 1500, 'unpaid');

select is((select count(*) from public.list_admin_members('41000000-0000-0000-0000-000000000001', '', 'all', 'all', 'all', 0, 50)), 3::bigint, 'listing is isolated to the caller organization and includes members without fees');
select is((select total_members from public.list_admin_members('41000000-0000-0000-0000-000000000001', '', 'all', 'all', 'all', 0, 50) limit 1), 1::bigint, 'listing total counts only paid memberships');
select is((select members_late from public.list_admin_members('41000000-0000-0000-0000-000000000001', '', 'all', 'all', 'all', 0, 50) limit 1), 0::bigint, 'listing late count uses overdue monthly dues');
select is((select members_paid from public.list_admin_members('41000000-0000-0000-0000-000000000001', '', 'all', 'all', 'all', 0, 50) limit 1), 0::bigint, 'listing does not count members without generated dues as current');
select is((select member_status from public.list_admin_members('41000000-0000-0000-0000-000000000001', 'awa', 'all', 'all', 'all', 0, 50)), 'active'::public.member_status, 'listing returns each member status');
select is((select total_members from public.list_admin_members('41000000-0000-0000-0000-000000000001', 'awa', 'all', 'all', 'all', 0, 50) limit 1), 1::bigint, 'filtered rows retain organization-wide total');
select is((select members_late from public.list_admin_members('41000000-0000-0000-0000-000000000001', 'awa', 'all', 'all', 'all', 0, 50) limit 1), 0::bigint, 'filtered rows retain organization-wide late count');
update public.members set status = 'suspended' where id = '43000000-0000-0000-0000-000000000002';
select is((select count(*) from public.list_admin_members('41000000-0000-0000-0000-000000000001', '', 'all', 'all', 'suspended', 0, 50)), 1::bigint, 'listing filters members by member status');
select is((select count(*) from public.list_admin_members('41000000-0000-0000-0000-000000000001', 'awa', 'all', 'all', 'all', 0, 50)), 1::bigint, 'listing searches names case-insensitively');
select is((select count(*) from public.list_admin_members('41000000-0000-0000-0000-000000000001', '', 'partial', 'admin', 'all', 0, 50)), 1::bigint, 'listing combines payment and role filters');
select is((select count(*) from public.list_admin_members('41000000-0000-0000-0000-000000000001', '%_', 'all', 'all', 'all', 0, 50)), 1::bigint, 'listing treats percent and underscore search characters literally');
select is((select count(*) from public.list_admin_members('41000000-0000-0000-0000-000000000001', E'\\', 'all', 'all', 'all', 0, 50)), 1::bigint, 'listing treats a backslash search character literally');
select is((select fee_status from public.list_admin_members('41000000-0000-0000-0000-000000000001', 'percent', 'all', 'all', 'all', 0, 50)), 'unpaid'::public.membership_fee_status, 'listing treats a member with no membership fee as unpaid');
select is((select total_members from public.list_admin_members('41000000-0000-0000-0000-000000000001', '', 'all', 'all', 'all', 99, 50)), 1::bigint, 'an empty page preserves summary metadata');
select ok((select member_id is null from public.list_admin_members('41000000-0000-0000-0000-000000000001', '', 'all', 'all', 'all', 99, 50)), 'an empty page returns a metadata-only row');
select throws_ok($$ select * from public.list_admin_members('41000000-0000-0000-0000-000000000001', '', 'late', 'all', 'all', 0, 50) $$, 'Invalid payment status', 'invalid payment status is rejected');
select throws_ok($$ select * from public.list_admin_members('41000000-0000-0000-0000-000000000001', '', 'all', 'owner', 'all', 0, 50) $$, 'Invalid role filter', 'invalid role filter is rejected');
select throws_ok($$ select * from public.list_admin_members('41000000-0000-0000-0000-000000000001', '', 'all', 'all', 'all', 0, 51) $$, 'Limit must be between 1 and 50', 'out-of-range page limit is rejected');
select throws_ok($$ select * from public.list_admin_members('41000000-0000-0000-0000-000000000001', '', 'all', 'all', 'archived', 0, 50) $$, 'Invalid member status', 'invalid member status is rejected');

insert into public.users (id, organization_id, role, is_active) values
  ('41000000-0000-0000-0000-000000000007', '42000000-0000-0000-0000-000000000002', 'member', true);

select throws_ok(
  $$ select public.provision_admin_member('41000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000007', 'Refused', 'CrossOrg', '+2250700000007', 'member') $$,
  'Unauthorized',
  'an admin cannot provision a user already assigned to another organization'
);

select throws_ok(
  $$ select public.provision_admin_member('41000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000006', 'Naya', 'Yao', '+2250700000006', null) $$,
  'Invalid role',
  'a null requested role is rejected explicitly'
);

create temporary table provisioned_member as
select public.provision_admin_member('41000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000006', '  Naya  ', '  Yao  ', '+2250700000006', 'member') as id;

select is(
  (select id from provisioned_member),
  (select id from public.members where user_id = '41000000-0000-0000-0000-000000000006'),
  'an active admin provisions a member'
);
select is((select member_number from public.members where user_id = '41000000-0000-0000-0000-000000000006'), 'M-000003', 'provisioning assigns the next number within the organization');
select ok((select is_active and role = 'member' from public.users where id = '41000000-0000-0000-0000-000000000006'), 'provisioning creates an active application user');
select ok(exists (select 1 from public.membership_fees f join public.members m on m.id = f.member_id where m.user_id = '41000000-0000-0000-0000-000000000006' and f.amount_due = 1000 and f.status = 'unpaid'), 'provisioning creates the organization membership fee');

insert into public.users (id, organization_id, role, is_active)
values ('41000000-0000-0000-0000-000000000009', '42000000-0000-0000-0000-000000000001', 'member', true);
insert into public.members (id, organization_id, user_id, member_number, first_name, last_name, phone, status, created_by)
values ('43000000-0000-0000-0000-000000000009', '42000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000009', 'M-1000000', 'Numero', 'Limite', '+2250700000009', 'active', '41000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.provision_admin_member('41000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000010', 'Au', 'Dela', '+2250700000010', 'member') $$,
  'Member number limit reached',
  'provisioning rejects legacy M-numbers beyond the supported six-digit range'
);

select ok(not has_function_privilege('anon', 'public.provision_admin_member(uuid, uuid, text, text, text, public.account_role)', 'execute'), 'anon cannot provision members');
select ok(has_function_privilege('service_role', 'public.provision_admin_member(uuid, uuid, text, text, text, public.account_role)', 'execute'), 'service role can provision members');
select ok(not has_function_privilege('authenticated', 'public.list_admin_members(uuid, text, text, text, text, integer, integer)', 'execute'), 'authenticated cannot list members through the service RPC');
select ok(has_function_privilege('service_role', 'public.list_admin_members(uuid, text, text, text, text, integer, integer)', 'execute'), 'service role can list members through the service RPC');

select has_table('public', 'monthly_contribution_dues', 'monthly contribution dues ledger exists');
select has_table('public', 'exceptional_contributions', 'exceptional contributions ledger exists');
select has_table('public', 'exceptional_contribution_dues', 'exceptional contribution dues ledger exists');
select has_table('public', 'disbursements', 'disbursement ledger exists');
select has_function('public', 'get_admin_member_detail', array['uuid', 'uuid'], 'admin member detail RPC exists');

insert into public.monthly_contribution_dues (member_id, contribution_month, due_date, amount_due, amount_paid, remaining_amount, status) values
  ('43000000-0000-0000-0000-000000000001', '2026-01-01', '2026-01-31', 500, 500, 0, 'paid'),
  ('43000000-0000-0000-0000-000000000001', '2026-02-01', '2026-02-28', 500, 200, 300, 'partial');

insert into public.exceptional_contributions (id, organization_id, label, amount, due_date, created_by) values
  ('44000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', 'Solidarite rentree', 1000, '2026-02-15', '41000000-0000-0000-0000-000000000001');
insert into public.exceptional_contribution_dues (exceptional_contribution_id, member_id, amount_due, amount_paid, remaining_amount, status) values
  ('44000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001', 1000, 300, 700, 'partial');

insert into public.disbursements (organization_id, member_id, label, amount, disbursed_on, created_by) values
  ('42000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001', 'Aide medicale', 250, '2026-02-20', '41000000-0000-0000-0000-000000000001'),
  ('42000000-0000-0000-0000-000000000001', null, 'Aide generale', 125, '2026-02-21', '41000000-0000-0000-0000-000000000001');

select is((public.get_admin_member_detail('41000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001')->'summary'->>'totalContributed')::numeric, 1000::numeric, 'member detail excludes membership fees from contribution totals');
select is((public.get_admin_member_detail('41000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001')->'summary'->>'monthlyPaid')::numeric, 700::numeric, 'member detail reports monthly paid total');
select is((public.get_admin_member_detail('41000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001')->'summary'->>'exceptionalRemaining')::numeric, 700::numeric, 'member detail reports exceptional balance');
select is((public.get_admin_member_detail('41000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001')->'aid'->>'count')::integer, 1, 'member detail excludes general disbursements from member aid count');
select is((public.get_admin_member_detail('41000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001')->'aid'->>'totalReceived')::numeric, 250::numeric, 'member detail reports received aid total');
select is(jsonb_array_length(public.get_admin_member_detail('41000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001')->'chart'), 6, 'member detail chart contains exactly six months');
select ok(
  public.get_admin_member_detail('41000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000004')->'membershipFee' @> '{"amountDue": 0, "amountPaid": 0, "amountRemaining": 0, "status": "paid"}'::jsonb,
  'member detail returns a zero-safe membership fee when no row exists'
);
select ok(
  public.get_admin_member_detail('41000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001')->'member' @> '{"memberStatus": "active", "paymentStatus": "paid", "amountRemaining": 0}'::jsonb,
  'member detail emits planned mobile member payment fields'
);
select ok(public.get_admin_member_detail('41000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001')->'monthlyDues'->0 ?& array['id', 'month', 'amountRemaining'], 'monthly dues use the client JSON keys');
select ok(public.get_admin_member_detail('41000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001')->'exceptionalDues'->0 ?& array['id', 'label', 'amountRemaining'], 'exceptional dues serialize their identifiers and balances');
select ok(public.get_admin_member_detail('41000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001')->'aid'->'items'->0 ?& array['id', 'label', 'amount', 'disbursedOn'], 'aid items serialize client JSON keys');
select throws_ok(
  $$ insert into public.disbursements (organization_id, member_id, label, amount, disbursed_on, created_by) values ('42000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000003', 'Aide croisee', 50, '2026-02-22', '41000000-0000-0000-0000-000000000001') $$,
  'Disbursement member must belong to the organization',
  'disbursement rejects a member from another organization'
);
select throws_ok(
  $$ insert into public.exceptional_contribution_dues (exceptional_contribution_id, member_id, amount_due, amount_paid, remaining_amount, status) values ('44000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000003', 1000, 0, 1000, 'unpaid') $$,
  'Exceptional contribution member must belong to the organization',
  'exceptional contribution due rejects a member from another organization'
);
select throws_ok(
  $$ select public.get_admin_member_detail('41000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000003') $$,
  'Member not found',
  'member detail hides members from another organization'
);
select ok(not has_function_privilege('authenticated', 'public.get_admin_member_detail(uuid, uuid)', 'execute'), 'authenticated cannot retrieve member details through the service RPC');
select ok(has_function_privilege('service_role', 'public.get_admin_member_detail(uuid, uuid)', 'execute'), 'service role can retrieve member details');
select throws_ok(
  $$ insert into public.monthly_contribution_dues (member_id, contribution_month, due_date, amount_due, amount_paid, remaining_amount, status) values ('43000000-0000-0000-0000-000000000001', '2026-03-01', '2026-03-31', 100, 20, 80, 'paid') $$,
  '23514',
  null,
  'monthly dues reject a status and balance mismatch'
);
select throws_ok(
  $$ insert into public.exceptional_contributions (organization_id, label, amount, due_date, created_by) values ('42000000-0000-0000-0000-000000000001', 'Createur croise', 100, '2026-03-31', '41000000-0000-0000-0000-000000000002') $$,
  'Exceptional contribution creator must belong to the organization',
  'exceptional contributions reject a creator from another organization'
);
select throws_ok(
  $$ insert into public.disbursements (organization_id, label, amount, disbursed_on, created_by) values ('42000000-0000-0000-0000-000000000001', 'Createur croise', 100, '2026-03-31', '41000000-0000-0000-0000-000000000002') $$,
  'Disbursement creator must belong to the organization',
  'disbursements reject a creator from another organization'
);
select throws_ok(
  $$ select public.manage_admin_member('41000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001', 'suspend') $$,
  'Disciplinary investigation required',
  'direct suspension is blocked without an investigation'
);
select throws_ok(
  $$ select public.manage_admin_member('41000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001', 'archive') $$,
  'Disciplinary investigation required',
  'direct removal is blocked without an investigation'
);
select is((select public.manage_admin_member('41000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000002', 'reactivate')), 'active'::public.member_status, 'only suspended members can be reactivated');
select ok(exists (select 1 from public.member_lifecycle_audit where member_id = '43000000-0000-0000-0000-000000000002' and action = 'reactivate' and previous_status = 'suspended' and next_status = 'active' and actor_id = '41000000-0000-0000-0000-000000000001'), 'reactivation writes an audit record');
update public.members set status = 'removed' where id = '43000000-0000-0000-0000-000000000001';
select throws_ok(
  $$ select public.manage_admin_member('41000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001', 'reactivate') $$,
  'Invalid member transition',
  'removed members cannot be reactivated'
);

select * from finish();
rollback;
