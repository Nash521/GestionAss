create or replace function public.release_registration_otp(
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
  released boolean := false;
begin
  if p_code_hash is null or octet_length(p_code_hash) <> 32 then
    return false;
  end if;

  delete from public.auth_otps
  where phone = p_phone
    and purpose = p_purpose
    and code_hash = p_code_hash
  returning true into released;

  return coalesce(released, false);
end;
$$;

revoke all on function public.release_registration_otp(text, text, bytea) from public;
grant execute on function public.release_registration_otp(text, text, bytea) to service_role;
