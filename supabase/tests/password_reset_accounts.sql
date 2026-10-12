begin;
select plan(6);

insert into auth.users (instance_id, id, aud, role, phone, encrypted_password, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '98000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', '2250700000981', 'not-used', now(), '{"provider":"phone","providers":["phone"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '98000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', '2250700000982', 'not-used', now(), '{"provider":"phone","providers":["phone"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '98000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', '2250700000983', 'not-used', now(), '{"provider":"phone","providers":["phone"]}', '{}', now(), now());
insert into public.organizations (id, name, membership_fee_amount, monthly_contribution_amount, monthly_contribution_due_day)
values ('98000000-0000-0000-0000-000000000010', 'Association récupération', 0, 5000, 15);
insert into public.users (id, organization_id, role, is_active) values
  ('98000000-0000-0000-0000-000000000001', '98000000-0000-0000-0000-000000000010', 'admin', true),
  ('98000000-0000-0000-0000-000000000002', '98000000-0000-0000-0000-000000000010', 'member', true),
  ('98000000-0000-0000-0000-000000000003', '98000000-0000-0000-0000-000000000010', 'admin', false);
insert into public.members (id, organization_id, user_id, member_number, first_name, last_name, phone, status, created_by)
values ('98000000-0000-0000-0000-000000000020', '98000000-0000-0000-0000-000000000010', '98000000-0000-0000-0000-000000000002', 'R-001', 'Awa', 'Test', '+2250700000982', 'active', '98000000-0000-0000-0000-000000000001');

select is(public.get_password_reset_account('+2250700000981'), '98000000-0000-0000-0000-000000000001'::uuid, 'active admin can recover a password');
select is(public.get_password_reset_account('+2250700000982'), '98000000-0000-0000-0000-000000000002'::uuid, 'active member can recover a password');
select is(public.get_password_reset_account('+2250700000983'), null, 'inactive admin is excluded');
select is(public.get_password_reset_account('+2250700000999'), null, 'unknown phone is excluded');
select ok(has_function_privilege('service_role', 'public.get_password_reset_account(text)', 'EXECUTE'), 'service role can look up the account');
select ok(not has_function_privilege('authenticated', 'public.get_password_reset_account(text)', 'EXECUTE'), 'client cannot enumerate accounts');

select * from finish();
rollback;
