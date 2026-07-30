begin;

select plan(30);

select has_table('public', 'organizations', 'organizations is available for authentication data');
select has_table('public', 'users', 'application users table exists');
select has_table('public', 'members', 'members table exists for approval');
select has_table('public', 'membership_fees', 'membership fees table exists for approval');
select has_table('public', 'membership_requests', 'membership requests table exists');
select has_table('public', 'auth_otps', 'OTP persistence table exists');
select has_function('public', 'is_admin', array['uuid'], 'active administrator predicate exists');
select has_function('public', 'is_active_admin_for_organization', array['uuid', 'uuid'], 'organization-scoped active administrator predicate exists');
select has_function('public', 'verify_and_consume_otp', array['text', 'text', 'bytea'], 'atomic OTP verification function exists');
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

insert into public.auth_otps (phone, purpose, code_hash, expires_at)
values ('+2250701020305', 'registration', decode(repeat('01', 32), 'hex'), now() + interval '10 minutes');

select ok(
  not public.verify_and_consume_otp('+2250701020305', 'registration', decode(repeat('02', 32), 'hex'))
  and not public.verify_and_consume_otp('+2250701020305', 'registration', decode(repeat('03', 32), 'hex'))
  and not public.verify_and_consume_otp('+2250701020305', 'registration', decode(repeat('04', 32), 'hex'))
  and not public.verify_and_consume_otp('+2250701020305', 'registration', decode(repeat('05', 32), 'hex'))
  and not public.verify_and_consume_otp('+2250701020305', 'registration', decode(repeat('06', 32), 'hex'))
  and not public.verify_and_consume_otp('+2250701020305', 'registration', decode(repeat('07', 32), 'hex')),
  'serialized OTP failures remain rejected after the attempt limit'
);
select is(
  (select attempts from public.auth_otps where phone = '+2250701020305' and purpose = 'registration'),
  5::smallint,
  'OTP failures never increment attempts beyond the limit'
);

select has_function('public', 'issue_registration_otp', array['text', 'text', 'bytea'], 'atomic OTP sending function exists');
select ok(not has_function_privilege('anon', 'public.verify_and_consume_otp(text, text, bytea)', 'execute'), 'anon cannot execute OTP verification RPC');
select ok(not has_function_privilege('authenticated', 'public.verify_and_consume_otp(text, text, bytea)', 'execute'), 'authenticated cannot execute OTP verification RPC');
select ok(has_function_privilege('service_role', 'public.verify_and_consume_otp(text, text, bytea)', 'execute'), 'service role can execute OTP verification RPC');
select ok(not has_function_privilege('anon', 'public.issue_registration_otp(text, text, bytea)', 'execute'), 'anon cannot execute OTP sending RPC');
select ok(not has_function_privilege('authenticated', 'public.issue_registration_otp(text, text, bytea)', 'execute'), 'authenticated cannot execute OTP sending RPC');
select ok(has_function_privilege('service_role', 'public.issue_registration_otp(text, text, bytea)', 'execute'), 'service role can execute OTP sending RPC');

insert into public.auth_otps (phone, purpose, code_hash, expires_at, last_sent_at)
values ('+2250701020315', 'registration', decode(repeat('08', 32), 'hex'), now() + interval '10 minutes', now() - interval '10 minutes');
select ok(public.verify_and_consume_otp('+2250701020315', 'registration', decode(repeat('08', 32), 'hex')), 'the matching OTP is consumed successfully');
select ok((select consumed_at is not null from public.auth_otps where phone = '+2250701020315' and purpose = 'registration'), 'successful OTP verification marks the OTP consumed');

select ok(public.issue_registration_otp('+2250701020316', 'registration', decode(repeat('09', 32), 'hex')), 'first concurrent send contender reserves the OTP slot');
select ok(not public.issue_registration_otp('+2250701020316', 'registration', decode(repeat('0a', 32), 'hex')), 'second send contender is rejected during cooldown');


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
