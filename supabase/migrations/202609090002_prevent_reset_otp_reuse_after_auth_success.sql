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
    consumed_at = null,
    reset_reservation = null,
    reset_reserved_at = null
  where public.auth_otps.last_sent_at <= pg_catalog.now() - interval '5 minutes'
  returning true into issued;

  return coalesce(issued, false);
end;
$$;

create or replace function public.reserve_password_reset_otp(p_phone text, p_code_hash bytea)
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
    or otp_record.expires_at <= pg_catalog.now()
    or otp_record.reset_reservation is not null then
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
