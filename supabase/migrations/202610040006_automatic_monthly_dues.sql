-- Africa/Abidjan uses UTC year-round. Generate each month's dues at 00:05 on day 1.
create extension if not exists pg_cron with schema pg_catalog;

create function public.generate_current_month_dues_for_all_organizations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_record record;
  total_inserted integer := 0;
begin
  for admin_record in
    select distinct on (organization_id) id
    from public.users
    where role = 'admin' and is_active
    order by organization_id, id
  loop
    total_inserted := total_inserted + public.generate_monthly_contribution_dues(
      admin_record.id,
      date_trunc('month', (now() at time zone 'Africa/Abidjan'))::date
    );
  end loop;
  return total_inserted;
end;
$$;

revoke all on function public.generate_current_month_dues_for_all_organizations() from public, anon, authenticated;
grant execute on function public.generate_current_month_dues_for_all_organizations() to service_role;

select cron.schedule(
  'gestionass-generate-monthly-dues',
  '5 0 1 * *',
  $job$select public.generate_current_month_dues_for_all_organizations();$job$
);

-- Create the current month's dues when this migration is installed.
select public.generate_current_month_dues_for_all_organizations();
