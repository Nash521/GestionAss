create function public.verify_and_consume_otp(
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
  otp_record public.auth_otps%rowtype;
begin
  if p_code_hash is null or octet_length(p_code_hash) <> 32 then
    return false;
  end if;

  select *
  into otp_record
  from public.auth_otps
  where phone = p_phone
    and purpose = p_purpose
  for update;

  if not found
    or otp_record.consumed_at is not null
    or otp_record.attempts >= 5
    or otp_record.expires_at <= pg_catalog.now() then
    return false;
  end if;

  if otp_record.code_hash = p_code_hash then
    update public.auth_otps
    set consumed_at = pg_catalog.now()
    where id = otp_record.id;
    return true;
  end if;

  update public.auth_otps
  set attempts = attempts + 1
  where id = otp_record.id;
  return false;
end;
$$;

revoke all on function public.verify_and_consume_otp(text, text, bytea) from public;
grant execute on function public.verify_and_consume_otp(text, text, bytea) to service_role;
