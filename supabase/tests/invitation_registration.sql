begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(11);

select has_table('public', 'organization_invitations', 'organization invitations table exists');
select has_function(
  'public',
  'consume_registration_invitation',
  array['uuid'],
  'atomic invitation consumption function exists'
);

insert into public.organizations (id, name)
values ('40000000-0000-0000-0000-000000000001', 'Organisation invitations de test');

insert into public.organization_invitations (
  id, organization_id, code_hash, usage_limit
) values (
  '50000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  decode(repeat('01', 32), 'hex'),
  1
);

select is(
  public.consume_registration_invitation('50000000-0000-0000-0000-000000000001'),
  '40000000-0000-0000-0000-000000000001'::uuid,
  'first consumption returns the invitation organization'
);
select is(
  (select usage_count from public.organization_invitations where id = '50000000-0000-0000-0000-000000000001'),
  1,
  'first consumption increments usage count'
);
select throws_ok(
  $$ select public.consume_registration_invitation('50000000-0000-0000-0000-000000000001') $$,
  'P0001',
  'invitation is unavailable',
  'a consumed single-use invitation is rejected'
);

insert into public.organization_invitations (id, organization_id, code_hash, is_active)
values ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', decode(repeat('02', 32), 'hex'), false);
select throws_ok(
  $$ select public.consume_registration_invitation('50000000-0000-0000-0000-000000000002') $$,
  'P0001',
  'invitation is unavailable',
  'an inactive invitation is rejected'
);

insert into public.organization_invitations (id, organization_id, code_hash, expires_at)
values ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', decode(repeat('03', 32), 'hex'), now() - interval '1 second');
select throws_ok(
  $$ select public.consume_registration_invitation('50000000-0000-0000-0000-000000000003') $$,
  'P0001',
  'invitation is unavailable',
  'an expired invitation is rejected'
);

insert into public.organization_invitations (id, organization_id, code_hash, usage_limit, usage_count)
values ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', decode(repeat('04', 32), 'hex'), 2, 2);
select throws_ok(
  $$ select public.consume_registration_invitation('50000000-0000-0000-0000-000000000004') $$,
  'P0001',
  'invitation is unavailable',
  'an exhausted invitation is rejected'
);

select is(
  (select usage_count from public.organization_invitations where id = '50000000-0000-0000-0000-000000000004'),
  2,
  'rejected consumption does not increment usage count'
);
select col_is_null('public', 'organization_invitations', 'expires_at', 'invitation expiration is optional');
select col_is_null('public', 'organization_invitations', 'usage_limit', 'invitation usage limit is optional');

select * from finish();

rollback;
