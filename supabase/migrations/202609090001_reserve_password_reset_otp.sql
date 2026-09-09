alter table public.auth_otps
  add column reset_reservation uuid,
  add column reset_reserved_at timestamptz;

create function public.reserve_password_reset_otp(p_phone text, p_code_hash bytea)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  otp_record public.auth_otps%rowtype;
  reservation uuid;
begin
  if p_code_hash is null or octet_length(p_code_hash) <> 32 then
    return null;
  end if;

  select *
  into otp_record
  from public.auth_otps
  where phone = p_phone
    and purpose = 'password_reset'
  for update;

  if not found
    or otp_record.consumed_at is not null
    or otp_record.attempts >= 5
    or otp_record.expires_at <= pg_catalog.now() then
    return null;
  end if;

  if otp_record.reset_reserved_at is not null
    and otp_record.reset_reserved_at > pg_catalog.now() - interval '5 minutes' then
    return null;
  end if;

  if otp_record.code_hash <> p_code_hash then
    update public.auth_otps
    set attempts = attempts + 1
    where id = otp_record.id;
    return null;
  end if;

  reservation := extensions.gen_random_uuid();
  update public.auth_otps
  set reset_reservation = reservation,
      reset_reserved_at = pg_catalog.now()
  where id = otp_record.id;
  return reservation;
end;
$$;

create function public.finalize_password_reset_otp(p_phone text, p_reservation uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.auth_otps
  set consumed_at = pg_catalog.now(),
      reset_reservation = null,
      reset_reserved_at = null
  where phone = p_phone
    and purpose = 'password_reset'
    and reset_reservation = p_reservation
    and consumed_at is null;
  return found;
end;
$$;

create function public.release_password_reset_otp(p_phone text, p_reservation uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.auth_otps
  set reset_reservation = null,
      reset_reserved_at = null
  where phone = p_phone
    and purpose = 'password_reset'
    and reset_reservation = p_reservation
    and consumed_at is null;
  return found;
end;
$$;

revoke all on function public.reserve_password_reset_otp(text, bytea) from public;
revoke all on function public.finalize_password_reset_otp(text, uuid) from public;
revoke all on function public.release_password_reset_otp(text, uuid) from public;
grant execute on function public.reserve_password_reset_otp(text, bytea) to service_role;
grant execute on function public.finalize_password_reset_otp(text, uuid) to service_role;
grant execute on function public.release_password_reset_otp(text, uuid) to service_role;
