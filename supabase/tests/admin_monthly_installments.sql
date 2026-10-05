begin;
select plan(17);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'installment-admin@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'installment-member@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'installment-other-admin@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
insert into public.organizations (id, name, membership_fee_amount, monthly_contribution_amount)
values ('72000000-0000-0000-0000-000000000001', 'Installment test', 0, 1000),
       ('72000000-0000-0000-0000-000000000002', 'Other installment test', 0, 1000);
insert into public.users (id, organization_id, role, is_active) values
  ('71000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'admin', true),
  ('71000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000001', 'member', true),
  ('71000000-0000-0000-0000-000000000003', '72000000-0000-0000-0000-000000000002', 'admin', true);
insert into public.members (id, organization_id, user_id, member_number, first_name, last_name, phone, status, created_by)
values ('73000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000002', 'I-000001', 'Awa', 'Versement', '+2250700000201', 'active', '71000000-0000-0000-0000-000000000001');
insert into public.monthly_contribution_dues (id, member_id, contribution_month, due_date, amount_due, amount_paid, remaining_amount, status)
values
  ('74000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '2026-08-01', '2026-08-15', 1000, 0, 1000, 'unpaid'),
  ('74000000-0000-0000-0000-000000000002', '73000000-0000-0000-0000-000000000001', '2026-09-01', '2026-09-15', 1001, 0, 1001, 'unpaid'),
  ('74000000-0000-0000-0000-000000000003', '73000000-0000-0000-0000-000000000001', '2026-10-01', '2026-10-15', 1500, 0, 1500, 'unpaid'),
  ('74000000-0000-0000-0000-000000000004', '73000000-0000-0000-0000-000000000001', '2026-11-01', '2026-11-15', 1000, 400, 600, 'partial');

select is((public.get_monthly_contribution_settings('71000000-0000-0000-0000-000000000001')->>'maxPayments')::int, 2, 'new organizations default to two payments');
select throws_ok($$select public.update_monthly_contribution_settings('71000000-0000-0000-0000-000000000001', 1000::numeric, 15::smallint, 3::smallint)$$, 'Invalid monthly settings', 'legacy settings reject more than two payments');
select throws_ok($$select public.update_admin_contribution_settings('71000000-0000-0000-0000-000000000001', 0::numeric, 1000::numeric, 15::smallint, 3::smallint)$$, 'Invalid contribution settings', 'current admin settings reject more than two payments');
select is((public.get_admin_monthly_payment_context('71000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001')->>'maxPayments')::int, 2, 'payment context includes two-payment limit');
select throws_ok($$select public.get_admin_monthly_payment_context('71000000-0000-0000-0000-000000000003', '73000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001')$$, 'Contribution due not found', 'another organization cannot inspect this due');

select public.record_contribution_payment('71000000-0000-0000-0000-000000000001', 'monthly', '74000000-0000-0000-0000-000000000001', 500, '2026-08-10', 'I-001', 'manual');
select throws_ok($$select public.record_contribution_payment('71000000-0000-0000-0000-000000000001', 'monthly', '74000000-0000-0000-0000-000000000001', 300, '2026-08-11', 'I-002', 'wave')$$, 'Payment must settle remaining balance on final installment', 'second payment cannot leave a balance');
select is((select remaining_amount from public.monthly_contribution_dues where id='74000000-0000-0000-0000-000000000001'), 500::numeric, 'rejected second payment leaves the due unchanged');
select public.record_contribution_payment('71000000-0000-0000-0000-000000000001', 'monthly', '74000000-0000-0000-0000-000000000001', 500, '2026-08-11', 'I-002', 'wave');
select is((select status::text from public.monthly_contribution_dues where id='74000000-0000-0000-0000-000000000001'), 'paid', 'second payment settles the due');
select is((select count(*) from public.contribution_payments where monthly_contribution_due_id='74000000-0000-0000-0000-000000000001'), 2::bigint, 'exactly two payments are recorded');
select is((select payment_source::text from public.contribution_payments where payment_reference='I-002'), 'wave', 'selected payment method is saved');

select public.record_monthly_step_payment('71000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000002', 501, '2026-09-10', 'STEP-001', 'manual');
select public.record_monthly_step_payment('71000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000002', 500, '2026-09-11', 'STEP-002', 'wave');
select is((select status::text from public.monthly_contribution_dues where id='74000000-0000-0000-0000-000000000002'), 'paid', 'odd amount settles in two whole-XOF payments');
select throws_ok($$select public.record_monthly_step_payment('71000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000003', 550, '2026-10-10', '', 'manual')$$, 'Payment amount is not an allowed installment', 'a non-half intermediate amount is rejected');
select public.record_monthly_step_payment('71000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000003', 750, '2026-10-10', 'STEP-003', 'manual');
select throws_ok($$select public.record_monthly_step_payment('71000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000003', 500, '2026-10-11', '', 'manual')$$, 'Payment amount is not an allowed installment', 'second stepped payment must settle the balance');
select public.record_monthly_step_payment('71000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000003', 750, '2026-10-11', 'STEP-004', 'manual');
select is((select status::text from public.monthly_contribution_dues where id='74000000-0000-0000-0000-000000000003'), 'paid', 'second stepped payment settles the due');

select is(public.update_monthly_contribution_settings('71000000-0000-0000-0000-000000000001', 1000::numeric, 15::smallint, 1::smallint), 1000::numeric, 'admin can switch to one payment');
select is((public.get_admin_monthly_payment_context('71000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000004')->>'maxPayments')::int, 1, 'payment context reflects one-payment setting');
select public.record_monthly_step_payment('71000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000004', 600, '2026-11-10', 'STEP-005', 'manual');
select is((select status::text from public.monthly_contribution_dues where id='74000000-0000-0000-0000-000000000004'), 'paid', 'one-payment setting requires the full remaining balance');

select * from finish();
rollback;
