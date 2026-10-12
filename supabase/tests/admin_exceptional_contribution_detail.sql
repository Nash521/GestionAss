begin;
select plan(22);
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

update public.members set status = 'active' where id = '53000000-0000-0000-0000-000000000003';
insert into public.exceptional_contributions (id, organization_id, label, amount, due_date, created_by) values
('54000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 'Solidarité', 300, '2026-10-20', '51000000-0000-0000-0000-000000000001'),
('54000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000001', 'Vide', 300, '2026-10-20', '51000000-0000-0000-0000-000000000001');
insert into public.exceptional_contribution_dues (exceptional_contribution_id, member_id, amount_due, amount_paid, remaining_amount, status)
select '54000000-0000-0000-0000-000000000001', id, 300, 0, 300, 'unpaid' from public.members where organization_id = '52000000-0000-0000-0000-000000000001';
select public.record_contribution_payment('51000000-0000-0000-0000-000000000001', 'exceptional', (select id from public.exceptional_contribution_dues where member_id='53000000-0000-0000-0000-000000000001'), 300, '2026-10-05', null, 'manual');
select public.record_contribution_payment('51000000-0000-0000-0000-000000000001', 'exceptional', (select id from public.exceptional_contribution_dues where member_id='53000000-0000-0000-0000-000000000002'), 100, '2026-10-05', null, 'manual');
update public.members set status='suspended' where id='53000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);
select is(public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001')->'summary', '{"memberCount":3,"paidCount":1,"partialCount":1,"unpaidCount":1,"totalExpected":900,"totalCollected":400,"totalRemaining":500}'::jsonb, 'summary includes all assigned members and exact balances, even after suspension');
select is(jsonb_array_length(public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001')->'items'), 3, 'all three assigned members are returned');
select is(public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001',0,30,'paid')->'items'->0->>'firstName', 'Awa', 'paid filter returns settled member');
select is(public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001',0,30,'partial')->'items'->0->>'amountRemaining', '200.00', 'partial member has the right remaining amount');
select is(public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001',0,30,'unpaid')->'items'->0->>'firstName', 'Chloe', 'unpaid filter returns member without payments');
select is(public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001',0,30,'paid')->'summary', public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001')->'summary', 'filter does not change global summary');
select is(public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001',1,1)->'items'->0->>'firstName', 'Benoit', 'pagination follows stable member ordering');
select is(public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001',1,1)->'metadata'->>'total','3','pagination retains full member count');
select is(jsonb_array_length(public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001',3,1)->'items'),0,'page after last member is empty');
select is(public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000002')->'summary'->>'totalExpected','0','contribution without members has zero totals');
select throws_ok($$ select public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001',0,30,'invalid') $$,'22023','Invalid pagination or status','invalid filter is rejected');
select throws_ok($$ select public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001',-1,30) $$,'22023','Invalid pagination or status','negative offset is rejected');
select throws_ok($$ select public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001',0,51) $$,'22023','Invalid pagination or status','oversized page is rejected');
select is(public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001',0,30,'all','  bEnOiT  ')->'items'->0->>'firstName','Benoit','search ignores case and surrounding spaces');
select is(public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001',0,30,'all','F-000003')->'metadata'->>'total','1','search matches member number');
select is(public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001',0,30,'paid','Benoit')->'metadata'->>'total','0','search combines with payment status');
select is(public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001',0,30,'all','Finance Awa')->'items'->0->>'firstName','Awa','search accepts last name before first name');
select is(public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001',0,30,'all','%')->'metadata'->>'total','0','search treats wildcard characters literally');
select is(public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001',0,30,'all','Benoit')->'summary',public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001')->'summary','search preserves global contribution totals');
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000002', true);
select is(public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001'),null::jsonb,'other association admin cannot see contribution');
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000003', true);
select throws_ok($$ select public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001') $$,'42501','Unauthorized','member cannot read admin detail');
reset role;
update public.users set is_active=false where id='51000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);
select throws_ok($$ select public.get_admin_exceptional_contribution_detail('54000000-0000-0000-0000-000000000001') $$,'42501','Unauthorized','inactive administrator cannot read detail');
select * from finish();
rollback;