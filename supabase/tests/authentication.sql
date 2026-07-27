begin;

select plan(16);

select has_table('public', 'organizations', 'organizations is available for authentication data');
select has_table('public', 'users', 'application users table exists');
select has_table('public', 'members', 'members table exists for approval');
select has_table('public', 'membership_fees', 'membership fees table exists for approval');
select has_table('public', 'membership_requests', 'membership requests table exists');
select has_table('public', 'auth_otps', 'OTP persistence table exists');
select has_function('public', 'is_admin', array['uuid'], 'active administrator predicate exists');
select has_function('public', 'is_active_admin_for_organization', array['uuid', 'uuid'], 'organization-scoped active administrator predicate exists');
select policies_are(
  'public',
  'membership_requests',
  array['active admin manages requests', 'applicant reads own request']::name[],
  'membership request policies are limited to the active-admin and applicant rules'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'applicant-one@example.test', 'not-used-by-database-tests', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'applicant-two@example.test', 'not-used-by-database-tests', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'admin@example.test', 'not-used-by-database-tests', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'other-organization@example.test', 'not-used-by-database-tests', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.organizations (id, name, membership_fee_amount)
values
  ('20000000-0000-0000-0000-000000000001', 'Organisation de test', 1000),
  ('20000000-0000-0000-0000-000000000002', 'Autre organisation de test', 1000);

insert into public.users (id, organization_id, role, is_active)
values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'member', true),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'member', true),
  ('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'admin', true),
  ('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'member', true);

insert into public.membership_requests (
  id,
  organization_id,
  user_id,
  first_name,
  last_name,
  phone,
  phone_verified_at
) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Awa', 'Koné', '+2250701020304', now()),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Koffi', 'Yao', '+2250501020304', now()),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 'Mariam', 'Traoré', '+2250101020304', now());

select is(
  public.is_admin('10000000-0000-0000-0000-000000000003'),
  true,
  'an active admin is recognized by is_admin'
);

grant select, update on public.membership_requests to authenticated;

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select is(
  (select count(*) from public.membership_requests),
  1::bigint,
  'an applicant cannot read another applicant membership request'
);
select is(
  (select count(*) from public.membership_requests where id = '30000000-0000-0000-0000-000000000002'),
  0::bigint,
  'RLS hides the other applicant request'
);

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
set local role authenticated;

select is(
  (select count(*) from public.membership_requests),
  2::bigint,
  'an active admin only sees membership requests for their organization'
);
select lives_ok(
  $$
    update public.membership_requests
    set first_name = 'Awa validée'
    where id = '30000000-0000-0000-0000-000000000001'
  $$,
  'an active admin can manage a membership request'
);
select is(
  (select first_name from public.membership_requests where id = '30000000-0000-0000-0000-000000000001'),
  'Awa validée',
  'an active admin can read the managed request'
);

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
set local role authenticated;

update public.membership_requests
set first_name = 'Intrusion'
where id = '30000000-0000-0000-0000-000000000003';

reset role;
select is(
  (select first_name from public.membership_requests where id = '30000000-0000-0000-0000-000000000003'),
  'Mariam',
  'an active admin cannot update another organization request'
);

select * from finish();

rollback;
