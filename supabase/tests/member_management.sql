begin;

select plan(16);

select has_function('public', 'provision_admin_member', array['uuid', 'uuid', 'text', 'text', 'text', 'public.account_role'], 'admin member provisioning RPC exists');
select has_function('public', 'list_admin_members', array['uuid', 'text', 'text', 'text', 'integer', 'integer'], 'admin member listing RPC exists');
select policies_are('public', 'members', array['active admin reads organization members']::name[], 'members are protected by the active-admin organization policy');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin-one@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'admin-two@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'awa@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'idriss@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'other@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'new@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'rejected@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.organizations (id, name, membership_fee_amount) values
  ('42000000-0000-0000-0000-000000000001', 'Organisation membres une', 1000),
  ('42000000-0000-0000-0000-000000000002', 'Organisation membres deux', 1500);

insert into public.users (id, organization_id, role, is_active) values
  ('41000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', 'admin', true),
  ('41000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000002', 'admin', true),
  ('41000000-0000-0000-0000-000000000003', '42000000-0000-0000-0000-000000000001', 'member', true),
  ('41000000-0000-0000-0000-000000000004', '42000000-0000-0000-0000-000000000001', 'admin', true),
  ('41000000-0000-0000-0000-000000000005', '42000000-0000-0000-0000-000000000002', 'member', true);

insert into public.members (id, organization_id, user_id, member_number, first_name, last_name, phone, status, created_by) values
  ('43000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000003', 'M-000001', 'Awa', 'Kone', '+2250700000001', 'active', '41000000-0000-0000-0000-000000000001'),
  ('43000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000004', 'M-000002', 'Idriss', 'Nguessan', '+2250500000002', 'active', '41000000-0000-0000-0000-000000000001'),
  ('43000000-0000-0000-0000-000000000003', '42000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000005', 'M-000001', 'Mariam', 'Traore', '+2250100000003', 'active', '41000000-0000-0000-0000-000000000002');

insert into public.membership_fees (member_id, amount_due, amount_paid, remaining_amount, status) values
  ('43000000-0000-0000-0000-000000000001', 1000, 1000, 0, 'paid'),
  ('43000000-0000-0000-0000-000000000002', 1000, 400, 600, 'partial'),
  ('43000000-0000-0000-0000-000000000003', 1500, 0, 1500, 'unpaid');

select is((select count(*) from public.list_admin_members('41000000-0000-0000-0000-000000000001', '', 'all', 'all', 0, 50)), 2::bigint, 'listing is isolated to the caller organization');
select is((select total_members from public.list_admin_members('41000000-0000-0000-0000-000000000001', '', 'all', 'all', 0, 50) limit 1), 2::bigint, 'listing returns the organization total');
select is((select count(*) from public.list_admin_members('41000000-0000-0000-0000-000000000001', 'awa', 'all', 'all', 0, 50)), 1::bigint, 'listing searches names case-insensitively');
select is((select count(*) from public.list_admin_members('41000000-0000-0000-0000-000000000001', '', 'partial', 'admin', 0, 50)), 1::bigint, 'listing combines payment and role filters');

insert into public.users (id, organization_id, role, is_active) values
  ('41000000-0000-0000-0000-000000000007', '42000000-0000-0000-0000-000000000002', 'member', true);

select throws_ok(
  $$ select public.provision_admin_member('41000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000007', 'Refused', 'CrossOrg', '+2250700000007', 'member') $$,
  'Unauthorized',
  'an admin cannot provision a user already assigned to another organization'
);

select is(
  public.provision_admin_member('41000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000006', '  Naya  ', '  Yao  ', '+2250700000006', 'member'),
  (select id from public.members where user_id = '41000000-0000-0000-0000-000000000006'),
  'an active admin provisions a member'
);
select is((select member_number from public.members where user_id = '41000000-0000-0000-0000-000000000006'), 'M-000003', 'provisioning assigns the next number within the organization');
select ok((select is_active and role = 'member' from public.users where id = '41000000-0000-0000-0000-000000000006'), 'provisioning creates an active application user');
select ok(exists (select 1 from public.membership_fees f join public.members m on m.id = f.member_id where m.user_id = '41000000-0000-0000-0000-000000000006' and f.amount_due = 1000 and f.status = 'unpaid'), 'provisioning creates the organization membership fee');

select ok(not has_function_privilege('anon', 'public.provision_admin_member(uuid, uuid, text, text, text, public.account_role)', 'execute'), 'anon cannot provision members');
select ok(has_function_privilege('service_role', 'public.provision_admin_member(uuid, uuid, text, text, text, public.account_role)', 'execute'), 'service role can provision members');
select ok(not has_function_privilege('authenticated', 'public.list_admin_members(uuid, text, text, text, integer, integer)', 'execute'), 'authenticated cannot list members through the service RPC');
select ok(has_function_privilege('service_role', 'public.list_admin_members(uuid, text, text, text, integer, integer)', 'execute'), 'service role can list members through the service RPC');

select * from finish();
rollback;
