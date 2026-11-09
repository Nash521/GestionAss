begin;

select plan(12);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '81000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'profile-admin@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '81000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'profile-member@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '81000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'profile-other@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '81000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'profile-other-admin@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
insert into public.organizations (id, name) values
  ('82000000-0000-0000-0000-000000000001', 'Association Profil'),
  ('82000000-0000-0000-0000-000000000002', 'Association Voisine Profil');
insert into public.users (id, organization_id, role, is_active) values
  ('81000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', 'admin', true),
  ('81000000-0000-0000-0000-000000000002', '82000000-0000-0000-0000-000000000001', 'member', true),
  ('81000000-0000-0000-0000-000000000003', '82000000-0000-0000-0000-000000000002', 'member', true),
  ('81000000-0000-0000-0000-000000000004', '82000000-0000-0000-0000-000000000002', 'admin', true);
insert into public.members (id, organization_id, user_id, member_number, first_name, last_name, phone, status, created_by) values
  ('83000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000002', 'PRO-0001', 'Awa', 'Koné', '+2250700000301', 'active', '81000000-0000-0000-0000-000000000001'),
  ('83000000-0000-0000-0000-000000000002', '82000000-0000-0000-0000-000000000002', '81000000-0000-0000-0000-000000000003', 'PRO-0002', 'Mariam', 'Diallo', '+2250700000302', 'active', '81000000-0000-0000-0000-000000000004');
insert into public.membership_fees (id, member_id, amount_due, amount_paid, remaining_amount, status) values
  ('84000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000001', 1000, 1000, 0, 'paid'),
  ('84000000-0000-0000-0000-000000000002', '83000000-0000-0000-0000-000000000002', 1000, 1000, 0, 'paid');
insert into public.monthly_contribution_dues (id, member_id, contribution_month, due_date, amount_due, amount_paid, remaining_amount, status) values
  ('85000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000001', '2026-09-01', '2026-09-15', 1500, 500, 1000, 'partial');
insert into public.exceptional_contributions (id, organization_id, label, amount, due_date, created_by) values
  ('86000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', 'Solidarité', 2000, '2026-09-30', '81000000-0000-0000-0000-000000000001');
insert into public.exceptional_contribution_dues (id, exceptional_contribution_id, member_id, amount_due, amount_paid, remaining_amount, status) values
  ('87000000-0000-0000-0000-000000000001', '86000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000001', 2000, 2000, 0, 'paid');
insert into public.contribution_payments (id, organization_id, membership_fee_id, monthly_contribution_due_id, exceptional_contribution_due_id, amount, payment_source, paid_on, recorded_by, created_at) values
  ('88000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', null, null, 1000, 'manual', '2026-09-01', '81000000-0000-0000-0000-000000000001', now() - interval '3 days'),
  ('88000000-0000-0000-0000-000000000002', '82000000-0000-0000-0000-000000000001', null, '85000000-0000-0000-0000-000000000001', null, 500, 'wave', '2026-09-02', '81000000-0000-0000-0000-000000000001', now() - interval '2 days'),
  ('88000000-0000-0000-0000-000000000003', '82000000-0000-0000-0000-000000000001', null, null, '87000000-0000-0000-0000-000000000001', 2000, 'manual', '2026-09-03', '81000000-0000-0000-0000-000000000001', now() - interval '1 day'),
  ('88000000-0000-0000-0000-000000000004', '82000000-0000-0000-0000-000000000002', '84000000-0000-0000-0000-000000000002', null, null, 1000, 'manual', '2026-09-04', '81000000-0000-0000-0000-000000000004', now());

select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000002', true);
select is(public.get_my_member_profile()->>'memberNumber', 'PRO-0001', 'profile returns the signed-in member number');
select is(public.get_my_member_profile()->>'organizationName', 'Association Profil', 'profile returns the member association');
select is(public.get_my_member_profile()->>'membershipStatus', 'paid', 'profile shows the membership fee status');
select is((public.get_my_member_transactions(30, 0)->>'total')::integer, 3, 'history counts only the signed-in member payments');
select is(public.get_my_member_transactions(30, 0)->'items'->0->>'kind', 'exceptional', 'history is newest first');
select is(public.get_my_member_transactions(30, 0)->'items'->1->>'kind', 'monthly', 'monthly payment is included');
select is(public.get_my_member_transactions(30, 0)->'items'->1->>'paymentSource', 'wave', 'payment method is retained');
select is(public.get_my_member_transactions(30, 0)->'items'->2->>'kind', 'membership', 'membership fee payment is included');
select is(jsonb_array_length(public.get_my_member_transactions(1, 1)->'items'), 1, 'history pages one payment at a time');
select throws_ok($$select public.get_my_member_transactions(0, 0)$$, 'Invalid pagination', 'invalid page size is rejected');
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000001', true);
select throws_ok($$select public.get_my_member_profile()$$, 'Unauthorized', 'admin cannot read a member profile through member RPC');
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000003', true);
select is((public.get_my_member_transactions(30, 0)->>'total')::integer, 1, 'another association member sees only their own payment');

select * from finish();
rollback;
