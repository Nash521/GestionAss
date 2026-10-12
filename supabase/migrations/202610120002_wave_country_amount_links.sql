-- Wave Business merchant links may contain a country segment and a fixed
-- amount query, for example /m/M_ci_.../c/ci/?amount=1000.
create or replace function public.is_valid_wave_fixed_link(payment_url text)
returns boolean language sql immutable set search_path = '' as $$
  select payment_url is not null and length(payment_url) <= 500
    and payment_url ~ '^https://pay[.]wave[.]com/(m|mqr)/[A-Za-z0-9_-]+(/c/[a-z]{2})?/?([?]amount=[1-9][0-9]*)?$';
$$;

create function public.wave_link_amount(payment_url text)
returns numeric language sql immutable set search_path = '' as $$
  select nullif(substring(payment_url from '[?]amount=([1-9][0-9]*)$'), '')::numeric;
$$;

alter table public.exceptional_contributions add constraint wave_exceptional_amount_matches
  check (wave_payment_url is null or (public.wave_link_amount(wave_payment_url) = amount) is true);

revoke all on function public.wave_link_amount(text) from public, anon, authenticated;

create or replace function public.create_exceptional_contribution_with_wave_link(
  admin_id uuid, contribution_label text, contribution_amount numeric,
  contribution_due_date date, selected_member_ids uuid[], payment_url text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result_id uuid;
begin
  if not public.is_valid_wave_fixed_link(payment_url)
    or public.wave_link_amount(payment_url) is distinct from contribution_amount then
    raise exception 'Invalid Wave payment link or amount' using errcode = '22023';
  end if;
  result_id := public.create_exceptional_contribution(admin_id, contribution_label,
    contribution_amount, contribution_due_date, selected_member_ids);
  update public.exceptional_contributions set wave_payment_url = btrim(payment_url)
    where id = result_id;
  return result_id;
end;
$$;

notify pgrst, 'reload schema';
