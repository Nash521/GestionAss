create function public.can_access_payment_notification(notification_organization_id uuid, notification_member_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.users u
    join public.organizations o on o.id = u.organization_id
    where u.id = auth.uid() and u.is_active and o.is_active
      and u.organization_id = notification_organization_id
      and (u.role = 'admin' or exists (
        select 1 from public.members m
        where m.id = notification_member_id and m.user_id = u.id
      ))
  );
$$;
revoke all on function public.can_access_payment_notification(uuid, uuid) from public, anon;
grant execute on function public.can_access_payment_notification(uuid, uuid) to authenticated;

drop policy "recipient reads own payment notifications" on public.payment_notifications;
create policy "active recipient reads own payment notifications" on public.payment_notifications
  for select to authenticated using (
    recipient_id = auth.uid()
    and public.can_access_payment_notification(organization_id, member_id)
  );

create or replace function public.mark_payment_notification_read(notification_id uuid)
returns boolean language sql security definer set search_path = '' as $$
  with changed as (
    update public.payment_notifications n set read_at = now()
    where n.id = notification_id and n.recipient_id = auth.uid() and n.read_at is null
      and public.can_access_payment_notification(n.organization_id, n.member_id)
    returning n.id
  ) select exists (select 1 from changed);
$$;
