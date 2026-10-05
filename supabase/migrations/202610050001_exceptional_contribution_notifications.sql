-- Keep payment notices and contribution announcements in one recipient-scoped inbox.
alter table public.payment_notifications alter column payment_id drop not null;
alter table public.payment_notifications
  add column exceptional_due_id uuid references public.exceptional_contribution_dues(id) on delete restrict,
  add column event_type text not null default 'payment' check (event_type in ('payment', 'exceptional_created')),
  add column due_date date,
  add constraint payment_notification_event_check check (
    (event_type = 'payment' and payment_id is not null and exceptional_due_id is null)
    or (event_type = 'exceptional_created' and payment_id is null and exceptional_due_id is not null and kind = 'exceptional' and due_date is not null)
  );
create unique index exceptional_notification_recipient_unique
  on public.payment_notifications (exceptional_due_id, recipient_id)
  where event_type = 'exceptional_created';

create function public.enqueue_exceptional_contribution_notification(due_row public.exceptional_contribution_dues)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.payment_notifications (
    exceptional_due_id, event_type, organization_id, recipient_id, member_id,
    member_name, kind, due_label, amount, remaining_amount, due_date,
    is_member_recipient, created_at
  )
  select due_row.id, 'exceptional_created', c.organization_id, m.user_id, m.id,
    concat_ws(' ', m.first_name, m.last_name), 'exceptional', c.label,
    due_row.amount_due, due_row.remaining_amount, c.due_date, true, c.created_at
  from public.exceptional_contributions c
  join public.members m on m.id = due_row.member_id and m.organization_id = c.organization_id
  join public.users u on u.id = m.user_id and u.organization_id = c.organization_id
  where c.id = due_row.exceptional_contribution_id
    and u.is_active and m.status <> 'removed'
    and c.due_date > (now() at time zone 'Africa/Abidjan')::date
    and due_row.remaining_amount > 0
  on conflict (exceptional_due_id, recipient_id) where event_type = 'exceptional_created' do nothing;
end;
$$;
revoke all on function public.enqueue_exceptional_contribution_notification(public.exceptional_contribution_dues) from public, anon, authenticated;

create function public.notify_exceptional_contribution_created()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.enqueue_exceptional_contribution_notification(new);
  return new;
end;
$$;
revoke all on function public.notify_exceptional_contribution_created() from public, anon, authenticated;
create trigger exceptional_contribution_notification_created
  after insert on public.exceptional_contribution_dues
  for each row execute function public.notify_exceptional_contribution_created();

do $$ declare due_row public.exceptional_contribution_dues;
begin
  for due_row in
    select d.* from public.exceptional_contribution_dues d
    join public.exceptional_contributions c on c.id = d.exceptional_contribution_id
    where c.due_date > (now() at time zone 'Africa/Abidjan')::date and d.remaining_amount > 0
  loop
    perform public.enqueue_exceptional_contribution_notification(due_row);
  end loop;
end $$;
