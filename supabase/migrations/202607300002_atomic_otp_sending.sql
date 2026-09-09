create or replace function public.issue_registration_otp(
  p_phone text,
  p_purpose text,
  p_code_hash bytea
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  issued boolean := false;
begin
  if p_code_hash is null or octet_length(p_code_hash) <> 32 then
    return false;
  end if;

  insert into public.auth_otps (
    phone, purpose, code_hash, expires_at, attempts, last_sent_at, consumed_at
  ) values (
    p_phone, p_purpose, p_code_hash, pg_catalog.now() + interval '10 minutes', 0, pg_catalog.now(), null
  )
  on conflict (phone, purpose) do update
  set
    code_hash = excluded.code_hash,
    expires_at = excluded.expires_at,
    attempts = 0,
    last_sent_at = excluded.last_sent_at,
    consumed_at = null
  where public.auth_otps.last_sent_at <= pg_catalog.now() - interval '5 minutes'
  returning true into issued;

  return coalesce(issued, false);
end;
$$;

revoke all on function public.issue_registration_otp(text, text, bytea) from public;
grant execute on function public.issue_registration_otp(text, text, bytea) to service_role;
