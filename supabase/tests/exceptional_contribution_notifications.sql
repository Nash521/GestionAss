begin;
select plan(6);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '99000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'notice-admin@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '99000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'notice-member@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '99000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'notice-other@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.organizations (id, name, membership_fee_amount, monthly_contribution_amount, monthly_contribution_due_day)
values ('99000000-0000-0000-0000-000000000010', 'Association notifications', 0, 5000, 15);
insert into public.users (id, organization_id, role, is_active) values
  ('99000000-0000-0000-0000-000000000001', '99000000-0000-0000-0000-000000000010', 'admin', true),
  ('99000000-0000-0000-0000-000000000002', '99000000-0000-0000-0000-000000000010', 'member', true),
  ('99000000-0000-0000-0000-000000000003', '99000000-0000-0000-0000-000000000010', 'member', true);
insert into public.members (id, organization_id, user_id, member_number, first_name, last_name, phone, status, created_by) values
  ('99000000-0000-0000-0000-000000000020', '99000000-0000-0000-0000-000000000010', '99000000-0000-0000-0000-000000000002', 'N-001', 'Awa', 'Test', '+2250700000991', 'active', '99000000-0000-0000-0000-000000000001'),
  ('99000000-0000-0000-0000-000000000021', '99000000-0000-0000-0000-000000000010', '99000000-0000-0000-0000-000000000003', 'N-002', 'Béa', 'Test', '+2250700000992', 'active', '99000000-0000-0000-0000-000000000001');

insert into public.exceptional_contributions (id, organization_id, label, amount, due_date, created_by)
values ('99000000-0000-0000-0000-000000000030', '99000000-0000-0000-0000-000000000010', 'Solidarité', 5000, (now() at time zone 'Africa/Abidjan')::date + 7, '99000000-0000-0000-0000-000000000001');
insert into public.exceptional_contribution_dues (id, exceptional_contribution_id, member_id, amount_due, amount_paid, remaining_amount, status)
values ('99000000-0000-0000-0000-000000000040', '99000000-0000-0000-0000-000000000030', '99000000-0000-0000-0000-000000000020', 5000, 0, 5000, 'unpaid');

select is((select count(*)::integer from public.payment_notifications where exceptional_due_id = '99000000-0000-0000-0000-000000000040'), 1, 'new due creates one notice');
select is((select event_type from public.payment_notifications where exceptional_due_id = '99000000-0000-0000-0000-000000000040'), 'exceptional_created', 'new due is identified as an announcement');
select public.enqueue_exceptional_contribution_notification((select d from public.exceptional_contribution_dues d where id = '99000000-0000-0000-0000-000000000040'));
select is((select count(*)::integer from public.payment_notifications where exceptional_due_id = '99000000-0000-0000-0000-000000000040'), 1, 'backfill cannot duplicate a notice');

set local role authenticated;
select set_config('request.jwt.claim.sub', '99000000-0000-0000-0000-000000000002', true);
select is((select count(*)::integer from public.payment_notifications where exceptional_due_id = '99000000-0000-0000-0000-000000000040'), 1, 'recipient can read the announcement');
select ok(public.mark_payment_notification_read((select id from public.payment_notifications where exceptional_due_id = '99000000-0000-0000-0000-000000000040')), 'recipient can mark it read');
select set_config('request.jwt.claim.sub', '99000000-0000-0000-0000-000000000003', true);
select is((select count(*)::integer from public.payment_notifications where exceptional_due_id = '99000000-0000-0000-0000-000000000040'), 0, 'other member cannot read it');

select * from finish();
rollback;
