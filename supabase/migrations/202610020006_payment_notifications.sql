create table public.payment_notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  payment_id uuid not null references public.contribution_payments(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  recipient_id uuid not null references public.users(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  member_name text not null,
  kind text not null check (kind in ('membership', 'monthly', 'exceptional')),
  due_label text,
  amount numeric(12, 2) not null check (amount > 0),
  remaining_amount numeric(12, 2) not null check (remaining_amount >= 0),
  is_member_recipient boolean not null,
  created_at timestamptz not null,
  read_at timestamptz,
  unique (payment_id, recipient_id)
);
create index payment_notifications_recipient_recent_idx on public.payment_notifications (recipient_id, created_at desc, id desc);
alter table public.payment_notifications enable row level security;
revoke all on public.payment_notifications from public, anon, authenticated;
grant select on public.payment_notifications to authenticated;
create policy "recipient reads own payment notifications" on public.payment_notifications
  for select to authenticated using (recipient_id = auth.uid());

create function public.mark_payment_notification_read(notification_id uuid)
returns boolean language sql security definer set search_path = '' as $$
  with changed as (
    update public.payment_notifications n set read_at = now()
    where n.id = notification_id and n.recipient_id = auth.uid() and n.read_at is null
    returning n.id
  ) select exists (select 1 from changed);
$$;
revoke all on function public.mark_payment_notification_read(uuid) from public, anon;
grant execute on function public.mark_payment_notification_read(uuid) to authenticated;

create function public.enqueue_payment_notifications(payment_row public.contribution_payments)
returns void language plpgsql security definer set search_path = '' as $$
declare member_value uuid; member_user_value uuid; member_name_value text;
  kind_value text; due_label_value text; remaining_value numeric;
begin
  if payment_row.membership_fee_id is not null then
    kind_value := 'membership';
    select f.member_id, f.remaining_amount into member_value, remaining_value
    from public.membership_fees f where f.id = payment_row.membership_fee_id;
  elsif payment_row.monthly_contribution_due_id is not null then
    kind_value := 'monthly';
    select d.member_id, d.remaining_amount into member_value, remaining_value
    from public.monthly_contribution_dues d where d.id = payment_row.monthly_contribution_due_id;
  else
    kind_value := 'exceptional';
    select d.member_id, d.remaining_amount, c.label into member_value, remaining_value, due_label_value
    from public.exceptional_contribution_dues d
    join public.exceptional_contributions c on c.id = d.exceptional_contribution_id
    where d.id = payment_row.exceptional_contribution_due_id;
  end if;
  select m.user_id, concat_ws(' ', m.first_name, m.last_name)
    into member_user_value, member_name_value
  from public.members m where m.id = member_value and m.organization_id = payment_row.organization_id;
  if member_user_value is null then raise exception 'Invalid payment notification member'; end if;
  insert into public.payment_notifications (
    payment_id, organization_id, recipient_id, member_id, member_name,
    kind, due_label, amount, remaining_amount, is_member_recipient, created_at
  )
  select payment_row.id, payment_row.organization_id, u.id, member_value, member_name_value,
    kind_value, due_label_value, payment_row.amount, remaining_value,
    u.id = member_user_value, payment_row.created_at
  from public.users u
  where u.is_active and u.organization_id = payment_row.organization_id
    and (u.role = 'admin' or u.id = member_user_value)
  on conflict (payment_id, recipient_id) do nothing;
end;
$$;
revoke all on function public.enqueue_payment_notifications(public.contribution_payments) from public, anon, authenticated;

create function public.notify_recorded_contribution_payment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.enqueue_payment_notifications(new);
  return new;
end;
$$;
revoke all on function public.notify_recorded_contribution_payment() from public, anon, authenticated;
create trigger contribution_payment_notification_created
  after insert on public.contribution_payments
  for each row execute function public.notify_recorded_contribution_payment();

do $$ declare payment_row public.contribution_payments;
begin
  for payment_row in select * from public.contribution_payments order by created_at, id loop
    perform public.enqueue_payment_notifications(payment_row);
  end loop;
end $$;
