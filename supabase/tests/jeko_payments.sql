begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(11);
insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','81000000-0000-0000-0000-000000000001','authenticated','authenticated','jeko-test-admin@example.test','unused',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','81000000-0000-0000-0000-000000000002','authenticated','authenticated','jeko-test-member@example.test','unused',now(),'{}','{}',now(),now());
insert into public.organizations (id,name,membership_fee_amount,monthly_contribution_amount) values ('82000000-0000-0000-0000-000000000001','Jeko test',0,1500);
insert into public.users(id,organization_id,role,is_active) values
('81000000-0000-0000-0000-000000000001','82000000-0000-0000-0000-000000000001','admin',true),
('81000000-0000-0000-0000-000000000002','82000000-0000-0000-0000-000000000001','member',true);
insert into public.members(id,organization_id,user_id,member_number,first_name,last_name,phone,status,created_by) values ('83000000-0000-0000-0000-000000000001','82000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000002','J-001','Jeko','Test','+2250700012345','active','81000000-0000-0000-0000-000000000001');
insert into public.monthly_contribution_dues(id,member_id,contribution_month,due_date,amount_due,amount_paid,remaining_amount,status) values
('84000000-0000-0000-0000-000000000001','83000000-0000-0000-0000-000000000001','2026-01-01','2026-01-15',1500,0,1500,'unpaid'),
('84000000-0000-0000-0000-000000000002','83000000-0000-0000-0000-000000000001','2026-02-01','2026-02-15',1500,0,1500,'unpaid');
insert into public.jeko_configurations(organization_id,api_key_id,store_id,encrypted_api_key,encrypted_webhook_secret,updated_by) values ('82000000-0000-0000-0000-000000000001','test','85000000-0000-0000-0000-000000000001','encrypted','encrypted','81000000-0000-0000-0000-000000000001');
select throws_ok($$select public.reserve_jeko_monthly_payment('81000000-0000-0000-0000-000000000001','83000000-0000-0000-0000-000000000001','84000000-0000-0000-0000-000000000001',550,'jeko_ref_bad')$$,'Invalid payment amount','invalid installment rejected');
select ok(public.reserve_jeko_monthly_payment('81000000-0000-0000-0000-000000000001','83000000-0000-0000-0000-000000000001','84000000-0000-0000-0000-000000000001',500,'jeko_ref_001') is not null,'valid payment reserved');
select throws_ok($$select public.reserve_jeko_monthly_payment('81000000-0000-0000-0000-000000000001','83000000-0000-0000-0000-000000000001','84000000-0000-0000-0000-000000000001',500,'jeko_ref_002')$$,'23505',null,'duplicate pending request rejected');
select throws_ok($$update public.jeko_configurations set encrypted_webhook_secret='new' where organization_id='82000000-0000-0000-0000-000000000001'$$,'Jeko configuration has unresolved payments','configuration cannot change while a payment is unresolved');
update public.jeko_payment_intents set status='pending',provider_request_id='request-001' where reference='jeko_ref_001';
select throws_ok($$select public.confirm_jeko_monthly_payment((select id from public.jeko_payment_intents where reference='jeko_ref_001'),'txn-001','request-001','85000000-0000-0000-0000-000000000001','jeko_ref_001',501)$$,'Payment confirmation mismatch','wrong amount rejected');
select is(public.confirm_jeko_monthly_payment((select id from public.jeko_payment_intents where reference='jeko_ref_001'),'txn-001','request-001','85000000-0000-0000-0000-000000000001','jeko_ref_001',500),'confirmed','payment confirmed');
select is((select remaining_amount from public.monthly_contribution_dues where id='84000000-0000-0000-0000-000000000001'),1000::numeric,'balance updated');
select is((select payment_source::text from public.contribution_payments where payment_reference='txn-001'),'jeko','provider identified');
select is(public.confirm_jeko_monthly_payment((select id from public.jeko_payment_intents where reference='jeko_ref_001'),'txn-001','request-001','85000000-0000-0000-0000-000000000001','jeko_ref_001',500),'confirmed','replay idempotent');
select is((select count(*) from public.contribution_payments where payment_reference='txn-001'),1::bigint,'one financial entry');
select ok(not has_table_privilege('authenticated','public.jeko_configurations','SELECT'),'users cannot read encrypted credentials');
select * from finish();
rollback;
